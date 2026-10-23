#!/usr/bin/env python3
"""
EcoPilot AI — Model Context Protocol (MCP) Server for Alexa+ Hackathon
Protocol Version: 2025-11-25 (Streamable HTTP / JSON-RPC 2.0)
Exposed Real Tools:
  - calculate_energy_usage
  - estimate_energy_savings
  - optimize_saving_plan (Exact 0/1 Knapsack Dynamic Programming)
  - simulate_energy_action
  - get_impact_summary
"""

import sys
import json
import os
import math
from typing import Any, Dict, List, Tuple
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Protocol Version conforming to MCP 2025-11-25 specification
MCP_PROTOCOL_VERSION = "2025-11-25"
SERVER_NAME = "ecopilot-mcp-server"
SERVER_VERSION = "1.1.0"

# Verified Residential Saving Actions Catalog for 0/1 Knapsack
ACTIONS_CATALOG = [
    {
        "id": "act-ac-thermostat",
        "title": "Set AC to 24°C & Enable Eco Timer",
        "upfront_cost": 0,
        "monthly_savings": 420.0,
        "monthly_kwh_saved": 52.5,
        "category": "Cooling",
        "difficulty": "Zero Effort",
        "tag": "Zero Cost",
        "assumptions": "BEE: 1°C thermostat increase saves ~6% energy; 1h daily auto-off cuts ~45-55 kWh/mo."
    },
    {
        "id": "act-fan-bldc",
        "title": "Upgrade to 28W BLDC Fan",
        "upfront_cost": 2400,
        "monthly_savings": 280.0,
        "monthly_kwh_saved": 35.0,
        "category": "Cooling",
        "difficulty": "DIY",
        "tag": "High ROI",
        "assumptions": "Replaces 75W induction fan with 28W BLDC motor running 12h/day."
    },
    {
        "id": "act-geyser-timer",
        "title": "Smart Geyser Plug / Mechanical Timer",
        "upfront_cost": 750,
        "monthly_savings": 240.0,
        "monthly_kwh_saved": 30.0,
        "category": "Heating",
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Restricts water heater to 45 mins before showers, stopping continuous standby thermal loss."
    },
    {
        "id": "act-led-retrofit",
        "title": "Full Home LED Retrofit (Pack of 6)",
        "upfront_cost": 600,
        "monthly_savings": 180.0,
        "monthly_kwh_saved": 22.5,
        "category": "Lighting",
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Replaces six 40W CFLs with 9W 5-star LEDs running 5h/day."
    },
    {
        "id": "act-ac-clean",
        "title": "AC Condenser Deep Coil Cleaning",
        "upfront_cost": 450,
        "monthly_savings": 310.0,
        "monthly_kwh_saved": 38.8,
        "category": "Cooling",
        "difficulty": "Technician",
        "tag": "Quick Win",
        "assumptions": "Restores airflow and heat rejection, lowering compressor duty cycle by 12-15%."
    },
    {
        "id": "act-smart-strip",
        "title": "Smart Surge Strip (Phantom Load Killer)",
        "upfront_cost": 1100,
        "monthly_savings": 160.0,
        "monthly_kwh_saved": 20.0,
        "category": "Electronics",
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Kills 25-35W 24/7 standby power to TV, console, and AV equipment."
    },
    {
        "id": "act-window-film",
        "title": "Solar Heat-Reflective Window Film",
        "upfront_cost": 1600,
        "monthly_savings": 350.0,
        "monthly_kwh_saved": 43.8,
        "category": "Insulation",
        "difficulty": "DIY",
        "tag": "High ROI",
        "assumptions": "Rejects 65% infrared heat on sun-facing glazing, decreasing room heat load."
    },
    {
        "id": "act-fridge-tuneup",
        "title": "Refrigerator Defrost & Coil Vacuum",
        "upfront_cost": 250,
        "monthly_savings": 120.0,
        "monthly_kwh_saved": 15.0,
        "category": "Kitchen",
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Cleans dust on rear condenser coils, improving compressor heat transfer."
    },
    {
        "id": "act-washing-eco",
        "title": "Cold-Water Wash Cycle Habits",
        "upfront_cost": 0,
        "monthly_savings": 140.0,
        "monthly_kwh_saved": 17.5,
        "category": "Laundry",
        "difficulty": "Zero Effort",
        "tag": "Zero Cost",
        "assumptions": "Heating water consumes 80%+ of wash energy; modern cold detergents clean without internal heaters."
    },
    {
        "id": "act-aerator-tap",
        "title": "Low-Flow Faucet Aerators",
        "upfront_cost": 350,
        "monthly_savings": 150.0,
        "monthly_kwh_saved": 18.8,
        "category": "Habit",
        "difficulty": "DIY",
        "tag": "Quick Win",
        "assumptions": "Cuts hot water draw from 12 L/min to 6 L/min, reducing geyser heating duration."
    }
]

