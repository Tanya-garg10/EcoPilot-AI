import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SavingAction, TariffConfig } from '../types';
import { DEFAULT_SAVING_ACTIONS } from '../engine/actionCatalog';
import { optimizeSavingPlan } from '../engine/knapsackOptimizer';

interface BudgetOptimizerProps {
  tariff: TariffConfig;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({ tariff }) => {
  // Budget state (default ₹500 as highlighted in prompt)
  const [budget, setBudget] = useState<number>(500);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  // Quick preset budgets
  const BUDGET_PRESETS = [
    { label: '₹0 (Free Wins)', value: 0 },
    { label: '₹500 (Starter Kit)', value: 500 },
    { label: '₹1,500 (Smart Energy)', value: 1500 },
    { label: '₹3,000 (High Impact)', value: 3000 },
    { label: '₹5,000 (Maximum ROI)', value: 5000 },
    { label: '₹10,000+ (Deep Retrofit)', value: 12000 },
  ];

  // Run exact 0/1 Knapsack DP algorithm
  const knapsackResult = useMemo(() => {
    return optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, budget);
  }, [budget]);

  const selectedIds = useMemo(() => {
    return new Set(knapsackResult.selectedActions.map((a) => a.id));
  }, [knapsackResult]);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    if (activeCategory === 'All') return DEFAULT_SAVING_ACTIONS;
    return DEFAULT_SAVING_ACTIONS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const categories = ['All', 'Cooling', 'Heating', 'Lighting', 'Kitchen', 'Electronics', 'Insulation', 'Habit', 'Smart Home'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <TrendingDown className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Smart Plan Budget Optimizer</h2>
        </div>
        <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
          Powered by an exact <strong className="text-emerald-800">0/1 Knapsack Dynamic Programming algorithm</strong>. Enter your target upfront budget, and the engine computes the mathematically optimal combination of energy interventions that yields the maximum estimated monthly electricity bill savings.
        </p>
      </div>

      {/* Interactive Budget Controller Card */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Set Your Available Upfront Budget
            </div>
            <div className="text-sm text-stone-700 mt-0.5">
              How much are you willing to invest once in energy-saving actions?
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-emerald-800 font-mono">{tariff.currency}</span>
            <input
              type="number"
              min="0"
              max="50000"
              step="50"
              value={budget}
              onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-36 bg-stone-50 border border-stone-300 focus:border-emerald-600 focus:bg-white rounded-2xl px-4 py-2 text-xl font-bold font-mono text-stone-900 text-right focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {BUDGET_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setBudget(p.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                budget === p.value
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="15000"
            step="100"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-600 bg-stone-200 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-500 font-mono">
            <span>{tariff.currency}0</span>
            <span>{tariff.currency}3,000</span>
            <span>{tariff.currency}6,000</span>
            <span>{tariff.currency}10,000</span>
            <span>{tariff.currency}15,000+</span>
          </div>
        </div>
      </div>

      {/* Knapsack Output Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Estimated Monthly Savings</span>
            <Award className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-black text-emerald-800 mt-2 font-mono">
            {tariff.currency}
            {knapsackResult.totalMonthlySavings.toLocaleString()}
            <span className="text-xs text-stone-600 font-normal ml-1">/mo</span>
          </div>
          <div className="text-xs text-stone-600 mt-1">
            Annual: <strong className="text-stone-900">{tariff.currency}{knapsackResult.totalAnnualSavings.toLocaleString()}</strong> / year
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Upfront Cost vs Budget
          </div>
          <div className="text-3xl font-extrabold text-stone-900 mt-2 font-mono">
            {tariff.currency}
            {knapsackResult.totalUpfrontCost.toLocaleString()}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Unallocated: <span className="font-mono text-emerald-700 font-semibold">{tariff.currency}{knapsackResult.unallocatedBudget.toLocaleString()}</span> remaining
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Average Payback Period
          </div>
          <div className="text-3xl font-extrabold text-teal-800 mt-2 font-mono">
            {knapsackResult.paybackMonths === 0 ? 'Instant' : `${knapsackResult.paybackMonths} mo`}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Annual ROI: <strong className="text-teal-800">{knapsackResult.roiPercentageAnnual}%</strong>
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Carbon Reduction
          </div>
          <div className="text-3xl font-extrabold text-teal-800 mt-2 font-mono">
            {knapsackResult.totalCo2SavedMonthly.toLocaleString()} kg
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Energy Saved: <span className="text-stone-900 font-bold">{knapsackResult.totalKwhSavedMonthly} kWh</span> / month
          </div>
        </div>
      </div>

      {/* Selected Optimal Actions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <span>Optimal Interventions Selected by 0/1 Knapsack</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {knapsackResult.selectedActions.length} Actions
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Exact mathematical optimum yielding max monetary return under your {tariff.currency}{budget.toLocaleString()} budget
            </p>
          </div>
        </div>

        {knapsackResult.selectedActions.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-stone-300 rounded-2xl text-stone-500">
            No actions selected. Increase budget or explore zero-cost habit changes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knapsackResult.selectedActions.map((action) => (
              <div
                key={action.id}
                className="p-5 bg-white border border-stone-200/90 hover:border-emerald-200 rounded-2xl space-y-3 relative overflow-hidden shadow-xs"
              >
                <div className="absolute top-0 right-0 w-14 h-14 bg-emerald-50 rounded-bl-3xl flex items-start justify-end p-2 border-b border-l border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {action.tag}
                  </span>
                  <span className="text-[10px] text-stone-500">{action.category}</span>
                </div>

                <h4 className="font-bold text-stone-900 text-sm">{action.title}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">{action.description}</p>

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono">
                  <div>
                    <span className="text-stone-500 text-[10px] block">Upfront Cost:</span>
                    <span className="font-bold text-stone-800">
                      {action.upfrontCost === 0 ? 'FREE' : `${tariff.currency}${action.upfrontCost.toLocaleString()}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[10px] block">Monthly Savings:</span>
                    <span className="font-bold text-emerald-700">
                      +{tariff.currency}{action.monthlySavings.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Engineering Assumptions Disclosure */}
                <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <div className="font-semibold text-stone-800 mb-0.5 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-emerald-700" />
                    <span>Calculation Assumption:</span>
                  </div>
                  <div className="italic leading-tight">{action.assumptions}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Catalog Explorer & Engineering Assumptions */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-stone-900">Full Energy-Saving Action Catalog</h3>
            <p className="text-xs text-stone-500">
              Browse all candidate interventions evaluated by the Knapsack algorithm with explicit payback periods
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-500 tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Upfront Cost</th>
                <th className="p-3 text-right">Est. Savings / mo</th>
                <th className="p-3 text-right">Payback</th>
                <th className="p-3 text-center">Assumptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCatalog.map((action) => {
                const isSelected = selectedIds.has(action.id);
                const isExpanded = expandedActionId === action.id;
                return (
                  <React.Fragment key={action.id}>
                    <tr
                      className={`hover:bg-stone-50 transition cursor-pointer ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                      onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                    >
                      <td className="p-3 whitespace-nowrap">
                        {isSelected ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            Selected
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">Over budget</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-stone-900">{action.title}</td>
                      <td className="p-3 text-stone-500">{action.category}</td>
                      <td className="p-3 font-mono text-right text-stone-800">
                        {action.upfrontCost === 0 ? 'FREE' : `${tariff.currency}${action.upfrontCost.toLocaleString()}`}
                      </td>
                      <td className="p-3 font-mono text-right text-emerald-700 font-bold">
                        +{tariff.currency}{action.monthlySavings.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-right text-teal-700">
                        {action.paybackMonths === 0 ? 'Immediate' : `${action.paybackMonths} mo`}
                      </td>
                      <td className="p-3 text-center">
                        <button className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-stone-50/70">
                        <td colSpan={7} className="p-4 text-xs space-y-1">
                          <div className="font-semibold text-emerald-800">Engineering Assumptions & Methodology:</div>
                          <p className="text-stone-600 italic">{action.assumptions}</p>
                          <div className="text-[11px] text-stone-500 pt-1">
                            Difficulty: <span className="text-stone-800 font-medium">{action.difficulty}</span> • Monthly Energy Saved: <span className="text-stone-800 font-medium">{action.monthlyKwhSaved} kWh</span> • CO₂ Saved: <span className="text-stone-800 font-medium">{action.monthlyCo2KgSaved} kg</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500">
          <strong className="text-stone-700">Illustrative Estimate Disclosure:</strong> All monthly monetary savings, payback periods, and kilowatt-hour reductions are engineering simulations based on standard test conditions and ₹8/kWh utility tariff benchmarks. Actual household electricity bills depend on local weather, room thermal insulation, appliance maintenance history, and grid tariffs. EcoPilot AI does not claim measured savings or automated physical appliance control.
        </div>
      </div>
    </div>
  );
};
