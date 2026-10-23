import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Flame,
  Tv,
  Refrigerator,
  Wind,
  Lightbulb,
  Laptop,
  Shirt,
  Info,
  TrendingUp,
} from 'lucide-react';
import { Appliance, ApplianceCategory, CalculationSummary, TariffConfig } from '../types';
import { validateAppliance } from '../engine/energyCalculator';

interface WattWiseEngineProps {
  appliances: Appliance[];
  setAppliances: React.Dispatch<React.SetStateAction<Appliance[]>>;
  summary: CalculationSummary;
  tariff: TariffConfig;
}

const CATEGORY_ICONS: Record<ApplianceCategory, any> = {
  Cooling: Wind,
  Heating: Flame,
  Lighting: Lightbulb,
  Kitchen: Refrigerator,
  Entertainment: Tv,
  Electronics: Laptop,
  Laundry: Shirt,
  Other: Zap,
};

const PRESET_APPLIANCES: Array<{ name: string; category: ApplianceCategory; watts: number; hours: number; room: string }> = [
  { name: '1.5 Ton Inverter AC', category: 'Cooling', watts: 1500, hours: 6, room: 'Bedroom' },
  { name: 'Energy-Saving BLDC Fan', category: 'Cooling', watts: 28, hours: 10, room: 'Living Room' },
  { name: 'Standard Induction Fan', category: 'Cooling', watts: 75, hours: 12, room: 'Bed 2' },
  { name: 'Instant / Storage Geyser', category: 'Heating', watts: 2000, hours: 1.5, room: 'Bathroom' },
  { name: 'Double Door Refrigerator', category: 'Kitchen', watts: 250, hours: 10, room: 'Kitchen' },
  { name: 'Microwave Oven', category: 'Kitchen', watts: 1200, hours: 0.5, room: 'Kitchen' },
  { name: 'Induction Cooktop', category: 'Kitchen', watts: 1600, hours: 1.5, room: 'Kitchen' },
  { name: 'Gaming Desktop PC', category: 'Electronics', watts: 450, hours: 4, room: 'Study' },
  { name: 'EV Two-Wheeler Charger', category: 'Electronics', watts: 800, hours: 3.5, room: 'Garage' },
  { name: 'Desert Air Cooler', category: 'Cooling', watts: 180, hours: 8, room: 'Balcony Room' },
];

