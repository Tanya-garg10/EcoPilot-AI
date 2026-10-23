import React from 'react';
import { Zap, TrendingDown, Sun, Sparkles, Activity } from 'lucide-react';

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
      <div className="absolute -top-12 -right-12 w-80 h-80 rounded-full bg-[#F5D878]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-80 h-80 rounded-full bg-[#D5F477]/25 blur-3xl pointer-events-none" />

      {/* Main Illustration Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white to-[#FCFCF9] border border-[#E2E8E2] p-6 sm:p-8 shadow-xl shadow-stone-200/40 overflow-hidden">
        {/* Fine background orbit paths */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[390px] h-[390px] rounded-full border border-dashed border-[#123D32]/15 animate-orbit" />
          <div className="absolute w-[270px] h-[270px] rounded-full border border-[#123D32]/10" />
        </div>

        {/* Glowing Sun Energy Disc */}
        <div className="absolute top-6 right-10 w-28 h-28 rounded-full bg-gradient-to-tr from-[#F5D878] to-[#FFF4B8] shadow-lg shadow-amber-200/40 flex items-center justify-center animate-sun-glow">
          <div className="w-20 h-20 rounded-full border border-white/70 flex items-center justify-center bg-white/20 backdrop-blur-xs">
            <Sun className="w-8 h-8 text-[#123D32]/75" />
          </div>
        </div>

        {/* House Architectural SVG Illustration */}
        <div className="relative z-10 pt-6 pb-2 flex justify-center">
          <svg
            viewBox="0 0 340 230"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-[310px] h-auto drop-shadow-sm"
          >
            {/* Ground line & landscaping base */}
            <ellipse cx="170" cy="216" rx="150" ry="9" fill="#E2EBE0" />

            {/* Lush Greenery & Modern Landscape Trees */}
            <path
              d="M38 214C38 174 60 156 60 156C60 156 82 174 82 214H38Z"
              fill="#123D32"
              opacity="0.9"
            />
            <path
              d="M70 214C70 186 86 172 86 172C86 172 102 186 102 214H70Z"
              fill="#4E9C65"
              opacity="0.85"
            />
            <path
              d="M255 214C255 182 272 168 272 168C272 168 289 182 289 214H255Z"
              fill="#123D32"
              opacity="0.9"
            />
            <path
              d="M280 214C280 192 294 180 294 180C294 180 308 192 308 214H280Z"
              fill="#D5F477"
              opacity="0.75"
            />

            {/* House Foundation & Walls */}
            <rect
              x="98"
              y="114"
              width="144"
              height="98"
              rx="4"
              fill="#FFFFFF"
              stroke="#123D32"
              strokeWidth="2.5"
            />

            {/* Contemporary Gable Roof */}
            <path
              d="M86 116L170 54L254 116H86Z"
              fill="#123D32"
              stroke="#123D32"
              strokeWidth="2"
            />

            {/* Rooftop Solar PV Array */}
            <path
              d="M130 106L170 76L188 90L148 120H130V106Z"
              fill="#1A5445"
              stroke="#D5F477"
              strokeWidth="1.2"
            />
            <line x1="150" y1="90" x2="167" y2="105" stroke="#D5F477" strokeWidth="1" strokeDasharray="2 1" />
            <line x1="140" y1="98" x2="157" y2="113" stroke="#D5F477" strokeWidth="1" strokeDasharray="2 1" />

            {/* Front Door with Warm Solar Highlight */}
            <rect
              x="155"
              y="158"
              width="30"
              height="54"
              rx="2"
              fill="#F5D878"
              stroke="#123D32"
              strokeWidth="2"
            />
            <circle cx="162" cy="186" r="2" fill="#123D32" />

            {/* Architectural Windows with Warm Interior Ambient Glow */}
            <rect
              x="114"
              y="132"
              width="28"
              height="28"
              rx="3"
              fill="#FEF7DC"
              stroke="#123D32"
              strokeWidth="1.8"
            />
            <line x1="128" y1="132" x2="128" y2="160" stroke="#123D32" strokeWidth="1.2" />
            <line x1="114" y1="146" x2="142" y2="146" stroke="#123D32" strokeWidth="1.2" />

            <rect
              x="198"
              y="132"
              width="28"
              height="28"
              rx="3"
              fill="#FEF7DC"
              stroke="#123D32"
              strokeWidth="1.8"
            />
            <line x1="212" y1="132" x2="212" y2="160" stroke="#123D32" strokeWidth="1.2" />
            <line x1="198" y1="146" x2="226" y2="146" stroke="#123D32" strokeWidth="1.2" />

            {/* Upper Clerestory Round Window */}
            <circle cx="170" cy="88" r="10" fill="#FEF7DC" stroke="#123D32" strokeWidth="1.8" />
            <line x1="170" y1="78" x2="170" y2="98" stroke="#123D32" strokeWidth="1" />
            <line x1="160" y1="88" x2="180" y2="88" stroke="#123D32" strokeWidth="1" />

            {/* Flowing Energy Curves from Solar Panel to Insight Cards */}
            <path
              d="M170 76 Q230 40 280 65"
              stroke="#D5F477"
              strokeWidth="2"
              className="animate-energy-flow"
              fill="none"
            />
            <path
              d="M130 106 Q60 80 40 120"
              stroke="#4E9C65"
              strokeWidth="2"
              className="animate-energy-flow"
              fill="none"
            />
            <path
              d="M185 186 Q230 200 270 170"
              stroke="#F5D878"
              strokeWidth="2"
              className="animate-energy-flow"
              fill="none"
            />
          </svg>
        </div>

        {/* Floating UI Card 1: Estimated Electricity Usage */}
        <div className="absolute top-5 left-4 sm:left-6 bg-white/95 backdrop-blur-md border border-[#E2E8E2] rounded-2xl p-3.5 shadow-md shadow-stone-200/50 animate-float max-w-[175px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#718078] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#123D32]" />
            <span>Monthly Usage</span>
          </div>
          <div className="text-base font-extrabold text-[#142721] tracking-tight">
            {monthlyKwh.toLocaleString()} <span className="text-xs font-normal text-[#718078]">kWh</span>
          </div>
          <div className="text-[10px] text-[#718078] mt-0.5 font-medium">
            {isRealData ? 'From active inventory' : 'Typical 3-BHK home'}
          </div>
        </div>

        {/* Floating UI Card 2: Estimated Monthly Electricity Cost */}
        <div className="absolute top-24 -right-1 sm:right-3 bg-white/95 backdrop-blur-md border border-[#E2E8E2] rounded-2xl p-3.5 shadow-md shadow-stone-200/50 animate-float-delayed max-w-[180px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#718078] uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5 text-[#123D32]" />
            <span>Estimated Cost</span>
          </div>
          <div className="text-base font-extrabold text-[#123D32] tracking-tight">
            {currency}{monthlyCost.toLocaleString()}
            <span className="text-xs font-normal text-[#718078]">/mo</span>
          </div>
          <div className="text-[10px] text-[#718078] mt-0.5 font-medium">
            {isRealData ? 'Calculated with tariff' : 'Standard ₹8/unit rate'}
          </div>
        </div>

        {/* Floating UI Card 3: Potential Monthly Savings */}
        <div className="absolute bottom-4 left-4 sm:left-8 bg-[#123D32] text-white rounded-2xl p-3.5 shadow-xl shadow-[#123D32]/20 animate-float max-w-[195px]">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#D5F477] uppercase tracking-wider mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Potential Savings</span>
          </div>
          <div className="text-base font-extrabold text-white tracking-tight">
            {currency}{potentialSavings.toLocaleString()}
            <span className="text-xs font-normal text-[#D5F477]">/month</span>
          </div>
          <div className="text-[10px] text-white/80 mt-0.5 font-medium">
            {isRealData ? 'Identified by optimizer' : '0/1 Knapsack optimal'}
          </div>
        </div>

        {/* Bottom Transparent Badge */}
        <div className="relative z-10 text-center mt-6 pt-3 border-t border-[#E2E8E2]/70">
          <span className="text-[11px] font-semibold text-[#718078] inline-flex items-center gap-1.5 bg-[#F8F8F2] px-3.5 py-1 rounded-full border border-[#E2E8E2]">
            <Sparkles className="w-3 h-3 text-[#123D32]" />
            <span>{isRealData ? 'Populated with your real appliance inventory' : 'Sample household estimates • No smart meter required'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
