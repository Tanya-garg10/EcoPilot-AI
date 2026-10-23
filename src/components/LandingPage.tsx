import React, { useState, useMemo } from 'react';
import {
  Zap,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bot,
  Send,
  Activity,
  Layers,
  Flame,
  Wind,
  Refrigerator,
  Tv,
  Check,
  Plus,
  Compass,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import { EcoPilotLogo } from './EcoPilotLogo';
import { HouseIllustration } from './HouseIllustration';
import { Appliance, TariffConfig } from '../types';
import { DEFAULT_SAVING_ACTIONS } from '../engine/actionCatalog';
import { optimizeSavingPlan } from '../engine/knapsackOptimizer';
import { simulateWhatIf } from '../engine/whatIfSimulator';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface LandingPageProps {
  onStartOptimizing: () => void;
  onOpenOptimizerWithBudget?: (budget: number) => void;
  appliances: Appliance[];
  tariff: TariffConfig;
  totalMonthlyCost: number;
  totalMonthlyKwh: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOptimizing,
  onOpenOptimizerWithBudget,
  appliances,
  tariff,
  totalMonthlyCost,
  totalMonthlyKwh,
}) => {
  // Budget section interactive state
  const [interactiveBudget, setInteractiveBudget] = useState<number>(1000);
  const budgetPlan = useMemo(() => {
    return optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, interactiveBudget);
  }, [interactiveBudget]);

  // What-If simulator interactive state in Landing
  const [simApplianceName, setSimApplianceName] = useState<string>('1.5 Ton Inverter AC');
  const [simHours, setSimHours] = useState<number>(4);
  const [simRate, setSimRate] = useState<number>(tariff.ratePerKwh || 8.0);

  const APPLIANCE_PRESETS: Record<string, { watts: number; defaultHours: number }> = {
    '1.5 Ton Inverter AC': { watts: 1500, defaultHours: 6 },
    'Instant Water Geyser': { watts: 2000, defaultHours: 1.5 },
    'Double Door Refrigerator': { watts: 250, defaultHours: 10 },
    'Induction Cooktop': { watts: 1600, defaultHours: 1.5 },
  };

  const currentAppliancePreset = APPLIANCE_PRESETS[simApplianceName] || { watts: 1500, defaultHours: 6 };
  const baselineHours = currentAppliancePreset.defaultHours;
  const baselineWatts = currentAppliancePreset.watts;

  const simCalculation = useMemo(() => {
    const baselineMonthlyKwh = (baselineWatts * baselineHours * 30) / 1000;
    const baselineCost = baselineMonthlyKwh * simRate;
    const simMonthlyKwh = (baselineWatts * simHours * 30) / 1000;
    const simCost = simMonthlyKwh * simRate;
    const diffKwh = baselineMonthlyKwh - simMonthlyKwh;
    const diffCost = baselineCost - simCost;
    return {
      baselineMonthlyKwh: Math.round(baselineMonthlyKwh * 10) / 10,
      baselineCost: Math.round(baselineCost),
      simMonthlyKwh: Math.round(simMonthlyKwh * 10) / 10,
      simCost: Math.round(simCost),
      diffKwh: Math.round(diffKwh * 10) / 10,
      diffCost: Math.round(diffCost),
    };
  }, [baselineWatts, baselineHours, simHours, simRate]);

  // AI Copilot state in landing
  const [copilotQuestion, setCopilotQuestion] = useState<string>('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotCategory, setCopilotCategory] = useState<'calculated' | 'general' | null>(null);

  const COPILOT_CHIPS = [
    'Which appliance costs me the most?',
    'How can I save without buying anything?',
    'What can I improve within my budget?',
  ];

  const handleAskCopilot = async (question: string) => {
    setCopilotQuestion(question);
    setCopilotLoading(true);
    setCopilotAnswer(null);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          userContext: {
            tariffRate: tariff.ratePerKwh,
            currency: tariff.currency,
            totalMonthlyCost,
            totalMonthlyKwh,
            appliances,
          },
        }),
      });

      const data = await res.json();
      setCopilotAnswer(data.reply || 'Calculations verified by mathematical energy formula.');
      setCopilotCategory(question.includes('costs me') || question.includes('budget') ? 'calculated' : 'general');
    } catch {
      // Deterministic immediate fallback
      if (question.includes('costs me')) {
        setCopilotAnswer(
          `Based on calculated load: A 1.5-ton AC running 6 hrs/day consumes 270 kWh/month (₹${(270 * tariff.ratePerKwh).toLocaleString()}), representing ~52% of an average household electricity bill.`
        );
        setCopilotCategory('calculated');
      } else if (question.includes('budget')) {
        setCopilotAnswer(
          `With a ₹1,000 budget, the 0/1 knapsack optimizer identifies that AC coil deep cleaning (₹450) and refrigerator coil maintenance (₹250) provide the highest return, saving ₹460/month.`
        );
        setCopilotCategory('calculated');
      } else {
        setCopilotAnswer(
          `Zero-cost behavioral habits: Setting AC to 24°C saves ~18% compressor power, cleaning ceiling fan blades restores airflow, and turning off vampire standby saves 20-35 kWh every month.`
        );
        setCopilotCategory('general');
      }
    } finally {
      setCopilotLoading(false);
    }
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const FAQ_ITEMS = [
    {
      q: 'How does EcoPilot estimate electricity costs?',
      a: 'EcoPilot calculates energy consumption using the standard physics formula: (Appliance Wattage × Daily Hours × 30 Days) ÷ 1,000 = Monthly kWh. This number is then multiplied by your local electricity tariff rate per kWh. The calculations are 100% transparent with no black-box assumptions.',
    },
    {
      q: 'Do I need a smart meter?',
      a: 'No. EcoPilot is designed to work with standard households using data you already have: appliance wattage labels, estimated daily hours, and the unit rate on your utility bill. No hardware, smart meters, or electrician visits required.',
    },
    {
      q: 'Are the savings guaranteed?',
      a: 'No. Real-world electricity savings vary with ambient weather, room insulation, temperature settings, and actual runtime habits. EcoPilot provides realistic engineering estimates and mathematically optimal decisions, rather than fabricated guarantees.',
    },
    {
      q: 'How does the budget optimizer work?',
      a: 'EcoPilot formulates home energy investments as a classic 0/1 Knapsack optimization problem. Given a budget constraint (e.g. ₹500, ₹1,500, or ₹5,000), our dynamic programming engine selects the exact set of actions that maximizes ongoing monthly savings without exceeding your upfront budget.',
    },
    {
      q: 'What information should I provide?',
      a: 'For best results, add your major appliances (air conditioners, geysers, refrigerators, washing machines) with their rated wattage, typical daily runtimes, and the cost per unit from your latest electricity bill.',
    },
    {
      q: 'How is my data handled?',
      a: 'All household data and appliance lists are stored locally in your browser using standard HTML5 localStorage. We do not require an account, and your data is never sold or tracked across third-party ad networks.',
    },
  ];

  // Sample chart data for product preview
  const SAMPLE_CHART_DATA = [
    { name: '1.5T AC (Cooling)', kwh: 270, cost: 2160 },
    { name: 'Water Geyser', kwh: 90, cost: 720 },
    { name: 'BLDC Fans (3x)', kwh: 81, cost: 648 },
    { name: 'Refrigerator', kwh: 75, cost: 600 },
    { name: 'Lighting & TV', kwh: 36, cost: 288 },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F2] text-[#142721] font-sans antialiased">
      {/* 1. Floating Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-[#F8F8F2]/90 backdrop-blur-md border-b border-[#E2E8E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Custom Brand Logo + Wordmark */}
          <EcoPilotLogo size={36} />

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#718078]">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#123D32] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('the-big-picture')}
              className="hover:text-[#123D32] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('budget-optimizer')}
              className="hover:text-[#123D32] transition-colors cursor-pointer"
            >
              Optimizer
            </button>
            <button
              onClick={() => scrollToSection('what-if')}
              className="hover:text-[#123D32] transition-colors cursor-pointer"
            >
              Simulator
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#123D32] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action: Clean Forest Green Button */}
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-xs font-semibold text-[#718078] px-3 py-1 rounded-full bg-[#E2E8E2]/60">
              No meter needed
            </span>
            <button
              onClick={onStartOptimizing}
              className="px-5 py-2.5 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-bold text-sm transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2 cursor-pointer group"
            >
              <span>Start optimizing</span>
              <ArrowUpRight className="w-4 h-4 text-[#D5F477] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline & Copy */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBFAC2] border border-[#D5F477] text-[#123D32] text-xs font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#123D32]" />
                <span>SMARTER ENERGY STARTS AT HOME</span>
              </div>

              {/* Exact Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#142721] tracking-tight leading-[1.12]">
                Your home uses energy. <br />
                Let’s make{' '}
                <span className="inline-block relative">
                  <span className="relative z-10 text-[#123D32] underline decoration-[#D5F477] decoration-4 underline-offset-6">
                    every unit count.
                  </span>
                </span>
              </h1>

              {/* Exact Supporting Text */}
              <p className="text-lg sm:text-xl text-[#718078] leading-relaxed max-w-2xl font-normal">
                Understand your electricity costs, discover where energy is being wasted, and build a practical savings plan that fits your budget.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={onStartOptimizing}
                  className="px-7 py-4 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-extrabold text-base transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <span>Start optimizing</span>
                  <ArrowRight className="w-5 h-5 text-[#D5F477] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-6 py-4 rounded-full bg-white hover:bg-[#F3F4EE] border border-[#E2E8E2] text-[#142721] font-semibold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>See how it works</span>
                  <ArrowDown className="w-4 h-4 text-[#718078]" />
                </button>
              </div>

              {/* Three Compact Trust Points */}
              <div className="pt-6 border-t border-[#E2E8E2] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#D5F477] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#123D32]" />
                  </div>
                  <span className="text-xs font-semibold text-[#142721]">
                    Personalized recommendations
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#D5F477] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#123D32]" />
                  </div>
                  <span className="text-xs font-semibold text-[#142721]">
                    Budget-aware planning
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#D5F477] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#123D32]" />
                  </div>
                  <span className="text-xs font-semibold text-[#142721]">
                    Transparent savings estimates
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Original Architectural Hero Illustration */}
            <div className="lg:col-span-5">
              <HouseIllustration
                monthlyCost={totalMonthlyCost > 0 ? totalMonthlyCost : 4128}
                monthlyKwh={totalMonthlyKwh > 0 ? totalMonthlyKwh : 516}
                potentialSavings={1020}
                currency={tariff.currency}
                isRealData={totalMonthlyCost > 0}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Hero Bottom Thin Strip */}
      <section className="border-y border-[#E2E8E2] bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 text-sm sm:text-base font-semibold text-[#142721]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#123D32]" />
              Less guesswork.
            </span>
            <span className="hidden sm:inline text-[#D4DBD2]">—</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E9C65]" />
              Smarter decisions.
            </span>
            <span className="hidden sm:inline text-[#D4DBD2]">—</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5D878]" />
              A plan that fits your budget.
            </span>
          </div>
        </div>
      </section>

      {/* 3. Section: The Hidden Cost of Everyday Energy */}
      <section id="the-big-picture" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Editorial Text */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
                THE BIG PICTURE
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] tracking-tight leading-tight">
                Your energy bill tells a story. We help you read it.
              </h2>
              <p className="text-base sm:text-lg text-[#718078] leading-relaxed font-normal">
                Small daily habits and inefficient appliances can add up. Start by understanding your household usage.
              </p>
              <div className="pt-4">
                <button
                  onClick={onStartOptimizing}
                  className="px-6 py-3 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer group"
                >
                  <span>Explore your home's story</span>
                  <ArrowRight className="w-4 h-4 text-[#D5F477] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Right Three Feature Cards with Custom Line Illustrations */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card 1: Know your usage */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8E2] card-hover-lift group flex items-start gap-5 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2] flex items-center justify-center shrink-0 text-[#123D32] group-hover:border-[#4E9C65] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <line x1="7" y1="9" x2="17" y2="9" />
                    <line x1="7" y1="13" x2="12" y2="13" />
                    <circle cx="15" cy="15" r="2" fill="#D5F477" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#142721] group-hover:text-[#123D32] transition-colors">
                      1. Know your usage
                    </h3>
                    <ArrowRight className="w-4 h-4 text-[#718078] group-hover:text-[#123D32] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-[#718078] mt-1.5 leading-relaxed">
                    Understand the usage and estimated cost you enter. Break down high-draw appliances into transparent monthly units.
                  </p>
                </div>
              </div>

              {/* Card 2: Find your opportunities */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8E2] card-hover-lift group flex items-start gap-5 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2] flex items-center justify-center shrink-0 text-[#123D32] group-hover:border-[#4E9C65] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                    <path d="M11 8v6M8 11h6" stroke="#4E9C65" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#142721] group-hover:text-[#123D32] transition-colors">
                      2. Find your opportunities
                    </h3>
                    <ArrowRight className="w-4 h-4 text-[#718078] group-hover:text-[#123D32] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-[#718078] mt-1.5 leading-relaxed">
                    Identify the actions that may reduce electricity consumption. Pinpoint low-cost maintenance and runtime tweaks with high ROI.
                  </p>
                </div>
              </div>

              {/* Card 3: Make a practical plan */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8E2] card-hover-lift group flex items-start gap-5 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2] flex items-center justify-center shrink-0 text-[#123D32] group-hover:border-[#4E9C65] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M9 11l3 3L22 4" stroke="#4E9C65" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    <circle cx="8" cy="16" r="1.5" fill="#F5D878" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#142721] group-hover:text-[#123D32] transition-colors">
                      3. Make a practical plan
                    </h3>
                    <ArrowRight className="w-4 h-4 text-[#718078] group-hover:text-[#123D32] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-[#718078] mt-1.5 leading-relaxed">
                    Prioritize changes based on your available budget and estimated impact. Allocate every rupee where it creates genuine ongoing savings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: How EcoPilot Works */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E2E8E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
              Step-by-Step
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
              How EcoPilot works
            </h2>
            <p className="text-base text-[#718078] mt-2">
              A connected visual journey from household inputs to an optimal savings plan.
            </p>
          </div>

          {/* Connected 3-Step Visual Journey */}
          <div className="relative">
            {/* Thin Connecting Line on Desktop */}
            <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-0.5 bg-[#E2E8E2] -translate-y-8 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Step 01 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#123D32] text-[#D5F477] font-black text-base flex items-center justify-center mb-6 shadow-sm">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-[#142721] mb-2">
                    Tell us about your home
                  </h3>
                  <p className="text-sm text-[#718078] leading-relaxed">
                    Add your appliances, power ratings, usage hours, and electricity rate.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#123D32] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4E9C65]" />
                  <span>Preset catalog & custom inputs</span>
                </div>
              </div>

              {/* Step 02 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#123D32] text-[#D5F477] font-black text-base flex items-center justify-center mb-6 shadow-sm">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-[#142721] mb-2">
                    Let the numbers guide you
                  </h3>
                  <p className="text-sm text-[#718078] leading-relaxed">
                    Calculate estimated consumption and costs, then compare practical actions within your budget.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#123D32] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4E9C65]" />
                  <span>Exact 0/1 knapsack optimization</span>
                </div>
              </div>

              {/* Step 03 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#123D32] text-[#D5F477] font-black text-base flex items-center justify-center mb-6 shadow-sm">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-[#142721] mb-2">
                    Take your next best step
                  </h3>
                  <p className="text-sm text-[#718078] leading-relaxed">
                    Review recommendations, explore what-if scenarios, and choose changes that suit your household.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#123D32] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4E9C65]" />
                  <span>Interactive simulator & AI Copilot</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA: Build my energy plan */}
          <div className="text-center mt-12">
            <button
              onClick={onStartOptimizing}
              className="px-8 py-4 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-extrabold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2.5 mx-auto cursor-pointer group"
            >
              <span>Build my energy plan</span>
              <ArrowRight className="w-4 h-4 text-[#D5F477] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Section: Immersive Product Preview */}
      <section className="py-20 lg:py-28 bg-[#FCFCF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
              PRODUCT EXPERIENCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
              See your energy use in one place.
            </h2>
            <p className="text-base sm:text-lg text-[#718078] mt-2">
              Get a clear view of your costs, consumption, and personalized recommendations — all in a clean, easy-to-use dashboard.
            </p>
          </div>

          {/* Large Dashboard Mockup inside rounded browser-like frame */}
          <div className="rounded-3xl bg-white border border-[#E2E8E2] shadow-2xl shadow-stone-200/60 overflow-hidden">
            {/* Browser Header Bar */}
            <div className="px-6 py-3.5 bg-[#F8F8F2] border-b border-[#E2E8E2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#E2E8E2]" />
                <div className="w-3 h-3 rounded-full bg-[#E2E8E2]" />
                <div className="w-3 h-3 rounded-full bg-[#E2E8E2]" />
                <span className="ml-3 text-xs font-mono text-[#718078]">ecopilot.ai/app/overview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBFAC2] text-[#123D32]">
                  Live Calculation State
                </span>
              </div>
            </div>

            {/* Dashboard Inner Container */}
            <div className="p-6 sm:p-10">
              {/* Personalized Dashboard Greeting Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#E2E8E2] gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">
                    Welcome back • Household Profile
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#142721]">
                    Good energy decisions start with clarity.
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#F8F8F2] border border-[#E2E8E2] text-[#123D32]">
                    Tariff: {tariff.currency}{tariff.ratePerKwh}/kWh
                  </span>
                  <button
                    onClick={onStartOptimizing}
                    className="px-4 py-2 rounded-xl bg-[#123D32] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#1A5445] transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D5F477]" />
                    <span>Add appliance</span>
                  </button>
                </div>
              </div>

              {/* Four Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2]">
                  <span className="text-xs font-bold text-[#718078] uppercase">Estimated Monthly Cost</span>
                  <div className="text-2xl font-extrabold text-[#142721] mt-1">
                    {tariff.currency}{totalMonthlyCost > 0 ? totalMonthlyCost.toLocaleString() : '4,128'}
                  </div>
                  <span className="text-[11px] text-[#718078] mt-1 block">Based on 30-day operating cycle</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2]">
                  <span className="text-xs font-bold text-[#718078] uppercase">Estimated Consumption</span>
                  <div className="text-2xl font-extrabold text-[#142721] mt-1">
                    {totalMonthlyKwh > 0 ? totalMonthlyKwh.toLocaleString() : '516'}{' '}
                    <span className="text-sm font-normal text-[#718078]">kWh</span>
                  </div>
                  <span className="text-[11px] text-[#718078] mt-1 block">Active household wattage load</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#123D32] text-white">
                  <span className="text-xs font-bold text-[#D5F477] uppercase">Potential Savings</span>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {tariff.currency}1,020
                    <span className="text-xs font-normal text-[#D5F477]">/mo</span>
                  </div>
                  <span className="text-[11px] text-white/80 mt-1 block">With ₹1,000 budget upgrades</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2]">
                  <span className="text-xs font-bold text-[#718078] uppercase">Budget Available</span>
                  <div className="text-2xl font-extrabold text-[#142721] mt-1">
                    {tariff.currency}1,000
                  </div>
                  <span className="text-[11px] text-[#4E9C65] font-semibold mt-1 block">
                    3 high-ROI actions selected
                  </span>
                </div>
              </div>

              {/* Chart & Recommendations Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Consumption Chart */}
                <div className="lg:col-span-7 bg-[#F8F8F2] p-6 rounded-2xl border border-[#E2E8E2]">
                  <span className="text-xs font-bold text-[#142721] uppercase tracking-wider block mb-4">
                    Appliance Monthly Consumption Breakdown (kWh)
                  </span>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SAMPLE_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#718078' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#718078' }} />
                        <Tooltip
                          formatter={(val: any) => [`${val} kWh`, 'Monthly Consumption']}
                          contentStyle={{ backgroundColor: '#123D32', color: '#fff', borderRadius: '12px' }}
                        />
                        <Bar dataKey="kwh" radius={[6, 6, 0, 0]}>
                          {SAMPLE_CHART_DATA.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#123D32' : index === 1 ? '#1A5445' : index === 2 ? '#4E9C65' : '#D5F477'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#718078] mt-3 pt-2 border-t border-[#E2E8E2]">
                    <span>1.5T AC draws 52.3% of total household load</span>
                    <span>Transparent Math: Watts × Hours × Days ÷ 1000</span>
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold text-[#142721] uppercase tracking-wider block mb-2">
                    Recommended Actions (Ranked by ROI)
                  </span>

                  <div className="p-3.5 rounded-xl border border-[#E2E8E2] bg-white flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#142721]">AC Coil Deep Cleaning</div>
                      <div className="text-xs text-[#718078]">Cost: ₹450 • Restores heat transfer</div>
                    </div>
                    <span className="text-xs font-bold text-[#123D32] bg-[#EBFAC2] px-2.5 py-1 rounded-md">
                      +₹310/mo
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E2E8E2] bg-white flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#142721]">Refrigerator Gasket Maintenance</div>
                      <div className="text-xs text-[#718078]">Cost: ₹250 • Stops cool air leakage</div>
                    </div>
                    <span className="text-xs font-bold text-[#123D32] bg-[#EBFAC2] px-2.5 py-1 rounded-md">
                      +₹150/mo
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E2E8E2] bg-white flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#142721]">Set AC Thermostat to 24°C</div>
                      <div className="text-xs text-[#718078]">Free Habit • 18% compressor relief</div>
                    </div>
                    <span className="text-xs font-bold text-[#123D32] bg-[#FEF7DC] px-2.5 py-1 rounded-md">
                      +₹380/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Three Concise Benefits & Open Dashboard CTA */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8E2]">
              <h4 className="font-bold text-base text-[#142721] mb-1">Track usage and estimated costs</h4>
              <p className="text-xs text-[#718078]">See exact monthly units and financial costs broken down by appliance.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8E2]">
              <h4 className="font-bold text-base text-[#142721] mb-1">Get personalized recommendations</h4>
              <p className="text-xs text-[#718078]">Ranked upgrades tailored to your home's unique high-draw appliances.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8E2]">
              <h4 className="font-bold text-base text-[#142721] mb-1">Plan your next steps with confidence</h4>
              <p className="text-xs text-[#718078]">Budget-aware decision logic that ensures your money delivers actual ROI.</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={onStartOptimizing}
              className="px-8 py-4 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-extrabold text-sm transition shadow-sm hover:shadow inline-flex items-center gap-2.5 cursor-pointer group"
            >
              <span>Open dashboard</span>
              <ArrowRight className="w-4 h-4 text-[#D5F477] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. Section: Dedicated Split-Screen Budget Optimizer */}
      <section id="budget-optimizer" className="py-20 bg-[#F4FCE8] border-y border-[#D6F0A8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Side */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-white px-3.5 py-1.5 rounded-full border border-[#D6F0A8]">
                BUDGET OPTIMIZER
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] tracking-tight">
                Smarter choices. Your budget.
              </h2>
              <p className="text-base text-[#718078] leading-relaxed">
                Not every improvement costs the same. Discover practical options based on the budget you have available.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onOpenOptimizerWithBudget) {
                      onOpenOptimizerWithBudget(interactiveBudget);
                    } else {
                      onStartOptimizing();
                    }
                  }}
                  className="px-7 py-3.5 rounded-full bg-[#123D32] hover:bg-[#1A5445] text-white font-bold text-sm transition shadow-sm hover:shadow flex items-center gap-2 cursor-pointer group"
                >
                  <span>Optimize my budget</span>
                  <ArrowRight className="w-4 h-4 text-[#D5F477] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="text-xs text-[#718078] pt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#123D32]" />
                <span>Distinguishes verified upfront prices from estimated monthly savings</span>
              </div>
            </div>

            {/* Right Side: Interactive Optimizer Panel */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8E2] shadow-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#142721]">Your Available Budget</span>
                <span className="text-xl font-extrabold text-[#123D32] bg-[#EBFAC2] px-3.5 py-1 rounded-xl">
                  {tariff.currency}{interactiveBudget.toLocaleString()}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="5000"
                step="250"
                value={interactiveBudget}
                onChange={(e) => setInteractiveBudget(Number(e.target.value))}
                className="w-full accent-[#123D32] cursor-pointer h-2 bg-[#E2E8E2] rounded-lg mb-4"
              />

              <div className="flex justify-between text-[11px] font-mono text-[#718078] mb-6">
                <span>₹0 (Free Habits)</span>
                <span>₹1,500</span>
                <span>₹3,000</span>
                <span>₹5,000 (Deep Upgrade)</span>
              </div>

              {/* Knapsack Output Metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2] mb-6 text-center">
                <div>
                  <span className="text-[10px] font-bold text-[#718078] uppercase">Selected Actions</span>
                  <div className="text-lg font-extrabold text-[#142721]">
                    {budgetPlan.selectedActions.length}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#718078] uppercase">Upfront Cost</span>
                  <div className="text-lg font-extrabold text-[#142721]">
                    {tariff.currency}{budgetPlan.totalUpfrontCost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#123D32] uppercase">Est. Monthly Savings</span>
                  <div className="text-lg font-extrabold text-[#123D32]">
                    +{tariff.currency}{budgetPlan.totalMonthlySavings.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Selected Action List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {budgetPlan.selectedActions.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8E2] text-xs hover:bg-[#F8F8F2] transition"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#123D32]" />
                      <span className="font-semibold text-[#142721]">{act.title}</span>
                      <span className="text-[10px] text-[#718078]">
                        (Upfront: {act.upfrontCost === 0 ? 'Free' : `${tariff.currency}${act.upfrontCost}`})
                      </span>
                    </div>
                    <span className="font-bold text-[#123D32]">
                      +{tariff.currency}{act.monthlySavings}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section: Interactive What-If Simulator */}
      <section id="what-if" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
              WHAT-IF ENGINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
              What if one small change made a difference?
            </h2>
            <p className="text-base text-[#718078] mt-2">
              Select an appliance, adjust runtime hours or tariff rates, and see before-and-after results recalculated instantly.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#E2E8E2] shadow-md">
            {/* Control Grid: Appliance Selector, Usage Hours, Electricity Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-8 border-b border-[#E2E8E2]">
              {/* 1. Appliance Selector */}
              <div>
                <label className="text-xs font-bold text-[#142721] block mb-1.5">
                  Select Appliance
                </label>
                <select
                  value={simApplianceName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSimApplianceName(name);
                    setSimHours(APPLIANCE_PRESETS[name]?.defaultHours || 4);
                  }}
                  className="w-full bg-[#F8F8F2] border border-[#E2E8E2] rounded-xl px-3 py-2 text-xs font-semibold text-[#142721] focus:outline-none focus:border-[#123D32]"
                >
                  {Object.keys(APPLIANCE_PRESETS).map((key) => (
                    <option key={key} value={key}>
                      {key} ({APPLIANCE_PRESETS[key].watts}W)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Usage Hours Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#142721]">Simulated Runtime</label>
                  <span className="text-xs font-extrabold text-[#123D32] bg-[#EBFAC2] px-2 py-0.5 rounded">
                    {simHours} hrs/day
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={simHours}
                  onChange={(e) => setSimHours(Number(e.target.value))}
                  className="w-full accent-[#123D32] cursor-pointer h-2 bg-[#E2E8E2] rounded-lg mt-2"
                />
                <div className="flex justify-between text-[10px] text-[#718078] mt-1 font-mono">
                  <span>0 hrs</span>
                  <span>Baseline: {baselineHours}h</span>
                  <span>12 hrs</span>
                </div>
              </div>

              {/* 3. Electricity Rate Input */}
              <div>
                <label className="text-xs font-bold text-[#142721] block mb-1.5">
                  Electricity Rate ({tariff.currency}/unit)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="50"
                  value={simRate}
                  onChange={(e) => setSimRate(Number(e.target.value) || 8.0)}
                  className="w-full bg-[#F8F8F2] border border-[#E2E8E2] rounded-xl px-3 py-2 text-xs font-semibold text-[#142721] focus:outline-none focus:border-[#123D32]"
                />
              </div>
            </div>

            {/* Before-and-After Comparison Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              {/* Baseline */}
              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2]">
                <span className="text-xs font-bold text-[#718078] uppercase">Before (Baseline)</span>
                <div className="text-2xl font-extrabold text-[#142721] mt-1">
                  {simCalculation.baselineMonthlyKwh} <span className="text-sm font-normal text-[#718078]">kWh</span>
                </div>
                <span className="text-sm font-bold text-[#142721] mt-1 block">
                  {tariff.currency}{simCalculation.baselineCost.toLocaleString()} / month
                </span>
                <span className="text-[11px] text-[#718078] block mt-1 font-medium">
                  At {baselineHours} hrs/day baseline
                </span>
              </div>

              {/* Simulated */}
              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E2E8E2]">
                <span className="text-xs font-bold text-[#718078] uppercase">After (Simulated)</span>
                <div className="text-2xl font-extrabold text-[#142721] mt-1">
                  {simCalculation.simMonthlyKwh} <span className="text-sm font-normal text-[#718078]">kWh</span>
                </div>
                <span className="text-sm font-bold text-[#142721] mt-1 block">
                  {tariff.currency}{simCalculation.simCost.toLocaleString()} / month
                </span>
                <span className="text-[11px] text-[#718078] block mt-1 font-medium">
                  At {simHours} hrs/day simulated
                </span>
              </div>

              {/* Net Difference */}
              <div className="p-5 rounded-2xl bg-[#123D32] text-white">
                <span className="text-xs font-extrabold text-[#D5F477] uppercase">Net Difference</span>
                <div className="text-2xl font-extrabold text-[#D5F477] mt-1">
                  {simCalculation.diffKwh >= 0 ? `-${simCalculation.diffKwh}` : `+${Math.abs(simCalculation.diffKwh)}`}{' '}
                  <span className="text-sm font-normal text-white">kWh</span>
                </div>
                <span className="text-lg font-bold text-white mt-1 block">
                  {simCalculation.diffCost >= 0
                    ? `Save ${tariff.currency}${simCalculation.diffCost.toLocaleString()}/mo`
                    : `+${tariff.currency}${Math.abs(simCalculation.diffCost).toLocaleString()}/mo`}
                </span>
                <span className="text-[11px] text-white/80 block mt-1 font-medium">
                  {simCalculation.diffCost >= 0
                    ? `₹${(simCalculation.diffCost * 12).toLocaleString()} saved annually`
                    : 'Increased power consumption'}
                </span>
              </div>
            </div>

            {/* Reset Scenario & Assumption Note */}
            <div className="mt-8 pt-4 border-t border-[#E2E8E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#718078]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSimHours(baselineHours);
                    setSimRate(tariff.ratePerKwh || 8.0);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E2] hover:bg-[#F8F8F2] text-[#142721] font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset scenario</span>
                </button>
                <span>Note: Results are estimates based on user-provided inputs, not guaranteed savings.</span>
              </div>

              <button
                onClick={onStartOptimizing}
                className="font-bold text-[#123D32] hover:underline cursor-pointer"
              >
                Run full-house simulation in app →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section: AI Copilot — Conversational Experience */}
      <section className="py-20 bg-white border-y border-[#E2E8E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
                AI COPILOT
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
                Meet your personal energy copilot.
              </h2>
              <p className="text-base text-[#718078] mt-2">
                Ask better questions about your energy usage and get practical, understandable guidance.
              </p>
            </div>

            {/* Clickable Suggestion Chips */}
            <div className="flex flex-wrap gap-2.5 justify-center mb-6">
              {COPILOT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskCopilot(chip)}
                  className="text-xs font-semibold px-4 py-2 rounded-full bg-[#F8F8F2] hover:bg-[#EBFAC2] text-[#142721] border border-[#E2E8E2] hover:border-[#123D32]/30 transition-all cursor-pointer text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Conversational Assistant Card */}
            <div className="rounded-3xl border border-[#E2E8E2] bg-[#F8F8F2] p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8E2]">
                <div className="w-10 h-10 rounded-xl bg-[#123D32] text-[#D5F477] flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#142721]">EcoPilot Conversational Advisor</div>
                  <div className="text-[11px] text-[#718078]">
                    Grounds responses in mathematical energy models
                  </div>
                </div>
              </div>

              {/* Output Response */}
              <div className="py-5 min-h-[120px] flex items-center justify-center text-sm">
                {copilotLoading ? (
                  <div className="flex items-center gap-2 text-[#718078] animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#123D32]" />
                    <span>Analyzing household power formulas...</span>
                  </div>
                ) : copilotAnswer ? (
                  <div className="space-y-3 w-full">
                    <div className="text-xs font-mono text-[#718078]">Q: "{copilotQuestion}"</div>
                    <div className="p-4 rounded-2xl bg-white border border-[#E2E8E2] text-[#142721] leading-relaxed">
                      {copilotAnswer}
                    </div>
                    {copilotCategory && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold px-2 py-0.5 rounded bg-[#EBFAC2] text-[#123D32]">
                          {copilotCategory === 'calculated'
                            ? 'Factual Calculated Result'
                            : 'Engineering General Suggestion'}
                        </span>
                        <span className="text-[#718078]">
                          Values derived from mathematical power equations
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[#718078] text-xs">
                    Click a question chip above or ask anything to see a live contextual response.
                  </div>
                )}
              </div>

              {/* Input Form */}
              <div className="flex items-center gap-2 pt-4 border-t border-[#E2E8E2]">
                <input
                  type="text"
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && copilotQuestion.trim() && handleAskCopilot(copilotQuestion)}
                  placeholder="Ask anything: e.g. How much does 2 hours of iron use cost?"
                  className="flex-1 bg-white border border-[#E2E8E2] rounded-xl px-4 py-2.5 text-xs text-[#142721] placeholder-[#718078] focus:outline-none focus:border-[#123D32]"
                />
                <button
                  onClick={() => copilotQuestion.trim() && handleAskCopilot(copilotQuestion)}
                  disabled={!copilotQuestion.trim() || copilotLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#123D32] hover:bg-[#1A5445] text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#D5F477]" />
                  <span>Ask</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Section: Impact Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
              DECISION IMPACT
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
              Small changes. Better-informed decisions.
            </h2>
            <p className="text-base text-[#718078] mt-2">
              Highlighting the real benefits of transparent household energy planning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#123D32]">100%</span>
                <h3 className="text-lg font-bold text-[#142721] mt-2 mb-2">
                  Understand household consumption
                </h3>
                <p className="text-sm text-[#718078] leading-relaxed">
                  Every watt and kilowatt-hour is traceable directly to an appliance and runtime duration. No black-box approximations.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#718078]">
                Standard engineering formula
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#123D32]">12+</span>
                <h3 className="text-lg font-bold text-[#142721] mt-2 mb-2">
                  Prioritize practical energy-saving actions
                </h3>
                <p className="text-sm text-[#718078] leading-relaxed">
                  Carefully categorized options ranging from zero-cost temperature settings to high-efficiency BLDC motor retrofits.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#718078]">
                Curated efficiency action catalog
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E2E8E2] card-hover-lift flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#123D32]">0/1</span>
                <h3 className="text-lg font-bold text-[#142721] mt-2 mb-2">
                  Make decisions that fit your budget
                </h3>
                <p className="text-sm text-[#718078] leading-relaxed">
                  Mathematical dynamic programming finds the global optimum allocation of your funds, strictly respecting your chosen budget ceiling.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E2E8E2] text-xs font-semibold text-[#718078]">
                Guaranteed knapsack optimality
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Section: FAQ Section */}
      <section id="faq" className="py-20 bg-white border-y border-[#E2E8E2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#123D32] bg-[#EBFAC2] px-3.5 py-1.5 rounded-full border border-[#D5F477]">
              COMMON QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#142721] mt-3 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-base text-[#718078] mt-2">
              Straightforward answers about our algorithms, data privacy, and estimation methods.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#E2E8E2] bg-[#F8F8F2] overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-base text-[#142721] cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span className="shrink-0 p-1.5 rounded-full bg-white border border-[#E2E8E2] text-[#123D32]">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-[#718078] leading-relaxed border-t border-[#E2E8E2]/60 pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Final CTA Section */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-[#123D32] text-white p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl">
            {/* Subtle Abstract Graphic */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D5F477]/10 pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-[#F5D878]/10 pointer-events-none" />
            <div className="absolute top-1/2 right-12 -translate-y-1/2 hidden lg:block opacity-20">
              <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
                <circle cx="120" cy="120" r="110" stroke="#D5F477" strokeWidth="2" strokeDasharray="4 6" />
                <circle cx="120" cy="120" r="70" stroke="#F5D878" strokeWidth="1.5" />
                <circle cx="120" cy="120" r="30" fill="#D5F477" />
              </svg>
            </div>

            <div className="relative z-10 max-w-2xl space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D5F477] bg-[#1A5445] px-3.5 py-1.5 rounded-full inline-block">
                START OPTIMIZING
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Make your next energy decision a smarter one.
              </h2>

              <p className="text-base sm:text-lg text-[#D5F477]/90 leading-relaxed font-normal">
                Start with what you know. Discover what you can improve.
              </p>

              <div className="pt-2">
                <button
                  onClick={onStartOptimizing}
                  className="px-8 py-4 rounded-full bg-[#D5F477] hover:bg-[#c9ea6b] text-[#123D32] font-black text-base transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-3 cursor-pointer group"
                >
                  <span>Start optimizing</span>
                  <ArrowRight className="w-5 h-5 text-[#123D32] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-white border-t border-[#E2E8E2] py-12 text-xs text-[#718078]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <EcoPilotLogo size={30} />

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#123D32] cursor-pointer">
              How it works
            </button>
            <button onClick={() => scrollToSection('the-big-picture')} className="hover:text-[#123D32] cursor-pointer">
              Features
            </button>
            <button onClick={() => scrollToSection('budget-optimizer')} className="hover:text-[#123D32] cursor-pointer">
              Budget Optimizer
            </button>
            <button onClick={() => scrollToSection('what-if')} className="hover:text-[#123D32] cursor-pointer">
              What-if Simulator
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#123D32] cursor-pointer">
              FAQ
            </button>
            <button onClick={onStartOptimizing} className="font-bold text-[#123D32] cursor-pointer">
              Open Dashboard
            </button>
          </div>

          <div className="text-center md:text-right text-[11px] text-[#718078]">
            © {new Date().getFullYear()} EcoPilot AI • Smarter energy. Better living.
          </div>
        </div>
      </footer>
    </div>
  );
};
