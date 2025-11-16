import React from 'react';

interface JarvisCoreProps {
  status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
  onClick: () => void;
}

const BAR_COUNT = 80;

export const JarvisCore: React.FC<JarvisCoreProps> = ({ status, onClick }) => {
  const stateClass = `state-${status}`;

  return (
    <button
      onClick={onClick}
      className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none group"
      aria-label={status === 'idle' ? 'Start session' : 'Stop session'}
    >
      {/* Bar Container */}
      <div className={`absolute w-full h-full ${stateClass}`}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className="bar-wrapper"
            style={{ transform: `rotate(${i * (360 / BAR_COUNT)}deg)` }}
          >
            <div
              className="bar"
              style={{ animationDelay: `${(i * 25)}ms` }}
            />
          </div>
        ))}
      </div>
      
      {/* Central Core */}
       <div className="absolute w-[60%] h-[60%] rounded-full bg-slate-900 border-2 border-cyan-400/30 group-hover:border-cyan-400/80 transition-colors duration-300">
         <div className="absolute inset-0 rounded-full core-glow" />
         <div className={`absolute inset-2 rounded-full core-pulse ${stateClass}`} />
      </div>
    </button>
  );
};
