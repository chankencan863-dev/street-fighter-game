import React from 'react';

interface VirtualControlsProps {
  onInput: (action: string | null, active: boolean) => void;
  className?: string;
}

export function VirtualControls({ onInput, className = '' }: VirtualControlsProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 p-4 flex justify-between ${className}`}>
      {/* Movement Controls (Left Side) */}
      <div className="flex flex-col items-start">
        {/* D-Pad */}
        <div className="flex flex-col items-center mb-2">
          <button
            className="w-16 h-16 bg-gray-800/70 hover:bg-gray-700/70 rounded-full mb-1 text-white text-2xl active:bg-gray-600/70"
            onTouchStart={() => onInput('up', true)}
            onTouchEnd={() => onInput('up', false)}
            onMouseDown={() => onInput('up', true)}
            onMouseUp={() => onInput('up', false)}
            onMouseLeave={() => onInput('up', false)}
          >
            ↑
          </button>
          <div className="flex gap-1">
            <button
              className="w-16 h-16 bg-gray-800/70 hover:bg-gray-700/70 rounded-full text-white text-2xl active:bg-gray-600/70"
              onTouchStart={() => onInput('left', true)}
              onTouchEnd={() => onInput('left', false)}
              onMouseDown={() => onInput('left', true)}
              onMouseUp={() => onInput('left', false)}
              onMouseLeave={() => onInput('left', false)}
            >
              ←
            </button>
            <div className="w-16 h-16"></div>
            <button
              className="w-16 h-16 bg-gray-800/70 hover:bg-gray-700/70 rounded-full text-white text-2xl active:bg-gray-600/70"
              onTouchStart={() => onInput('right', true)}
              onTouchEnd={() => onInput('right', false)}
              onMouseDown={() => onInput('right', true)}
              onMouseUp={() => onInput('right', false)}
              onMouseLeave={() => onInput('right', false)}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Attack Controls (Right Side) */}
      <div className="flex flex-col items-end gap-3">
        <button
          className="w-20 h-20 bg-red-600/70 hover:bg-red-500/70 rounded-full text-white font-bold text-lg active:bg-red-700/70"
          onTouchStart={() => onInput('punch', true)}
          onTouchEnd={() => onInput('punch', false)}
          onMouseDown={() => onInput('punch', true)}
          onMouseUp={() => onInput('punch', false)}
          onMouseLeave={() => onInput('punch', false)}
        >
          PUNCH
        </button>
        
        <button
          className="w-20 h-20 bg-orange-600/70 hover:bg-orange-500/70 rounded-full text-white font-bold text-lg active:bg-orange-700/70"
          onTouchStart={() => onInput('kick', true)}
          onTouchEnd={() => onInput('kick', false)}
          onMouseDown={() => onInput('kick', true)}
          onMouseUp={() => onInput('kick', false)}
          onMouseLeave={() => onInput('kick', false)}
        >
          KICK
        </button>
        
        <button
          className="w-20 h-20 bg-blue-600/70 hover:bg-blue-500/70 rounded-full text-white font-bold text-lg active:bg-blue-700/70"
          onTouchStart={() => onInput('special', true)}
          onTouchEnd={() => onInput('special', false)}
          onMouseDown={() => onInput('special', true)}
          onMouseUp={() => onInput('special', false)}
          onMouseLeave={() => onInput('special', false)}
        >
          SPECIAL
        </button>
      </div>
    </div>
  );
        }
