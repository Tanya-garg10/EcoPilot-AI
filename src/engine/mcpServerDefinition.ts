import { Appliance, TariffConfig } from '../types';
import { DEFAULT_SAVING_ACTIONS } from './actionCatalog';
import { calculateApplianceEnergy, calculateSummary, DEFAULT_TARIFF } from './energyCalculator';
import { optimizeSavingPlan } from './knapsackOptimizer';
import { simulateWhatIf } from './whatIfSimulator';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'calculate_energy_usage',
    description:
      'Calculates monthly kWh energy consumption and estimated electricity bill for appliances using exact mathematical wattage and usage formulas.',
    inputSchema: {
      type: 'object',
      properties: {
        powerWatts: {
          type: 'number',
          description: 'Power rating of appliance in Watts (e.g. 1500 for AC, 75 for fan).',
        },
        hoursPerDay: {
          type: 'number',
          description: 'Daily usage runtime in hours (0 to 24).',
        },
        daysPerMonth: {
          type: 'number',
          description: 'Number of active operational days per month (default 30).',
        },
        quantity: {
          type: 'number',
          description: 'Quantity of units (default 1).',
        },
        tariffRate: {
          type: 'number',
          description: 'Electricity cost per kWh unit (default ₹8.0).',
        },
        applianceName: {
          type: 'string',
          description: 'Human-readable name of the appliance.',
        },
      },
      required: ['powerWatts', 'hoursPerDay'],
    },
  },
  {
    name: 'estimate_energy_savings',
    description:
      'Estimates monthly and annual cost savings, kWh saved, and CO2 reduction from specific efficiency upgrades or habit changes.',
    inputSchema: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'Unique action ID from catalog, e.g., "act-ac-thermostat", "act-fan-bldc", "act-geyser-timer".',
        },
        customHoursSaved: {
          type: 'number',
          description: 'Optional custom hours saved per day.',
        },
        tariffRate: {
          type: 'number',
          description: 'Tariff rate per unit in currency (default 8.0).',
        },
      },
      required: ['actionId'],
    },
  },
  {
    name: 'optimize_saving_plan',
    description:
      'Runs an exact 0/1 knapsack algorithm to maximize estimated monthly savings under a user-defined upfront budget limit.',
    inputSchema: {
      type: 'object',
      properties: {
        budget: {
          type: 'number',
          description: 'Maximum upfront budget in Rupees/Currency (e.g. 500, 1500, 5000).',
        },
        filterCategory: {
          type: 'string',
          description: 'Optional category filter (Cooling, Heating, Lighting, Kitchen, etc.).',
        },
      },
      required: ['budget'],
    },
  },
  {
    name: 'simulate_energy_action',
    description:
      'Performs a dynamic what-if simulation comparing baseline household electricity usage against adjusted usage hours or appliance wattage.',
    inputSchema: {
      type: 'object',
      properties: {
        applianceName: {
          type: 'string',
          description: 'Appliance name, e.g. "Air Conditioner" or "Geyser".',
        },
        baselineWatts: {
          type: 'number',
          description: 'Baseline appliance wattage.',
        },
        baselineHours: {
          type: 'number',
          description: 'Baseline daily operating hours.',
        },
        simulatedHours: {
          type: 'number',
          description: 'Proposed daily operating hours after change.',
        },
        simulatedWatts: {
          type: 'number',
          description: 'Proposed appliance wattage (if upgrading hardware).',
        },
        tariffRate: {
          type: 'number',
          description: 'Electricity tariff per unit (default 8.0).',
        },
      },
      required: ['baselineWatts', 'baselineHours'],
    },
  },
  {
    name: 'get_impact_summary',
    description:
      'Generates a holistic household energy audit summary with total monthly kWh, bill breakdown, carbon footprint, and top energy hogs.',
    inputSchema: {
      type: 'object',
      properties: {
        tariffRate: {
          type: 'number',
          description: 'Tariff rate per kWh unit.',
        },
        appliances: {
          type: 'array',
          description: 'Optional custom list of appliances to evaluate.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              powerWatts: { type: 'number' },
              hoursPerDay: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
      },
    },
export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface AgentSkillDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  triggerPhrases: string[];
  orchestratedTools: string[];
  mcpAppResource?: string;
  formulaOrProof: string;
}

export const MCP_RESOURCES: McpResourceDefinition[] = [
  {
    uri: 'ui://ecopilot/budget-allocator',
    name: 'Interactive Budget Allocator (MCP App)',
    description: 'Inline interactive 0/1 knapsack budget optimizer widget with dynamic slider and instant action selection.',
    mimeType: 'application/vnd.mcp.app+json',
  },
  {
    uri: 'ui://ecopilot/whatif-simulator',
    name: 'Interactive What-If Scenario Slider (MCP App)',
    description: 'Inline interactive scenario builder to simulate reducing appliance hours with live delta proofs.',
    mimeType: 'application/vnd.mcp.app+json',
  },
  {
    uri: 'ui://ecopilot/appliance-breakdown',
    name: 'Household Energy Breakdown (MCP App)',
    description: 'Interactive consumption breakdown mini-card identifying top power hog appliances and savings potential.',
    mimeType: 'application/vnd.mcp.app+json',
  },
];

export const MCP_PROMPTS: McpPromptDefinition[] = [
  {
    name: 'audit-household',
    description: 'Conduct a thorough household energy audit, identify top consumers, and calculate monthly kWh/bill.',
    arguments: [
      { name: 'tariffRate', description: 'Electricity tariff per unit (₹/kWh)', required: false },
    ],
  },
  {
    name: 'optimize-budget',
    description: 'Run 0/1 knapsack dynamic programming on energy-saving interventions for a given budget.',
    arguments: [
      { name: 'budget', description: 'Maximum upfront budget in Rupees', required: true },
    ],
  },
  {
    name: 'simulate-reduction',
    description: 'Simulate reducing air conditioning runtime by 1 or more hours daily and show financial/carbon impact.',
    arguments: [
      { name: 'hoursReduced', description: 'Hours to reduce per day', required: false },
    ],
  },
];

export const AGENT_SKILLS: AgentSkillDefinition[] = [
  {
    id: 'energy-auditor',
    name: 'Household Energy Auditor',
    category: 'Analysis & Benchmarking',
    description: 'Calculates monthly electricity consumption, evaluates multi-appliance loads, and pinpoints top consumer hogs using deterministic mathematical formulas.',
    triggerPhrases: [
      'Calculate my monthly electricity cost',
      'Explain which appliances contribute most to my bill',
      'How much does a 1500W AC cost running 6 hours daily?',
    ],
    orchestratedTools: ['calculate_energy_usage', 'get_impact_summary'],
    mcpAppResource: 'ui://ecopilot/appliance-breakdown',
    formulaOrProof: 'Monthly kWh = (Watts × Quantity × Hours/day × Days/mo) ÷ 1000; Bill = kWh × Tariff',
  },
  {
    id: 'tariff-optimizer',
    name: '0/1 Knapsack Budget Optimizer',
    category: 'Dynamic Programming Optimization',
    description: 'Employs a tested 0/1 knapsack algorithm to maximize monthly energy savings within a strict upfront budget constraint without hallucination.',
    triggerPhrases: [
      'Find the best saving actions within ₹1,000',
      'Optimize energy plan for budget of ₹500',
      'What should I upgrade with my budget?',
    ],
    orchestratedTools: ['optimize_saving_plan', 'estimate_energy_savings'],
    mcpAppResource: 'ui://ecopilot/budget-allocator',
    formulaOrProof: 'DP Knapsack: dp[i][w] = max(dp[i-1][w], dp[i-1][w-cost[i]] + savings[i])',
  },
  {
    id: 'what-if-planner',
    name: 'What-If Habit & Action Simulator',
    category: 'Behavioral Modeling',
    description: 'Performs dynamic before-and-after usage comparisons for appliances, calculating accurate monthly rupee savings, carbon offsets, and percentage bill cuts.',
    triggerPhrases: [
      'What if I reduce AC usage by one hour daily?',
      'What if I replace my 75W fan with a 28W BLDC fan?',
      'Compare running geyser 1 hour vs 2 hours',
    ],
    orchestratedTools: ['simulate_energy_action'],
    mcpAppResource: 'ui://ecopilot/whatif-simulator',
    formulaOrProof: 'Δ kWh = Baseline kWh - Simulated kWh; Δ Cost = Δ kWh × Tariff; CO2 = Δ kWh × 0.82 kg',
  },
  {
    id: 'alexa-conversationalist',
    name: 'Alexa+ Grounded Explainer',
    category: 'Conversational Voice & Grounding',
    description: 'Speaks Alexa+ voice and text explanations strictly grounded in deterministic tool results, backed by Amazon Bedrock Converse and Gemini fallback.',
    triggerPhrases: [
      'Alexa, summarize my energy report',
      'Explain my savings options',
      'Can you help me lower my power bill?',
    ],
    orchestratedTools: ['calculate_energy_usage', 'optimize_saving_plan', 'simulate_energy_action', 'get_impact_summary'],
    formulaOrProof: 'Strict prompt grounding: Language model is passed exact numeric proof payload and forbidden from inventing numbers.',
  },
];

export function readMcpResource(uri: string): { uri: string; mimeType: string; contents: any } {
  switch (uri) {
    case 'ui://ecopilot/budget-allocator':
      return {
        uri,
        mimeType: 'application/vnd.mcp.app+json',
        contents: {
          appType: 'interactive-knapsack-slider',
          defaultBudget: 1000,
          minBudget: 0,
          maxBudget: 5000,
          step: 100,
          actionsCount: DEFAULT_SAVING_ACTIONS.length,
        },
      };
    case 'ui://ecopilot/whatif-simulator':
      return {
        uri,
        mimeType: 'application/vnd.mcp.app+json',
        contents: {
          appType: 'interactive-usage-slider',
          targetAppliance: '1.5T AC',
          baselineHours: 6,
          baselineWatts: 1500,
          tariffRate: 8.0,
        },
      };
    case 'ui://ecopilot/appliance-breakdown':
      return {
        uri,
        mimeType: 'application/vnd.mcp.app+json',
        contents: {
          appType: 'breakdown-chart',
          metric: 'monthlyCost',
          currency: '₹',
        },
      };
    default:
      throw new Error(`Resource with URI "${uri}" not found`);
  }
}

export function getMcpPrompt(name: string, args: Record<string, any> = {}): any {
  switch (name) {
    case 'audit-household': {
      const tariff = args.tariffRate || 8.0;
      return {
        description: 'Household audit prompt template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please audit my household electricity consumption at ₹${tariff}/unit. Identify which appliances contribute most and calculate my total monthly bill.`,
            },
          },
        ],
      };
    }
    case 'optimize-budget': {
      const budget = args.budget || 1000;
      return {
        description: 'Budget optimization prompt template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Find the best energy saving actions within a budget of ₹${budget} using 0/1 knapsack optimization.`,
            },
          },
        ],
      };
    }
    case 'simulate-reduction': {
      const hours = args.hoursReduced || 1;
      return {
        description: 'What-if AC reduction prompt template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `What if I reduce AC usage by ${hours} hour daily? How much money and CO2 will I save each month?`,
            },
          },
        ],
      };
    }
    default:
      throw new Error(`Prompt "${name}" not found`);
  }
}
 */
