"""
EcoPilot AI — Deterministic Energy Calculation Engine
All energy calculations and units are strictly deterministic.
Formula:
  monthly_kWh = (power_watts × quantity × hours_per_day × days_per_month) / 1000
  monthly_cost = monthly_kWh × tariff_per_kWh
"""

from typing import Dict, List, Any, Optional

def validate_appliance_input(watts: float, hours_per_day: float, days_per_month: float = 30, quantity: int = 1) -> None:
    """Validates appliance inputs against physically plausible residential bounds."""
    if watts < 0:
        raise ValueError(f"Appliance wattage cannot be negative (received {watts}W).")
    if watts > 25000:
        raise ValueError(f"Appliance wattage exceeds standard residential threshold of 25,000W (received {watts}W).")
    if hours_per_day < 0 or hours_per_day > 24:
        raise ValueError(f"Hours per day must be between 0 and 24 (received {hours_per_day}h).")
    if days_per_month < 1 or days_per_month > 31:
        raise ValueError(f"Days per month must be between 1 and 31 (received {days_per_month}d).")
    if quantity < 1 or quantity > 500:
        raise ValueError(f"Quantity must be at least 1 and at most 500 (received {quantity}).")

def calculate_monthly_kwh(power_watts: float, hours_per_day: float, days_per_month: float = 30.0, quantity: int = 1) -> float:
    """
    Computes monthly electrical energy consumption in kilowatt-hours (kWh / units).
    Formula: (W × hours/day × days/month × quantity) / 1000
    """
    validate_appliance_input(power_watts, hours_per_day, days_per_month, quantity)
    kwh = (power_watts * quantity * hours_per_day * days_per_month) / 1000.0
    return round(kwh, 2)

def calculate_monthly_cost(kwh: float, tariff_per_kwh: float = 8.0, fixed_charges: float = 0.0) -> float:
    """
    Computes total estimated electricity cost for given energy units.
    Cost = (kWh × tariff) + fixed_charges
    """
    if kwh < 0:
        raise ValueError(f"kWh cannot be negative (received {kwh}).")
    if tariff_per_kwh < 0:
        raise ValueError(f"Tariff rate cannot be negative (received {tariff_per_kwh}).")
    cost = (kwh * tariff_per_kwh) + fixed_charges
    return round(cost, 2)

def calculate_appliance_energy(appliance: Dict[str, Any], tariff_rate: float = 8.0) -> Dict[str, Any]:
    """
    Calculates detailed metrics for a single appliance.
    """
    watts = float(appliance.get("powerWatts", appliance.get("power_watts", 0)))
    hours = float(appliance.get("hoursPerDay", appliance.get("hours_per_day", 0)))
    days = float(appliance.get("daysPerMonth", appliance.get("days_per_month", 30)))
    qty = int(appliance.get("quantity", 1))
    name = appliance.get("name", "Appliance")
    category = appliance.get("category", "General")

    monthly_kwh = calculate_monthly_kwh(watts, hours, days, qty)
    daily_kwh = round((watts * qty * hours) / 1000.0, 3)
    monthly_cost = calculate_monthly_cost(monthly_kwh, tariff_rate)
    annual_cost = round(monthly_cost * 12.0, 2)
    co2_kg_monthly = round(monthly_kwh * 0.82, 2)  # 0.82 kg CO2 / kWh grid factor

    return {
        "name": name,
        "category": category,
        "power_watts": watts,
        "hours_per_day": hours,
        "days_per_month": days,
        "quantity": qty,
        "daily_kwh": daily_kwh,
        "monthly_kwh": monthly_kwh,
        "annual_kwh": round(monthly_kwh * 12.0, 1),
        "monthly_cost": monthly_cost,
        "annual_cost": annual_cost,
        "co2_kg_monthly": co2_kg_monthly,
        "formula": f"({watts}W × {qty} × {hours}h/d × {days}d) ÷ 1000 = {monthly_kwh} kWh"
    }

def calculate_household_summary(appliances: List[Dict[str, Any]], tariff_rate: float = 8.0, fixed_monthly_charges: float = 80.0) -> Dict[str, Any]:
    """
    Aggregates consumption across all configured household appliances.
    """
    breakdown = []
    total_monthly_kwh = 0.0

    for app in appliances:
        res = calculate_appliance_energy(app, tariff_rate)
        total_monthly_kwh += res["monthly_kwh"]
        breakdown.append(res)

    total_monthly_kwh = round(total_monthly_kwh, 2)
    total_energy_cost = round(total_monthly_kwh * tariff_rate, 2)
    total_bill_with_fixed = round(total_energy_cost + fixed_monthly_charges, 2)

    # Compute percentage shares
    for item in breakdown:
        item["share_percent"] = round((item["monthly_kwh"] / total_monthly_kwh) * 100, 1) if total_monthly_kwh > 0 else 0.0

    # Sort descending by energy consumption
    breakdown.sort(key=lambda x: x["monthly_kwh"], reverse=True)
    highest_consumer = breakdown[0] if breakdown else None

    return {
        "total_monthly_kwh": total_monthly_kwh,
        "total_energy_cost": total_energy_cost,
        "fixed_monthly_charges": fixed_monthly_charges,
        "total_monthly_bill": total_bill_with_fixed,
        "total_annual_bill": round(total_bill_with_fixed * 12.0, 2),
        "average_daily_kwh": round(total_monthly_kwh / 30.0, 2),
        "total_co2_kg_monthly": round(total_monthly_kwh * 0.82, 2),
        "highest_consumer": highest_consumer,
        "appliance_breakdown": breakdown,
        "assumptions": "Deterministic engineering estimates based on rated wattage and constant daily duty cycles. Actual consumption varies with local temperature and appliance maintenance."
    }
