"""
EcoPilot AI — Budget-Aware Savings Optimizer
Implements exact 0/1 Knapsack Dynamic Programming algorithm.
Guarantees global mathematical optimum (maximizes monthly savings under upfront budget).
"""

import math
from typing import List, Dict, Any, Tuple

DEFAULT_SAVING_ACTIONS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "act-ac-thermostat",
        "title": "Set AC to 24°C & Enable Eco Timer",
        "category": "Cooling",
        "description": "Raise thermostat from 18-20°C to 24°C and enable 1-hour sleep auto-off.",
        "upfront_cost": 0.0,
        "monthly_savings": 420.0,
        "monthly_kwh_saved": 52.5,
        "difficulty": "Zero Effort",
        "tag": "Zero Cost",
        "assumptions": "BEE: 1°C increase saves ~6% electricity; 1h runtime reduction cuts 45-55 kWh/mo."
    },
    {
        "id": "act-fan-bldc",
        "title": "Upgrade to 28W BLDC Motor Ceiling Fan",
        "category": "Cooling",
        "description": "Replace 75W induction ceiling fan with 5-star Brushless DC motor fan.",
        "upfront_cost": 2400.0,
        "monthly_savings": 280.0,
        "monthly_kwh_saved": 35.0,
        "difficulty": "DIY",
        "tag": "High ROI",
        "assumptions": "Consumes 28W instead of 75W (saving 47W) over 12h/day runtime."
    },
    {
        "id": "act-geyser-timer",
        "title": "Smart Geyser Plug / Mechanical Timer",
        "category": "Heating",
        "description": "Automate 2kW water heater to heat for 45 minutes before morning showers.",
        "upfront_cost": 750.0,
        "monthly_savings": 240.0,
        "monthly_kwh_saved": 30.0,
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Eliminates continuous standby reheating and accidental multi-hour running."
    },
    {
        "id": "act-led-retrofit",
        "title": "Full Home LED Retrofit (Pack of 6 Bulbs)",
        "category": "Lighting",
        "description": "Replace 40W CFL or incandescent bulbs with 9W 5-star LEDs.",
        "upfront_cost": 600.0,
        "monthly_savings": 180.0,
        "monthly_kwh_saved": 22.5,
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Six bulbs running 5h/day; saving 186W continuous lighting load."
    },
    {
        "id": "act-ac-clean",
        "title": "AC Condenser Deep Coil Cleaning",
        "category": "Cooling",
        "description": "Wash outdoor condenser fins to restore airflow and compressor heat transfer.",
        "upfront_cost": 450.0,
        "monthly_savings": 310.0,
        "monthly_kwh_saved": 38.8,
        "difficulty": "Technician",
        "tag": "Quick Win",
        "assumptions": "Restoring heat transfer lowers compressor head pressure and duty cycle by 12-15%."
    },
    {
        "id": "act-smart-strip",
        "title": "Smart Power Strip (Phantom Load Killer)",
        "category": "Electronics",
        "description": "Cuts 100% standby power to TV, console, and printer when powered off.",
        "upfront_cost": 1100.0,
        "monthly_savings": 160.0,
        "monthly_kwh_saved": 20.0,
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Eliminates 25-35W vampire load running 24/7."
    },
    {
        "id": "act-window-film",
        "title": "Solar Heat-Reflective Window Film",
        "category": "Insulation",
        "description": "Block 65% infrared heat on sun-facing glazing to reduce room heat load.",
        "upfront_cost": 1600.0,
        "monthly_savings": 350.0,
        "monthly_kwh_saved": 43.8,
        "difficulty": "DIY",
        "tag": "High ROI",
        "assumptions": "Reduces room ambient temp by 4-5°C, reducing AC compressor on-time."
    },
    {
        "id": "act-fridge-tuneup",
        "title": "Refrigerator Defrost & Coil Vacuum",
        "category": "Kitchen",
        "description": "Clean rear coils and replace leaking door gasket seal.",
        "upfront_cost": 250.0,
        "monthly_savings": 120.0,
        "monthly_kwh_saved": 15.0,
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Clean coils reduce compressor run duration by 20% per refrigeration cycle."
    },
    {
        "id": "act-washing-eco",
        "title": "Cold-Water Wash Cycle Habits",
        "category": "Laundry",
        "description": "Run washing machine on cold wash setting (30°C) with full loads.",
        "upfront_cost": 0.0,
        "monthly_savings": 140.0,
        "monthly_kwh_saved": 17.5,
        "difficulty": "Zero Effort",
        "tag": "Zero Cost",
        "assumptions": "Water heating accounts for 80%+ of washing machine electricity consumption."
    },
    {
        "id": "act-aerator-tap",
        "title": "Faucet Aerators & Low-Flow Showerhead",
        "category": "Habit",
        "description": "Reduce hot water flow rate from 12 L/min to 6 L/min without pressure loss.",
        "upfront_cost": 350.0,
        "monthly_savings": 150.0,
        "monthly_kwh_saved": 18.8,
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Cuts hot water volume by 40%, directly lowering geyser heating duration."
    }
]

