# EcoPilot AI 💚

> **Mathematical Energy Calculator, 0/1 Knapsack Budget Optimizer, What-If Simulator & Alexa+ MCP Assistant**

---

## 🌟 Overview

**EcoPilot AI** is an intelligent household energy advisor built for the Alexa+ Hackathon. Unlike generic chatbots, EcoPilot AI uses verified physics and discrete optimization algorithms to:
1. **Alexa+ Simulated Experience**: Web-based conversational interface featuring signature ambient cyan glowing ring, optional text-to-speech voice synthesis, quick natural queries, and a **Real MCP Client**.
2. **Visible Tool-Call Activity Panel**: Real-time inspection panel displaying the selected MCP tool, sanitized input parameters, execution status, latency, formula/algorithm proofs, and expandable raw JSON-RPC 2.0 payloads.
3. **WattWise Engine**: Calculates monthly electricity units (kWh) and progressive tiered bills (`kWh = Watts × Hours/Day × Days × Quantity ÷ 1000`).
4. **Smart Plan Optimizer**: Solves an exact **0/1 Knapsack Dynamic Programming algorithm** to find the mathematically optimal set of efficiency interventions maximizing monthly monetary savings under any user-defined upfront budget.
5. **What-If Simulator**: Dynamically recalculates before/after baseline consumption when users test appliance runtime cuts or hardware upgrades in real-time.
6. **Model Context Protocol (MCP) Streamable HTTP Server**: Exposes 5 core tools over JSON-RPC 2.0 Streamable HTTP following specification version **2025-11-25**.

---

## 🔌 MCP Server & Protocol Specification

### Endpoints
- **Integrated Full-Stack Server**: `http://localhost:3000/api/mcp`
- **Standalone Python Server**: `http://localhost:8000/mcp`
- **SSE Stream Endpoint**: `/api/mcp/sse` (or `/mcp/sse` on Python server)
- **Supported Transport**: Streamable HTTP (`POST` JSON-RPC 2.0 & `GET` Server-Sent Events)
- **Protocol Version**: `2025-11-25`

### Handshake & Methods
1. `initialize`: Returns server capabilities, serverInfo, and protocol version `2025-11-25`.
2. `notifications/initialized`: Notification acknowledgment.
3. `ping`: Health check.
4. `tools/list`: Dynamically advertises all 5 tools with strict JSON schema definitions.
5. `tools/call`: Executes the chosen tool with input validation and returns structured results.

### Exposed Real Tools
1. `calculate_energy_usage`: Computes exact kWh and estimated bill.
2. `estimate_energy_savings`: Returns engineering savings & payback for specific actions.
3. `optimize_saving_plan`: 0/1 Knapsack DP optimizer under given budget.
4. `simulate_energy_action`: Dynamic before/after comparison with delta metrics.
5. `get_impact_summary`: Comprehensive household audit and top energy hogs.

---

## 🧮 Mathematical Engine & Formulas

### 1. Appliance Consumption Formula
$$\text{Monthly kWh} = \frac{\text{Power (Watts)} \times \text{Hours/Day} \times \text{Days/Month} \times \text{Quantity}}{1000}$$

$$\text{Monthly Cost} = \text{Monthly kWh} \times \text{Tariff Rate (₹/kWh)}$$

*Example benchmark:*
$$\text{1,500 W AC} \times 6\text{ hrs/day} \times 30\text{ days} \div 1000 = 270\text{ kWh/month}$$
$$\text{At ₹8/unit: } 270\text{ kWh} \times ₹8 = ₹2,160\text{/month}$$

### 2. 0/1 Knapsack Optimization Formulation
Given candidate energy interventions $i = 1 \dots n$, each with upfront cost $c_i \ge 0$ and monthly savings $s_i$:

$$\max \sum_{i=1}^n s_i \cdot x_i \quad \text{subject to} \quad \sum_{i=1}^n c_i \cdot x_i \le \text{Budget}, \quad x_i \in \{0, 1\}$$

Solved in $\mathcal{O}(n \cdot W)$ time using dynamic programming with state traceback to identify the exact subset of actions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (Standard library only — zero pip dependencies required!)

### 1. Start the Full-Stack Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. (Optional) Run the Standalone Python MCP Server
```bash
python3 mcp_server.py
```
Starts pure Python Streamable HTTP JSON-RPC 2.0 server on port `8000`.

---

## 🧪 Testing

### 1. Run Python MCP Server Tests
```bash
python3 tests/test_mcp_server.py
```
Runs 11 automated test cases covering handshake, tool discovery, validation, and mathematical correctness.

### 2. Run Full Test Suite in UI
Navigate to the **Hackathon Checklist** tab and click **Run Test Suite Now**.

---

## 🎥 Sub-Three-Minute Video Presentation Structure
- **0:00 - 0:45**: Problem context & WattWise math demonstration.
- **0:45 - 1:45**: Alexa+ Simulated Experience & Visible Tool Activity Panel.
- **1:45 - 2:40**: What-If simulation & automated test execution report.

---

## ⚖️ Assumptions & Disclosures
All monetary savings, payback periods, and kilowatt-hour figures are engineering simulations based on standard test conditions and typical ₹8/kWh utility benchmarks. Actual household electricity bills depend on local weather, room thermal insulation, appliance maintenance history, and grid tariffs. EcoPilot AI does not claim measured meter readings or direct hardware control.

---

## 📜 License
Apache-2.0 License.
