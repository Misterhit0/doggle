import React from 'react';

interface DogAvatarFallbackProps {
  name: string;
  breed?: string;
  className?: string;
}

export default function DogAvatarFallback({ name, breed, className = "" }: DogAvatarFallbackProps) {
  const initials = name ? name.substring(0, 2).toUpperCase() : "DG";

  // Deterministic color assignment based on name
  const colors = [
    "bg-pink-100 text-pink-800 border-pink-300",
    "bg-purple-100 text-purple-800 border-purple-300",
    "bg-yellow-100 text-yellow-800 border-yellow-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-orange-100 text-orange-800 border-orange-300",
  ];

  const charCodeSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[charCodeSum % colors.length];

  return (
    <div
      className={`relative flex flex-col items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${colorClass} ${className}`}
    >
      <span className="font-black text-xl tracking-wider">{initials}</span>
      {breed && (
        <span className="text-[9px] uppercase font-black tracking-wide mt-1 px-1 bg-white/70 rounded border border-black/30">
          {breed.substring(0, 10)}
        </span>
      )}
      
      {/* Small floating paw icon */}
      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
        <svg viewBox="0 0 100 100" className="w-4.5 h-4.5 text-black" fill="currentColor">
          <path d="M 50 45 C 38 45 32 55 35 68 C 38 78 62 78 65 68 C 68 55 62 45 50 45 Z" />
          <circle cx="28" cy="40" r="9" />
          <circle cx="42" cy="26" r="9" />
          <circle cx="58" cy="26" r="9" />
          <circle cx="72" cy="40" r="9" />
        </svg>
      </div>
    </div>
  );
}