export function executeMcpTool(name: string, args: Record<string, any>): any {
  const tariffRate = typeof args.tariffRate === 'number' && args.tariffRate > 0 ? args.tariffRate : 8.0;
  const tariff: TariffConfig = {
    ...DEFAULT_TARIFF,
    ratePerKwh: tariffRate,
  };

  switch (name) {
    case 'calculate_energy_usage': {
      const powerWatts = Number(args.powerWatts || 0);
      const hoursPerDay = Math.min(24, Math.max(0, Number(args.hoursPerDay || 0)));
      const daysPerMonth = Math.min(31, Math.max(0, Number(args.daysPerMonth || 30)));
      const quantity = Math.max(1, Number(args.quantity || 1));
      const applianceName = String(args.applianceName || 'Appliance');

      const appliance: Appliance = {
        id: 'mcp-target',
        name: applianceName,
        category: 'Other',
        powerWatts,
        hoursPerDay,
        daysPerMonth,
        quantity,
      };

      const result = calculateApplianceEnergy(appliance, tariff);
      return {
        applianceName,
        powerWatts,
        hoursPerDay,
        daysPerMonth,
        quantity,
        formula: `${powerWatts} W × ${hoursPerDay} hrs × ${daysPerMonth} days × ${quantity} ÷ 1000 = ${result.monthlyKwh} kWh/month`,
        monthlyKwh: result.monthlyKwh,
        dailyKwh: result.dailyKwh,
        monthlyCost: result.monthlyCost,
        annualCost: result.yearlyCost,
        tariffRate,
        monthlyCo2Kg: result.monthlyCo2Kg,
        assumptionLabel: 'Engineering estimate based on rated wattage and constant usage; actual duty cycles vary.',
      };
    }

    case 'estimate_energy_savings': {
      const actionId = String(args.actionId || '');
      const action = DEFAULT_SAVING_ACTIONS.find((a) => a.id === actionId || a.title.toLowerCase().includes(actionId.toLowerCase()));
      if (!action) {
        return {
          error: `Action "${actionId}" not found in catalog. Available actions: ${DEFAULT_SAVING_ACTIONS.map((a) => a.id).join(', ')}`,
        };
      }
      return {
        actionId: action.id,
        title: action.title,
        category: action.category,
        upfrontCost: action.upfrontCost,
        monthlySavings: action.monthlySavings,
        annualSavings: action.monthlySavings * 12,
        monthlyKwhSaved: action.monthlyKwhSaved,
        co2KgSavedMonthly: action.monthlyCo2KgSaved,
        paybackMonths: action.paybackMonths,
        difficulty: action.difficulty,
        assumptions: action.assumptions,
        disclaimer: 'Illustrative savings benchmark. Actual savings depend on ambient conditions and user habits.',
      };
    }

    case 'optimize_saving_plan': {
      const budget = Math.max(0, Number(args.budget || 0));
      let actions = DEFAULT_SAVING_ACTIONS;
      if (args.filterCategory) {
        actions = actions.filter((a) => a.category.toLowerCase() === String(args.filterCategory).toLowerCase());
      }
      const optResult = optimizeSavingPlan(actions, budget);
      return {
        budget,
        algorithm: '0/1 Knapsack Dynamic Programming (Exact Global Optimum)',
        totalUpfrontCost: optResult.totalUpfrontCost,
        unallocatedBudget: optResult.unallocatedBudget,
        estimatedMonthlySavings: optResult.totalMonthlySavings,
        estimatedAnnualSavings: optResult.totalAnnualSavings,
        monthlyKwhSaved: optResult.totalKwhSavedMonthly,
        monthlyCo2OffsetKg: optResult.totalCo2SavedMonthly,
        annualRoiPercent: optResult.roiPercentageAnnual,
        paybackPeriodMonths: optResult.paybackMonths,
        recommendedActions: optResult.selectedActions.map((a) => ({
          id: a.id,
          title: a.title,
          upfrontCost: a.upfrontCost,
          monthlySavings: a.monthlySavings,
          tag: a.tag,
          paybackMonths: a.paybackMonths,
        })),
        disclaimer: 'Optimization selects interventions to maximize estimated monthly monetary return within user budget.',
      };
    }

    case 'simulate_energy_action': {
      const applianceName = String(args.applianceName || 'Simulated Appliance');
      const baselineWatts = Number(args.baselineWatts || 1500);
      const baselineHours = Number(args.baselineHours || 6);
      const simulatedHours = args.simulatedHours !== undefined ? Number(args.simulatedHours) : baselineHours;
      const simulatedWatts = args.simulatedWatts !== undefined ? Number(args.simulatedWatts) : baselineWatts;

      const baseApp: Appliance = {
        id: 'sim-1',
        name: applianceName,
        category: 'Cooling',
        powerWatts: baselineWatts,
        hoursPerDay: baselineHours,
        daysPerMonth: 30,
        quantity: 1,
      };

      const mods = [];
      if (simulatedHours !== baselineHours) {
        mods.push({ applianceId: 'sim-1', field: 'hoursPerDay' as const, oldValue: baselineHours, newValue: simulatedHours });
      }
      if (simulatedWatts !== baselineWatts) {
        mods.push({ applianceId: 'sim-1', field: 'powerWatts' as const, oldValue: baselineWatts, newValue: simulatedWatts });
      }

      const simRes = simulateWhatIf([baseApp], mods, tariff);
      return {
        appliance: applianceName,
        baseline: {
          watts: baselineWatts,
          hoursPerDay: baselineHours,
          monthlyKwh: simRes.comparison.baseline.monthlyKwh,
          monthlyCost: simRes.comparison.baseline.monthlyCost,
        },
        simulated: {
          watts: simulatedWatts,
          hoursPerDay: simulatedHours,
          monthlyKwh: simRes.comparison.simulated.monthlyKwh,
          monthlyCost: simRes.comparison.simulated.monthlyCost,
        },
        delta: {
          monthlyKwhSaved: simRes.comparison.delta.monthlyKwh,
          monthlyCostSaved: simRes.comparison.delta.monthlyCost,
          annualCostSaved: simRes.comparison.delta.annualCostSavings,
          co2OffsetKgMonthly: simRes.comparison.delta.monthlyCo2Kg,
          percentageSaved: simRes.comparison.delta.percentCost,
        },
      };
    }

    case 'get_impact_summary': {
      const appliancesList: Appliance[] =
        Array.isArray(args.appliances) && args.appliances.length > 0
          ? args.appliances.map((a: any, idx: number) => ({
              id: `custom-${idx}`,
              name: a.name || `Appliance ${idx + 1}`,
              category: 'Other',
              powerWatts: Number(a.powerWatts || 100),
              hoursPerDay: Number(a.hoursPerDay || 4),
              daysPerMonth: 30,
              quantity: Number(a.quantity || 1),
            }))
          : [
              { id: '1', name: '1.5T AC', category: 'Cooling', powerWatts: 1500, hoursPerDay: 6, daysPerMonth: 30, quantity: 1 },
              { id: '2', name: 'Fans (x3)', category: 'Cooling', powerWatts: 75, hoursPerDay: 12, daysPerMonth: 30, quantity: 3 },
              { id: '3', name: 'Geyser', category: 'Heating', powerWatts: 2000, hoursPerDay: 1.5, daysPerMonth: 30, quantity: 1 },
              { id: '4', name: 'Refrigerator', category: 'Kitchen', powerWatts: 250, hoursPerDay: 10, daysPerMonth: 30, quantity: 1 },
            ];

      const summary = calculateSummary(appliancesList, tariff);
      return {
        totalMonthlyKwh: summary.totalMonthlyKwh,
        totalMonthlyBill: summary.totalMonthlyCost,
        totalYearlyBill: summary.totalYearlyCost,
        totalMonthlyCo2Kg: summary.totalMonthlyCo2Kg,
        averageDailyKwh: summary.averageDailyKwh,
        topConsumer: summary.highestConsumer
          ? {
              name: summary.highestConsumer.appliance.name,
              monthlyKwh: summary.highestConsumer.monthlyKwh,
              monthlyCost: summary.highestConsumer.monthlyCost,
              sharePercent: summary.highestConsumer.percentageOfTotal,
            }
          : null,
        breakdown: summary.applianceBreakdown.map((b) => ({
          name: b.appliance.name,
          kwh: b.monthlyKwh,
          cost: b.monthlyCost,
          percent: b.percentageOfTotal,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Ready-to-run Python MCP Server script template for submission & local execution
 */
export const PYTHON_MCP_SERVER_CODE = `"""
EcoPilot AI — Model Context Protocol (MCP) Server for Alexa+ Hackathon
Transport: Streamable HTTP (FastAPI / SSE / JSON-RPC 2.0)
Tools:
  - calculate_energy_usage
  - estimate_energy_savings
  - optimize_saving_plan (Exact 0/1 Knapsack DP)
  - simulate_energy_action
  - get_impact_summary
"""

import sys
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn
import json

app = FastAPI(title="EcoPilot MCP Server", version="1.0.0")

# Catalog of Energy Actions for 0/1 Knapsack
ACTIONS_CATALOG = [
    {
        "id": "act-ac-thermostat",
        "title": "Set AC to 24°C & Eco Timer",
        "upfront_cost": 0,
        "monthly_savings": 420.0,
        "monthly_kwh_saved": 52.5,
        "category": "Cooling",
        "assumptions": "BEE: 1°C temp raise saves ~6% energy; 1h auto-off saves ~45-55 kWh/mo."
    },
    {
        "id": "act-fan-bldc",
        "title": "Upgrade to 28W BLDC Fan",
        "upfront_cost": 2400,
        "monthly_savings": 280.0,
        "monthly_kwh_saved": 35.0,
        "category": "Cooling",
        "assumptions": "Saves 47W compared to 75W fan running 12h daily."
    },
    {
        "id": "act-geyser-timer",
        "title": "Smart Geyser Plug / Timer",
        "upfront_cost": 750,
        "monthly_savings": 240.0,
        "monthly_kwh_saved": 30.0,
        "category": "Heating",
        "assumptions": "Eliminates standby thermal loss and accidental prolonged heating."
    },
    {
        "id": "act-led-retrofit",
        "title": "LED Bulb Retrofit (Pack of 6)",
        "upfront_cost": 600,
        "monthly_savings": 180.0,
        "monthly_kwh_saved": 22.5,
        "category": "Lighting",
        "assumptions": "Replacing 40W CFL with 9W LEDs cuts ~180W load over 5h/day."
    },
    {
        "id": "act-ac-clean",
        "title": "AC Condenser Deep Clean",
        "upfront_cost": 450,
        "monthly_savings": 310.0,
        "monthly_kwh_saved": 38.8,
        "category": "Cooling",
        "assumptions": "Restoring heat transfer on clogged coils reduces compressor draw 12-15%."
    },
    {
        "id": "act-window-film",
        "title": "Solar Window Reflective Film",
        "upfront_cost": 1600,
        "monthly_savings": 350.0,
        "monthly_kwh_saved": 43.8,
        "category": "Insulation",
        "assumptions": "Rejects 65% solar IR heat on sun-facing rooms."
    }
]

def knapsack_01(items: List[Dict], budget: int, step_size: int = 10):
    free_items = [it for it in items if it["upfront_cost"] <= 0]
    paid_items = [it for it in items if it["upfront_cost"] > 0]
    
    if budget <= 0 or not paid_items:
        return free_items, 0, sum(it["monthly_savings"] for it in free_items)
    
    max_w = budget // step_size
    n = len(paid_items)
    dp = [[0.0] * (max_w + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        item = paid_items[i - 1]
        cost_steps = (item["upfront_cost"] + step_size - 1) // step_size
        val = item["monthly_savings"]
        for w in range(max_w + 1):
            dp[i][w] = dp[i - 1][w]
            if w >= cost_steps and dp[i - 1][w - cost_steps] + val > dp[i][w]:
                dp[i][w] = dp[i - 1][w - cost_steps] + val
                
    chosen_paid = []
    curr_w = max_w
    for i in range(n, 0, -1):
        item = paid_items[i - 1]
        cost_steps = (item["upfront_cost"] + step_size - 1) // step_size
        if curr_w >= cost_steps and dp[i][curr_w] != dp[i - 1][curr_w]:
            chosen_paid.append(item)
            curr_w -= cost_steps
            
    all_selected = free_items + chosen_paid
    total_cost = sum(it["upfront_cost"] for it in chosen_paid)
    total_savings = sum(it["monthly_savings"] for it in all_selected)
    return all_selected, total_cost, total_savings

# Tool Execution Dispatcher
def handle_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    tariff = float(arguments.get("tariffRate", 8.0))
    
    if tool_name == "calculate_energy_usage":
        watts = float(arguments.get("powerWatts", 0))
        hours = float(arguments.get("hoursPerDay", 0))
        days = float(arguments.get("daysPerMonth", 30))
        qty = float(arguments.get("quantity", 1))
        kwh = (watts * hours * days * qty) / 1000.0
        cost = kwh * tariff
        return {
            "monthly_kwh": round(kwh, 2),
            "monthly_cost": round(cost, 2),
            "annual_cost": round(cost * 12, 2),
            "co2_kg_monthly": round(kwh * 0.82, 2),
            "formula": f"{watts}W * {hours}h * {days}d * {qty} / 1000 = {round(kwh, 2)} kWh"
        }
        
    elif tool_name == "optimize_saving_plan":
        budget = int(arguments.get("budget", 0))
        selected, cost, savings = knapsack_01(ACTIONS_CATALOG, budget)
        return {
            "budget": budget,
            "total_upfront_cost": cost,
            "unallocated_budget": budget - cost,
            "monthly_savings": round(savings, 2),
            "annual_savings": round(savings * 12, 2),
            "payback_months": round(cost / savings, 1) if savings > 0 else 0,
            "selected_actions": [a["title"] for a in selected]
        }
        
    elif tool_name == "simulate_energy_action":
        base_w = float(arguments.get("baselineWatts", 1500))
        base_h = float(arguments.get("baselineHours", 6))
        sim_h = float(arguments.get("simulatedHours", base_h))
        sim_w = float(arguments.get("simulatedWatts", base_w))
        
        base_kwh = (base_w * base_h * 30) / 1000.0
        sim_kwh = (sim_w * sim_h * 30) / 1000.0
        
        kwh_diff = base_kwh - sim_kwh
        cost_diff = kwh_diff * tariff
        return {
            "baseline_kwh": round(base_kwh, 2),
            "simulated_kwh": round(sim_kwh, 2),
            "saved_kwh_monthly": round(kwh_diff, 2),
            "saved_cost_monthly": round(cost_diff, 2),
            "saved_cost_annual": round(cost_diff * 12, 2)
        }
        
    elif tool_name == "estimate_energy_savings":
        action_id = arguments.get("actionId", "")
        for it in ACTIONS_CATALOG:
            if it["id"] == action_id or action_id.lower() in it["title"].lower():
                return it
        return {"error": f"Action '{action_id}' not found"}

    elif tool_name == "get_impact_summary":
        return {
            "status": "active",
            "grid_emission_factor": 0.82,
            "tariff_benchmark": tariff,
            "available_tools_count": 5
        }
    
    return {"error": f"Unknown tool: {tool_name}"}

# Streamable HTTP MCP Endpoint
@app.post("/mcp")
async def mcp_streamable_http(request: Request):
    body = await request.json()
    method = body.get("method")
    req_id = body.get("id", 1)
    
    if method == "tools/list":
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {"name": "calculate_energy_usage", "description": "Calculate kWh & bill"},
                    {"name": "estimate_energy_savings", "description": "Savings from action"},
                    {"name": "optimize_saving_plan", "description": "0/1 Knapsack optimizer"},
                    {"name": "simulate_energy_action", "description": "What-if simulator"},
                    {"name": "get_impact_summary", "description": "Household summary"}
                ]
            }
        })
        
    elif method == "tools/call":
        params = body.get("params", {})
        tool_name = params.get("name")
        args = params.get("arguments", {})
        result = handle_tool_call(tool_name, args)
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [{"type": "text", "text": json.dumps(result, indent=2)}]
            }
        })
        
    return JSONResponse({"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "Method not found"}})

if __name__ == "__main__":
    print("EcoPilot MCP Streamable HTTP Server starting on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;
