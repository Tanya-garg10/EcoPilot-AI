"""
EcoPilot AI — FastAPI Backend Application
Exposes validated endpoints for:
  - /api/energy/calculate
  - /api/energy/optimize (0/1 Knapsack DP)
  - /api/energy/simulate (What-If)
  - /api/energy/summary
  - /api/bedrock/chat (Amazon Bedrock Runtime Converse API)
  - /api/bedrock/status
OpenAPI documentation available at /docs
"""

from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.calculation_engine import (
    calculate_monthly_kwh,
    calculate_monthly_cost,
    calculate_appliance_energy,
    calculate_household_summary,
    validate_appliance_input
)
from backend.optimizer import (
    knapsack_01,
    DEFAULT_SAVING_ACTIONS_CATALOG
)
from backend.bedrock_service import (
    converse_with_bedrock,
    check_bedrock_status,
    get_bedrock_config
)

app = FastAPI(
    title="EcoPilot AI — Energy & Budget Optimization API",
    version="1.2.0",
    description="Mathematical household energy calculations, exact 0/1 knapsack optimization, and Amazon Bedrock integration."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Request Models
class ApplianceModel(BaseModel):
    name: str = Field(default="Appliance", description="Human-readable appliance name")
    category: Optional[str] = Field(default="General", description="Category: Cooling, Heating, Lighting, etc.")
    powerWatts: float = Field(..., ge=0, le=25000, description="Rated power in Watts")
    hoursPerDay: float = Field(..., ge=0, le=24, description="Daily operational runtime in hours")
    daysPerMonth: float = Field(default=30.0, ge=1, le=31, description="Operating days per month")
    quantity: int = Field(default=1, ge=1, le=500, description="Number of units")

class CalculateEnergyRequest(BaseModel):
    powerWatts: float = Field(..., ge=0, le=25000)
    hoursPerDay: float = Field(..., ge=0, le=24)
    daysPerMonth: float = Field(default=30.0, ge=1, le=31)
    quantity: int = Field(default=1, ge=1, le=500)
    tariffRate: float = Field(default=8.0, ge=0)
    applianceName: Optional[str] = "Appliance"

class OptimizeBudgetRequest(BaseModel):
    budget: float = Field(..., ge=0, description="Target upfront budget limit in ₹")
    filterCategory: Optional[str] = Field(default=None, description="Optional category filter")

class SimulateWhatIfRequest(BaseModel):
    applianceName: Optional[str] = "Appliance"
    baselineWatts: float = Field(..., ge=0, le=25000)
    baselineHours: float = Field(..., ge=0, le=24)
    simulatedWatts: Optional[float] = Field(default=None, ge=0, le=25000)
    simulatedHours: Optional[float] = Field(default=None, ge=0, le=24)
    tariffRate: float = Field(default=8.0, ge=0)

class HouseholdSummaryRequest(BaseModel):
    appliances: List[ApplianceModel]
    tariffRate: float = Field(default=8.0, ge=0)
    fixedMonthlyCharges: float = Field(default=80.0, ge=0)

class BedrockChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    energySummary: Optional[Dict[str, Any]] = None
    optimizerOutput: Optional[Dict[str, Any]] = None
    conversationHistory: Optional[List[Dict[str, str]]] = None
    region: Optional[str] = None
    modelId: Optional[str] = None

# Health Endpoint
@app.get("/health")
def health():
    return {"status": "healthy", "service": "EcoPilot AI FastAPI Engine"}

# 1. Energy Calculation Endpoint
@app.post("/api/energy/calculate")
def api_calculate_energy(req: CalculateEnergyRequest):
    try:
        kwh = calculate_monthly_kwh(req.powerWatts, req.hoursPerDay, req.daysPerMonth, req.quantity)
        cost = calculate_monthly_cost(kwh, req.tariffRate)
        return {
            "appliance_name": req.applianceName,
            "monthly_kwh": kwh,
            "daily_kwh": round((req.powerWatts * req.quantity * req.hoursPerDay) / 1000.0, 3),
            "monthly_cost": cost,
            "annual_cost": round(cost * 12.0, 2),
            "co2_kg_monthly": round(kwh * 0.82, 2),
            "formula": f"({req.powerWatts}W × {req.quantity} × {req.hoursPerDay}h/d × {req.daysPerMonth}d) ÷ 1000 = {kwh} kWh"
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

# 2. Budget Optimization Endpoint (Exact 0/1 Knapsack)
@app.post("/api/energy/optimize")
def api_optimize_budget(req: OptimizeBudgetRequest):
    try:
        catalog = DEFAULT_SAVING_ACTIONS_CATALOG
        if req.filterCategory and req.filterCategory != "All":
            cat = req.filterCategory.strip().lower()
            catalog = [a for a in catalog if a.get("category", "").lower() == cat]

        result = knapsack_01(catalog, req.budget)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 3. What-If Simulation Endpoint
@app.post("/api/energy/simulate")
def api_simulate_whatif(req: SimulateWhatIfRequest):
    try:
        sim_w = req.simulatedWatts if req.simulatedWatts is not None else req.baselineWatts
        sim_h = req.simulatedHours if req.simulatedHours is not None else req.baselineHours

        base_kwh = calculate_monthly_kwh(req.baselineWatts, req.baselineHours, 30.0, 1)
        base_cost = calculate_monthly_cost(base_kwh, req.tariffRate)

        sim_kwh = calculate_monthly_kwh(sim_w, sim_h, 30.0, 1)
        sim_cost = calculate_monthly_cost(sim_kwh, req.tariffRate)

        kwh_diff = round(base_kwh - sim_kwh, 2)
        cost_diff = round(base_cost - sim_cost, 2)
        pct = round((cost_diff / base_cost) * 100, 1) if base_cost > 0 else 0.0

        return {
            "appliance": req.applianceName,
            "baseline": {
                "power_watts": req.baselineWatts,
                "daily_hours": req.baselineHours,
                "monthly_kwh": base_kwh,
                "monthly_cost": base_cost
            },
            "simulated": {
                "power_watts": sim_w,
                "daily_hours": sim_h,
                "monthly_kwh": sim_kwh,
                "monthly_cost": sim_cost
            },
            "delta": {
                "monthly_kwh_saved": kwh_diff,
                "monthly_cost_saved": cost_diff,
                "annual_cost_saved": round(cost_diff * 12.0, 2),
                "co2_offset_kg_monthly": round(kwh_diff * 0.82, 2),
                "percent_bill_reduction": pct
            },
            "formula_breakdown": f"Baseline ({req.baselineWatts}W × {req.baselineHours}h × 30d = {base_kwh} kWh) vs Proposed ({sim_w}W × {sim_h}h × 30d = {sim_kwh} kWh)"
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

# 4. Household Summary Audit Endpoint
@app.post("/api/energy/summary")
def api_household_summary(req: HouseholdSummaryRequest):
    try:
        app_dicts = [a.model_dump() for a in req.appliances]
        summary = calculate_household_summary(app_dicts, req.tariffRate, req.fixedMonthlyCharges)
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 5. Amazon Bedrock Status & Diagnostics Endpoint
@app.get("/api/bedrock/status")
def api_bedrock_status():
    return check_bedrock_status()

# 6. Amazon Bedrock Conversational Explanation Endpoint
@app.post("/api/bedrock/chat")
def api_bedrock_chat(req: BedrockChatRequest):
    try:
        result = converse_with_bedrock(
            user_prompt=req.prompt,
            energy_summary=req.energySummary,
            optimizer_output=req.optimizerOutput,
            conversation_history=req.conversationHistory,
            custom_region=req.region,
            custom_model_id=req.modelId
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
