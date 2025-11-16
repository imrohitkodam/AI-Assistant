import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: The `LiveSession` type is not exported from the `@google/genai` package.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, encode, decodeAudioData, createBlob } from './utils/audio';
import { JarvisCore } from './components/JarvisCore';

// FIX: Since `LiveSession` is not exported, its type is inferred from the `ai.live.connect` method
// to ensure type safety without relying on a non-exported type.
type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

type AppStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
type Language = 'english' | 'hindi';


const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [language, setLanguage] = useState<Language>('english');
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleToggleSession = async () => {
    if (status !== 'idle' && status !== 'error') {
      await cleanup();
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const systemInstruction = `You are Bujji, a friendly and helpful personal AI assistant. You are an expert in both English and Hindi. For this session, you must respond *exclusively* in ${language}. Do not mix languages. Keep your responses friendly and conversational.`;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('listening');
            const inputCtx = inputAudioContextRef.current;
            const stream = streamRef.current;
            if (!inputCtx || !stream) return;

            mediaStreamSourceRef.current = inputCtx.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputCtx.destination);
          },
          onmessage: onMessage,
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('An error occurred with the session. Please try again.');
            setStatus('error');
            cleanup();
          },
          onclose: (e: CloseEvent) => {
            cleanup();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
      });

    } catch (err) {
      console.error('Failed to start session:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to start session: ${errorMessage}`);
      setStatus('error');
      await cleanup();
    }
  };
  
  const onMessage = async (message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      setStatus('speaking');
    }

    if (message.serverContent?.turnComplete) {
      setStatus('listening');
    }

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
        setStatus('speaking');
        const outputCtx = outputAudioContextRef.current;
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
        const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
        const source = outputCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputCtx.destination);
        source.addEventListener('ended', () => {
          audioSourcesRef.current.delete(source);
          if (audioSourcesRef.current.size === 0) {
            setStatus(currentStatus => currentStatus === 'speaking' ? 'listening' : currentStatus);
          }
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    }
    
    if(message.serverContent?.interrupted){
        for(const source of audioSourcesRef.current.values()){
            source.stop();
            audioSourcesRef.current.delete(source);
        }
        nextStartTimeRef.current = 0;
    }
  };

  const cleanup = useCallback(async () => {
    try {
      if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
      }
    } catch (e) {
      console.error("Error closing session:", e);
    }

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    sessionPromiseRef.current = null;
    streamRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    nextStartTimeRef.current = 0;
    audioSourcesRef.current.clear();
    
    setStatus('idle');
  }, []);
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const LanguageSelector = () => (
    <div className="mb-8 flex items-center justify-center space-x-4">
       <button 
        onClick={() => setLanguage('english')}
        disabled={status !== 'idle'}
        className={`font-mono px-5 py-2 text-base rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed ${language === 'english' ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'}`}>
          English
       </button>
       <button 
        onClick={() => setLanguage('hindi')}
        disabled={status !== 'idle'}
        className={`font-mono px-5 py-2 text-base rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed ${language === 'hindi' ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'}`}>
          हिन्दी
       </button>
    </div>
  );

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md mx-auto main-panel flex flex-col items-center justify-center p-6 sm:p-8">
        {status === 'idle' && <LanguageSelector />}
        <div className="my-4">
          <JarvisCore status={status} onClick={handleToggleSession} />
        </div>
        <div className="w-full h-8 text-center mt-4">
          <p className="font-mono text-sky-300/80 text-base sm:text-lg tracking-wider">
            {error ? <span className="text-red-400">{error}</span> : 
            status === 'idle' ? 'Select language and tap core' :
            status === 'connecting' ? 'Initializing...' :
            status === 'listening' ? `Listening...` :
            status === 'speaking' ? 'Responding...' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;