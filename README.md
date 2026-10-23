# EcoPilot AI 💚

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-cyan.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

> **Mathematical Energy Calculator, 0/1 Knapsack Budget Optimizer, What-If Simulator & AI Chat Assistant with MCP Protocol Support**

---

## 🌟 Overview

**EcoPilot AI** is an intelligent household energy advisor that uses verified physics and discrete optimization algorithms to help users:

1. **🤖 AI Chat Assistant** - Conversational interface with markdown rendering (bold, italic, lists) for natural energy queries
2. **🔌 MCP Protocol Hub** - Real Model Context Protocol (MCP) Streamable HTTP Server following specification version `2025-11-25`
3. **⚡ WattWise Engine** - Calculates monthly electricity units (kWh) and progressive tiered bills using `kWh = Watts × Hours/Day × Days × Quantity ÷ 1000`
4. **💰 Smart Plan Optimizer** - Solves an exact **0/1 Knapsack Dynamic Programming algorithm** to find mathematically optimal efficiency interventions under any budget
5. **🔮 What-If Simulator** - Dynamically recalculates before/after baseline consumption when testing appliance runtime cuts or hardware upgrades
6. **✅ Hackathon Checklist** - Built-in submission tracker with progress monitoring

---

## 🎯 Key Features

### 💬 AI Chat with Markdown Support
- Conversational interface for natural energy queries
- Rich text rendering with **bold**, *italic*, lists, and code formatting
- Real-time responses powered by Gemini 3.8
- Context-aware calculations using appliance data

### 🧮 Mathematical Precision
- Exact kWh calculations using physics formulas
- Transparent calculations with visible formulas
- Tiered slab pricing support
- ROI and payback period calculations

### 🎛️ Budget Optimization
- 0/1 Knapsack DP algorithm for optimal savings
- Budget-aware recommendations
- Category filtering (Cooling, Heating, Kitchen, etc.)
- Visual ROI breakdown

### 🔧 What-If Scenarios
- Test runtime reductions
- Compare appliance upgrades
- Real-time delta calculations
- Impact visualization

### 📋 Hackathon Checklist
- Track submission requirements
- Progress tracking by category
- Local storage persistence
- Pro tips for successful submission

---

## 🔌 MCP Server & Protocol Specification

### Endpoints
- **Integrated Full-Stack Server**: `http://localhost:3000/api/mcp`
- **SSE Stream Endpoint**: `/api/mcp/sse`
- **Supported Transport**: Streamable HTTP (`POST` JSON-RPC 2.0 & `GET` Server-Sent Events)
- **Protocol Version**: `2025-11-25`

### Handshake & Methods
1. `initialize` - Returns server capabilities, serverInfo, and protocol version
2. `notifications/initialized` - Notification acknowledgment
3. `ping` - Health check
4. `tools/list` - Dynamically advertises all tools with JSON schema definitions
5. `tools/call` - Executes the chosen tool with input validation
6. `resources/list` - Lists available MCP resources
7. `resources/read` - Reads specific resource data
8. `prompts/list` - Lists available prompt templates
9. `prompts/get` - Gets specific prompt template

### Exposed Tools
1. `calculate_energy_usage` - Computes exact kWh and estimated bill
2. `estimate_energy_savings` - Returns engineering savings & payback
3. `optimize_saving_plan` - 0/1 Knapsack DP optimizer under budget
4. `simulate_energy_action` - Dynamic before/after comparison
5. `get_impact_summary` - Comprehensive household audit

---

## 🧮 Mathematical Engine & Formulas

### 1. Appliance Consumption Formula
$$\text{Monthly kWh} = \frac{\text{Power (Watts)} \times \text{Hours/Day} \times \text{Days/Month} \times \text{Quantity}}{1000}$$

$$\text{Monthly Cost} = \text{Monthly kWh} \times \text{Tariff Rate (₹/kWh)}$$

**Example:**
$$\text{1,500 W AC} \times 6\text{ hrs/day} \times 30\text{ days} \div 1000 = 270\text{ kWh/month}$$
$$\text{At ₹8/unit: } 270\text{ kWh} \times ₹8 = ₹2,160\text{/month}$$

### 2. 0/1 Knapsack Optimization
Given candidate energy interventions $i = 1 \dots n$, each with upfront cost $c_i \ge 0$ and monthly savings $s_i$:

$$\max \sum_{i=1}^n s_i \cdot x_i \quad \text{subject to} \quad \sum_{i=1}^n c_i \cdot x_i \le \text{Budget}, \quad x_i \in \{0, 1\}$$

Solved in $\mathcal{O}(n \cdot W)$ time using dynamic programming with state traceback.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ecopilot-ai

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

---

## 🏗️ Project Structure

```
ecopilot-ai/
├── src/
│   ├── components/          # React components
│   │   ├── EcoPilotAssistant.tsx    # AI Chat with markdown
│   │   ├── HackathonChecklist.tsx   # Submission tracker
│   │   ├── WattWiseEngine.tsx       # Appliance calculator
│   │   ├── BudgetOptimizer.tsx      # Knapsack optimizer
│   │   ├── WhatIfSimulator.tsx      # Scenario simulator
│   │   └── DashboardView.tsx        # Main dashboard
│   ├── engine/              # Calculation engines
│   │   ├── energyCalculator.ts
│   │   ├── actionCatalog.ts
│   │   └── knapsackOptimizer.ts
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript definitions
│   └── index.css            # Global styles
├── server.ts                # Express + Vite server
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## 🎨 Tech Stack

- **Frontend**: React 19, TypeScript 5.7, Tailwind CSS 4.3
- **Charts**: Recharts 3.10
- **Icons**: Lucide React
- **Markdown**: react-markdown, remark-gfm
- **Backend**: Express.js
- **Build Tool**: Vite 8.3
- **AI**: Featherless AI (OpenAI-compatible API with Llama 3.1)

---

## 🧪 Testing

The application includes a built-in **Hackathon Checklist** tab that allows you to:
- Track submission requirements
- Monitor progress by category
- Test core functionality
- Verify checklist items

Navigate to the **Hackathon Checklist** tab in the dashboard to access these features.

---

## 📊 Dashboard Tabs

1. **Overview** - Summary cards, category distribution, top consumers
2. **My Appliances** - Add, edit, remove household appliances
3. **Budget Optimizer** - Knapsack-based savings recommendations
4. **What-If Simulator** - Test different energy scenarios
5. **AI Copilot** - Chat interface with markdown support
6. **Hackathon Checklist** - Submission progress tracker

---

## ⚙️ Configuration

### Electricity Tariff
Configure your local electricity tariff rate:
- Click the **Tariff** button in the header
- Enter your rate per unit (kWh)
- Enable progressive slab pricing if applicable

### Currency Support
Supports multiple currencies:
- INR (₹) - Indian Rupee
- USD ($) - US Dollar
- EUR (€) - Euro
- GBP (£) - British Pound

---

## ⚖️ Assumptions & Disclosures

All monetary savings, payback periods, and kilowatt-hour figures are engineering simulations based on:
- Standard test conditions
- Typical utility benchmarks (₹8/kWh default)
- Average appliance power ratings

**Actual household electricity bills depend on:**
- Local weather conditions
- Room thermal insulation
- Appliance maintenance history
- Grid tariffs and time-of-use pricing
- Individual usage patterns

EcoPilot AI does not claim measured meter readings or direct hardware control.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **MCP Protocol** - Model Context Protocol specification
- **Google AI** - Gemini API for conversational AI
- **Vercel** - For Vite build tool
- **Tailwind Labs** - For Tailwind CSS framework

---

## 📞 Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.
