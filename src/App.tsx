/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AlexaSimulatedExperience } from './components/AlexaSimulatedExperience';
import { WattWiseEngine } from './components/WattWiseEngine';
import { BudgetOptimizer } from './components/BudgetOptimizer';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { McpProtocolHub } from './components/McpProtocolHub';
import { SubmissionChecklist } from './components/SubmissionChecklist';
import { Appliance, TariffConfig } from './types';
import { calculateSummary, DEFAULT_APPLIANCES, DEFAULT_TARIFF } from './engine/energyCalculator';
import { Leaf, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('alexa');

  // Appliances state with localStorage persistence
  const [appliances, setAppliances] = useState<Appliance[]>(() => {
    try {
      const saved = localStorage.getItem('ecopilot_appliances');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_APPLIANCES;
  });

  // Tariff config state
  const [tariff, setTariff] = useState<TariffConfig>(() => {
    try {
      const saved = localStorage.getItem('ecopilot_tariff');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TARIFF;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecopilot_appliances', JSON.stringify(appliances));
    } catch (e) {}
  }, [appliances]);

  useEffect(() => {
    try {
      localStorage.setItem('ecopilot_tariff', JSON.stringify(tariff));
    } catch (e) {}
  }, [tariff]);

  // Aggregate calculations
  const summary = useMemo(() => {
    return calculateSummary(appliances, tariff);
  }, [appliances, tariff]);

  const handleResetDemoData = () => {
    setAppliances(DEFAULT_APPLIANCES);
    setTariff(DEFAULT_TARIFF);
    localStorage.removeItem('ecopilot_appliances');
    localStorage.removeItem('ecopilot_tariff');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        tariff={tariff}
        setTariff={setTariff}
        totalMonthlyCost={summary.totalMonthlyCost}
        totalMonthlyKwh={summary.totalMonthlyKwh}
        totalMonthlyCo2={summary.totalMonthlyCo2Kg}
        onResetDemoData={handleResetDemoData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'alexa' && (
          <AlexaSimulatedExperience
            appliances={appliances}
            tariff={tariff}
            totalMonthlyCost={summary.totalMonthlyCost}
            totalMonthlyKwh={summary.totalMonthlyKwh}
          />
        )}

        {currentTab === 'wattwise' && (
          <WattWiseEngine
            appliances={appliances}
            setAppliances={setAppliances}
            summary={summary}
            tariff={tariff}
          />
        )}

        {currentTab === 'optimizer' && <BudgetOptimizer tariff={tariff} />}

        {currentTab === 'whatif' && (
          <WhatIfSimulator appliances={appliances} tariff={tariff} />
        )}

        {currentTab === 'mcp' && <McpProtocolHub tariff={tariff} />}

        {currentTab === 'checklist' && (
          <SubmissionChecklist onNavigateTab={(tab) => setCurrentTab(tab)} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 mt-12 py-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-900">EcoPilot AI</span>
            <span>— Intelligent Mathematical Energy Engine & 0/1 Knapsack Optimizer</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Amazon Bedrock & Streamable HTTP MCP (2025-11-25)</span>
            </span>
            <span>•</span>
            <span>Illustrative Engineering Estimates</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
