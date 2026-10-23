"""
EcoPilot AI — Amazon Bedrock Runtime Converse API Service
Uses official AWS SDK for Python (boto3) and the Converse API.
Grounds all model responses in actual deterministic energy calculations and 0/1 knapsack outputs.
Provides comprehensive error handling and rule-based conversational fallbacks.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Default configuration from environment variables
DEFAULT_AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
DEFAULT_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")

def get_bedrock_config() -> Dict[str, Any]:
    """Returns the active AWS region and model ID configuration."""
    region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", DEFAULT_AWS_REGION))
    model_id = os.environ.get("BEDROCK_MODEL_ID", DEFAULT_MODEL_ID)
    has_access_key = bool(os.environ.get("AWS_ACCESS_KEY_ID"))
    has_secret_key = bool(os.environ.get("AWS_SECRET_ACCESS_KEY"))

    return {
        "region": region,
        "model_id": model_id,
        "has_credentials": has_access_key and has_secret_key,
        "has_access_key": has_access_key,
        "has_secret_key": has_secret_key,
    }

def check_bedrock_status() -> Dict[str, Any]:
    """
    Probes the local Python environment and AWS setup to verify if Amazon Bedrock
    can be invoked or if rule-based fallback is currently active.
    """
    config = get_bedrock_config()
    boto3_installed = False

    try:
        import boto3
        boto3_installed = True
    except ImportError:
        return {
            "status": "boto3_not_installed",
            "is_configured": False,
            "region": config["region"],
            "model_id": config["model_id"],
            "message": "The AWS SDK for Python ('boto3') is not installed in the current environment.",
            "setup_required": "Install boto3 via `pip install boto3` and configure AWS credentials in .env.",
            "fallback_active": True
        }

    if not config["has_credentials"]:
        # Check if AWS credentials exist in ~/.aws/credentials
        try:
            import boto3
            session = boto3.Session(region_name=config["region"])
            creds = session.get_credentials()
            if creds and creds.access_key:
                return {
                    "status": "ready",
                    "is_configured": True,
                    "region": config["region"],
                    "model_id": config["model_id"],
                    "message": "AWS credentials detected from environment or AWS configuration files.",
                    "fallback_active": False
                }
        except Exception:
            pass

        return {
            "status": "credentials_pending",
            "is_configured": False,
            "region": config["region"],
            "model_id": config["model_id"],
            "message": "AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variables are not configured.",
            "setup_required": "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in .env to enable live Bedrock model calls.",
            "fallback_active": True
        }

    return {
        "status": "configured",
        "is_configured": True,
        "region": config["region"],
        "model_id": config["model_id"],
        "message": f"Amazon Bedrock configured for model '{config['model_id']}' in region '{config['region']}'.",
        "fallback_active": False
    }

def format_grounding_context(energy_summary: Optional[Dict[str, Any]], optimizer_output: Optional[Dict[str, Any]]) -> str:
    """
    Builds structured, factual context from deterministic calculation results
    to pass to the model, preventing hallucination.
    """
    context_lines = ["--- HOUSEHOLD DETERMINISTIC ENERGY DATA ---"]

    if energy_summary:
        context_lines.append(f"Total Monthly Consumption: {energy_summary.get('total_monthly_kwh', 0)} kWh")
        context_lines.append(f"Estimated Monthly Electricity Bill: ₹{energy_summary.get('total_monthly_bill', 0):,}")
        context_lines.append(f"Fixed Monthly Meter Charges: ₹{energy_summary.get('fixed_monthly_charges', 0):,}")
        context_lines.append(f"Estimated Annual Electricity Cost: ₹{energy_summary.get('total_annual_bill', 0):,}")
        context_lines.append(f"Estimated Monthly Carbon Footprint: {energy_summary.get('total_co2_kg_monthly', 0)} kg CO2")

        highest = energy_summary.get("highest_consumer")
        if highest:
            context_lines.append(f"Top Energy Consuming Appliance: {highest.get('name')} consuming {highest.get('monthly_kwh')} kWh/month (₹{highest.get('monthly_cost', 0):,}), which is {highest.get('share_percent', 0)}% of household electricity.")

        breakdown = energy_summary.get("appliance_breakdown", [])
        if breakdown:
            context_lines.append("Appliance Breakdown:")
            for item in breakdown:
                context_lines.append(f"  • {item.get('name')}: {item.get('power_watts')}W, {item.get('hours_per_day')}h/day, {item.get('monthly_kwh')} kWh/mo, ₹{item.get('monthly_cost', 0):,}/mo ({item.get('share_percent', 0)}% share)")

    if optimizer_output:
        context_lines.append("\n--- BUDGET-AWARE 0/1 KNAPSACK OPTIMIZATION OUTPUT ---")
        context_lines.append(f"User Budget Limit: ₹{optimizer_output.get('budget', 0):,}")
        context_lines.append(f"Total Upfront Investment: ₹{optimizer_output.get('total_upfront_cost', 0):,}")
        context_lines.append(f"Remaining Unallocated Budget: ₹{optimizer_output.get('unallocated_budget', 0):,}")
        context_lines.append(f"Estimated Monthly Bill Savings: ₹{optimizer_output.get('estimated_monthly_savings', 0):,}/month")
        context_lines.append(f"Estimated Annual Savings: ₹{optimizer_output.get('estimated_annual_savings', 0):,}/year")
        context_lines.append(f"Average Payback Period: {optimizer_output.get('payback_period_months', 0)} months")
        context_lines.append(f"Annual ROI: {optimizer_output.get('annual_roi_percent', 0)}%")
        context_lines.append(f"Monthly Energy Saved: {optimizer_output.get('monthly_kwh_saved', 0)} kWh")

        recommended = optimizer_output.get("recommended_actions", [])
        if recommended:
            context_lines.append("Selected Actions Chosen by 0/1 Knapsack:")
            for act in recommended:
                cost = "FREE" if act.get("upfront_cost", 0) == 0 else f"₹{act.get('upfront_cost', 0):,}"
                context_lines.append(f"  • {act.get('title')}: Cost {cost}, Saves ₹{act.get('monthly_savings', 0):,}/mo [{act.get('tag', 'Intervention')}] — Assumption: {act.get('assumptions', 'Standard benchmark')}")

    context_lines.append("-------------------------------------------")
    return "\n".join(context_lines)

def generate_rule_based_fallback(prompt: str, energy_summary: Optional[Dict[str, Any]], optimizer_output: Optional[Dict[str, Any]]) -> str:
    """
    Deterministic rule-based conversational explanation fallback when Amazon Bedrock
    is not configured or credentials are not yet supplied.
    """
    p = prompt.lower()

    # Query 1: Highest contributor
    if "contribute most" in p or "highest" in p or "most" in p or "power hog" in p:
        if energy_summary and energy_summary.get("highest_consumer"):
            top = energy_summary["highest_consumer"]
            return (
                f"Based on your calculated appliance metrics, the **{top.get('name')}** is the largest power consumer in your home. "
                f"It draws an estimated **{top.get('monthly_kwh')} kWh per month**, costing approximately **₹{top.get('monthly_cost', 0):,}**, "
                f"which represents **{top.get('share_percent', 0)}%** of your entire monthly electricity bill. "
                f"Recommended quick action: Setting its operating hours or thermostat setting can yield immediate financial savings."
            )

    # Query 2: Budget saving actions
    if "budget" in p or "actions" in p or "saving" in p or "recommend" in p or "optimize" in p:
        if optimizer_output and optimizer_output.get("recommended_actions"):
            actions = optimizer_output["recommended_actions"]
            cost = optimizer_output.get("total_upfront_cost", 0)
            monthly_save = optimizer_output.get("estimated_monthly_savings", 0)
            annual_save = optimizer_output.get("estimated_annual_savings", 0)
            payback = optimizer_output.get("payback_period_months", 0)
            titles = ", ".join(f"**{a.get('title')}**" for a in actions)

            return (
                f"Under your target budget of **₹{optimizer_output.get('budget', 0):,}**, the 0/1 Knapsack optimizer selected "
                f"**{len(actions)} optimal interventions** investing a total of **₹{cost:,}** (leaving ₹{optimizer_output.get('unallocated_budget', 0):,} unallocated). "
                f"These actions will generate an estimated **₹{monthly_save:,} per month in savings** (**₹{annual_save:,}/year**) "
                f"with an average payback period of **{payback} months**.\n\n"
                f"Selected interventions: {titles}."
            )

    # Query 3: What-if / AC reduction
    if "reduce" in p or "what if" in p or "ac" in p or "one hour" in p or "1 hour" in p:
        return (
            "Reducing a standard 1.5-ton AC (1,500W) runtime by **1 hour daily** saves approximately **45 kWh per month** (1.5 kW × 1h × 30 days). "
            "At a benchmark residential tariff of **₹8/kWh**, this directly reduces your monthly bill by **₹360/month** (**₹4,320 annually**) "
            "and offsets roughly **36.9 kg of grid CO₂ emissions** every month with zero financial investment."
        )

    # Query 4: Assumptions
    if "assumption" in p or "methodology" in p or "formula" in p:
        return (
            "All energy calculations use the deterministic formula: **kWh = (Watts × Quantity × Hours/Day × Days/Month) ÷ 1000**, multiplied by your tariff. "
            "The 0/1 Knapsack optimizer maximizes monthly monetary return without exceeding your upfront budget. "
            "All savings figures represent engineering simulations under standard test conditions rather than guaranteed hardware readings."
        )

    # General Bill Overview
    if energy_summary:
        return (
            f"Your household baseline is currently estimated at **{energy_summary.get('total_monthly_kwh', 0)} kWh/month**, "
            f"resulting in an estimated bill of **₹{energy_summary.get('total_monthly_bill', 0):,}** (including ₹{energy_summary.get('fixed_monthly_charges', 0)} fixed meter charges). "
            f"You can ask me which appliances consume the most power, how to optimize a specific budget, or test what-if scenarios."
        )

    return (
        "EcoPilot AI has analyzed your electrical appliance profile. All estimates are calculated deterministically using physics formulas and the 0/1 Knapsack optimization algorithm."
    )

def converse_with_bedrock(
    user_prompt: str,
    energy_summary: Optional[Dict[str, Any]] = None,
    optimizer_output: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    custom_region: Optional[str] = None,
    custom_model_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a grounded conversational request via Amazon Bedrock Runtime Converse API.
    Injects deterministic energy calculations as factual context.
    Falls back gracefully to rule-based explanation if Bedrock is not configured or fails.
    """
    region = custom_region or os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", DEFAULT_AWS_REGION))
    model_id = custom_model_id or os.environ.get("BEDROCK_MODEL_ID", DEFAULT_MODEL_ID)

    grounding_context = format_grounding_context(energy_summary, optimizer_output)

    system_instruction = (
        "You are EcoPilot AI, a knowledgeable and practical household energy consultant.\n"
        "Your role is to explain electricity consumption, bills, what-if simulations, and budget-aware recommendations.\n\n"
        "STRICT GROUNDING RULES:\n"
        "1. You MUST use the exact numbers, kWh values, costs, and savings provided in the FACTUAL CONTEXT below.\n"
        "2. NEVER alter, invent, or hallucinate different energy consumption figures, tariffs, or savings percentages.\n"
        "3. Explain the engineering rationale clearly and concisely (2 to 4 structured paragraphs or bullet points).\n"
        "4. Always distinguish between calculated engineering benchmarks and actual physical meter measurements.\n\n"
        f"{grounding_context}"
    )

    # Attempt Amazon Bedrock Runtime Converse API call
    try:
        import boto3
        from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError

        session = boto3.Session(region_name=region)
        client = session.client("bedrock-runtime", region_name=region)

        # Build message history conforming to Bedrock Converse API format
        messages = []
        if conversation_history:
            for msg in conversation_history[-4:]:  # Keep recent context
                role = "user" if msg.get("sender") == "user" or msg.get("role") == "user" else "assistant"
                text = msg.get("text") or msg.get("content") or ""
                if text:
                    messages.append({"role": role, "content": [{"text": text}]})

        # Append current user prompt
        messages.append({
            "role": "user",
            "content": [{"text": user_prompt}]
        })

        # Invoke Converse API
        response = client.converse(
            modelId=model_id,
            messages=messages,
            system=[{"text": system_instruction}],
            inferenceConfig={
                "temperature": 0.3,
                "maxTokens": 800,
                "topP": 0.9
            }
        )

        output_message = response.get("output", {}).get("message", {})
        content_parts = output_message.get("content", [])
        response_text = ""
        for part in content_parts:
            if "text" in part:
                response_text += part["text"]

        usage = response.get("usage", {})

        return {
            "status": "success",
            "provider": "amazon_bedrock",
            "api": "Converse",
            "model_id": model_id,
            "region": region,
            "response": response_text.strip(),
            "usage": usage,
            "fallback_used": False
        }

    except ImportError:
        logger.info("boto3 not installed, using deterministic rule fallback.")
        fallback_text = generate_rule_based_fallback(user_prompt, energy_summary, optimizer_output)
        return {
            "status": "fallback",
            "provider": "deterministic_rule_engine",
            "model_id": model_id,
            "region": region,
            "response": fallback_text,
            "fallback_used": True,
            "fallback_reason": "AWS SDK ('boto3') is not installed in the Python environment."
        }

    except (NoCredentialsError, PartialCredentialsError) as cred_err:
        logger.info("AWS credentials not configured, activating deterministic fallback.")
        fallback_text = generate_rule_based_fallback(user_prompt, energy_summary, optimizer_output)
        return {
            "status": "fallback",
            "provider": "deterministic_rule_engine",
            "model_id": model_id,
            "region": region,
            "response": fallback_text,
            "fallback_used": True,
            "fallback_reason": "AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not set. Active deterministic rule engine provided the calculation explanation."
        }

    except ClientError as client_err:
        err_code = client_err.response.get("Error", {}).get("Code", "ClientError")
        err_msg = client_err.response.get("Error", {}).get("Message", str(client_err))
        logger.warning(f"Amazon Bedrock ClientError [{err_code}]: {err_msg}")
        fallback_text = generate_rule_based_fallback(user_prompt, energy_summary, optimizer_output)
        return {
            "status": "fallback",
            "provider": "deterministic_rule_engine",
            "model_id": model_id,
            "region": region,
            "response": fallback_text,
            "fallback_used": True,
            "fallback_reason": f"Amazon Bedrock API returned {err_code}: {err_msg}. Using deterministic fallback."
        }

    except Exception as ex:
        logger.warning(f"Unexpected error in Bedrock service: {str(ex)}")
        fallback_text = generate_rule_based_fallback(user_prompt, energy_summary, optimizer_output)
        return {
            "status": "fallback",
            "provider": "deterministic_rule_engine",
            "model_id": model_id,
            "region": region,
            "response": fallback_text,
            "fallback_used": True,
            "fallback_reason": f"Bedrock invocation exception: {str(ex)}"
        }