export const WattWiseEngine: React.FC<WattWiseEngineProps> = ({
  appliances,
  setAppliances,
  summary,
  tariff,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ApplianceCategory>('Cooling');
  const [powerWatts, setPowerWatts] = useState('1500');
  const [hoursPerDay, setHoursPerDay] = useState('6');
  const [daysPerMonth, setDaysPerMonth] = useState('30');
  const [quantity, setQuantity] = useState('1');
  const [room, setRoom] = useState('Living Room');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('Cooling');
    setPowerWatts('1000');
    setHoursPerDay('4');
    setDaysPerMonth('30');
    setQuantity('1');
    setRoom('Living Room');
    setFormErrors([]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (app: Appliance) => {
    setEditingId(app.id);
    setName(app.name);
    setCategory(app.category);
    setPowerWatts(app.powerWatts.toString());
    setHoursPerDay(app.hoursPerDay.toString());
    setDaysPerMonth(app.daysPerMonth.toString());
    setQuantity(app.quantity.toString());
    setRoom(app.room || 'General');
    setFormErrors([]);
    setShowAddModal(true);
  };

  const handleSaveAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    const appData: Partial<Appliance> = {
      name: name.trim(),
      category,
      powerWatts: parseFloat(powerWatts),
      hoursPerDay: parseFloat(hoursPerDay),
      daysPerMonth: parseInt(daysPerMonth, 10),
      quantity: parseInt(quantity, 10),
      room: room.trim() || 'General',
    };

    const validation = validateAppliance(appData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingId) {
      setAppliances((prev) =>
        prev.map((a) => (a.id === editingId ? ({ ...a, ...(appData as Appliance), id: editingId } as Appliance) : a))
      );
    } else {
      const newApp: Appliance = {
        ...(appData as Appliance),
        id: `custom-${Date.now()}`,
        isCustom: true,
      };
      setAppliances((prev) => [...prev, newApp]);
    }

    setShowAddModal(false);
  };

  const handleQuickAdd = (preset: typeof PRESET_APPLIANCES[0]) => {
    const newApp: Appliance = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      category: preset.category,
      powerWatts: preset.watts,
      hoursPerDay: preset.hours,
      daysPerMonth: 30,
      quantity: 1,
      room: preset.room,
      isCustom: true,
    };
    setAppliances((prev) => [...prev, newApp]);
  };

  const handleRemoveAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSliderChange = (id: string, hours: number) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, hoursPerDay: hours } : a))
    );
  };

  // Group summary by category
  const categoryTotals = summary.applianceBreakdown.reduce((acc, item) => {
    const cat = item.appliance.category;
    if (!acc[cat]) {
      acc[cat] = { kwh: 0, cost: 0, count: 0 };
    }
    acc[cat].kwh += item.monthlyKwh;
    acc[cat].cost += item.monthlyCost;
    acc[cat].count += item.appliance.quantity;
    return acc;
  }, {} as Record<ApplianceCategory, { kwh: number; cost: number; count: number }>);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">WattWise Calculation Engine</h2>
          </div>
          <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
            Deterministic mathematical energy engine. Computes exact monthly kWh units, electricity costs, and carbon emissions using verified appliance ratings and DISCOM tariffs.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-2xl shadow-xs transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add Appliance</span>
        </button>
      </div>

      {/* Mathematical Formula Verification Proof Card */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Mathematical Formula Proof (Benchmark Case)
            </div>
            <div className="text-sm text-stone-800 mt-0.5 font-medium">
              <span className="font-semibold text-emerald-800">1,500 W</span> AC × <span className="font-semibold text-emerald-800">6 hrs/day</span> × <span className="font-semibold text-emerald-800">30 days</span> ÷ 1,000 = <span className="font-bold text-stone-900">270 kWh/month</span>. At <span className="font-semibold text-emerald-800">{tariff.currency}{tariff.ratePerKwh}/unit</span>, estimated monthly bill = <span className="font-bold text-emerald-800">{tariff.currency}{(270 * tariff.ratePerKwh).toLocaleString()}</span>.
            </div>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 whitespace-nowrap shadow-xs">
          kWh = (Watts × Hours × Days × Qty) ÷ 1,000
        </div>
      </div>

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Estimated Monthly Bill</div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2">
            {tariff.currency}
            {summary.totalMonthlyCost.toLocaleString()}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Annual: {tariff.currency}
            {summary.totalYearlyCost.toLocaleString()}
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Monthly Units</div>
          <div className="text-3xl font-extrabold text-stone-900 mt-2">
            {summary.totalMonthlyKwh.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-stone-500">kWh</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">Daily Avg: {summary.averageDailyKwh} units / day</div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Grid CO₂ Footprint</div>
          <div className="text-3xl font-extrabold text-teal-800 mt-2">
            {summary.totalMonthlyCo2Kg.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-stone-500">kg</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">~{(summary.totalMonthlyCo2Kg / 20).toFixed(1)} mature trees needed to offset</div>
        </div>

        <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Top Energy Hog</div>
          <div className="text-xl font-bold text-amber-700 mt-2 truncate">
            {summary.highestConsumer ? summary.highestConsumer.appliance.name : 'None'}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {summary.highestConsumer
              ? `${summary.highestConsumer.monthlyKwh} kWh (${summary.highestConsumer.percentageOfTotal}% of home total)`
              : 'Add appliances below'}
          </div>
        </div>
      </div>

      {/* Preset Quick Add Catalog */}
      <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Quick Add Preset Household Appliances
          </div>
          <span className="text-[11px] text-stone-500">Click to add with standard Indian wattage benchmarks</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_APPLIANCES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAdd(preset)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-xl text-xs font-medium text-stone-700 hover:text-emerald-900 transition group cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>{preset.name}</span>
              <span className="text-[10px] font-mono text-stone-500">({preset.watts}W)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Appliance List & Live Interactive Usage Sliders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
            <span>Configured Household Appliances</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono border border-stone-200">
              {appliances.length} devices
            </span>
          </h3>
          <span className="text-xs text-stone-500 hidden sm:inline">
            Drag usage sliders to see instant bill recalculations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.applianceBreakdown.map((item) => {
            const app = item.appliance;
            const Icon = CATEGORY_ICONS[app.category] || Zap;
            return (
              <div
                key={app.id}
                className="p-5 bg-white border border-stone-200/90 hover:border-emerald-200 rounded-2xl space-y-4 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-base">{app.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[11px] text-stone-700 border border-stone-200">
                          {app.powerWatts} W
                        </span>
                        <span>•</span>
                        <span>{app.room || 'General'}</span>
                        <span>•</span>
                        <span>Qty: {app.quantity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(app)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                      title="Edit Appliance"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveAppliance(app.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Remove Appliance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Usage Slider */}
                <div className="space-y-1.5 bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600 flex items-center gap-1 font-medium">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      Daily Runtime:
                    </span>
                    <span className="font-bold font-mono text-emerald-700">
                      {app.hoursPerDay} hrs / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={app.hoursPerDay}
                    onChange={(e) => handleSliderChange(app.id, parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 bg-stone-200 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>24h</span>
                  </div>
                </div>

                {/* Calculation Output Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <div>
                    <span className="text-stone-500">Monthly: </span>
                    <span className="font-bold font-mono text-stone-800">{item.monthlyKwh} kWh</span>
                    <span className="text-stone-500 text-[11px] ml-1">({item.percentageOfTotal}%)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500">Estimated Cost: </span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {tariff.currency}
                      {item.monthlyCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Consumption Breakdown Section */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-4 shadow-xs">
        <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span>Category Share Breakdown</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(categoryTotals).map(([cat, val]) => (
            <div key={cat} className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl">
              <div className="text-xs font-semibold text-stone-500">{cat}</div>
              <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
                {tariff.currency}
                {Math.round(val.cost).toLocaleString()}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {Math.round(val.kwh)} kWh ({summary.totalMonthlyKwh > 0 ? Math.round((val.kwh / summary.totalMonthlyKwh) * 100) : 0}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Appliance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-stone-900">
                {editingId ? 'Edit Appliance' : 'Add Custom Household Appliance'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                {formErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveAppliance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Appliance Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Master Bed Split AC"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ApplianceCategory)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="Cooling">Cooling (AC, Fan, Cooler)</option>
                    <option value="Heating">Heating (Geyser, Room Heater)</option>
                    <option value="Lighting">Lighting (LED, CFL)</option>
                    <option value="Kitchen">Kitchen (Fridge, Microwave, Induction)</option>
                    <option value="Entertainment">Entertainment (TV, Audio, Console)</option>
                    <option value="Electronics">Electronics (Laptop, Router, EV)</option>
                    <option value="Laundry">Laundry (Washing Machine, Iron)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Rated Power (Watts)</label>
                  <input
                    type="number"
                    min="1"
                    max="25000"
                    required
                    value={powerWatts}
                    onChange={(e) => setPowerWatts(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Daily Usage (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    required
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Days / Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={daysPerMonth}
                    onChange={(e) => setDaysPerMonth(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Room / Zone</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Bedroom"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Add Appliance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
