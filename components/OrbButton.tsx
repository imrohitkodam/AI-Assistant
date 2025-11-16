import React from 'react';

interface OrbButtonProps {
  status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
  onClick: () => void;
}

export const OrbButton: React.FC<OrbButtonProps> = ({ status, onClick }) => {
  const getOrbStateClasses = () => {
    switch (status) {
      case 'listening':
        return 'bg-blue-500 animate-pulse-strong';
      case 'speaking':
        return 'bg-purple-500 animate-pulse-strong';
      case 'connecting':
        return 'bg-yellow-500 animate-spin';
      case 'error':
        return 'bg-red-600';
      case 'idle':
      default:
        return 'bg-gray-600 hover:bg-gray-500';
    }
  };
  
  const getIcon = () => {
     switch (status) {
      case 'listening':
      case 'speaking':
      case 'connecting':
        return (
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        );
      case 'error':
      case 'idle':
      default:
         return (
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path d="M5.5 4.5a2.5 2.5 0 015 0v6a2.5 2.5 0 01-5 0V4.5z" /><path d="M10 15a5 5 0 005-5V4a5 5 0 00-10 0v6a5 5 0 005 5z" /><path d="M3 10a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" /><path d="M15.5 10a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" /></svg>
         );
    }
  };

  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-400/50 shadow-2xl ${getOrbStateClasses()}`}
      aria-label={status === 'idle' ? 'Start session' : 'Stop session'}
    >
      {getIcon()}
    </button>
  );
};