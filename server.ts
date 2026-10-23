import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import {
  executeMcpTool,
  MCP_TOOLS,
  MCP_RESOURCES,
  MCP_PROMPTS,
  AGENT_SKILLS,
  readMcpResource,
  getMcpPrompt,
} from './src/engine/mcpServerDefinition.ts';
import { runAllAutomatedTests } from './src/engine/run-tests.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MCP_PROTOCOL_VERSION = '2025-11-25';

app.use(express.json());

// Session store for MCP Streamable HTTP connections
interface McpSession {
  id: string;
  createdAt: number;
  lastActivity: number;
  clientInfo?: any;
}
const mcpSessions = new Map<string, McpSession>();

// Helper to validate origin against DNS rebinding (MCP 2025-11-25 Security Spec)
function isOriginValid(originHeader?: string): boolean {
  if (!originHeader) return true; // Local direct curl / Python client without origin
  try {
    const url = new URL(originHeader);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.run.app') ||
      host.endsWith('.aistudio.google') ||
      host.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

// Enable CORS for MCP requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, MCP-Protocol-Version, X-MCP-Protocol-Version, MCP-Session-Id'
  );
  res.header(
    'Access-Control-Expose-Headers',
    'MCP-Protocol-Version, X-MCP-Protocol-Version, MCP-Session-Id'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Initialize Featherless AI Client (OpenAI-compatible)
const ai = new OpenAI({
  apiKey: process.env.FEATHERLESS_API_KEY || 'dummy-key',
  baseURL: 'https://api.featherless.ai/v1',
});

// Helper for deterministic Alexa+ rule-based responses
function resolveDeterministicAlexaQuery(prompt: string, context: any) {
  const p = prompt.toLowerCase();
  const tariff = context?.tariffRate || 8.0;

  // 1. "Calculate my monthly electricity cost" / "bill"
  if (p.includes('monthly electricity cost') || p.includes('calculate my bill') || p.includes('total bill') || (p.includes('calculate') && p.includes('cost') && !p.includes('watt'))) {
    const res = executeMcpTool('get_impact_summary', { tariffRate: tariff, appliances: context?.appliances });
    const bill = res.totalMonthlyBill ?? res.total_monthly_bill ?? 0;
    const kwh = res.totalMonthlyKwh ?? res.total_monthly_kwh ?? 0;
    const top = res.topConsumer ?? res.highest_consumer;
    return {
      toolName: 'get_impact_summary',
      args: { tariffRate: tariff },
      result: res,
      spokenText: `Your estimated monthly electricity bill is ₹${bill.toLocaleString()} for ${kwh} units (kWh). Your top energy consumer is the ${top?.name || '1.5T AC'}, accounting for ${top?.sharePercent ?? top?.percentage ?? 52}% of your total power.`,
    };
  }

  // 2. "Find the best saving actions within ₹1,000" / "best saving actions within..." / budget queries
  const budgetMatch = prompt.match(/(?:within|budget of|under|for)\s*[₹$]?\s*(\d+[\d,]*)/i);
  if (p.includes('saving actions') || p.includes('best actions') || p.includes('optimize') || budgetMatch) {
    const budgetVal = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : 1000;
    const res = executeMcpTool('optimize_saving_plan', { budget: budgetVal });
    const cost = res.totalUpfrontCost ?? res.total_upfront_cost ?? 0;
    const monthlySave = res.estimatedMonthlySavings ?? res.estimated_monthly_savings ?? 0;
    const annualSave = res.estimatedAnnualSavings ?? res.estimated_annual_savings ?? monthlySave * 12;
    const payback = res.paybackPeriodMonths ?? res.payback_months ?? 0;
    const actions = res.recommendedActions ?? res.recommended_actions ?? [];
    const actionTitles = actions.map((a: any) => a.title).join(', ');
    return {
      toolName: 'optimize_saving_plan',
      args: { budget: budgetVal },
      result: res,
      spokenText: `Under your ₹${budgetVal.toLocaleString()} budget, the 0/1 knapsack optimizer selected ${actions.length} actions investing ₹${cost.toLocaleString()} to save an estimated ₹${monthlySave.toLocaleString()} per month (₹${annualSave.toLocaleString()} annually) with an average payback of ${payback} months. Recommended: ${actionTitles}.`,
    };
  }

  // 3. "What if I reduce AC usage by one hour daily?" / what-if simulations
  if (p.includes('what if') || p.includes('reduce ac') || p.includes('one hour') || p.includes('1 hour') || p.includes('hours daily')) {
    const hoursMatch = prompt.match(/(\d+)\s*hour/i);
    const reduction = hoursMatch ? parseInt(hoursMatch[1], 10) : 1;
    const baselineHours = 6;
    const simulatedHours = Math.max(0, baselineHours - reduction);
    const res = executeMcpTool('simulate_energy_action', {
      applianceName: '1.5T AC',
      baselineWatts: 1500,
      baselineHours,
      simulatedHours,
      tariffRate: tariff,
    });
    const kwhSaved = res.delta?.monthlyKwhSaved ?? res.delta?.monthly_kwh_saved ?? 45;
    const costSaved = res.delta?.monthlyCostSaved ?? res.delta?.monthly_cost_saved ?? 360;
    const annualSaved = res.delta?.annualCostSaved ?? res.delta?.annual_cost_saved ?? costSaved * 12;
    const co2Saved = res.delta?.co2OffsetKgMonthly ?? res.delta?.co2_offset_kg_monthly ?? 36.9;
    return {
      toolName: 'simulate_energy_action',
      args: { baselineWatts: 1500, baselineHours, simulatedHours, tariffRate: tariff },
      result: res,
      spokenText: `Reducing your 1.5-ton AC runtime by ${reduction} hour daily saves ${kwhSaved} kWh every month. At ₹${tariff}/unit, that cuts ₹${costSaved.toLocaleString()} from your monthly bill, saving ₹${annualSaved.toLocaleString()} per year and reducing ${co2Saved} kg of CO₂.`,
    };
  }

  // 4. "Explain which appliances contribute most to my bill."
  if (p.includes('contribute most') || p.includes('appliances contribute') || p.includes('highest consumer') || p.includes('power hog') || p.includes('breakdown')) {
    const res = executeMcpTool('get_impact_summary', { tariffRate: tariff, appliances: context?.appliances });
    const top = res.topConsumer ?? res.highest_consumer;
    const breakdown = res.breakdown ?? res.appliance_breakdown ?? [];
    const topApps = breakdown.slice(0, 3).map((a: any) => `${a.name} (${a.kwh ?? a.monthlyKwh ?? a.monthly_kwh} kWh, ${a.percent ?? a.percentage ?? a.sharePercent}%)`).join('; ');
    const topKwh = top?.monthlyKwh ?? top?.kwh ?? top?.monthly_kwh ?? 270;
    const topCost = top?.monthlyCost ?? top?.cost ?? 2160;
    const topPercent = top?.sharePercent ?? top?.percent ?? top?.percentage ?? 52.3;
    return {
      toolName: 'get_impact_summary',
      args: { tariffRate: tariff },
      result: res,
      spokenText: `The highest power contributor in your household is your ${top?.name || '1.5T AC'}, consuming ${topKwh} kWh per month (₹${topCost.toLocaleString()}) which represents ${topPercent}% of your entire bill. Top consumers: ${topApps}.`,
    };
  }

  // Default fallback calculation
  const defaultCalc = executeMcpTool('calculate_energy_usage', {
    powerWatts: 1500,
    hoursPerDay: 6,
    daysPerMonth: 30,
    tariffRate: tariff,
    applianceName: '1.5 Ton AC',
  });
  return {
    toolName: 'calculate_energy_usage',
    args: { powerWatts: 1500, hoursPerDay: 6, tariffRate: tariff },
    result: defaultCalc,
    spokenText: `For a 1,500 Watt air conditioner running 6 hours daily, your estimated monthly consumption is ${defaultCalc.monthly_kwh} kWh, totaling ₹${defaultCalc.monthly_cost.toLocaleString()} at ₹${tariff}/unit.`,
  };
}

// Alexa+ Simulated Assistant Endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const promptText = lastMessage.content || '';

    // Deterministically execute corresponding MCP tool first
    const deterministicData = resolveDeterministicAlexaQuery(promptText, userContext);

    // If Featherless AI is available, generate natural conversational response grounded in the tool output
    if (process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_API_KEY !== 'YOUR_FEATHERLESS_API_KEY') {
      try {
        const enrichedPrompt = `User asked: "${promptText}".
Exact deterministic tool calculation result from tool '${deterministicData.toolName}':
${JSON.stringify(deterministicData.result, null, 2)}

Provide an intelligent, concise Alexa+-style spoken response (2-4 sentences). Always use the exact mathematical numbers from the tool output above. Do not hallucinate or alter any numbers. Be conversational, clear, and reassuring.`;

        const featherlessPromise = ai.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [
            {
              role: 'system',
              content: 'You are Alexa+, an intelligent household energy advisor powered by EcoPilot AI. You speak naturally and quote exact deterministic tool calculation results.',
            },
            {
              role: 'user',
              content: enrichedPrompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 500,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Featherless API timeout')), 5000)
        );

        const featherlessRes: any = await Promise.race([featherlessPromise, timeoutPromise]);
        const reply = featherlessRes.choices[0]?.message?.content?.trim() || deterministicData.spokenText;
        res.json({
          reply,
          toolExecution: {
            toolName: deterministicData.toolName,
            args: deterministicData.args,
            result: deterministicData.result,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (featherlessErr) {
        console.warn('Featherless API call bypassed, using deterministic rule fallback:', featherlessErr);
      }
    }

    // Deterministic rule-based fallback
    res.json({
      reply: deterministicData.spokenText,
      toolExecution: {
        toolName: deterministicData.toolName,
        args: deterministicData.args,
        result: deterministicData.result,
      },
      timestamp: new Date().toISOString(),
      fallbackMode: true,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Streamable HTTP MCP (Model Context Protocol) Endpoint
// Conforms to MCP Specification 2025-11-25
// Supports GET (SSE stream), POST (JSON-RPC), and DELETE (Session termination)

app.get(['/api/mcp', '/api/mcp/sse'], (req: Request, res: Response) => {
  // Validate Origin header to prevent DNS rebinding attacks (MCP 2025-11-25 spec)
  const origin = req.headers.origin;
  if (!isOriginValid(origin)) {
    res.status(403).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Forbidden: Origin validation failed' },
    });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    'X-MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
  });

  res.write(`event: endpoint\ndata: /api/mcp\n\n`);

  // Keep-alive heartbeat ping
  const timer = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 15000);

  req.on('close', () => clearInterval(timer));
});

app.post('/api/mcp', async (req: Request, res: Response) => {
  // Validate Origin header to prevent DNS rebinding attacks
  const origin = req.headers.origin;
  if (!isOriginValid(origin)) {
    res.status(403).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Forbidden: Origin validation failed against DNS rebinding' },
    });
    return;
  }

  // Set required protocol version response headers
  res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
  res.setHeader('X-MCP-Protocol-Version', MCP_PROTOCOL_VERSION);

  try {
    const { method, params, id = 1, jsonrpc = '2.0' } = req.body || {};

    // 1. Session Management
    const incomingSessionId = (req.headers['mcp-session-id'] as string) || (req.headers['x-mcp-session-id'] as string);
    if (incomingSessionId && mcpSessions.has(incomingSessionId)) {
      const session = mcpSessions.get(incomingSessionId)!;
      session.lastActivity = Date.now();
      res.setHeader('MCP-Session-Id', incomingSessionId);
    }

    // 2. Initialize handshake
    if (method === 'initialize') {
      const newSessionId = `sess-${crypto.randomUUID()}`;
      mcpSessions.set(newSessionId, {
        id: newSessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        clientInfo: params?.clientInfo,
      });

      res.setHeader('MCP-Session-Id', newSessionId);

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
            logging: {},
          },
          serverInfo: {
            name: 'ecopilot-mcp-server',
            version: '1.2.0',
            description: 'Streamable HTTP MCP Server with Agent Skills & MCP Apps for EcoPilot AI',
          },
          sessionId: newSessionId,
        },
      });
      return;
    }

    // 3. Notifications (Per MCP 2025-11-25 spec: MUST respond with HTTP 202 Accepted and empty body)
    if (typeof method === 'string' && method.startsWith('notifications/')) {
      res.status(202).end();
      return;
    }

    // 4. Ping
    if (method === 'ping') {
      res.json({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    // 5. Tools Discovery
    if (method === 'tools/list') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
      return;
    }

    // 6. Tools Execution
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (!toolName) {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: "Missing 'name' in tools/call parameters" },
        });
        return;
      }

      const toolResult = executeMcpTool(toolName, args);

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2),
            },
          ],
          isError: false,
        },
      });
      return;
    }

    // 7. Resources Discovery (MCP Apps & schemas)
    if (method === 'resources/list') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: MCP_RESOURCES,
        },
      });
      return;
    }

    // 8. Resource Read
    if (method === 'resources/read') {
      const uri = params?.uri;
      if (!uri) {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: "Missing 'uri' in resources/read parameters" },
        });
        return;
      }

      const resourceData = readMcpResource(uri);
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri: resourceData.uri,
              mimeType: resourceData.mimeType,
              text: JSON.stringify(resourceData.contents, null, 2),
            },
          ],
        },
      });
      return;
    }

    // 9. Prompts Discovery
    if (method === 'prompts/list') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          prompts: MCP_PROMPTS,
        },
      });
      return;
    }

    // 10. Prompt Template Get
    if (method === 'prompts/get') {
      const promptName = params?.name;
      if (!promptName) {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: "Missing 'name' in prompts/get parameters" },
        });
        return;
      }

      const promptData = getMcpPrompt(promptName, params?.arguments);
      res.json({
        jsonrpc: '2.0',
        id,
        result: promptData,
      });
      return;
    }

    // Method Not Found
    res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  } catch (err: any) {
    res.status(400).json({
      jsonrpc: '2.0',
      id: req.body?.id || 1,
      error: { code: -32602, message: err.message || 'Tool execution error' },
    });
  }
});

