"""
Automated Test Suite for EcoPilot AI Backend
Tests:
  - Energy Calculation Engine (Formulas, zero usage, boundary validations)
  - 0/1 Knapsack Optimizer (Exact DP vs greedy, combination beating single highest saving item)
  - Amazon Bedrock Service (Grounding context format, rule-based fallback, credential diagnostics)
"""

import unittest
import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
    check_bedrock_status,
    format_grounding_context,
    generate_rule_based_fallback,
    converse_with_bedrock
)

class TestCalculationEngine(unittest.TestCase):

    def test_ac_benchmark_formula(self):
        """1,500 W AC × 6 hours/day × 30 days = 270 kWh. At ₹8/unit = ₹2,160."""
        kwh = calculate_monthly_kwh(1500, 6, 30, 1)
        self.assertEqual(kwh, 270.0)
        cost = calculate_monthly_cost(kwh, 8.0)
        self.assertEqual(cost, 2160.0)

    def test_validation_bounds(self):
        """Negative wattage or >24 hours/day must raise ValueError."""
        with self.assertRaises(ValueError):
            calculate_monthly_kwh(-50, 6, 30, 1)
        with self.assertRaises(ValueError):
            calculate_monthly_kwh(1500, 25, 30, 1)
        with self.assertRaises(ValueError):
            calculate_monthly_kwh(1500, 6, 32, 1)

    def test_household_summary(self):
        apps = [
            {"name": "1.5T AC", "powerWatts": 1500, "hoursPerDay": 6, "quantity": 1},
            {"name": "Ceiling Fan", "powerWatts": 75, "hoursPerDay": 12, "quantity": 3}
        ]
        # AC: 1.5 * 6 * 30 = 270 kWh
        # Fans: 0.075 * 12 * 30 * 3 = 81 kWh
        # Total = 351 kWh
        summary = calculate_household_summary(apps, tariff_rate=8.0, fixed_monthly_charges=80.0)
        self.assertEqual(summary["total_monthly_kwh"], 351.0)
        self.assertEqual(summary["total_energy_cost"], 2808.0)
        self.assertEqual(summary["total_monthly_bill"], 2888.0)
        self.assertEqual(summary["highest_consumer"]["name"], "1.5T AC")

class TestKnapsackOptimizer(unittest.TestCase):

    def test_combination_beats_single_highest_action(self):
        """
        Explicit requirement: Unit test where choosing a combination of actions
        beats choosing the single action with the highest savings.
        Budget = ₹1,000.
        Action A (single highest): Cost ₹1,000, Saves ₹500/mo.
        Action B: Cost ₹500, Saves ₹350/mo.
        Action C: Cost ₹500, Saves ₹300/mo.
        Combination (B + C): Cost ₹1,000, Saves ₹650/mo (> ₹500/mo).
        """
        test_actions = [
            {
                "id": "single-heavy",
                "title": "Action A (Heavy Single)",
                "upfront_cost": 1000.0,
                "monthly_savings": 500.0,
                "monthly_kwh_saved": 62.5
            },
            {
                "id": "combo-1",
                "title": "Action B",
                "upfront_cost": 500.0,
                "monthly_savings": 350.0,
                "monthly_kwh_saved": 43.7
            },
            {
                "id": "combo-2",
                "title": "Action C",
                "upfront_cost": 500.0,
                "monthly_savings": 300.0,
                "monthly_kwh_saved": 37.5
            }
        ]

        result = knapsack_01(test_actions, budget=1000.0, step_size=10)
        selected_ids = [a["id"] for a in result["recommended_actions"]]

        self.assertEqual(result["total_upfront_cost"], 1000.0)
        self.assertEqual(result["estimated_monthly_savings"], 650.0)
        self.assertIn("combo-1", selected_ids)
        self.assertIn("combo-2", selected_ids)
        self.assertNotIn("single-heavy", selected_ids)
        self.assertGreater(result["estimated_monthly_savings"], 500.0)

    def test_catalog_knapsack_500_budget(self):
        """Under ₹500, chooses free actions + AC clean (cost 450, saves 310) = ₹870 total savings."""
        res = knapsack_01(DEFAULT_SAVING_ACTIONS_CATALOG, budget=500.0)
        self.assertLessEqual(res["total_upfront_cost"], 500.0)
        self.assertGreaterEqual(res["estimated_monthly_savings"], 870.0)
        self.assertEqual(res["unallocated_budget"], 500.0 - res["total_upfront_cost"])

class TestBedrockService(unittest.TestCase):

    def test_bedrock_status_check(self):
        """Checks configuration without error."""
        status = check_bedrock_status()
        self.assertIn("region", status)
        self.assertIn("model_id", status)
        self.assertIn("fallback_active", status)

    def test_format_grounding_context(self):
        """Ensures actual numbers are present in context string."""
        summary = {"total_monthly_kwh": 350.0, "total_monthly_bill": 2880.0}
        optimizer = {"budget": 1000.0, "estimated_monthly_savings": 650.0}
        ctx = format_grounding_context(summary, optimizer)
        self.assertIn("350.0 kWh", ctx)
        self.assertIn("2,880", ctx)
        self.assertIn("650", ctx)

    def test_rule_based_fallback(self):
        """Ensures rule-based fallback works cleanly for standard queries."""
        top_summary = {
            "highest_consumer": {"name": "1.5T AC", "monthly_kwh": 270.0, "monthly_cost": 2160.0, "share_percent": 52.3}
        }
        res = generate_rule_based_fallback("Which appliance contributes most?", top_summary, None)
        self.assertIn("1.5T AC", res)
        self.assertIn("270.0 kWh", res)

    def test_converse_fallback_without_credentials(self):
        """Without active credentials, converse_with_bedrock returns fallback cleanly."""
        res = converse_with_bedrock("Explain my electricity bill")
        self.assertIn("status", res)
        self.assertIn("response", res)
        self.assertTrue(len(res["response"]) > 0)

if __name__ == "__main__":
    unittest.main()
