import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingDown,
  Settings2,
  Leaf,
  Activity,
  Cpu,
  RotateCcw,
  CheckCircle2,
  Layers,
  Sparkles,
  Radio,
  Cloud,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { CurrencyCode, TariffConfig } from '../types';
import { CURRENCY_CONFIGS } from '../engine/energyCalculator';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  tariff: TariffConfig;
  setTariff: React.Dispatch<React.SetStateAction<TariffConfig>>;
  totalMonthlyCost: number;
  totalMonthlyKwh: number;
  totalMonthlyCo2: number;
  onResetDemoData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  tariff,
  setTariff,
  totalMonthlyCost,
  totalMonthlyKwh,
  totalMonthlyCo2,
  onResetDemoData,
}) => {
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [showBedrockModal, setShowBedrockModal] = useState(false);
  const [tempRate, setTempRate] = useState(tariff.ratePerKwh.toString());
  const [tempFixed, setTempFixed] = useState(tariff.fixedMonthlyCharges.toString());
  const [tempUseSlab, setTempUseSlab] = useState(tariff.useSlabRates);

  const [bedrockStatus, setBedrockStatus] = useState<any>({
    status: 'checking',
    region: 'us-east-1',
    model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    fallback_active: true,
  });

  useEffect(() => {
    fetch('/api/bedrock/status')
      .then((r) => r.json())
      .then((data) => setBedrockStatus(data))
      .catch(() => {});
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    const config = CURRENCY_CONFIGS[newCurrency];
    setTariff((prev) => ({
      ...prev,
      currencyCode: newCurrency,
      currency: config.symbol,
      ratePerKwh: config.defaultTariff,
    }));
    setTempRate(config.defaultTariff.toString());
  };

  const handleSaveTariff = () => {
    const numRate = parseFloat(tempRate);
    const numFixed = parseFloat(tempFixed);
    if (!isNaN(numRate) && numRate >= 0) {
      setTariff((prev) => ({
        ...prev,
        ratePerKwh: numRate,
        fixedMonthlyCharges: !isNaN(numFixed) && numFixed >= 0 ? numFixed : prev.fixedMonthlyCharges,
        useSlabRates: tempUseSlab,
      }));
    }
    setShowTariffModal(false);
  };

  const navItems = [
    { id: 'alexa', label: 'Alexa+ Copilot', icon: Radio, badge: 'Bedrock & MCP' },
    { id: 'wattwise', label: 'Appliance Calculator', icon: Zap, badge: 'WattWise' },
    { id: 'optimizer', label: 'Savings Planner', icon: TrendingDown, badge: '0/1 Knapsack' },
    { id: 'whatif', label: 'What-If Simulator', icon: Activity, badge: 'Dynamic' },
    { id: 'mcp', label: 'MCP Protocol Hub', icon: Cpu, badge: 'Streamable HTTP' },
    { id: 'checklist', label: 'Hackathon Checklist', icon: CheckCircle2, badge: 'Tests' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
      {/* Top Banner with branding & quick stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-600/15 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-stone-900">
                EcoPilot <span className="text-emerald-600">AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Bedrock & Alexa+
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">Household Energy Calculator & Budget-Aware Optimizer</p>
          </div>
        </div>

        {/* Global Key Metrics Pills */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Monthly Bill */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Estimated Monthly Bill</div>
              <div className="text-sm font-extrabold text-emerald-700">
                {tariff.currency}
                {totalMonthlyCost.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Monthly Units */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Consumption</div>
              <div className="text-sm font-bold text-stone-800">{totalMonthlyKwh.toLocaleString()} kWh</div>
            </div>
          </div>

          {/* Carbon Footprint */}
          <div className="hidden md:flex bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 items-center gap-2">
            <Leaf className="w-3.5 h-3.5 text-teal-600" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Grid CO₂</div>
              <div className="text-sm font-bold text-teal-700">{totalMonthlyCo2.toLocaleString()} kg</div>
            </div>
          </div>

          {/* Amazon Bedrock Pill */}
          <button
            onClick={() => setShowBedrockModal(true)}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-800 transition cursor-pointer"
            title="Amazon Bedrock Configuration"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Bedrock:</span>
            <span className="font-mono text-[11px] text-emerald-700">
              {bedrockStatus.region}
            </span>
          </button>

          {/* Currency Selector */}
          <select
            value={tariff.currencyCode}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-white border border-stone-200 text-xs font-semibold text-stone-700 rounded-xl px-2.5 py-2 cursor-pointer hover:border-stone-300 focus:outline-none focus:border-emerald-500 shadow-2xs"
            title="Change Currency"
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>

          {/* Tariff Settings */}
          <button
            onClick={() => setShowTariffModal(true)}
            className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 transition cursor-pointer"
            title="Edit Tariff & Slab Rates"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetDemoData}
            className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="Reset to Benchmark Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 no-scrollbar border-t border-stone-100 pt-2 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-emerald-700 text-emerald-100 font-bold' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Amazon Bedrock Configuration Modal */}
      {showBedrockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">Amazon Bedrock Runtime Converse API</h3>
                  <p className="text-xs text-stone-500">Official AWS SDK (boto3) integration</p>
                </div>
              </div>
              <button
                onClick={() => setShowBedrockModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-600">Active AWS Region:</span>
                <span className="font-mono font-bold text-emerald-800">{bedrockStatus.region}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-600">Model ID:</span>
                <span className="font-mono text-[11px] font-bold text-stone-800 truncate max-w-[240px]">
                  {bedrockStatus.model_id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-600">Bedrock Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  bedrockStatus.is_configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {bedrockStatus.is_configured ? 'Live API Connected' : 'Deterministic Fallback Active'}
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                <strong>Strict Grounding:</strong> The Bedrock model receives actual calculated energy metrics (kWh, bill totals, top power hogs) and 0/1 knapsack action outputs as context. The model explains results and answers questions without hallucinating numbers.
              </p>
              <div className="p-3 rounded-xl bg-stone-100/80 font-mono text-[11px] text-stone-700 space-y-1">
                <div className="font-bold text-stone-900 font-sans">Setup via Environment Variables (.env):</div>
                <div>AWS_ACCESS_KEY_ID="your_access_key"</div>
                <div>AWS_SECRET_ACCESS_KEY="your_secret_key"</div>
                <div>AWS_REGION="{bedrockStatus.region}"</div>
                <div>BEDROCK_MODEL_ID="{bedrockStatus.model_id}"</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBedrockModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tariff Settings Modal */}
      {showTariffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-stone-900">Electricity Tariff Configuration</h3>
              </div>
              <button
                onClick={() => setShowTariffModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Customize your DISCOM or utility tariff rates. EcoPilot uses this to calculate exact monthly units and monetary costs.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Base Energy Tariff ({tariff.currency}/kWh Unit)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-stone-400 font-medium">{tariff.currency}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Average benchmark in India is ₹7.50 - ₹9.00/unit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fixed Monthly Meter Charges ({tariff.currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-stone-400 font-medium">{tariff.currency}</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={tempFixed}
                    onChange={(e) => setTempFixed(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempUseSlab}
                    onChange={(e) => setTempUseSlab(e.target.checked)}
                    className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 bg-white"
                  />
                  <span className="text-xs font-semibold text-stone-800">Enable Progressive Tiered Slab Pricing</span>
                </label>
                {tempUseSlab && (
                  <div className="mt-2 text-[11px] text-stone-600 space-y-1 font-mono">
                    <div>• 0 - 100 units: {tariff.currency}4.50/unit</div>
                    <div>• 101 - 200 units: {tariff.currency}6.50/unit</div>
                    <div>• 201 - 400 units: {tariff.currency}8.00/unit</div>
                    <div>• 400+ units: {tariff.currency}9.50/unit</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowTariffModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTariff}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Tariff
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
