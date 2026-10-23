import React, { useState, useMemo } from 'react';
import {
  Activity,
  RotateCcw,
} from 'lucide-react';
import { Appliance, TariffConfig, WhatIfModification } from '../types';
import { simulateWhatIf } from '../engine/whatIfSimulator';

interface WhatIfSimulatorProps {
  appliances: Appliance[];
  tariff: TariffConfig;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ appliances, tariff }) => {
  // Local state of simulated appliance modifications
  // map from applianceId -> { hours?: number, watts?: number }
  const [modifications, setModifications] = useState<Record<string, { hours?: number; watts?: number }>>({});
  const [activeScenario, setActiveScenario] = useState<string>('custom');

  // Convert map to WhatIfModification array
  const modArray: WhatIfModification[] = useMemo(() => {
    const list: WhatIfModification[] = [];
    appliances.forEach((app) => {
      const mod = modifications[app.id];
      if (mod) {
        if (mod.hours !== undefined && mod.hours !== app.hoursPerDay) {
          list.push({
            applianceId: app.id,
            field: 'hoursPerDay',
            oldValue: app.hoursPerDay,
            newValue: mod.hours,
          });
        }
        if (mod.watts !== undefined && mod.watts !== app.powerWatts) {
          list.push({
            applianceId: app.id,
            field: 'powerWatts',
            oldValue: app.powerWatts,
            newValue: mod.watts,
          });
        }
      }
    });
    return list;
  }, [appliances, modifications]);

  // Run simulation calculation
  const simulation = useMemo(() => {
    return simulateWhatIf(appliances, modArray, tariff);
  }, [appliances, modArray, tariff]);

  const handleSliderHours = (id: string, hours: number) => {
    setActiveScenario('custom');
    setModifications((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        hours,
      },
    }));
  };

  const handleSliderWatts = (id: string, watts: number) => {
    setActiveScenario('custom');
    setModifications((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        watts,
      },
    }));
  };

  // Preset Scenarios
  const applyScenario = (scenarioKey: string) => {
    setActiveScenario(scenarioKey);
    const newMods: Record<string, { hours?: number; watts?: number }> = {};

    if (scenarioKey === 'ac-eco') {
      // Find AC appliances and reduce hours by 2
      appliances.forEach((app) => {
        if (app.category === 'Cooling' && app.name.toLowerCase().includes('ac')) {
          newMods[app.id] = { hours: Math.max(2, app.hoursPerDay - 2) };
        }
      });
    } else if (scenarioKey === 'bldc-fans') {
      // Find fans and reduce wattage from 75W to 28W
      appliances.forEach((app) => {
        if (app.name.toLowerCase().includes('fan')) {
          newMods[app.id] = { watts: 28 };
        }
      });
    } else if (scenarioKey === 'geyser-timer') {
      // Find geyser and reduce runtime to 0.75h (45 min)
      appliances.forEach((app) => {
        if (app.name.toLowerCase().includes('geyser') || app.category === 'Heating') {
          newMods[app.id] = { hours: 0.75 };
        }
      });
    } else if (scenarioKey === 'all-eco') {
      // Combine multiple interventions
      appliances.forEach((app) => {
        if (app.category === 'Cooling' && app.name.toLowerCase().includes('ac')) {
          newMods[app.id] = { hours: Math.max(3, app.hoursPerDay - 2) };
        }
        if (app.name.toLowerCase().includes('fan')) {
          newMods[app.id] = { ...newMods[app.id], watts: 28 };
        }
        if (app.name.toLowerCase().includes('geyser')) {
          newMods[app.id] = { ...newMods[app.id], hours: 0.75 };
        }
      });
    } else if (scenarioKey === 'reset') {
      // Reset
    }

    setModifications(newMods);
  };

  const { baseline, simulated, delta } = simulation.comparison;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Activity className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Interactive What-If Simulator</h2>
        </div>
        <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
          Test behavioral shifts and hardware efficiency upgrades before committing. Adjust daily runtime hours or hardware wattage sliders below to immediately observe recalculated monthly bills, kilowatt-hour savings, and carbon impact based on actual mathematical formulas.
        </p>
      </div>

      {/* Preset One-Click Scenarios */}
      <div className="p-5 bg-white border border-stone-200/90 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            One-Click Test Scenarios
          </span>
          <button
            onClick={() => applyScenario('reset')}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => applyScenario('ac-eco')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeScenario === 'ac-eco'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            ❄️ AC Usage Optimization (-2 hrs/day)
          </button>

          <button
            onClick={() => applyScenario('bldc-fans')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeScenario === 'bldc-fans'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            🌀 All Ceiling Fans Upgrade to 28W BLDC
          </button>

          <button
            onClick={() => applyScenario('geyser-timer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeScenario === 'geyser-timer'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            🚿 Geyser Smart Timer (45 mins/day)
          </button>

          <button
            onClick={() => applyScenario('all-eco')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeScenario === 'all-eco'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            ✨ Combined Maximum Eco Impact
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline Card */}
        <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-3 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Current Baseline
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-mono">
            {tariff.currency}{baseline.monthlyCost.toLocaleString()}
            <span className="text-xs text-stone-500 font-normal ml-1">/ month</span>
          </div>
          <div className="text-xs text-stone-600 space-y-1 font-mono">
            <div>Monthly Units: <strong className="text-stone-900">{baseline.monthlyKwh} kWh</strong></div>
            <div>CO₂ Footprint: <strong className="text-stone-900">{baseline.monthlyCo2Kg} kg</strong></div>
          </div>
        </div>

        {/* Simulated Card */}
        <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-3 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Simulated Plan
          </div>
          <div className="text-3xl font-extrabold text-emerald-800 font-mono">
            {tariff.currency}{simulated.monthlyCost.toLocaleString()}
            <span className="text-xs text-stone-500 font-normal ml-1">/ month</span>
          </div>
          <div className="text-xs text-stone-600 space-y-1 font-mono">
            <div>Monthly Units: <strong className="text-emerald-800">{simulated.monthlyKwh} kWh</strong></div>
            <div>CO₂ Footprint: <strong className="text-teal-800">{simulated.monthlyCo2Kg} kg</strong></div>
          </div>
        </div>

        {/* Delta Net Savings Card */}
        <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-3xl space-y-3 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
            <span>Projected Savings</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              -{delta.percentCost}%
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-800 font-mono">
            +{tariff.currency}{delta.monthlyCost.toLocaleString()}
            <span className="text-xs text-stone-600 font-normal ml-1">/ month</span>
          </div>
          <div className="text-xs text-stone-600 space-y-1 font-mono">
            <div>Annual Savings: <strong className="text-emerald-800 font-bold">+{tariff.currency}{delta.annualCostSavings.toLocaleString()}</strong></div>
            <div>Grid Units Saved: <strong className="text-stone-900">+{delta.monthlyKwh} kWh</strong>/mo</div>
          </div>
        </div>
      </div>

      {/* Visual Delta Meter */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-3 shadow-xs">
        <div className="flex justify-between text-xs text-stone-700 font-semibold">
          <span>Electricity Consumption Comparison</span>
          <span className="font-mono text-emerald-700 font-bold">
            {delta.monthlyKwh > 0 ? `Saved ${delta.monthlyKwh} kWh / month` : 'Identical to baseline'}
          </span>
        </div>

        <div className="space-y-2">
          {/* Baseline Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Baseline: {baseline.monthlyKwh} kWh</span>
              <span>100%</span>
            </div>
            <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <div className="h-full bg-stone-400 rounded-full w-full" />
            </div>
          </div>

          {/* Simulated Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-emerald-800 font-medium">
              <span>Simulated: {simulated.monthlyKwh} kWh</span>
              <span>{baseline.monthlyKwh > 0 ? Math.round((simulated.monthlyKwh / baseline.monthlyKwh) * 100) : 100}%</span>
            </div>
            <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{
                  width: `${baseline.monthlyKwh > 0 ? Math.min(100, (simulated.monthlyKwh / baseline.monthlyKwh) * 100) : 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Appliance Simulation Controllers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-stone-900">Appliance-Level Parameter Tuning</h3>
          <span className="text-xs text-stone-500">Sliders override baseline parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {simulation.simulatedAppliances.map((app) => {
            const original = appliances.find((a) => a.id === app.id) || app;
            const hoursMod = modifications[app.id]?.hours ?? original.hoursPerDay;
            const wattsMod = modifications[app.id]?.watts ?? original.powerWatts;
            const isChanged = hoursMod !== original.hoursPerDay || wattsMod !== original.powerWatts;

            return (
              <div
                key={app.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isChanged
                    ? 'bg-white border-emerald-300 shadow-xs'
                    : 'bg-white border-stone-200/90 shadow-xs'
                } space-y-4`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{app.name}</h4>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Baseline: {original.powerWatts}W • {original.hoursPerDay} hrs/day
                    </div>
                  </div>
                  {isChanged && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Modified
                    </span>
                  )}
                </div>

                {/* Hours Slider */}
                <div className="space-y-1.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600 font-medium">Simulated Daily Hours:</span>
                    <span className="font-bold font-mono text-emerald-700">{hoursMod} hrs</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hoursMod}
                    onChange={(e) => handleSliderHours(app.id, parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 bg-stone-200 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Hardware Wattage Slider */}
                <div className="space-y-1.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600 font-medium">Simulated Power Rating:</span>
                    <span className="font-bold font-mono text-teal-800">{wattsMod} Watts</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max={Math.max(original.powerWatts, 2500)}
                    step="5"
                    value={wattsMod}
                    onChange={(e) => handleSliderWatts(app.id, parseInt(e.target.value, 10))}
                    className="w-full accent-teal-600 bg-stone-200 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
