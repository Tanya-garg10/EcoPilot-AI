import React from 'react';

interface EcoPilotLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  lightWordmark?: boolean;
}

export const EcoPilotLogo: React.FC<EcoPilotLogoProps> = ({
  className = '',
  size = 34,
  showWordmark = true,
  lightWordmark = false,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon: Minimalist Leaf holding an Energy Bolt */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-[#123D32] shadow-sm shrink-0 transition-transform duration-200 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          {/* Organic Leaf Outline */}
          <path
            d="M7 23C7 23 9 10 24 8C24 8 23 21 11 23.5C8.8 24 7 23 7 23Z"
            fill="#4E9C65"
            fillOpacity="0.35"
            stroke="#4E9C65"
            strokeWidth="1.2"
          />
          {/* Electric Bolt embedded cleanly into the leaf core */}
          <path
            d="M17.5 7.5L12 16H17L14.5 24.5L22 14.5H16.5L17.5 7.5Z"
            fill="#D5F477"
            stroke="#123D32"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold tracking-tight text-lg ${
                lightWordmark ? 'text-white' : 'text-[#142721]'
              }`}
            >
              EcoPilot
            </span>
            <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md bg-[#D5F477] text-[#123D32] tracking-wide">
              AI
            </span>
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase font-semibold mt-0.5 ${
              lightWordmark ? 'text-[#D5F477]/80' : 'text-[#718078]'
            }`}
          >
            Smarter energy. Better living.
          </span>
        </div>
      )}
    </div>
  );
};