# MCP Tool Schemas
MCP_TOOLS_MANIFEST = [
    {
        "name": "calculate_energy_usage",
        "description": "Calculates monthly kWh consumption and estimated bill for an appliance using exact mathematical formula.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "powerWatts": {"type": "number", "description": "Appliance power rating in Watts (e.g. 1500 for AC)."},
                "hoursPerDay": {"type": "number", "description": "Daily usage in hours (0 to 24)."},
                "daysPerMonth": {"type": "number", "description": "Days active per month (default 30)."},
                "quantity": {"type": "number", "description": "Quantity of appliances (default 1)."},
                "tariffRate": {"type": "number", "description": "Cost per unit in currency (default 8.0)."},
                "applianceName": {"type": "string", "description": "Name of appliance (e.g. 'Air Conditioner')."}
            },
            "required": ["powerWatts", "hoursPerDay"]
        }
    },
    {
        "name": "estimate_energy_savings",
        "description": "Estimates monthly/annual savings, kWh reduction, and payback for a specific energy action.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "actionId": {"type": "string", "description": "Unique action ID or keyword (e.g. 'act-ac-thermostat', 'fan', 'geyser')."},
                "tariffRate": {"type": "number", "description": "Electricity tariff per unit (default 8.0)."}
            },
            "required": ["actionId"]
        }
    },
    {
        "name": "optimize_saving_plan",
        "description": "Runs an exact 0/1 knapsack dynamic programming algorithm to maximize monthly monetary savings under a user budget.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "budget": {"type": "number", "description": "Maximum upfront budget limit (e.g. 500, 1000, 2500)."},
                "filterCategory": {"type": "string", "description": "Optional category filter (Cooling, Heating, Lighting, etc.)."}
            },
            "required": ["budget"]
        }
    },
    {
        "name": "simulate_energy_action",
        "description": "Performs dynamic what-if simulation comparing baseline vs simulated usage hours or hardware wattage.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "applianceName": {"type": "string", "description": "Name of appliance."},
                "baselineWatts": {"type": "number", "description": "Baseline wattage."},
                "baselineHours": {"type": "number", "description": "Baseline daily hours."},
                "simulatedHours": {"type": "number", "description": "Simulated new daily hours."},
                "simulatedWatts": {"type": "number", "description": "Simulated new power in Watts."},
                "tariffRate": {"type": "number", "description": "Tariff rate per unit (default 8.0)."}
            },
            "required": ["baselineWatts", "baselineHours"]
        }
    },
    {
        "name": "get_impact_summary",
        "description": "Audits household energy footprint, itemizes top consumers, and summarizes grid emissions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "tariffRate": {"type": "number", "description": "Tariff rate per unit (default 8.0)."},
                "appliances": {
                    "type": "array",
                    "description": "Optional list of household appliances to calculate.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "powerWatts": {"type": "number"},
                            "hoursPerDay": {"type": "number"},
                            "quantity": {"type": "number"}
                        }
                    }
                }
            }
        }
    }
]

