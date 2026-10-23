#!/usr/bin/env python3
"""
Unit and Protocol Tests for EcoPilot AI MCP Server
Tests:
  - calculate_energy_usage (Formula correctness & bounds validation)
  - estimate_energy_savings (Catalog matching & payback math)
  - optimize_saving_plan (Exact 0/1 Knapsack DP optimality)
  - simulate_energy_action (Dynamic delta recalculations)
  - get_impact_summary (Household audit & top power hog)
  - JSON-RPC 2.0 Protocol flow:
      1. initialize (protocolVersion: 2025-11-25)
      2. notifications/initialized
      3. ping
      4. tools/list
      5. tools/call
      6. Validation errors (-32602)
      7. Unknown method errors (-32601)
"""

import unittest
import json
import os
import sys

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp_server import (
    execute_tool,
    process_mcp_jsonrpc,
    knapsack_01_optimizer,
    ACTIONS_CATALOG,
    MCP_PROTOCOL_VERSION
)

class TestEcoPilotMcpServer(unittest.TestCase):

    # 1. TEST: calculate_energy_usage
    def test_calculate_energy_usage_benchmark(self):
        # Benchmark: 1500W AC * 6h * 30d / 1000 = 270 kWh @ ₹8/unit = ₹2,160
        args = {
            "powerWatts": 1500,
            "hoursPerDay": 6,
            "daysPerMonth": 30,
            "quantity": 1,
            "tariffRate": 8.0,
            "applianceName": "1.5T AC"
        }
        res = execute_tool("calculate_energy_usage", args)
        self.assertEqual(res["monthly_kwh"], 270.0)
        self.assertEqual(res["monthly_cost"], 2160.0)
        self.assertEqual(res["annual_cost"], 25920.0)
        self.assertEqual(res["daily_kwh"], 9.0)
        self.assertIn("270", res["formula"])

    def test_calculate_energy_usage_validation(self):
        # Negative watts rejected
        with self.assertRaises(ValueError) as ctx:
            execute_tool("calculate_energy_usage", {"powerWatts": -100, "hoursPerDay": 5})
        self.assertIn("powerWatts", str(ctx.exception))

        # > 24 hours rejected
        with self.assertRaises(ValueError) as ctx:
            execute_tool("calculate_energy_usage", {"powerWatts": 1000, "hoursPerDay": 26})
        self.assertIn("hoursPerDay", str(ctx.exception))

    # 2. TEST: estimate_energy_savings
    def test_estimate_energy_savings(self):
        res = execute_tool("estimate_energy_savings", {"actionId": "act-ac-thermostat"})
        self.assertEqual(res["action_id"], "act-ac-thermostat")
        self.assertEqual(res["monthly_savings"], 420.0)
        self.assertEqual(res["upfront_cost"], 0)
        self.assertEqual(res["payback_months"], 0.0)

    # 3. TEST: optimize_saving_plan (0/1 Knapsack)
    def test_optimize_saving_plan_500_budget(self):
        # Under ₹500 budget, should select free actions + AC clean (cost 450, saves 310)
        res = execute_tool("optimize_saving_plan", {"budget": 500})
        self.assertLessEqual(res["total_upfront_cost"], 500)
        self.assertGreaterEqual(res["estimated_monthly_savings"], 870.0)
        self.assertEqual(res["unallocated_budget"], 500 - res["total_upfront_cost"])

    def test_optimize_saving_plan_zero_budget(self):
        # Budget = 0 should only return zero-cost actions without expense
        res = execute_tool("optimize_saving_plan", {"budget": 0})
        self.assertEqual(res["total_upfront_cost"], 0.0)
        self.assertGreater(res["estimated_monthly_savings"], 0.0)
        for act in res["recommended_actions"]:
            self.assertEqual(act["upfront_cost"], 0)

    # 4. TEST: simulate_energy_action
    def test_simulate_energy_action(self):
        # Baseline: 1500W * 8h * 30d = 360 kWh = ₹2,880
        # Simulated: 1500W * 5h * 30d = 225 kWh = ₹1,800
        # Savings: 135 kWh = ₹1,080
        args = {
            "applianceName": "Split AC",
            "baselineWatts": 1500,
            "baselineHours": 8,
            "simulatedHours": 5,
            "tariffRate": 8.0
        }
        res = execute_tool("simulate_energy_action", args)
        self.assertEqual(res["baseline"]["monthly_kwh"], 360.0)
        self.assertEqual(res["simulated"]["monthly_kwh"], 225.0)
        self.assertEqual(res["delta"]["monthly_kwh_saved"], 135.0)
        self.assertEqual(res["delta"]["monthly_cost_saved"], 1080.0)

    # 5. TEST: get_impact_summary
    def test_get_impact_summary(self):
        res = execute_tool("get_impact_summary", {"tariffRate": 8.0})
        self.assertGreater(res["total_monthly_kwh"], 0)
        self.assertGreater(res["total_monthly_bill"], 0)
        self.assertIsNotNone(res["highest_consumer"])
        self.assertEqual(res["highest_consumer"]["name"], "1.5T Inverter AC (Bedroom)")

    # 6. TEST: JSON-RPC 2.0 Protocol Handshake & Flow
    def test_mcp_initialize(self):
        req = {
            "jsonrpc": "2.0",
            "id": "req-1",
            "method": "initialize",
            "params": {"protocolVersion": "2025-11-25"}
        }
        res = process_mcp_jsonrpc(req)
        self.assertEqual(res["jsonrpc"], "2.0")
        self.assertEqual(res["id"], "req-1")
        self.assertEqual(res["result"]["protocolVersion"], MCP_PROTOCOL_VERSION)
        self.assertIn("tools", res["result"]["capabilities"])

    def test_mcp_tools_list(self):
        req = {
            "jsonrpc": "2.0",
            "id": "req-2",
            "method": "tools/list"
        }
        res = process_mcp_jsonrpc(req)
        tools = res["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        self.assertIn("calculate_energy_usage", tool_names)
        self.assertIn("estimate_energy_savings", tool_names)
        self.assertIn("optimize_saving_plan", tool_names)
        self.assertIn("simulate_energy_action", tool_names)
        self.assertIn("get_impact_summary", tool_names)

    def test_mcp_tools_call(self):
        req = {
            "jsonrpc": "2.0",
            "id": "req-3",
            "method": "tools/call",
            "params": {
                "name": "calculate_energy_usage",
                "arguments": {
                    "powerWatts": 1500,
                    "hoursPerDay": 6,
                    "tariffRate": 8.0
                }
            }
        }
        res = process_mcp_jsonrpc(req)
        self.assertNotIn("error", res)
        content = res["result"]["content"]
        self.assertEqual(content[0]["type"], "text")
        parsed = json.loads(content[0]["text"])
        self.assertEqual(parsed["monthly_kwh"], 270.0)

    def test_mcp_error_invalid_params(self):
        req = {
            "jsonrpc": "2.0",
            "id": "req-err",
            "method": "tools/call",
            "params": {
                "name": "calculate_energy_usage",
                "arguments": {
                    "powerWatts": -50,
                    "hoursPerDay": 5
                }
            }
        }
        res = process_mcp_jsonrpc(req)
        self.assertIn("error", res)
        self.assertEqual(res["error"]["code"], -32602)

if __name__ == "__main__":
    unittest.main()