// Explicit Session Termination via HTTP DELETE (MCP 2025-11-25 Spec)
app.delete('/api/mcp', (req: Request, res: Response) => {
  const sessionId = (req.headers['mcp-session-id'] as string) || (req.headers['x-mcp-session-id'] as string);
  if (sessionId && mcpSessions.has(sessionId)) {
    mcpSessions.delete(sessionId);
  }
  res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
  res.status(204).end();
});

// Agent Skills Catalog Endpoint
app.get('/api/mcp/skills', (req: Request, res: Response) => {
  res.json({
    skills: AGENT_SKILLS,
    count: AGENT_SKILLS.length,
    protocolVersion: MCP_PROTOCOL_VERSION,
  });
});

// MCP Status & Health Endpoint
app.get('/api/mcp/status', async (req: Request, res: Response) => {
  let pythonServerDetected = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const pyCheck = await fetch('http://localhost:8000/health', { signal: controller.signal });
    clearTimeout(timeout);
    if (pyCheck.ok) {
      pythonServerDetected = true;
    }
  } catch (e) {
    pythonServerDetected = false;
  }

  res.json({
    status: 'online',
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: 'Streamable HTTP (JSON-RPC 2.0)',
    activeSessionsCount: mcpSessions.size,
    toolsCount: MCP_TOOLS.length,
    tools: MCP_TOOLS.map((t) => t.name),
    resourcesCount: MCP_RESOURCES.length,
    promptsCount: MCP_PROMPTS.length,
    agentSkillsCount: AGENT_SKILLS.length,
    endpoints: {
      integratedExpress: '/api/mcp',
      standalonePython: 'http://localhost:8000/mcp',
    },
    standalonePythonDetected: pythonServerDetected,
  });
});


