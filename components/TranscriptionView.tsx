
import React, { useRef, useEffect } from 'react';

type Transcript = {
  speaker: 'user' | 'bujji';
  text: string;
  isPartial: boolean;
};

interface TranscriptionViewProps {
  transcripts: Transcript[];
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ transcripts }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);
  
  return (
    <div className="flex-grow overflow-y-auto space-y-4 pr-2">
      {transcripts.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Your conversation with Bujji will appear here.</p>
        </div>
      )}
      {transcripts.map((transcript, index) => (
        <div key={index} className={`flex items-start gap-3 ${transcript.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
          {transcript.speaker === 'bujji' && (
            <div className="w-8 h-8 rounded-full bg-blue-400 flex-shrink-0 flex items-center justify-center font-bold text-gray-900">B</div>
          )}
          <div 
            className={`max-w-xs md:max-w-md p-3 rounded-lg text-white ${transcript.speaker === 'user' ? 'bg-gray-700' : 'bg-blue-600/80'} ${transcript.isPartial ? 'opacity-70' : ''}`}
          >
            <p>{transcript.text}</p>
          </div>
          {transcript.speaker === 'user' && (
             <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center font-bold">U</div>
          )}
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
