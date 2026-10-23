import React from 'react';
import { Zap, TrendingDown, Sun, Sparkles, Home } from 'lucide-react';

interface HouseIllustrationProps {
  monthlyCost?: number;
  monthlyKwh?: number;
  potentialSavings?: number;
  currency?: string;
  isRealData?: boolean;
}

export const HouseIllustration: React.FC<HouseIllustrationProps> = ({
  monthlyCost = 4128,
  monthlyKwh = 516,
  potentialSavings = 1020,
  currency = '₹',
  isRealData = false,
}) => {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-[#F5D979]/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-[#C9F36A]/20 blur-3xl pointer-events-none" />

      {/* Main Illustration Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white to-[#FDFDFB] border border-[#E5E9E4] p-6 sm:p-8 shadow-xl shadow-stone-200/50 overflow-hidden">
        {/* Fine background orbit lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[380px] h-[380px] rounded-full border border-dashed border-[#173F35]/15 animate-orbit" />
          <div className="absolute w-[280px] h-[280px] rounded-full border border-[#173F35]/10" />
        </div>

        {/* Glowing Sun Energy Disc */}
        <div className="absolute top-8 right-12 w-28 h-28 rounded-full bg-gradient-to-tr from-[#F5D979] to-[#FFF1A8] opacity-85 shadow-lg shadow-amber-200/50 flex items-center justify-center animate-sun-glow">
          <div className="w-20 h-20 rounded-full border border-white/60 flex items-center justify-center">
            <Sun className="w-8 h-8 text-[#173F35]/80 opacity-70" />
          </div>
        </div>

        {/* House Architectural SVG Illustration */}
        <div className="relative z-10 pt-4 pb-2 flex justify-center">
          <svg
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-[290px] h-auto drop-shadow-sm"
          >
            {/* Ground line & subtle shadow */}
            <ellipse cx="160" cy="208" rx="140" ry="8" fill="#E8EDE5" />

            {/* Trees & Foliage */}
            <path
              d="M45 204C45 170 65 155 65 155C65 155 85 170 85 204H45Z"
              fill="#235447"
              opacity="0.85"
            />
            <path
              d="M75 204C75 180 90 170 90 170C90 170 105 180 105 204H75Z"
              fill="#C9F36A"
              opacity="0.9"
            />
            <path
              d="M245 204C245 178 260 166 260 166C260 166 275 178 275 204H245Z"
              fill="#173F35"
              opacity="0.9"
            />

            {/* House Main Body */}
            <rect
              x="95"
              y="110"
              width="135"
              height="94"
              rx="4"
              fill="#FFFFFF"
              stroke="#173F35"
              strokeWidth="2.5"
            />

            {/* Contemporary Angled Roof */}
            <path
              d="M85 112L162 55L240 112H85Z"
              fill="#173F35"
              stroke="#173F35"
              strokeWidth="2"
            />

            {/* Solar Panels on Roof */}
            <path
              d="M125 102L162 75L178 88L140 115H125V102Z"
              fill="#235447"
              stroke="#C9F36A"
              strokeWidth="1.2"
            />
            <line x1="144" y1="88" x2="159" y2="102" stroke="#C9F36A" strokeWidth="1" strokeDasharray="2 1" />
            <line x1="135" y1="95" x2="150" y2="109" stroke="#C9F36A" strokeWidth="1" strokeDasharray="2 1" />

            {/* Front Door */}
            <rect
              x="148"
              y="152"
              width="28"
              height="52"
              rx="2"
              fill="#F5D979"
              stroke="#173F35"
              strokeWidth="2"
            />
            <circle cx="154" cy="178" r="2" fill="#173F35" />

            {/* Windows with warm indoor light */}
            <rect
              x="110"
              y="126"
              width="26"
              height="26"
              rx="2"
              fill="#FEF7DC"
              stroke="#173F35"
              strokeWidth="1.8"
            />
            <line x1="123" y1="126" x2="123" y2="152" stroke="#173F35" strokeWidth="1.2" />
            <line x1="110" y1="139" x2="136" y2="139" stroke="#173F35" strokeWidth="1.2" />

            <rect
              x="188"
              y="126"
              width="26"
              height="26"
              rx="2"
              fill="#FEF7DC"
              stroke="#173F35"
              strokeWidth="1.8"
            />
            <line x1="201" y1="126" x2="201" y2="152" stroke="#173F35" strokeWidth="1.2" />
            <line x1="188" y1="139" x2="214" y2="139" stroke="#173F35" strokeWidth="1.2" />

            {/* Upstairs Clerestory Window */}
            <circle cx="162" cy="85" r="9" fill="#FEF7DC" stroke="#173F35" strokeWidth="1.8" />
            <line x1="162" y1="76" x2="162" y2="94" stroke="#173F35" strokeWidth="1" />
            <line x1="153" y1="85" x2="171" y2="85" stroke="#173F35" strokeWidth="1" />

            {/* Animated Energy Flow Lines (House to UI Insights) */}
            <path
              d="M176 178 Q220 190 260 150"
              stroke="#C9F36A"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <path
              d="M110 178 Q70 190 35 150"
              stroke="#F5D979"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Floating UI Card 1: Monthly Consumption */}
        <div className="absolute top-5 left-4 sm:left-6 bg-white/95 backdrop-blur-sm border border-[#E5E9E4] rounded-2xl p-3 shadow-md shadow-stone-200/40 animate-float max-w-[170px]">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#69766F] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#173F35]" />
            <span>Monthly Usage</span>
          </div>
          <div className="text-base font-extrabold text-[#172C26] tracking-tight">
            {monthlyKwh.toLocaleString()} <span className="text-xs font-normal text-[#69766F]">kWh</span>
          </div>
          <div className="text-[10px] text-[#69766F] mt-0.5">
            {isRealData ? 'Active calculation' : 'Sample household avg'}
          </div>
        </div>

        {/* Floating UI Card 2: Estimated Bill */}
        <div className="absolute top-24 -right-1 sm:right-3 bg-white/95 backdrop-blur-sm border border-[#E5E9E4] rounded-2xl p-3 shadow-md shadow-stone-200/40 animate-float-delayed max-w-[175px]">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#69766F] uppercase tracking-wider mb-1">
            <Zap className="w-3 h-3 text-[#173F35]" />
            <span>Estimated Cost</span>
          </div>
          <div className="text-base font-extrabold text-[#173F35] tracking-tight">
            {currency}{monthlyCost.toLocaleString()}
            <span className="text-xs font-normal text-[#69766F]">/mo</span>
          </div>
          <div className="text-[10px] text-[#69766F] mt-0.5">
            {isRealData ? 'From tariff rate' : 'Standard ₹8/unit rate'}
          </div>
        </div>

        {/* Floating UI Card 3: Potential Savings */}
        <div className="absolute bottom-4 left-4 sm:left-8 bg-[#173F35] text-white rounded-2xl p-3 shadow-lg shadow-[#173F35]/20 animate-float max-w-[190px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#C9F36A] uppercase tracking-wider mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Potential Savings</span>
          </div>
          <div className="text-base font-extrabold text-white tracking-tight">
            {currency}{potentialSavings.toLocaleString()}
            <span className="text-xs font-normal text-[#C9F36A]">/month</span>
          </div>
          <div className="text-[10px] text-white/80 mt-0.5">
            {isRealData ? 'Identified in plan' : 'Sample 0/1 knapsack plan'}
          </div>
        </div>

        {/* Transparent bottom badge */}
        <div className="relative z-10 text-center mt-6 pt-3 border-t border-[#E5E9E4]/60">
          <span className="text-[11px] font-medium text-[#69766F] inline-flex items-center gap-1.5 bg-[#F8F8F2] px-3 py-1 rounded-full border border-[#E5E9E4]">
            <Sparkles className="w-3 h-3 text-[#173F35]" />
            <span>Values shown are illustrative samples until you enter your appliances</span>
          </span>
        </div>
      </div>
    </div>
  );
};