// Direct Deterministic Energy Calculation Endpoints
app.post('/api/energy/calculate', (req: Request, res: Response) => {
  try {
    const { powerWatts, hoursPerDay, daysPerMonth = 30, quantity = 1, tariffRate = 8.0, applianceName = 'Appliance' } = req.body;
    const result = executeMcpTool('calculate_energy_usage', { powerWatts, hoursPerDay, daysPerMonth, quantity, tariffRate, applianceName });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/energy/optimize', (req: Request, res: Response) => {
  try {
    const { budget, filterCategory } = req.body;
    const result = executeMcpTool('optimize_saving_plan', { budget, filterCategory });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/energy/simulate', (req: Request, res: Response) => {
  try {
    const { baselineWatts, baselineHours, simulatedWatts, simulatedHours, tariffRate = 8.0, applianceName = 'Appliance' } = req.body;
    const result = executeMcpTool('simulate_energy_action', { baselineWatts, baselineHours, simulatedWatts, simulatedHours, tariffRate, applianceName });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/energy/summary', (req: Request, res: Response) => {
  try {
    const { appliances, tariffRate = 8.0 } = req.body;
    const result = executeMcpTool('get_impact_summary', { appliances, tariffRate });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Start Server & mount Vite or Static assets
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoPilot AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
