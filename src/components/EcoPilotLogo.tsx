import React from 'react';

interface EcoPilotLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  lightWordmark?: boolean;
}

export const EcoPilotLogo: React.FC<EcoPilotLogoProps> = ({
  className = '',
  size = 32,
  showWordmark = true,
  lightWordmark = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Integrated Leaf + Sun Rays */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-[#173F35] shadow-sm overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle sun arc */}
          <circle cx="16" cy="16" r="12" stroke="#F5D979" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
          <circle cx="21" cy="11" r="3" fill="#F5D979" />
          {/* Modern stylized leaf with energy spine */}
          <path
            d="M9 23C9 23 11 12 23 9C23 9 22 20 12 23C10.5 23.4 9 23 9 23Z"
            fill="#C9F36A"
          />
          {/* Internal spine line */}
          <path
            d="M10.5 21.5C13 18.5 17 15 21.5 10.5"
            stroke="#173F35"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span
              className={`font-extrabold tracking-tight text-lg ${
                lightWordmark ? 'text-white' : 'text-[#172C26]'
              }`}
            >
              EcoPilot
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[#C9F36A] text-[#173F35] tracking-wide">
              AI
            </span>
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase font-medium mt-0.5 ${
              lightWordmark ? 'text-[#C9F36A]/80' : 'text-[#69766F]'
            }`}
          >
            Household Energy
          </span>
        </div>
      )}
    </div>
  );
};
