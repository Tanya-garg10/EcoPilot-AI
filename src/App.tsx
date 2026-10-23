/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { Appliance, TariffConfig } from './types';
import { calculateSummary, DEFAULT_APPLIANCES, DEFAULT_TARIFF } from './engine/energyCalculator';

export default function App() {
  // Routing view state: 'landing' or 'dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>(() => {
    try {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('app') || path.includes('/app')) {
        return 'dashboard';
      }
    } catch {}
    return 'landing';
  });

  // Initial tab and budget passed from landing page interactions
  const [dashboardInitialTab, setDashboardInitialTab] = useState<string>('overview');
  const [dashboardInitialBudget, setDashboardInitialBudget] = useState<number>(1000);

  // Appliances state with localStorage persistence
  const [appliances, setAppliances] = useState<Appliance[]>(() => {
    try {
      const saved = localStorage.getItem('ecopilot_appliances');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_APPLIANCES;
  });

  // Tariff config state
  const [tariff, setTariff] = useState<TariffConfig>(() => {
    try {
      const saved = localStorage.getItem('ecopilot_tariff');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TARIFF;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecopilot_appliances', JSON.stringify(appliances));
    } catch {}
  }, [appliances]);

  useEffect(() => {
    try {
      localStorage.setItem('ecopilot_tariff', JSON.stringify(tariff));
    } catch {}
  }, [tariff]);

  // Handle browser back/forward buttons with popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('app') || path.includes('/app')) {
        setCurrentView('dashboard');
        if (hash.includes('optimizer')) setDashboardInitialTab('optimizer');
        else if (hash.includes('simulator')) setDashboardInitialTab('simulator');
        else if (hash.includes('assistant')) setDashboardInitialTab('assistant');
        else if (hash.includes('appliances')) setDashboardInitialTab('appliances');
      } else {
        setCurrentView('landing');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Aggregate calculations
  const summary = useMemo(() => {
    return calculateSummary(appliances, tariff);
  }, [appliances, tariff]);

  const handleStartOptimizing = () => {
    setCurrentView('dashboard');
    setDashboardInitialTab('overview');
    window.location.hash = '#/app';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenOptimizerWithBudget = (budget: number) => {
    setDashboardInitialBudget(budget);
    setDashboardInitialTab('optimizer');
    setCurrentView('dashboard');
    window.location.hash = '#/app/optimizer';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentView('landing');
    window.location.hash = '#/';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetDemoData = () => {
    setAppliances(DEFAULT_APPLIANCES);
    setTariff(DEFAULT_TARIFF);
    localStorage.removeItem('ecopilot_appliances');
    localStorage.removeItem('ecopilot_tariff');
  };

  return (
    <div className="min-h-screen bg-[#F8F8F2] text-[#172C26] antialiased">
      {currentView === 'landing' ? (
        <LandingPage
          onStartOptimizing={handleStartOptimizing}
          onOpenOptimizerWithBudget={handleOpenOptimizerWithBudget}
          appliances={appliances}
          tariff={tariff}
          totalMonthlyCost={summary.totalMonthlyCost}
          totalMonthlyKwh={summary.totalMonthlyKwh}
        />
      ) : (
        <DashboardView
          appliances={appliances}
          setAppliances={setAppliances}
          tariff={tariff}
          setTariff={setTariff}
          summary={summary}
          onBackToHome={handleBackToHome}
          onResetDemoData={handleResetDemoData}
          initialTab={dashboardInitialTab}
          initialBudget={dashboardInitialBudget}
        />
      )}
    </div>
  );
}
