import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Zap,
  TrendingDown,
  Activity,
  Bot,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Settings,
  HelpCircle,
  Home,
  Flame,
  Wind,
  Refrigerator,
  Tv,
  Lightbulb,
  Laptop,
  Shirt,
} from 'lucide-react';
import { Appliance, TariffConfig, CalculationSummary, ApplianceCategory } from '../types';
import { EcoPilotLogo } from './EcoPilotLogo';
import { WattWiseEngine } from './WattWiseEngine';
import { BudgetOptimizer } from './BudgetOptimizer';
import { WhatIfSimulator } from './WhatIfSimulator';
import { EcoPilotAssistant } from './EcoPilotAssistant';
import { DEFAULT_SAVING_ACTIONS } from '../engine/actionCatalog';
import { optimizeSavingPlan } from '../engine/knapsackOptimizer';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DashboardViewProps {
  appliances: Appliance[];
  setAppliances: React.Dispatch<React.SetStateAction<Appliance[]>>;
  tariff: TariffConfig;
  setTariff: React.Dispatch<React.SetStateAction<TariffConfig>>;
  summary: CalculationSummary;
  onBackToHome: () => void;
  onResetDemoData: () => void;
  initialTab?: string;
  initialBudget?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Cooling: '#123D32',
  Heating: '#D97706',
  Kitchen: '#4E9C65',
  Entertainment: '#6366F1',
  Electronics: '#2563EB',
  Lighting: '#EAB308',
  Laundry: '#8B5CF6',
  Other: '#718078',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  appliances,
  setAppliances,
  tariff,
  setTariff,
  summary,
  onBackToHome,
  onResetDemoData,
  initialTab = 'overview',
  initialBudget = 1000,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [dashboardBudget, setDashboardBudget] = useState<number>(initialBudget);
  const [showTariffModal, setShowTariffModal] = useState<boolean>(false);
  const [tempRate, setTempRate] = useState<string>(tariff.ratePerKwh.toString());

  // Quick Knapsack summary for the overview cards
  const knapsackPlan = useMemo(() => {
    return optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, dashboardBudget);
  }, [dashboardBudget]);

  // Chart data for consumption by category
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    appliances.forEach((app) => {
      const kwh = (app.powerWatts * app.hoursPerDay * (app.daysPerMonth || 30) * (app.quantity || 1)) / 1000;
      map[app.category] = (map[app.category] || 0) + kwh;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round(value * 10) / 10,
      cost: Math.round(value * tariff.ratePerKwh),
      color: CATEGORY_COLORS[name] || '#123D32',
    }));
  }, [appliances, tariff.ratePerKwh]);

  // Top consumers sorted descending
  const sortedAppliances = useMemo(() => {
    return [...appliances].sort((a, b) => {
      const kwhA = a.powerWatts * a.hoursPerDay * (a.daysPerMonth || 30) * (a.quantity || 1);
      const kwhB = b.powerWatts * b.hoursPerDay * (b.daysPerMonth || 30) * (b.quantity || 1);
      return kwhB - kwhA;
    });
  }, [appliances]);

  const handleSaveTariff = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(tempRate);
    if (!isNaN(rate) && rate > 0) {
      setTariff((prev) => ({ ...prev, ratePerKwh: rate }));
      setShowTariffModal(false);
    }
  };

  const SIDEBAR_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'appliances', label: 'My Appliances', icon: Zap, badge: appliances.length.toString() },
    { id: 'optimizer', label: 'Budget Optimizer', icon: TrendingDown },
    { id: 'simulator', label: 'What-if Simulator', icon: Activity },
    { id: 'assistant', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[#F8F8F2] text-[#142721] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8E2] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#718078] hover:text-[#123D32] bg-[#F8F8F2] hover:bg-[#E2E8E2] px-3 py-1.5 rounded-lg border border-[#E2E8E2] transition cursor-pointer"
          >
            <span>← Home</span>
          </button>
          <div className="h-4 w-px bg-[#E2E8E2] hidden sm:block" />
          <EcoPilotLogo size={28} />
        </div>

        {/* Right Tools: Tariff quick rate, Reset Data, Help */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTariffModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F8F8F2] hover:bg-[#E2E8E2] border border-[#E2E8E2] text-[#123D32] transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#718078]" />
            <span>
              Tariff: {tariff.currency}{tariff.ratePerKwh}/unit
            </span>
          </button>

          <button
            onClick={onResetDemoData}
            title="Reset to default sample household"
            className="hidden sm:flex items-center gap-1 text-xs text-[#718078] hover:text-[#142721] px-2.5 py-1.5 rounded-lg hover:bg-[#F8F8F2] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-1">
          {/* Mobile Tab Scroll / Desktop Stack */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#123D32] text-white shadow-sm'
                      : 'text-[#718078] hover:text-[#142721] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D5F477]' : 'text-[#718078]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#D5F477] text-[#123D32]'
                          : 'bg-[#E2E8E2] text-[#718078]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Tariff Summary Box in Sidebar */}
          <div className="hidden md:block mt-8 p-4 rounded-2xl bg-white border border-[#E2E8E2]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#718078] block mb-1">
              Active Household Rate
            </span>
            <div className="text-sm font-extrabold text-[#142721]">
              {tariff.currency}{tariff.ratePerKwh} / unit (kWh)
            </div>
            <p className="text-[11px] text-[#718078] mt-1 leading-snug">
              Values automatically recalculate when appliances or tariff rates change.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E2E8E2] shadow-xs">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#142721] tracking-tight">
                    Good energy decisions start with clarity.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#718078] mt-1">
                    Your complete household energy profile, calculated transparently from appliance wattage and daily runtime.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('appliances')}
                  className="px-4 py-2.5 rounded-xl bg-[#123D32] hover:bg-[#1A5445] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#D5F477]" />
                  <span>Add / Edit Appliances</span>
                </button>
              </div>

              {/* Four Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Estimated monthly cost */}
                <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#718078] mb-1">
                    <span>Estimated Monthly Cost</span>
                    <Zap className="w-3.5 h-3.5 text-[#123D32]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#142721]">
                    {tariff.currency}{summary.totalMonthlyCost.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#718078] mt-1 block">
                    {tariff.currency}{(summary.totalMonthlyCost * 12).toLocaleString()} / year projected
                  </span>
                </div>

                {/* 2. Estimated monthly consumption */}
                <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#718078] mb-1">
                    <span>Monthly Consumption</span>
                    <Activity className="w-3.5 h-3.5 text-[#123D32]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#142721]">
                    {summary.totalMonthlyKwh.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-[#718078]">kWh</span>
                  </div>
                  <span className="text-[11px] text-[#718078] mt-1 block">
                    {(summary.totalMonthlyKwh / 30).toFixed(1)} kWh / day average
                  </span>
                </div>

                {/* 3. Potential savings */}
                <div className="p-5 rounded-2xl bg-[#123D32] text-white shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#D5F477] mb-1">
                    <span>Potential Savings</span>
                    <TrendingDown className="w-3.5 h-3.5 text-[#D5F477]" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">
                    {tariff.currency}{knapsackPlan.totalMonthlySavings.toLocaleString()}/mo
                  </div>
                  <span className="text-[11px] text-white/80 mt-1 block">
                    Under {tariff.currency}{dashboardBudget.toLocaleString()} budget
                  </span>
                </div>

                {/* 4. Budget available */}
                <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#718078] mb-1">
                      <span>Budget Allocated</span>
                      <button
                        onClick={() => setActiveTab('optimizer')}
                        className="text-[11px] text-[#123D32] font-bold hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <div className="text-2xl font-extrabold text-[#142721]">
                      {tariff.currency}{dashboardBudget.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#4E9C65] font-semibold mt-1">
                    {knapsackPlan.selectedActions.length} actions selected
                  </span>
                </div>
              </div>

              {/* Energy Insights & Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Consumption by Category Chart */}
                <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E2E8E2] shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#142721]">Monthly Consumption by Category</h3>
                    <span className="text-xs text-[#718078]">Total: {summary.totalMonthlyKwh} kWh</span>
                  </div>

                  {categoryChartData.length === 0 ? (
                    <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-[#718078] text-xs">
                      <Zap className="w-8 h-8 text-[#E2E8E2] mb-2" />
                      <span>No appliances registered yet.</span>
                      <button
                        onClick={() => setActiveTab('appliances')}
                        className="mt-2 text-[#123D32] font-bold hover:underline cursor-pointer"
                      >
                        Add your first appliance
                      </button>
                    </div>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#718078' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#718078' }} />
                          <Tooltip
                            formatter={(val: any, name: any, item: any) => [
                              `${val} kWh (${tariff.currency}${item.payload.cost}/mo)`,
                              'Monthly Consumption',
                            ]}
                            contentStyle={{ backgroundColor: '#123D32', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Highest Consumers / Power Draw */}
                <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E2E8E2] shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#142721] mb-3">Highest Power Draw</h3>
                    <div className="space-y-3">
                      {sortedAppliances.slice(0, 4).map((app, index) => {
                        const monthlyKwh = (app.powerWatts * app.hoursPerDay * (app.daysPerMonth || 30) * (app.quantity || 1)) / 1000;
                        const monthlyCost = monthlyKwh * tariff.ratePerKwh;
                        const sharePercent = summary.totalMonthlyKwh > 0 ? ((monthlyKwh / summary.totalMonthlyKwh) * 100).toFixed(0) : '0';

                        return (
                          <div key={app.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F8F2] border border-[#E2E8E2] text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-[#123D32] text-[#D5F477] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <div className="font-bold text-[#142721]">{app.name}</div>
                                <div className="text-[10px] text-[#718078]">
                                  {app.powerWatts}W • {app.hoursPerDay}h/day
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-[#123D32]">
                                {tariff.currency}{Math.round(monthlyCost).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-[#718078]">{sharePercent}% of total</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="mt-4 w-full py-2.5 rounded-xl border border-[#E2E8E2] hover:bg-[#F8F8F2] text-xs font-bold text-[#123D32] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#123D32]" />
                    <span>Simulate reducing top appliance runtime</span>
                  </button>
                </div>
              </div>

              {/* Recommended Efficiency Actions Section */}
              <div className="bg-white p-6 rounded-3xl border border-[#E2E8E2] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#142721]">Optimal Efficiency Upgrades</h3>
                    <p className="text-xs text-[#718078]">
                      Ranked by return-on-investment from our 0/1 knapsack dynamic programming engine.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('optimizer')}
                    className="text-xs font-bold text-[#123D32] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Optimizer</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {knapsackPlan.selectedActions.slice(0, 3).map((action) => (
                    <div
                      key={action.id}
                      className="p-4 rounded-2xl border border-[#E2E8E2] bg-[#F8F8F2] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EBFAC2] text-[#123D32]">
                            {action.tag}
                          </span>
                          <span className="text-xs font-extrabold text-[#123D32]">
                            +{tariff.currency}{action.monthlySavings}/mo
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#142721] mb-1">{action.title}</h4>
                        <p className="text-xs text-[#718078] leading-snug">{action.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E2E8E2] flex items-center justify-between text-[11px] text-[#718078]">
                        <span>Upfront: {action.upfrontCost === 0 ? 'Free Habit' : `${tariff.currency}${action.upfrontCost}`}</span>
                        <span>Payback: {action.paybackMonths > 0 ? `${action.paybackMonths} mo` : 'Immediate'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Appliances Quick View / Empty State */}
              <div className="bg-white p-6 rounded-3xl border border-[#E2E8E2] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#142721]">
                    Active Household Inventory ({appliances.length} items)
                  </h3>
                  <button
                    onClick={() => setActiveTab('appliances')}
                    className="text-xs font-bold text-[#123D32] hover:underline cursor-pointer"
                  >
                    Manage Inventory →
                  </button>
                </div>

                {appliances.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#E2E8E2] rounded-2xl">
                    <Zap className="w-10 h-10 text-[#718078] mx-auto mb-2 opacity-50" />
                    <h4 className="text-base font-bold text-[#142721]">No appliances in your home yet</h4>
                    <p className="text-xs text-[#718078] mt-1 max-w-sm mx-auto">
                      Add appliances like air conditioners, geysers, or refrigerators to start calculating costs.
                    </p>
                    <button
                      onClick={() => setActiveTab('appliances')}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-[#123D32] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-[#D5F477]" />
                      <span>Add your first appliance</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#E2E8E2] text-[#718078] uppercase text-[10px] font-semibold">
                          <th className="pb-2.5">Appliance</th>
                          <th className="pb-2.5">Category</th>
                          <th className="pb-2.5">Power</th>
                          <th className="pb-2.5">Daily Usage</th>
                          <th className="pb-2.5">Monthly kWh</th>
                          <th className="pb-2.5 text-right">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8E2]">
                        {appliances.map((app) => {
                          const kwh = (app.powerWatts * app.hoursPerDay * (app.daysPerMonth || 30) * (app.quantity || 1)) / 1000;
                          const cost = kwh * tariff.ratePerKwh;
                          return (
                            <tr key={app.id} className="hover:bg-[#F8F8F2]/60 transition">
                              <td className="py-3 font-semibold text-[#142721]">{app.name}</td>
                              <td className="py-3 text-[#718078]">{app.category}</td>
                              <td className="py-3 font-mono">{app.powerWatts} W</td>
                              <td className="py-3 font-mono">{app.hoursPerDay} hrs/day</td>
                              <td className="py-3 font-mono font-semibold">{kwh.toFixed(1)} kWh</td>
                              <td className="py-3 text-right font-extrabold text-[#123D32]">
                                {tariff.currency}{Math.round(cost).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPLIANCES (WATTWISE ENGINE) */}
          {activeTab === 'appliances' && (
            <WattWiseEngine
              appliances={appliances}
              setAppliances={setAppliances}
              summary={summary}
              tariff={tariff}
            />
          )}

          {/* TAB 3: BUDGET OPTIMIZER */}
          {activeTab === 'optimizer' && <BudgetOptimizer tariff={tariff} />}

          {/* TAB 4: WHAT-IF SIMULATOR */}
          {activeTab === 'simulator' && (
            <WhatIfSimulator appliances={appliances} tariff={tariff} />
          )}

          {/* TAB 5: AI COPILOT */}
          {activeTab === 'assistant' && (
            <EcoPilotAssistant
              appliances={appliances}
              tariff={tariff}
              totalMonthlyCost={summary.totalMonthlyCost}
              totalMonthlyKwh={summary.totalMonthlyKwh}
            />
          )}

        </main>
      </div>

      {/* Tariff Settings Modal */}
      {showTariffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#E2E8E2] shadow-2xl">
            <h3 className="text-base font-extrabold text-[#142721] mb-1">
              Configure Electricity Tariff
            </h3>
            <p className="text-xs text-[#718078] mb-4">
              Enter the unit rate from your electricity bill.
            </p>

            <form onSubmit={handleSaveTariff} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#142721] block mb-1">
                  Rate per Unit ({tariff.currency} / kWh)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-full bg-[#F8F8F2] border border-[#E2E8E2] rounded-xl px-3 py-2 text-sm text-[#142721] focus:outline-none focus:border-[#123D32]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTariffModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8E2] text-xs font-semibold text-[#718078] hover:bg-[#F8F8F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#123D32] text-white text-xs font-bold hover:bg-[#1A5445] cursor-pointer"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