# Exact 0/1 Knapsack Dynamic Programming Business Logic
def knapsack_01_optimizer(items: List[Dict], budget: int, step_size: int = 10) -> Tuple[List[Dict], float, float]:
    """
    Exact 0/1 Knapsack algorithm maximizing monthly savings under upfront budget.
    Guarantees mathematically optimal subset selection.
    """
    safe_budget = max(0, int(budget))
    free_items = [it for it in items if it["upfront_cost"] <= 0]
    paid_items = [it for it in items if it["upfront_cost"] > 0]

    if safe_budget <= 0 or not paid_items:
        total_free_savings = sum(it["monthly_savings"] for it in free_items)
        return free_items, 0.0, round(total_free_savings, 2)

    step = max(1, step_size)
    max_w = safe_budget // step
    n = len(paid_items)

    # 2D DP Table: dp[i][w] = max savings with subset of first i paid items under budget w*step
    dp = [[0.0] * (max_w + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        item = paid_items[i - 1]
        cost_steps = math.ceil(item["upfront_cost"] / step)
        val = item["monthly_savings"]

        for w in range(max_w + 1):
            dp[i][w] = dp[i - 1][w]
            if w >= cost_steps:
                candidate = dp[i - 1][w - cost_steps] + val
                if candidate > dp[i][w]:
                    dp[i][w] = candidate

    # Backtrack to identify selected items
    chosen_paid = []
    curr_w = max_w
    for i in range(n, 0, -1):
        item = paid_items[i - 1]
        cost_steps = math.ceil(item["upfront_cost"] / step)
        if curr_w >= cost_steps and dp[i][curr_w] != dp[i - 1][curr_w]:
            chosen_paid.append(item)
            curr_w -= cost_steps

    chosen_paid.reverse()
    all_selected = free_items + chosen_paid
    total_cost = sum(it["upfront_cost"] for it in chosen_paid)
    total_savings = sum(it["monthly_savings"] for it in all_selected)

    return all_selected, round(total_cost, 2), round(total_savings, 2)

# Tool Dispatcher with Strict Input Validation
def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(arguments, dict):
        raise ValueError("Invalid parameters: 'arguments' must be a JSON object.")

    tariff_raw = arguments.get("tariffRate", 8.0)
    try:
        tariff = float(tariff_raw)
        if tariff < 0:
            raise ValueError()
    except Exception:
        raise ValueError("Field 'tariffRate' must be a non-negative number.")

    if tool_name == "calculate_energy_usage":
        if "powerWatts" not in arguments or "hoursPerDay" not in arguments:
            raise ValueError("Missing required fields: 'powerWatts' and 'hoursPerDay'.")

        try:
            watts = float(arguments["powerWatts"])
            hours = float(arguments["hoursPerDay"])
        except (ValueError, TypeError):
            raise ValueError("'powerWatts' and 'hoursPerDay' must be valid numbers.")

        if watts < 0 or watts > 25000:
            raise ValueError(f"powerWatts must be between 0 and 25000 W (received {watts}).")
        if hours < 0 or hours > 24:
            raise ValueError(f"hoursPerDay must be between 0 and 24 hours (received {hours}).")

        days = float(arguments.get("daysPerMonth", 30))
        qty = float(arguments.get("quantity", 1))
        appliance_name = str(arguments.get("applianceName", "Appliance"))

        if days < 1 or days > 31:
            raise ValueError("daysPerMonth must be between 1 and 31.")
        if qty < 1 or qty > 500:
            raise ValueError("quantity must be between 1 and 500.")

        monthly_kwh = round((watts * hours * days * qty) / 1000.0, 2)
        daily_kwh = round((watts * hours * qty) / 1000.0, 3)
        monthly_cost = round(monthly_kwh * tariff, 2)
        annual_cost = round(monthly_cost * 12, 2)
        co2_monthly_kg = round(monthly_kwh * 0.82, 2)

        return {
            "appliance_name": appliance_name,
            "power_watts": watts,
            "hours_per_day": hours,
            "days_per_month": days,
            "quantity": qty,
            "tariff_rate": tariff,
            "daily_kwh": daily_kwh,
            "monthly_kwh": monthly_kwh,
            "annual_kwh": round(monthly_kwh * 12, 1),
            "monthly_cost": monthly_cost,
            "annual_cost": annual_cost,
            "co2_kg_monthly": co2_monthly_kg,
            "formula": f"({watts} W × {hours} h/day × {days} days × {qty}) ÷ 1000 = {monthly_kwh} kWh/month",
            "assumptions": "Standard test conditions. Actual duty cycles vary with ambient temperatures and inverter modulation."
        }

    elif tool_name == "estimate_energy_savings":
        action_query = str(arguments.get("actionId", "")).strip().lower()
        if not action_query:
            raise ValueError("Missing required field 'actionId'.")

        matched = None
        for it in ACTIONS_CATALOG:
            if it["id"].lower() == action_query or action_query in it["title"].lower() or action_query in it["category"].lower():
                matched = it
                break

        if not matched:
            available_ids = [a["id"] for a in ACTIONS_CATALOG]
            raise ValueError(f"Action '{action_query}' not found. Available IDs: {', '.join(available_ids[:5])}...")

        monthly_savings = matched["monthly_savings"]
        upfront_cost = matched["upfront_cost"]
        payback_months = round(upfront_cost / monthly_savings, 1) if monthly_savings > 0 and upfront_cost > 0 else 0.0

        return {
            "action_id": matched["id"],
            "title": matched["title"],
            "category": matched["category"],
            "upfront_cost": upfront_cost,
            "monthly_savings": monthly_savings,
            "annual_savings": round(monthly_savings * 12, 2),
            "monthly_kwh_saved": matched["monthly_kwh_saved"],
            "payback_months": payback_months,
            "difficulty": matched["difficulty"],
            "tag": matched["tag"],
            "assumptions": matched["assumptions"],
            "disclaimer": "Engineering estimates based on standard Indian residential usage benchmarks (₹8/kWh)."
        }

    elif tool_name == "optimize_saving_plan":
        if "budget" not in arguments:
            raise ValueError("Missing required field 'budget'.")

        try:
            budget = float(arguments["budget"])
            if budget < 0:
                raise ValueError()
        except Exception:
            raise ValueError("'budget' must be a non-negative number.")

        catalog = ACTIONS_CATALOG
        category_filter = arguments.get("filterCategory")
        if category_filter:
            cat_str = str(category_filter).strip().lower()
            catalog = [a for a in catalog if a["category"].lower() == cat_str]

        selected, total_cost, total_savings = knapsack_01_optimizer(catalog, int(budget))
        unallocated = round(budget - total_cost, 2)
        total_kwh_saved = round(sum(a["monthly_kwh_saved"] for a in selected), 2)
        total_co2_saved = round(total_kwh_saved * 0.82, 2)
        payback = round(total_cost / total_savings, 1) if total_savings > 0 and total_cost > 0 else 0.0
        roi_annual = round((total_savings * 12 / total_cost) * 100, 1) if total_cost > 0 else 999.0

        return {
            "budget": budget,
            "algorithm": "0/1 Knapsack Dynamic Programming (Exact Global Optimum)",
            "total_upfront_cost": total_cost,
            "unallocated_budget": unallocated,
            "estimated_monthly_savings": total_savings,
            "estimated_annual_savings": round(total_savings * 12, 2),
            "monthly_kwh_saved": total_kwh_saved,
            "monthly_co2_offset_kg": total_co2_saved,
            "payback_period_months": payback,
            "annual_roi_percent": roi_annual,
            "selected_actions_count": len(selected),
            "recommended_actions": [
                {
                    "id": a["id"],
                    "title": a["title"],
                    "category": a["category"],
                    "upfront_cost": a["upfront_cost"],
                    "monthly_savings": a["monthly_savings"],
                    "tag": a["tag"]
                }
                for a in selected
            ],
            "assumptions": "Maximizes monthly monetary savings within exact budget limit. 0-cost habits included automatically."
        }

    elif tool_name == "simulate_energy_action":
        if "baselineWatts" not in arguments or "baselineHours" not in arguments:
            raise ValueError("Missing required fields: 'baselineWatts' and 'baselineHours'.")

        try:
            base_w = float(arguments["baselineWatts"])
            base_h = float(arguments["baselineHours"])
        except (ValueError, TypeError):
            raise ValueError("'baselineWatts' and 'baselineHours' must be numbers.")

        if base_w < 0 or base_w > 25000:
            raise ValueError("baselineWatts must be between 0 and 25000 W.")
        if base_h < 0 or base_h > 24:
            raise ValueError("baselineHours must be between 0 and 24 hours.")

        sim_h = float(arguments.get("simulatedHours", base_h))
        sim_w = float(arguments.get("simulatedWatts", base_w))

        if sim_h < 0 or sim_h > 24:
            raise ValueError("simulatedHours must be between 0 and 24 hours.")
        if sim_w < 0 or sim_w > 25000:
            raise ValueError("simulatedWatts must be between 0 and 25000 W.")

        appliance_name = str(arguments.get("applianceName", "Appliance"))

        base_kwh = round((base_w * base_h * 30) / 1000.0, 2)
        base_cost = round(base_kwh * tariff, 2)

        sim_kwh = round((sim_w * sim_h * 30) / 1000.0, 2)
        sim_cost = round(sim_kwh * tariff, 2)

        kwh_diff = round(base_kwh - sim_kwh, 2)
        cost_diff = round(base_cost - sim_cost, 2)
        percent_saved = round((cost_diff / base_cost) * 100, 1) if base_cost > 0 else 0.0

        return {
            "appliance": appliance_name,
            "baseline": {
                "power_watts": base_w,
                "daily_hours": base_h,
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
                "annual_cost_saved": round(cost_diff * 12, 2),
                "co2_offset_kg_monthly": round(kwh_diff * 0.82, 2),
                "percent_bill_reduction": percent_saved
            },
            "formula_breakdown": f"Baseline ({base_w}W × {base_h}h × 30d = {base_kwh} kWh) vs Proposed ({sim_w}W × {sim_h}h × 30d = {sim_kwh} kWh)",
            "assumptions": "Calculated deterministically assuming 30 days/month at specified tariff."
        }

    elif tool_name == "get_impact_summary":
        raw_apps = arguments.get("appliances")
        appliances_list = []
        if isinstance(raw_apps, list) and len(raw_apps) > 0:
            for item in raw_apps:
                if isinstance(item, dict):
                    appliances_list.append({
                        "name": str(item.get("name", "Appliance")),
                        "powerWatts": float(item.get("powerWatts", 100)),
                        "hoursPerDay": float(item.get("hoursPerDay", 4)),
                        "quantity": float(item.get("quantity", 1))
                    })
        else:
            appliances_list = [
                {"name": "1.5T Inverter AC (Bedroom)", "powerWatts": 1500, "hoursPerDay": 6, "quantity": 1},
                {"name": "Ceiling Fans (Standard Induction)", "powerWatts": 75, "hoursPerDay": 12, "quantity": 3},
                {"name": "Storage Water Heater (Geyser)", "powerWatts": 2000, "hoursPerDay": 1.5, "quantity": 1},
                {"name": "Double Door Refrigerator", "powerWatts": 250, "hoursPerDay": 10, "quantity": 1},
                {"name": "Home LED Lighting (9W x8)", "powerWatts": 72, "hoursPerDay": 6, "quantity": 1}
            ]

        breakdown = []
        total_kwh = 0.0

        for a in appliances_list:
            kwh = (a["powerWatts"] * a["hoursPerDay"] * 30 * a["quantity"]) / 1000.0
            cost = kwh * tariff
            total_kwh += kwh
            breakdown.append({
                "name": a["name"],
                "monthly_kwh": round(kwh, 2),
                "monthly_cost": round(cost, 2),
                "percentage": 0.0
            })

        total_kwh = round(total_kwh, 2)
        total_cost = round(total_kwh * tariff, 2)

        for b in breakdown:
            b["percentage"] = round((b["monthly_kwh"] / total_kwh) * 100, 1) if total_kwh > 0 else 0.0

        breakdown.sort(key=lambda x: x["monthly_kwh"], reverse=True)
        top_consumer = breakdown[0] if breakdown else None

        return {
            "total_monthly_kwh": total_kwh,
            "total_monthly_bill": total_cost,
            "total_annual_bill": round(total_cost * 12, 2),
            "average_daily_kwh": round(total_kwh / 30.0, 2),
            "total_co2_kg_monthly": round(total_kwh * 0.82, 2),
            "grid_emission_factor": 0.82,
            "highest_consumer": top_consumer,
            "appliance_breakdown": breakdown,
            "assumptions": "Household baseline aggregation based on standard appliance duty cycles."
        }

    else:
        raise ValueError(f"Unknown MCP tool '{tool_name}'.")

# JSON-RPC 2.0 Handler for Streamable HTTP MCP
def process_mcp_jsonrpc(req_data: Dict[str, Any]) -> Dict[str, Any]:
    req_id = req_data.get("id", 1)
    method = req_data.get("method")
    params = req_data.get("params", {})

    if method == "initialize":
        client_version = params.get("protocolVersion", MCP_PROTOCOL_VERSION)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {
                    "tools": {"listChanged": False},
                    "logging": {}
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION,
                    "description": "EcoPilot AI Streamable HTTP Model Context Protocol (MCP) Server"
                }
            }
        }

    elif method == "notifications/initialized":
        # Notification acknowledgment per MCP spec
        return None

    elif method == "ping":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {}
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS_MANIFEST
            }
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32602,
                    "message": "Missing 'name' parameter in tools/call."
                }
            }

        try:
            tool_result = execute_tool(tool_name, arguments)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(tool_result, indent=2)
                        }
                    ]
                }
            }
        except ValueError as ve:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32602,
                    "message": f"Tool execution validation error: {str(ve)}"
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32603,
                    "message": f"Internal tool execution error: {str(e)}"
                }
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32601,
                "message": f"Method '{method}' not implemented."
            }
        }

