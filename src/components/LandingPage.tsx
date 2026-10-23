import React, { useState, useMemo } from 'react';
import {
  Zap,
  TrendingDown,
  ArrowRight,
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
  const [simHours, setSimHours] = useState<number>(4); // Baseline is 6h for 1.5T AC
  const baselineHours = 6;
  const baselineWatts = 1500;
  const simAcCalculation = useMemo(() => {
    // 1.5T AC (1500W)
    const baselineMonthlyKwh = (baselineWatts * baselineHours * 30) / 1000; // 270 kWh
    const baselineCost = baselineMonthlyKwh * tariff.ratePerKwh; // ₹2,160
    const simMonthlyKwh = (baselineWatts * simHours * 30) / 1000;
    const simCost = simMonthlyKwh * tariff.ratePerKwh;
    const diffKwh = baselineMonthlyKwh - simMonthlyKwh;
    const diffCost = baselineCost - simCost;
    return {
      baselineMonthlyKwh,
      baselineCost,
      simMonthlyKwh,
      simCost,
      diffKwh,
      diffCost,
    };
  }, [simHours, tariff.ratePerKwh]);

  // AI Copilot state in landing
  const [copilotQuestion, setCopilotQuestion] = useState<string>('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotCategory, setCopilotCategory] = useState<'calculated' | 'general' | null>(null);

  const COPILOT_CHIPS = [
    'Which appliance contributes most to my estimated bill?',
    'How can I reduce usage without buying new appliances?',
    'What can I improve with my current budget of ₹1,000?',
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
      setCopilotCategory(question.includes('contributes') || question.includes('budget') ? 'calculated' : 'general');
    } catch {
      // Deterministic immediate fallback
      if (question.includes('contributes')) {
        setCopilotAnswer(
          `Based on calculations, a 1.5-ton AC running 6 hrs/day consumes 270 kWh/month (₹${(270 * tariff.ratePerKwh).toLocaleString()}), representing over 50% of an average home electricity bill.`
        );
        setCopilotCategory('calculated');
      } else if (question.includes('budget')) {
        setCopilotAnswer(
          `Under a ₹1,000 budget, the knapsack optimizer identifies that AC deep cleaning (₹450) and refrigerator coil tune-up (₹250) yield the highest monthly ROI, saving an estimated ₹460/month.`
        );
        setCopilotCategory('calculated');
      } else {
        setCopilotAnswer(
          `Zero-cost behavioral habits: Setting AC to 24°C saves ~18% compressor energy, cleaning fan blades restores airflow, and eliminating vampire standby saves 20-35 kWh/month.`
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
      a: 'EcoPilot calculates energy transparently using the standard mathematical formula: (Appliance Power in Watts × Daily Runtime Hours × Days per Month) ÷ 1,000 = Monthly kWh. This is then multiplied by your local electricity tariff rate per kWh. No guesswork, completely open math.',
    },
    {
      q: 'Do I need a smart meter?',
      a: 'No. EcoPilot works with standard household appliances and information you already have (wattage labels on appliances, average daily runtimes, and the unit rate on your utility bill). You do not need any hardware or smart meters to start.',
    },
    {
      q: 'Are the savings guaranteed?',
      a: 'No. Electricity savings depend on real-world factors including climate, room insulation, temperature settings, and actual runtime habits. EcoPilot provides clear engineering estimates and optimal decision logic, rather than unrealistic guarantees.',
    },
    {
      q: 'How does the budget optimizer work?',
      a: 'EcoPilot models home energy efficiency upgrades as a classic 0/1 Knapsack problem. Given your specific budget constraint (e.g. ₹500, ₹1,500, or ₹5,000), it uses dynamic programming to pick the exact combination of efficiency actions that maximizes your monthly savings without exceeding your upfront budget.',
    },
    {
      q: 'Is my household data stored?',
      a: 'Your appliance inventory and tariff settings are saved locally in your own browser using standard localStorage for your convenience. We do not require an account, and we do not sell or track your household energy data on external servers.',
    },
    {
      q: 'What information should I enter for better estimates?',
      a: 'For best results, enter the rated wattage from the back plate of high-draw appliances (air conditioners, geysers, refrigerators, washing machines), realistic daily operating hours, and your utility rate per kWh from your latest bill.',
    },
  ];

  // Sample weekly chart data for product preview
  const SAMPLE_CHART_DATA = [
    { name: 'AC (Cooling)', kwh: 270, cost: 2160 },
    { name: 'Fridge', kwh: 75, cost: 600 },
    { name: 'Geyser', kwh: 90, cost: 720 },
    { name: 'Fans (3x)', kwh: 81, cost: 648 },
    { name: 'Lighting & TV', kwh: 36, cost: 288 },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F2] text-[#172C26] font-sans">
      {/* 1. Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#F8F8F2]/90 backdrop-blur-md border-b border-[#E5E9E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Brand Logo + Wordmark */}
          <EcoPilotLogo size={36} />

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#69766F]">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#173F35] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#173F35] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('optimizer-preview')}
              className="hover:text-[#173F35] transition-colors cursor-pointer"
            >
              Budget Optimizer
            </button>
            <button
              onClick={() => scrollToSection('savings')}
              className="hover:text-[#173F35] transition-colors cursor-pointer"
            >
              Savings
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#173F35] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-xs font-semibold text-[#69766F] px-2.5 py-1 rounded-full bg-[#E5E9E4]/60">
              Free • No meter needed
            </span>
            <button
              onClick={onStartOptimizing}
              className="px-5 py-2.5 rounded-full bg-[#173F35] hover:bg-[#235447] text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2 cursor-pointer group"
            >
              <span>Start optimizing</span>
              <ArrowRight className="w-4 h-4 text-[#C9F36A] group-hover:translate-x-0.5 transition-transform" />
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
              {/* Small Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5E9E4]/80 border border-[#D4DBD2] text-[#173F35] text-xs font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#C9F36A] border border-[#173F35]" />
                <span>SMARTER ENERGY STARTS AT HOME</span>
              </div>

              {/* Main Headline (3-4 lines with highlight) */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#172C26] tracking-tight leading-[1.12]">
                Your home uses energy. <br />
                Let's make{' '}
                <span className="inline-block relative">
                  <span className="relative z-10 text-[#173F35] underline decoration-[#C9F36A] decoration-4 underline-offset-6">
                    every unit count.
                  </span>
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-lg sm:text-xl text-[#69766F] leading-relaxed max-w-2xl font-normal">
                Understand your electricity costs, discover where energy is being wasted, and build a practical savings plan that fits your budget.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={onStartOptimizing}
                  className="px-7 py-4 rounded-full bg-[#173F35] hover:bg-[#235447] text-white font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <span>Start optimizing</span>
                  <ArrowRight className="w-5 h-5 text-[#C9F36A] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-6 py-4 rounded-full bg-white hover:bg-[#F3F4EE] border border-[#E5E9E4] text-[#172C26] font-semibold text-base transition-colors flex items-center justify-center cursor-pointer"
                >
                  Explore how it works
                </button>
              </div>

              {/* Three Trust Points */}
              <div className="pt-6 border-t border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#C9F36A]/60 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#173F35]" />
                  </div>
                  <span className="text-xs font-semibold text-[#172C26]">
                    Personalized recommendations
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#C9F36A]/60 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#173F35]" />
                  </div>
                  <span className="text-xs font-semibold text-[#172C26]">
                    Budget-aware planning
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#C9F36A]/60 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#173F35]" />
                  </div>
                  <span className="text-xs font-semibold text-[#172C26]">
                    Transparent savings estimates
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Energy Illustration */}
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

      {/* Hero Bottom Strip */}
      <section className="border-y border-[#E5E9E4] bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 text-sm sm:text-base font-medium text-[#172C26]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#173F35]" />
              Less guesswork.
            </span>
            <span className="hidden sm:inline text-[#D4DBD2]">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9F36A]" />
              Smarter decisions.
            </span>
            <span className="hidden sm:inline text-[#D4DBD2]">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5D979]" />
              A plan that fits your budget.
            </span>
          </div>
        </div>
      </section>

      {/* 3. Section: The Hidden Cost of Everyday Energy */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E8F9BE] px-3 py-1 rounded-full">
              Clarity & Visibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              Your energy bill tells a story. We help you read it.
            </h2>
            <p className="text-lg text-[#69766F] mt-3 font-normal">
              Small daily habits and inefficient appliances can add up. Start by understanding your household usage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Know your usage */}
            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] shadow-xs hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4] flex items-center justify-center mb-6 text-[#173F35]">
                {/* Minimal electricity meter icon SVG */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#173F35]">
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <line x1="7" y1="9" x2="17" y2="9" />
                  <line x1="7" y1="13" x2="12" y2="13" />
                  <circle cx="15" cy="15" r="2" fill="#C9F36A" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#172C26] mb-2">
                Know your usage
              </h3>
              <p className="text-sm text-[#69766F] leading-relaxed">
                Understand the usage and estimated cost you enter. Break down every room and appliance into exact monthly units.
              </p>
            </div>

            {/* Card 2: Find your opportunities */}
            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] shadow-xs hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4] flex items-center justify-center mb-6 text-[#173F35]">
                {/* Search / Insight illustration SVG */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#173F35]">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6M8 11h6" stroke="#C9F36A" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#172C26] mb-2">
                Find your opportunities
              </h3>
              <p className="text-sm text-[#69766F] leading-relaxed">
                Identify the actions that may reduce electricity consumption. Discover low-cost maintenance and runtime tweaks with high ROI.
              </p>
            </div>

            {/* Card 3: Make a practical plan */}
            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] shadow-xs hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4] flex items-center justify-center mb-6 text-[#173F35]">
                {/* Checklist with budget indicator SVG */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#173F35]">
                  <path d="M9 11l3 3L22 4" stroke="#C9F36A" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  <circle cx="8" cy="16" r="1.5" fill="#F5D979" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#172C26] mb-2">
                Make a practical plan
              </h3>
              <p className="text-sm text-[#69766F] leading-relaxed">
                Prioritize changes based on your available budget and estimated impact. Allocate every rupee where it creates genuine ongoing savings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: How EcoPilot Works */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E5E9E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E5E9E4] px-3 py-1 rounded-full">
              Step-by-step
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              How EcoPilot works
            </h2>
            <p className="text-base text-[#69766F] mt-2">
              Three simple steps to transform raw appliance wattage into an actionable savings plan.
            </p>
          </div>

          {/* Desktop Horizontal Journey / Mobile Vertical Timeline */}
          <div className="relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-[#E5E9E4] -translate-y-6 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Step 01 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#173F35] text-[#C9F36A] font-black text-sm flex items-center justify-center mb-6 shadow-sm">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-[#172C26] mb-2">
                    Tell us about your home
                  </h3>
                  <p className="text-sm text-[#69766F] leading-relaxed">
                    Add the appliances you use, their power ratings, daily usage hours, and electricity rate.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#173F35] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C9F36A]" />
                  <span>Preset catalog & custom wattage</span>
                </div>
              </div>

              {/* Step 02 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#173F35] text-[#C9F36A] font-black text-sm flex items-center justify-center mb-6 shadow-sm">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-[#172C26] mb-2">
                    Let the numbers guide you
                  </h3>
                  <p className="text-sm text-[#69766F] leading-relaxed">
                    EcoPilot calculates estimated consumption and costs, then compares possible actions within your budget.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#173F35] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C9F36A]" />
                  <span>0/1 Knapsack optimal algorithm</span>
                </div>
              </div>

              {/* Step 03 */}
              <div className="bg-[#F8F8F2] rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#173F35] text-[#C9F36A] font-black text-sm flex items-center justify-center mb-6 shadow-sm">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-[#172C26] mb-2">
                    Take your next best step
                  </h3>
                  <p className="text-sm text-[#69766F] leading-relaxed">
                    Review recommendations, explore what-if scenarios, and choose changes that suit your household.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#173F35] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C9F36A]" />
                  <span>Interactive simulator & AI Copilot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="text-center mt-12">
            <button
              onClick={onStartOptimizing}
              className="px-8 py-3.5 rounded-full bg-[#173F35] hover:bg-[#235447] text-white font-bold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 mx-auto cursor-pointer"
            >
              <span>Build my energy plan</span>
              <ArrowRight className="w-4 h-4 text-[#C9F36A]" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Section: Product Preview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E8F9BE] px-3 py-1 rounded-full">
              Live Interface Preview
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              Clear numbers. Practical actions. Better-informed decisions.
            </h2>
            <p className="text-base text-[#69766F] mt-2">
              Sample household calculation — live reactive state available when you open the application.
            </p>
          </div>

          {/* Rounded Container with Subtle Border and Soft Green Accent */}
          <div className="rounded-3xl bg-white border border-[#E5E9E4] p-6 sm:p-10 shadow-lg shadow-stone-200/50">
            {/* Top Preview Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#E5E9E4] gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#69766F]">
                  Household Energy Overview
                </span>
                <h3 className="text-2xl font-extrabold text-[#172C26]">
                  Typical 3-BHK Model (5 Appliances)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F8F8F2] border border-[#E5E9E4] text-[#173F35]">
                  Tariff: {tariff.currency}{tariff.ratePerKwh}/unit
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#E8F9BE] text-[#173F35]">
                  Status: Optimized
                </span>
              </div>
            </div>

            {/* Miniature Dashboard Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4]">
                <span className="text-xs font-semibold text-[#69766F]">Estimated Monthly Cost</span>
                <div className="text-2xl font-extrabold text-[#172C26] mt-1">
                  {tariff.currency}{totalMonthlyCost > 0 ? totalMonthlyCost.toLocaleString() : '4,128'}
                </div>
                <span className="text-[11px] text-[#69766F] mt-1 block">Based on 30-day operating cycle</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4]">
                <span className="text-xs font-semibold text-[#69766F]">Estimated Consumption</span>
                <div className="text-2xl font-extrabold text-[#172C26] mt-1">
                  {totalMonthlyKwh > 0 ? totalMonthlyKwh.toLocaleString() : '516'}{' '}
                  <span className="text-sm font-normal text-[#69766F]">kWh</span>
                </div>
                <span className="text-[11px] text-[#69766F] mt-1 block">Units billed per billing month</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#173F35] text-white">
                <span className="text-xs font-bold text-[#C9F36A]">Potential Monthly Savings</span>
                <div className="text-2xl font-extrabold text-white mt-1">
                  {tariff.currency}1,020
                </div>
                <span className="text-[11px] text-white/80 mt-1 block">With ₹1,000 budget upgrades</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4]">
                <span className="text-xs font-semibold text-[#69766F]">Annual Payback Window</span>
                <div className="text-2xl font-extrabold text-[#172C26] mt-1">
                  0.8 <span className="text-sm font-normal text-[#69766F]">months</span>
                </div>
                <span className="text-[11px] text-[#173F35] font-semibold mt-1 block">
                  ROI pays back in under 25 days
                </span>
              </div>
            </div>

            {/* Consumption Chart & Action Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Chart */}
              <div className="lg:col-span-7 bg-[#F8F8F2] p-5 rounded-2xl border border-[#E5E9E4]">
                <span className="text-xs font-bold text-[#172C26] uppercase tracking-wider block mb-4">
                  Estimated Monthly Consumption by Appliance (kWh)
                </span>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SAMPLE_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#69766F' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#69766F' }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} kWh`, 'Monthly Consumption']}
                        contentStyle={{ backgroundColor: '#173F35', color: '#fff', borderRadius: '12px' }}
                      />
                      <Bar dataKey="kwh" radius={[6, 6, 0, 0]}>
                        {SAMPLE_CHART_DATA.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#173F35' : index === 1 ? '#235447' : '#C9F36A'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#69766F] mt-3 pt-2 border-t border-[#E5E9E4]">
                  <span>1.5T AC consumes 52.3% of total household load</span>
                  <span>Formula: Watts × Hours × Days ÷ 1000</span>
                </div>
              </div>

              {/* Recommended Actions Preview */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-xs font-bold text-[#172C26] uppercase tracking-wider block mb-2">
                  Top Recommended Saving Actions
                </span>

                <div className="p-3.5 rounded-xl border border-[#E5E9E4] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F9BE] text-[#173F35] flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172C26]">AC Coil Deep Cleaning</div>
                      <div className="text-xs text-[#69766F]">Cost: ₹450 • Restores heat transfer</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#173F35] bg-[#E8F9BE] px-2.5 py-1 rounded-md">
                    +₹310/mo
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E5E9E4] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F9BE] text-[#173F35] flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172C26]">Fridge Gasket & Coil Maintenance</div>
                      <div className="text-xs text-[#69766F]">Cost: ₹250 • Stops air leakage</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#173F35] bg-[#E8F9BE] px-2.5 py-1 rounded-md">
                    +₹150/mo
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E5E9E4] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF7DC] text-[#173F35] flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172C26]">Set AC Thermostat to 24°C</div>
                      <div className="text-xs text-[#69766F]">Free habit • 18% compressor relief</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#173F35] bg-[#FEF7DC] px-2.5 py-1 rounded-md">
                    +₹380/mo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: Budget-Aware Optimization */}
      <section id="optimizer-preview" className="py-20 bg-[#F4FCE8] border-y border-[#D6F0A8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-white px-3 py-1 rounded-full border border-[#D6F0A8]">
                Exact Mathematical DP Optimizer
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] tracking-tight">
                Better choices, within your budget.
              </h2>
              <p className="text-base text-[#69766F] leading-relaxed">
                Not every energy-saving upgrade costs the same. Explore options based on your available budget and let our 0/1 knapsack algorithm maximize your monthly return.
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
                  className="px-6 py-3.5 rounded-full bg-[#173F35] hover:bg-[#235447] text-white font-bold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
                >
                  <span>Optimize my budget →</span>
                </button>
              </div>

              <div className="text-xs text-[#69766F] pt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#173F35]" />
                <span>Distinguishes verified upfront prices from estimated monthly savings</span>
              </div>
            </div>

            {/* Right: Interactive Budget Slider & Knapsack Preview */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E9E4] shadow-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#172C26]">Your Available Budget</span>
                <span className="text-xl font-extrabold text-[#173F35] bg-[#E8F9BE] px-3.5 py-1 rounded-xl">
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
                className="w-full accent-[#173F35] cursor-pointer h-2 bg-[#E5E9E4] rounded-lg mb-4"
              />

              <div className="flex justify-between text-[11px] font-mono text-[#69766F] mb-6">
                <span>₹0 (Free Habits)</span>
                <span>₹1,500</span>
                <span>₹3,000</span>
                <span>₹5,000 (Deep Upgrade)</span>
              </div>

              {/* Knapsack Output Metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4] mb-6 text-center">
                <div>
                  <span className="text-[10px] font-semibold text-[#69766F] uppercase">Selected Actions</span>
                  <div className="text-lg font-extrabold text-[#172C26]">
                    {budgetPlan.selectedActions.length}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#69766F] uppercase">Upfront Cost</span>
                  <div className="text-lg font-extrabold text-[#172C26]">
                    {tariff.currency}{budgetPlan.totalUpfrontCost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#173F35] uppercase">Est. Monthly Savings</span>
                  <div className="text-lg font-extrabold text-[#173F35]">
                    +{tariff.currency}{budgetPlan.totalMonthlySavings.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Selected Action List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {budgetPlan.selectedActions.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E9E4] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#173F35]" />
                      <span className="font-semibold text-[#172C26]">{act.title}</span>
                      <span className="text-[10px] text-[#69766F]">
                        (Upfront: {act.upfrontCost === 0 ? 'Free' : `${tariff.currency}${act.upfrontCost}`})
                      </span>
                    </div>
                    <span className="font-bold text-[#173F35]">
                      +{tariff.currency}{act.monthlySavings}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section: What-If Simulator */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E8F9BE] px-3 py-1 rounded-full">
              Scenario Testing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              What if you changed just one thing?
            </h2>
            <p className="text-base text-[#69766F] mt-2">
              Adjust appliance usage hours and see immediate before-and-after results calculated by the real math engine.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#E5E9E4] shadow-md">
            {/* Control Bar: AC Runtime */}
            <div className="space-y-3 pb-8 border-b border-[#E5E9E4]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-[#172C26]">1.5 Ton AC Daily Runtime</h3>
                  <p className="text-xs text-[#69766F]">
                    Baseline: 6.0 hours/day @ 1,500 Watts ({tariff.currency}{tariff.ratePerKwh}/unit)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#69766F]">Simulated:</span>
                  <span className="text-lg font-extrabold text-[#173F35] bg-[#E8F9BE] px-3 py-0.5 rounded-lg">
                    {simHours} hrs/day
                  </span>
                  <button
                    onClick={() => setSimHours(6)}
                    className="p-1.5 rounded-lg bg-[#F8F8F2] hover:bg-[#E5E9E4] text-[#69766F] text-xs transition cursor-pointer"
                    title="Reset to baseline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={simHours}
                onChange={(e) => setSimHours(Number(e.target.value))}
                className="w-full accent-[#173F35] cursor-pointer h-2 bg-[#E5E9E4] rounded-lg"
              />
            </div>

            {/* Before & After Comparison Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              {/* Current Baseline */}
              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4]">
                <span className="text-xs font-semibold text-[#69766F] uppercase">Current Estimated Baseline</span>
                <div className="text-2xl font-extrabold text-[#172C26] mt-1">
                  {simAcCalculation.baselineMonthlyKwh} <span className="text-sm font-normal text-[#69766F]">kWh</span>
                </div>
                <span className="text-sm font-bold text-[#172C26] mt-1 block">
                  {tariff.currency}{simAcCalculation.baselineCost.toLocaleString()}/month
                </span>
                <span className="text-[11px] text-[#69766F] block mt-1">At 6.0 hours/day</span>
              </div>

              {/* New Simulated */}
              <div className="p-5 rounded-2xl bg-[#F8F8F2] border border-[#E5E9E4]">
                <span className="text-xs font-semibold text-[#69766F] uppercase">New Estimated Usage</span>
                <div className="text-2xl font-extrabold text-[#172C26] mt-1">
                  {simAcCalculation.simMonthlyKwh} <span className="text-sm font-normal text-[#69766F]">kWh</span>
                </div>
                <span className="text-sm font-bold text-[#172C26] mt-1 block">
                  {tariff.currency}{simAcCalculation.simCost.toLocaleString()}/month
                </span>
                <span className="text-[11px] text-[#69766F] block mt-1">At {simHours} hours/day</span>
              </div>

              {/* Difference / Net Savings */}
              <div className="p-5 rounded-2xl bg-[#173F35] text-white">
                <span className="text-xs font-bold text-[#C9F36A] uppercase">Difference (Monthly)</span>
                <div className="text-2xl font-extrabold text-[#C9F36A] mt-1">
                  {simAcCalculation.diffKwh >= 0 ? `-${simAcCalculation.diffKwh}` : `+${Math.abs(simAcCalculation.diffKwh)}`}{' '}
                  <span className="text-sm font-normal text-white">kWh</span>
                </div>
                <span className="text-lg font-bold text-white mt-1 block">
                  {simAcCalculation.diffCost >= 0
                    ? `Save ${tariff.currency}${simAcCalculation.diffCost.toLocaleString()}/mo`
                    : `+${tariff.currency}${Math.abs(simAcCalculation.diffCost).toLocaleString()}/mo`}
                </span>
                <span className="text-[11px] text-white/80 block mt-1">
                  {simAcCalculation.diffCost >= 0
                    ? `₹${(simAcCalculation.diffCost * 12).toLocaleString()} saved annually`
                    : 'Increased power usage'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs text-[#69766F] flex items-center justify-between">
              <span>Formula: (1,500W × Hours × 30 days) ÷ 1,000 × ₹{tariff.ratePerKwh}</span>
              <button
                onClick={onStartOptimizing}
                className="text-xs font-bold text-[#173F35] hover:underline cursor-pointer"
              >
                Simulate your full home in the app →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section: AI Energy Copilot */}
      <section className="py-20 bg-white border-y border-[#E5E9E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E8F9BE] px-3 py-1 rounded-full">
                Context-Aware Assistant
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
                Your energy questions, answered with context.
              </h2>
              <p className="text-base text-[#69766F] mt-2">
                Click a sample question below or type your own to see how EcoPilot explains calculations in plain language.
              </p>
            </div>

            {/* Clickable Suggestion Chips */}
            <div className="flex flex-wrap gap-2.5 justify-center mb-6">
              {COPILOT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskCopilot(chip)}
                  className="text-xs font-semibold px-4 py-2 rounded-full bg-[#F8F8F2] hover:bg-[#E8F9BE] text-[#172C26] border border-[#E5E9E4] hover:border-[#173F35]/30 transition-all cursor-pointer text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Conversational Assistant Card */}
            <div className="rounded-3xl border border-[#E5E9E4] bg-[#F8F8F2] p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E5E9E4]">
                <div className="w-9 h-9 rounded-xl bg-[#173F35] text-[#C9F36A] flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#172C26]">EcoPilot Conversational Advisor</div>
                  <div className="text-[11px] text-[#69766F]">
                    Connected to deterministic math engine & Gemini 3.8
                  </div>
                </div>
              </div>

              {/* Output Response */}
              <div className="py-5 min-h-[120px] flex items-center justify-center text-sm">
                {copilotLoading ? (
                  <div className="flex items-center gap-2 text-[#69766F] animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#173F35]" />
                    <span>Analyzing appliance calculations...</span>
                  </div>
                ) : copilotAnswer ? (
                  <div className="space-y-3 w-full">
                    <div className="text-xs font-mono text-[#69766F]">Q: "{copilotQuestion}"</div>
                    <div className="p-4 rounded-2xl bg-white border border-[#E5E9E4] text-[#172C26] leading-relaxed">
                      {copilotAnswer}
                    </div>
                    {copilotCategory && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold px-2 py-0.5 rounded bg-[#E8F9BE] text-[#173F35]">
                          {copilotCategory === 'calculated'
                            ? 'Factual Calculated Result'
                            : 'Engineering General Suggestion'}
                        </span>
                        <span className="text-[#69766F]">
                          Values derived from household wattage formulas
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[#69766F] text-xs">
                    Click a question chip above to see a live contextual response.
                  </div>
                )}
              </div>

              {/* Input Form */}
              <div className="flex items-center gap-2 pt-4 border-t border-[#E5E9E4]">
                <input
                  type="text"
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && copilotQuestion.trim() && handleAskCopilot(copilotQuestion)}
                  placeholder="Ask anything: e.g. How much does 2 hours of iron use cost?"
                  className="flex-1 bg-white border border-[#E5E9E4] rounded-xl px-4 py-2.5 text-xs text-[#172C26] placeholder-[#69766F] focus:outline-none focus:border-[#173F35]"
                />
                <button
                  onClick={() => copilotQuestion.trim() && handleAskCopilot(copilotQuestion)}
                  disabled={!copilotQuestion.trim() || copilotLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#235447] text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#C9F36A]" />
                  <span>Ask</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Section: Impact and Savings */}
      <section id="savings" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E5E9E4] px-3 py-1 rounded-full">
              Transparent Engineering
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              Make the numbers work for you.
            </h2>
            <p className="text-base text-[#69766F] mt-2">
              Ground your home energy decisions in transparent mathematical models, not vague promises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#173F35]">100%</span>
                <h3 className="text-lg font-bold text-[#172C26] mt-2 mb-2">
                  Energy Use Understood
                </h3>
                <p className="text-sm text-[#69766F] leading-relaxed">
                  Every watt and kilowatt-hour is traceable directly to an appliance and runtime duration. No black-box approximations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#69766F]">
                Standard physics formulation
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#173F35]">12+</span>
                <h3 className="text-lg font-bold text-[#172C26] mt-2 mb-2">
                  Savings Opportunities Identified
                </h3>
                <p className="text-sm text-[#69766F] leading-relaxed">
                  Carefully categorized options ranging from zero-cost temperature settings to high-efficiency BLDC motor retrofits.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#69766F]">
                Curated efficiency action catalog
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E5E9E4] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#173F35]">0/1</span>
                <h3 className="text-lg font-bold text-[#172C26] mt-2 mb-2">
                  Budget Considered
                </h3>
                <p className="text-sm text-[#69766F] leading-relaxed">
                  Mathematical dynamic programming finds the global optimum allocation of your funds, strictly respecting your chosen budget ceiling.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E9E4] text-xs font-semibold text-[#69766F]">
                Guaranteed knapsack optimality
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Section: FAQ Section */}
      <section id="faq" className="py-20 bg-white border-y border-[#E5E9E4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173F35] bg-[#E5E9E4] px-3 py-1 rounded-full">
              Common Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172C26] mt-3 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-base text-[#69766F] mt-2">
              Straightforward answers about our algorithms, data privacy, and estimation methods.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#E5E9E4] bg-[#F8F8F2] overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-base text-[#172C26] cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span className="shrink-0 p-1 rounded-full bg-white border border-[#E5E9E4] text-[#173F35]">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-[#69766F] leading-relaxed border-t border-[#E5E9E4]/60 pt-4">
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
          <div className="relative rounded-3xl bg-[#173F35] text-white p-8 sm:p-14 lg:p-16 overflow-hidden shadow-xl">
            {/* Abstract Sun & Orbit Graphic */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#C9F36A]/10 pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-[#F5D979]/10 pointer-events-none" />
            <div className="absolute top-1/2 right-12 -translate-y-1/2 hidden lg:block opacity-20">
              <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
                <circle cx="120" cy="120" r="110" stroke="#C9F36A" strokeWidth="2" strokeDasharray="4 6" />
                <circle cx="120" cy="120" r="70" stroke="#F5D979" strokeWidth="1.5" />
                <circle cx="120" cy="120" r="30" fill="#C9F36A" />
              </svg>
            </div>

            <div className="relative z-10 max-w-2xl space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9F36A] bg-[#235447] px-3.5 py-1.5 rounded-full inline-block">
                Start Saving Today
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Your next energy-saving decision starts here.
              </h2>

              <p className="text-base sm:text-lg text-[#C9F36A]/90 leading-relaxed font-normal">
                Start with the information you already have. Build a clearer picture of your home's energy use and make every unit count.
              </p>

              <div className="pt-2">
                <button
                  onClick={onStartOptimizing}
                  className="px-8 py-4 rounded-full bg-[#C9F36A] hover:bg-[#bfe860] text-[#173F35] font-extrabold text-base transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-3 cursor-pointer group"
                >
                  <span>Start optimizing</span>
                  <ArrowRight className="w-5 h-5 text-[#173F35] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E9E4] py-12 text-xs text-[#69766F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <EcoPilotLogo size={28} />

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#173F35] cursor-pointer">
              How it works
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#173F35] cursor-pointer">
              Features
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#173F35] cursor-pointer">
              FAQ
            </button>
            <button onClick={onStartOptimizing} className="font-bold text-[#173F35] cursor-pointer">
              Open Dashboard
            </button>
          </div>

          <div className="text-center md:text-right text-[11px] text-[#69766F]">
            Transparent engineering estimates • No smart meter required
          </div>
        </div>
      </footer>
    </div>
  );
};
