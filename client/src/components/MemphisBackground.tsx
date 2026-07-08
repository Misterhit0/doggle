import React from 'react';

interface MemphisBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

// Custom Dog-Themed Memphis SVGs
const BoneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path
      d="M 25 35 C 18 35 15 25 22 18 C 29 11 39 18 39 25 L 61 25 C 61 18 71 11 78 18 C 85 25 82 35 75 35 C 82 35 85 45 78 52 C 71 59 61 52 61 45 L 39 45 C 39 52 29 59 22 52 C 15 45 18 35 25 35 Z"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PawPrintIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path
      d="M 50 45 C 38 45 32 55 35 68 C 38 78 62 78 65 68 C 68 55 62 45 50 45 Z"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="40" r="8.5" stroke="currentColor" strokeWidth="3.5" />
    <circle cx="42" cy="26" r="8.5" stroke="currentColor" strokeWidth="3.5" />
    <circle cx="58" cy="26" r="8.5" stroke="currentColor" strokeWidth="3.5" />
    <circle cx="72" cy="40" r="8.5" stroke="currentColor" strokeWidth="3.5" />
  </svg>
);

const DogBowlIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path
      d="M 15 70 L 25 40 L 75 40 L 85 70 Z"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse cx="50" cy="40" rx="25" ry="6.5" stroke="currentColor" strokeWidth="3.5" />
    <path d="M 32 55 Q 50 50 68 55" stroke="currentColor" strokeWidth="2.5" fill="none" />
  </svg>
);

const DogCollarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none">
    <ellipse
      cx="50"
      cy="45"
      rx="32"
      ry="12"
      stroke="currentColor"
      strokeWidth="5"
      fill="none"
    />
    <line x1="50" y1="57" x2="50" y2="65" stroke="currentColor" strokeWidth="4" />
    <path
      d="M 50 65 C 47 62 42 62 42 67 C 42 72 50 78 50 78 C 50 78 58 72 58 67 C 58 62 53 62 50 65 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MemphisBackground({
  children,
  className = '',
  intensity = 'medium',
}: MemphisBackgroundProps) {
  const shapeCount = intensity === 'low' ? 4 : intensity === 'high' ? 12 : 8;

  const shapes = Array.from({ length: shapeCount }).map((_, i) => {
    const type = ['bone', 'paw', 'bowl', 'collar'][i % 4];
    const size = 50 + (i * 10);
    const left = (i * 13 + 5) % 90;
    const top = (i * 19 + 5) % 90;
    const rotation = (i * 35) % 360;
    const delay = i * 0.15;
    const duration = 22 + (i % 3) * 6;

    return { type, size, left, top, rotation, delay, duration };
  });

  const renderShapeIcon = (type: string, className?: string) => {
    switch (type) {
      case 'bone':
        return <BoneIcon className={className} />;
      case 'paw':
        return <PawPrintIcon className={className} />;
      case 'bowl':
        return <DogBowlIcon className={className} />;
      case 'collar':
        return <DogCollarIcon className={className} />;
      default:
        return <BoneIcon className={className} />;
    }
  };

  const colors = [
    'text-pink-300/30',
    'text-purple-300/30',
    'text-yellow-300/30',
    'text-emerald-300/30',
    'text-orange-300/30',
  ];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Animated background dog-themed shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {shapes.map((shape, i) => (
          <div
            key={i}
            className={`absolute ${colors[i % colors.length]} opacity-10 blur-[0.5px]`}
            style={{
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              left: `${shape.left}%`,
              top: `${shape.top}%`,
              transform: `rotate(${shape.rotation}deg)`,
              animation: `float ${shape.duration}s ease-in-out infinite`,
              animationDelay: `${shape.delay}s`,
            }}
          >
            {renderShapeIcon(shape.type, "w-full h-full")}
          </div>
        ))}
      </div>

      {/* Static dog-themed accent shapes */}
      <div className="absolute top-10 left-10 w-20 h-20 text-yellow-300/20 opacity-8 pointer-events-none">
        <DogBowlIcon className="w-full h-full" />
      </div>
      <div className="absolute bottom-20 right-10 w-24 h-24 text-pink-300/20 opacity-8 pointer-events-none">
        <PawPrintIcon className="w-full h-full" />
      </div>
      <div className="absolute top-1/2 right-1/4 w-16 h-16 text-purple-300/20 opacity-8 pointer-events-none">
        <BoneIcon className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* CSS for Memphis shapes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
}