# Streamable HTTP Request Handler (Pure Python Standard Library — Zero External Deps)
class McpStreamableHttpHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-MCP-Version")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Health / metadata route
        if path in ["/", "/health"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            body = {
                "status": "healthy",
                "server": SERVER_NAME,
                "version": SERVER_VERSION,
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "transport": "Streamable HTTP / SSE",
                "toolsCount": len(MCP_TOOLS_MANIFEST)
            }
            self.wfile.write(json.dumps(body, indent=2).encode("utf-8"))
            return

        # Server-Sent Events (SSE) stream endpoint for Streamable HTTP transport
        if path in ["/mcp", "/mcp/sse", "/sse"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self._send_cors_headers()
            self.end_headers()

            # Send initial endpoint event per Streamable HTTP spec
            endpoint_event = f"event: endpoint\ndata: /mcp\n\n"
            self.wfile.write(endpoint_event.encode("utf-8"))
            self.wfile.flush()
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ["/mcp", "/api/mcp", "/"]:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length).decode("utf-8")

        try:
            req_data = json.loads(raw_body)
        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error: Invalid JSON"}
            }).encode("utf-8"))
            return

        response_payload = process_mcp_jsonrpc(req_data)

        if response_payload is None:
            # Notification without response
            self.send_response(204)
            self._send_cors_headers()
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-MCP-Protocol-Version", MCP_PROTOCOL_VERSION)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(response_payload, indent=2).encode("utf-8"))

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[EcoPilot-MCP] {self.address_string()} - {format % args}\n")

def run_server(port: int = 8000, host: str = "0.0.0.0"):
    server_address = (host, port)
    httpd = HTTPServer(server_address, McpStreamableHttpHandler)
    print(f"================================================================")
    print(f" EcoPilot AI — Streamable HTTP MCP Server v{SERVER_VERSION}")
    print(f" Protocol Version: {MCP_PROTOCOL_VERSION}")
    print(f" Listening on http://{host}:{port}/mcp")
    print(f" Tools Available ({len(MCP_TOOLS_MANIFEST)}):")
    for t in MCP_TOOLS_MANIFEST:
        print(f"   • {t['name']}")
    print(f"================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping MCP Server...")
        httpd.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("MCP_PORT", 8000))
    run_server(port=port)
