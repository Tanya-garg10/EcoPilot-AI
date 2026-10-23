import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Copy,
  Check,
  Terminal,
  Radio,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { MCP_TOOLS, PYTHON_MCP_SERVER_CODE } from '../engine/mcpServerDefinition';
import { TariffConfig } from '../types';

interface McpProtocolHubProps {
  tariff: TariffConfig;
}

export const McpProtocolHub: React.FC<McpProtocolHubProps> = ({ tariff }) => {
  const [selectedToolName, setSelectedToolName] = useState<string>('calculate_energy_usage');
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({
    powerWatts: 1500,
    hoursPerDay: 6,
    daysPerMonth: 30,
    quantity: 1,
    tariffRate: 8.0,
    applianceName: '1.5T AC',
  });
  const [requestJson, setRequestJson] = useState<string>('');
  const [responseJson, setResponseJson] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedAlexa, setCopiedAlexa] = useState(false);

  const selectedTool = MCP_TOOLS.find((t) => t.name === selectedToolName) || MCP_TOOLS[0];

  const handleToolSelect = (toolName: string) => {
    setSelectedToolName(toolName);
    if (toolName === 'calculate_energy_usage') {
      setToolArgs({
        powerWatts: 1500,
        hoursPerDay: 6,
        daysPerMonth: 30,
        quantity: 1,
        tariffRate: tariff.ratePerKwh,
        applianceName: '1.5T AC',
      });
    } else if (toolName === 'estimate_energy_savings') {
      setToolArgs({
        actionId: 'act-ac-thermostat',
        tariffRate: tariff.ratePerKwh,
      });
    } else if (toolName === 'optimize_saving_plan') {
      setToolArgs({
        budget: 500,
      });
    } else if (toolName === 'simulate_energy_action') {
      setToolArgs({
        applianceName: 'Split AC',
        baselineWatts: 1500,
        baselineHours: 8,
        simulatedHours: 5,
        simulatedWatts: 1500,
        tariffRate: tariff.ratePerKwh,
      });
    } else if (toolName === 'get_impact_summary') {
      setToolArgs({
        tariffRate: tariff.ratePerKwh,
      });
    }
  };

  const handleExecuteTool = async () => {
    setExecuting(true);
    const mcpPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: selectedToolName,
        arguments: toolArgs,
      },
    };

    setRequestJson(JSON.stringify(mcpPayload, null, 2));

    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2025-11-25',
          'X-MCP-Protocol-Version': '2025-11-25',
        },
        body: JSON.stringify(mcpPayload),
      });
      const data = await res.json();
      setResponseJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseJson(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'python' | 'curl' | 'alexa') => {
    navigator.clipboard.writeText(text);
    if (type === 'python') {
      setCopiedPython(true);
      setTimeout(() => setCopiedPython(false), 2000);
    } else if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else {
      setCopiedAlexa(true);
      setTimeout(() => setCopiedAlexa(false), 2000);
    }
  };

  const sampleCurl = `curl -X POST http://localhost:3000/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "MCP-Protocol-Version: 2025-11-25" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "${selectedToolName}",
      "arguments": ${JSON.stringify(toolArgs)}
    }
  }'`;

  const alexaSchemaJson = `{
  "interactionModel": {
    "languageModel": {
      "invocationName": "eco pilot",
      "intents": [
        {
          "name": "CalculateEnergyIntent",
          "samples": [
            "calculate my appliance electricity cost",
            "how much does a {watts} watt {appliance} cost for {hours} hours",
            "calculate bill for {appliance}"
          ],
          "slots": [
            { "name": "watts", "type": "AMAZON.NUMBER" },
            { "name": "appliance", "type": "AMAZON.SearchQuery" },
            { "name": "hours", "type": "AMAZON.NUMBER" }
          ]
        },
        {
          "name": "OptimizeBudgetIntent",
          "samples": [
            "optimize energy plan for budget of {budget} rupees",
            "what should I upgrade with {budget} budget",
            "best energy saving actions under {budget}"
          ],
          "slots": [
            { "name": "budget", "type": "AMAZON.NUMBER" }
          ]
        },
        {
          "name": "SimulateActionIntent",
          "samples": [
            "what if I reduce AC by {saved_hours} hours",
            "simulate saving if I turn off my geyser earlier"
          ]
        }
      ]
    }
  }
}`;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Cpu className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Model Context Protocol (MCP) Streamable HTTP Hub
          </h2>
        </div>
        <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
          Complies with the official MCP standard using <strong className="text-emerald-800">Streamable HTTP transport (JSON-RPC 2.0)</strong>, spec version <strong className="text-emerald-800 font-mono">2025-11-25</strong>. Connects Alexa+, Amazon Bedrock, Cursor, or external LLM agents directly to EcoPilot's mathematical engine.
        </p>
      </div>

      {/* Protocol Architecture Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-stone-200/90 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-500">Transport Layer</div>
            <div className="text-sm font-bold text-stone-900">Streamable HTTP (Spec 2025-11-25)</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-stone-200/90 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-500">MCP Standard Tools</div>
            <div className="text-sm font-bold text-stone-900">5 Deterministic Tools Active</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-stone-200/90 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-500">Live Endpoint</div>
            <div className="text-sm font-bold font-mono text-emerald-800">POST /api/mcp</div>
          </div>
        </div>
      </div>

      {/* Live Tool Execution & Testing Playground */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-700" />
              <span>Live MCP Streamable HTTP Playground</span>
            </h3>
            <p className="text-xs text-stone-500">
              Select a tool, adjust parameters, and send a live JSON-RPC 2.0 tool execution request
            </p>
          </div>

          <button
            onClick={handleExecuteTool}
            disabled={executing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{executing ? 'Executing...' : 'Execute Tool via MCP'}</span>
          </button>
        </div>

        {/* Tool Selectors */}
        <div className="flex flex-wrap gap-2">
          {MCP_TOOLS.map((tool) => (
            <button
              key={tool.name}
              onClick={() => handleToolSelect(tool.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
                selectedToolName === tool.name
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs font-bold'
                  : 'bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>

        {/* Tool Documentation Preview */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-900 font-mono">{selectedTool.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono">
              MCP Tool Definition
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">{selectedTool.description}</p>
        </div>

        {/* Dynamic Parameter Form */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Tool Arguments (Input Parameters)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(selectedTool.inputSchema.properties).map(([paramName, schema]: [string, any]) => (
              <div key={paramName} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <label className="text-xs font-semibold text-stone-800 font-mono flex items-center justify-between">
                  <span>{paramName}</span>
                  <span className="text-[10px] text-stone-500 font-normal">({schema.type})</span>
                </label>
                <input
                  type={schema.type === 'number' ? 'number' : 'text'}
                  value={toolArgs[paramName] ?? ''}
                  onChange={(e) =>
                    setToolArgs((prev) => ({
                      ...prev,
                      [paramName]: schema.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-emerald-600"
                />
                <p className="text-[10px] text-stone-500 line-clamp-1">{schema.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Request & Response Live Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Payload */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-stone-500">
              <span className="font-mono">JSON-RPC 2.0 Request Payload</span>
              <button
                onClick={() => copyToClipboard(requestJson || sampleCurl, 'curl')}
                className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedCurl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>Copy cURL</span>
              </button>
            </div>
            <pre className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-[11px] font-mono text-emerald-400 overflow-x-auto h-48 leading-relaxed">
              {requestJson || JSON.stringify(
                {
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'tools/call',
                  params: {
                    name: selectedToolName,
                    arguments: toolArgs,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Response Payload */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-stone-500">
              <span className="font-mono">Streamable HTTP Response</span>
              <span className="text-[11px] text-stone-500 font-mono">Status: 200 OK</span>
            </div>
            <pre className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-[11px] font-mono text-teal-300 overflow-x-auto h-48 leading-relaxed">
              {responseJson || '// Click "Execute Tool via MCP" above to trigger response'}
            </pre>
          </div>
        </div>
      </div>

      {/* Exportable Python MCP Server Script */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-lg text-stone-900">Standalone Python MCP Server (mcp_server.py)</h3>
              <p className="text-xs text-stone-500">
                Ready-to-run FastAPI / Uvicorn script with Streamable HTTP transport and 0/1 knapsack implementation
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(PYTHON_MCP_SERVER_CODE, 'python')}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {copiedPython ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            <span>{copiedPython ? 'Copied Python Code!' : 'Copy mcp_server.py'}</span>
          </button>
        </div>

        <pre className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-[11px] font-mono text-stone-200 overflow-x-auto max-h-72 leading-relaxed">
          {PYTHON_MCP_SERVER_CODE}
        </pre>
      </div>

      {/* Alexa+ Skill Interaction Model Schema */}
      <div className="p-6 bg-white border border-stone-200/90 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-700" />
            <div>
              <h3 className="font-bold text-lg text-stone-900">Alexa+ Voice Interaction Model Schema</h3>
              <p className="text-xs text-stone-500">
                Alexa Developer Console JSON model schema mapping voice utterances to EcoPilot MCP tools
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(alexaSchemaJson, 'alexa')}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {copiedAlexa ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAlexa ? 'Copied Schema!' : 'Copy Alexa Schema'}</span>
          </button>
        </div>

        <pre className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-[11px] font-mono text-stone-200 overflow-x-auto max-h-60 leading-relaxed">
          {alexaSchemaJson}
        </pre>
      </div>
    </div>
  );
};