def knapsack_01(actions: List[Dict[str, Any]], budget: float, step_size: int = 10) -> Dict[str, Any]:
    """
    Solves 0/1 Knapsack problem using Dynamic Programming.
    Maximizes \sum(monthly_savings) subject to \sum(upfront_cost) <= budget.
    """
    safe_budget = max(0, int(budget))
    free_actions = [a for a in actions if a["upfront_cost"] <= 0]
    paid_actions = [a for a in actions if a["upfront_cost"] > 0]

    if safe_budget <= 0 or not paid_actions:
        total_free_savings = sum(a["monthly_savings"] for a in free_actions)
        total_free_kwh = sum(a["monthly_kwh_saved"] for a in free_actions)
        return {
            "budget": safe_budget,
            "algorithm": "0/1 Knapsack Dynamic Programming (Exact Global Optimum)",
            "total_upfront_cost": 0.0,
            "unallocated_budget": float(safe_budget),
            "estimated_monthly_savings": round(total_free_savings, 2),
            "estimated_annual_savings": round(total_free_savings * 12.0, 2),
            "monthly_kwh_saved": round(total_free_kwh, 2),
            "monthly_co2_offset_kg": round(total_free_kwh * 0.82, 2),
            "payback_period_months": 0.0,
            "annual_roi_percent": 999.0 if total_free_savings > 0 else 0.0,
            "selected_actions_count": len(free_actions),
            "recommended_actions": free_actions,
            "assumptions": "Includes all zero-cost habit interventions since they require zero financial expenditure."
        }

    step = max(1, step_size)
    max_w = safe_budget // step
    n = len(paid_actions)

    # dp[i][w] = maximum monthly savings achievable with subset of first i items under scaled budget w
    dp = [[0.0] * (max_w + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        item = paid_actions[i - 1]
        cost_steps = math.ceil(item["upfront_cost"] / step)
        val = item["monthly_savings"]

        for w in range(max_w + 1):
            dp[i][w] = dp[i - 1][w]
            if w >= cost_steps:
                candidate = dp[i - 1][w - cost_steps] + val
                if candidate > dp[i][w]:
                    dp[i][w] = candidate

    # Trace back to recover exact subset of items
    chosen_paid = []
    curr_w = max_w
    for i in range(n, 0, -1):
        item = paid_actions[i - 1]
        cost_steps = math.ceil(item["upfront_cost"] / step)
        if curr_w >= cost_steps and dp[i][curr_w] != dp[i - 1][curr_w]:
            chosen_paid.append(item)
            curr_w -= cost_steps

    chosen_paid.reverse()
    all_selected = free_actions + chosen_paid

    total_upfront_cost = sum(a["upfront_cost"] for a in chosen_paid)
    total_monthly_savings = sum(a["monthly_savings"] for a in all_selected)
    total_kwh_saved = sum(a["monthly_kwh_saved"] for a in all_selected)
    unallocated = round(safe_budget - total_upfront_cost, 2)
    payback_months = round(total_upfront_cost / total_monthly_savings, 1) if total_monthly_savings > 0 and total_upfront_cost > 0 else 0.0
    roi_annual = round((total_monthly_savings * 12.0 / total_upfront_cost) * 100, 1) if total_upfront_cost > 0 else 999.0

    return {
        "budget": safe_budget,
        "algorithm": "0/1 Knapsack Dynamic Programming (Exact Global Optimum)",
        "total_upfront_cost": round(total_upfront_cost, 2),
        "unallocated_budget": unallocated,
        "estimated_monthly_savings": round(total_monthly_savings, 2),
        "estimated_annual_savings": round(total_monthly_savings * 12.0, 2),
        "monthly_kwh_saved": round(total_kwh_saved, 2),
        "monthly_co2_offset_kg": round(total_kwh_saved * 0.82, 2),
        "payback_period_months": payback_months,
        "annual_roi_percent": roi_annual,
        "selected_actions_count": len(all_selected),
        "recommended_actions": all_selected,
        "assumptions": "Maximizes estimated monthly monetary return within user budget. Illustrative engineering estimates; actual savings depend on household usage."
    }
