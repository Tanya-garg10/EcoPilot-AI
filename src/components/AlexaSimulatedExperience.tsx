import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Send,
  Cpu,
  Sparkles,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  ExternalLink,
  ShieldCheck,
  Sliders,
  Workflow,
  X,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { mcpClient, McpToolActivity } from '../services/mcpClient';
import { Appliance, TariffConfig } from '../types';
import { AGENT_SKILLS, AgentSkillDefinition } from '../engine/mcpServerDefinition';
import { DEFAULT_SAVING_ACTIONS } from '../engine/actionCatalog';
import { optimizeSavingPlan } from '../engine/knapsackOptimizer';

interface AlexaSimulatedExperienceProps {
  appliances: Appliance[];
  tariff: TariffConfig;
  totalMonthlyCost: number;
  totalMonthlyKwh: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'alexa';
  text: string;
  timestamp: string;
  toolUsed?: string;
  toolActivityId?: string;
  structuredData?: any;
  provider?: string;
}

const REQUIRED_PROMPTS = [
  'Calculate my monthly electricity cost.',
  'Find the best saving actions within ₹1,000.',
  'What if I reduce AC usage by one hour daily?',
  'Explain which appliances contribute most to my bill.',
  'How much does a 1500W AC cost running 6 hours daily?',
];

// Inline MCP App 1: Interactive 0/1 Knapsack Budget Allocator
const InlineKnapsackApp: React.FC<{
  initialBudget?: number;
  tariffRate: number;
  onSelectAction?: (text: string) => void;
}> = ({ initialBudget = 1000, tariffRate }) => {
  const [budget, setBudget] = useState<number>(initialBudget);

  const plan = useMemo(() => {
    return optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, budget);
  }, [budget]);

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200 rounded-2xl text-xs space-y-3 font-sans shadow-2xs">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-stone-900">
          <Sliders className="w-3.5 h-3.5 text-emerald-700" />
          <span>Interactive MCP App: 0/1 Knapsack Allocator</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 font-semibold border border-emerald-200">
          ui://ecopilot/budget-allocator
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone-600 font-medium">Adjust Upfront Budget:</span>
          <span className="font-mono font-bold text-emerald-800 text-sm">
            ₹{budget.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={3500}
          step={100}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
        />
        <div className="flex justify-between text-[10px] text-stone-400 font-mono">
          <span>₹0 (Habits only)</span>
          <span>₹1,500</span>
          <span>₹3,500</span>
        </div>
      </div>

      {/* Real-time recalculated metrics */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="p-2 rounded-xl bg-white border border-stone-200 text-center">
          <div className="text-[10px] text-stone-400 font-medium">Cost / Spend</div>
          <div className="font-mono font-bold text-stone-900 text-xs">
            ₹{plan.totalUpfrontCost.toLocaleString()}
          </div>
          <div className="text-[9px] text-stone-400">₹{plan.unallocatedBudget} unspent</div>
        </div>

        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <div className="text-[10px] text-emerald-800 font-medium">Monthly Savings</div>
          <div className="font-mono font-bold text-emerald-800 text-xs">
            +₹{plan.totalMonthlySavings.toLocaleString()}
          </div>
          <div className="text-[9px] text-emerald-700">{plan.totalKwhSavedMonthly} kWh/mo</div>
        </div>

        <div className="p-2 rounded-xl bg-white border border-stone-200 text-center">
          <div className="text-[10px] text-stone-400 font-medium">Payback Period</div>
          <div className="font-mono font-bold text-stone-900 text-xs">
            {plan.paybackMonths} mo
          </div>
          <div className="text-[9px] text-emerald-700">{plan.roiPercentageAnnual}% ROI</div>
        </div>
      </div>

      {/* Selected Action Chips */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
          Optimal Actions Selected ({plan.selectedActions.length}):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.selectedActions.map((act) => (
            <span
              key={act.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-[11px] text-stone-800 font-medium shadow-2xs"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              <span>{act.title}</span>
              <span className="text-[10px] text-emerald-800 font-mono">
                (+₹{act.monthlySavings}/mo)
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Inline MCP App 2: Interactive What-If AC Usage Adjuster
const InlineWhatIfApp: React.FC<{
  tariffRate: number;
}> = ({ tariffRate }) => {
  const [simHours, setSimHours] = useState<number>(5);
  const baselineHours = 6;
  const watts = 1500;

  const baseKwh = (watts * baselineHours * 30) / 1000; // 270 kWh
  const baseCost = baseKwh * tariffRate; // ₹2,160

  const simKwh = (watts * simHours * 30) / 1000;
  const simCost = simKwh * tariffRate;

  const kwhSaved = Math.round((baseKwh - simKwh) * 10) / 10;
  const costSaved = Math.round(baseCost - simCost);
  const co2Saved = (kwhSaved * 0.82).toFixed(1);

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-sky-50/80 via-white to-cyan-50/60 border border-sky-200 rounded-2xl text-xs space-y-3 font-sans shadow-2xs">
      <div className="flex items-center justify-between border-b border-sky-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-stone-900">
          <TrendingDown className="w-3.5 h-3.5 text-cyan-700" />
          <span>Interactive MCP App: What-If Scenario Slider</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold border border-sky-200">
          ui://ecopilot/whatif-simulator
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone-600 font-medium">Daily AC Runtime:</span>
          <span className="font-mono font-bold text-sky-900 text-sm">
            {simHours} hrs/day <span className="text-xs text-stone-400 font-normal">(was {baselineHours} hrs)</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={simHours}
          onChange={(e) => setSimHours(Number(e.target.value))}
          className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-sky-700"
        />
        <div className="flex justify-between text-[10px] text-stone-400 font-mono">
          <span>1 hr (Eco)</span>
          <span>6 hrs (Baseline)</span>
          <span>10 hrs</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="p-2 rounded-xl bg-white border border-stone-200">
          <div className="text-[10px] text-stone-400">Monthly Bill</div>
          <div className="font-mono font-bold text-stone-900 text-xs">
            ₹{simCost.toLocaleString()}
          </div>
          <div className="text-[9px] text-stone-400">{simKwh} kWh</div>
        </div>

        <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200">
          <div className="text-[10px] text-cyan-800 font-medium">Monthly Delta</div>
          <div className="font-mono font-bold text-cyan-800 text-xs">
            {costSaved >= 0 ? `-₹${costSaved.toLocaleString()}` : `+₹${Math.abs(costSaved)}`}
          </div>
          <div className="text-[9px] text-cyan-700">
            {kwhSaved >= 0 ? `${kwhSaved} kWh saved` : `${Math.abs(kwhSaved)} kWh added`}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-white border border-stone-200">
          <div className="text-[10px] text-stone-400">CO₂ Avoided</div>
          <div className="font-mono font-bold text-stone-900 text-xs">
            {co2Saved} kg
          </div>
          <div className="text-[9px] text-emerald-700">per month</div>
        </div>
      </div>
    </div>
  );
};

// Inline MCP App 3: Interactive Appliance Consumption Breakdown
const InlineBreakdownApp: React.FC<{
  appliances: Appliance[];
  tariff: TariffConfig;
}> = ({ appliances, tariff }) => {
  const totalCost = appliances.reduce((sum, a) => {
    const kwh = (a.powerWatts * a.hoursPerDay * a.daysPerMonth * a.quantity) / 1000;
    return sum + kwh * tariff.ratePerKwh;
  }, 0);

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-amber-50/70 via-white to-stone-50 border border-amber-200 rounded-2xl text-xs space-y-3 font-sans shadow-2xs">
      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-stone-900">
          <Zap className="w-3.5 h-3.5 text-amber-700" />
          <span>Interactive MCP App: Appliance Energy Breakdown</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
          ui://ecopilot/appliance-breakdown
        </span>
      </div>

      <div className="space-y-2">
        {appliances.slice(0, 4).map((app) => {
          const kwh = Math.round((app.powerWatts * app.hoursPerDay * app.daysPerMonth * app.quantity) / 1000);
          const cost = Math.round(kwh * tariff.ratePerKwh);
          const percent = totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0;

          return (
            <div key={app.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-stone-800">{app.name}</span>
                <span className="font-mono font-bold text-stone-900">
                  ₹{cost.toLocaleString()} <span className="text-stone-400 font-normal">({percent}%)</span>
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-700 h-1.5 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AlexaSimulatedExperience: React.FC<AlexaSimulatedExperienceProps> = ({
  appliances,
  tariff,
  totalMonthlyCost,
  totalMonthlyKwh,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'alexa',
      text: 'Hello! I am your Alexa+ simulated energy assistant powered by EcoPilot AI. I am grounded in deterministic calculations and connected to a real Model Context Protocol (MCP) Streamable HTTP server conforming to Specification 2025-11-25. You can ask me to calculate electricity costs, optimize your savings under a budget using 0/1 knapsack dynamic programming, or simulate energy habit changes.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mcpStatus, setMcpStatus] = useState(mcpClient.getStatus());
  const [sessionId, setSessionId] = useState<string | null>(mcpClient.getSessionId());
  const [activities, setActivities] = useState<McpToolActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [endpointInput, setEndpointInput] = useState(mcpClient.getEndpointUrl());
  const [showEndpointConfig, setShowEndpointConfig] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to MCP client changes
  useEffect(() => {
    const unsubscribe = mcpClient.subscribe(() => {
      setMcpStatus(mcpClient.getStatus());
      setSessionId(mcpClient.getSessionId());
      setActivities(mcpClient.getActivities());
    });
    // Initial connection handshake
    mcpClient.connect().then(() => {
      setMcpStatus(mcpClient.getStatus());
      setSessionId(mcpClient.getSessionId());
      setActivities(mcpClient.getActivities());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Text to speech playback
  const speakText = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const handleSendPrompt = async (queryText?: string) => {
    const text = (queryText || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Step 1: Query backend which coordinates with MCP Server and Bedrock/Gemini
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2025-11-25',
          ...(sessionId ? { 'MCP-Session-Id': sessionId } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          userContext: {
            currency: tariff.currency,
            tariffRate: tariff.ratePerKwh,
            totalMonthlyCost,
            totalMonthlyKwh,
            appliances: appliances.map((a) => ({
              name: a.name,
              powerWatts: a.powerWatts,
              hoursPerDay: a.hoursPerDay,
              quantity: a.quantity,
            })),
          },
        }),
      });

      const data = await response.json();
      const toolExec = data.toolExecution;

      // Record client-side tool activity through real MCP client
      let clientActivityId: string | undefined;
      if (toolExec?.toolName) {
        try {
          await mcpClient.callTool(toolExec.toolName, toolExec.args || {});
          const latestActs = mcpClient.getActivities();
          if (latestActs.length > 0) {
            clientActivityId = latestActs[0].id;
            setSelectedActivityId(clientActivityId);
          }
        } catch (mcpErr) {
          console.warn('Real MCP client call notice:', mcpErr);
        }
      }

      const alexaMsg: ChatMessage = {
        id: `alexa-${Date.now()}`,
        sender: 'alexa',
        text: data.reply || 'Calculation completed through MCP server.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolUsed: toolExec?.toolName,
        toolActivityId: clientActivityId,
        structuredData: toolExec?.result,
        provider: data.provider || (data.fallbackMode ? 'Deterministic Rule Engine' : 'AI Studio'),
      };

      setMessages((prev) => [...prev, alexaMsg]);
      speakText(alexaMsg.text);
    } catch (err: any) {
      // Deterministic fallback response
      const fallbackMsg: ChatMessage = {
        id: `alexa-fb-${Date.now()}`,
        sender: 'alexa',
        text: `Based on your household profile: Your monthly bill is estimated at ₹${totalMonthlyCost.toLocaleString()} (${totalMonthlyKwh} kWh). Setting your AC to 24°C saves ~₹420/month with zero upfront cost.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'Deterministic Fallback',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakText(fallbackMsg.text);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitchEndpoint = async (url: string) => {
    mcpClient.setEndpointUrl(url);
    setEndpointInput(url);
    await mcpClient.connect();
    setShowEndpointConfig(false);
  };

  const handleResetSession = async () => {
    await mcpClient.terminateSession();
    await mcpClient.connect();
  };

  const toggleExpand = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Honesty & Architecture Banner */}
      <div className="p-4 bg-white border border-stone-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-stone-700">
            <strong className="text-stone-900">Deterministic Mathematical Grounding: </strong>
            Energy figures and 0/1 knapsack plans are calculated deterministically. The assistant uses these exact outputs to explain findings and never invents energy data.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSkillsModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-medium text-[11px] transition cursor-pointer"
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-700" />
            <span>Agent Skills ({AGENT_SKILLS.length})</span>
          </button>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>MCP 2025-11-25</span>
          </span>

          <button
            onClick={() => setShowEndpointConfig(!showEndpointConfig)}
            className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
          >
            Config
          </button>
        </div>
      </div>

      {/* Endpoint Switcher Dropdown */}
      {showEndpointConfig && (
        <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 text-xs shadow-xs">
          <div className="font-bold text-stone-900">MCP Streamable HTTP Endpoint Configuration</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSwitchEndpoint('/api/mcp')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                endpointInput === '/api/mcp'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              Integrated Server (/api/mcp)
            </button>
            <button
              onClick={() => handleSwitchEndpoint('http://localhost:8000/mcp')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                endpointInput === 'http://localhost:8000/mcp'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              Standalone Python (http://localhost:8000/mcp)
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
            <span>Active Protocol Version: <span className="font-mono text-emerald-700 font-semibold">2025-11-25</span></span>
            {sessionId && (
              <span className="font-mono text-stone-600">Session: {sessionId.substring(0, 16)}...</span>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Left = Alexa+ Conversation / Right = Visible Tool Activity Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alexa+ Simulated Interface (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-3xl flex flex-col h-[670px] shadow-xs overflow-hidden relative">
          {/* Alexa+ Glow Header */}
          <div className="px-6 py-4 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Alexa Pulsing Cyan Ring */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center p-0.5 transition-all duration-300 ${
                  isSpeaking
                    ? 'shadow-md shadow-cyan-500/40 bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-500 animate-pulse'
                    : isProcessing
                    ? 'shadow-md shadow-amber-500/40 bg-gradient-to-tr from-amber-400 to-emerald-500 animate-spin'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-xs'
                }`}
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <Sparkles
                    className={`w-4 h-4 ${
                      isSpeaking ? 'text-cyan-600' : 'text-cyan-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900 tracking-wide">
                    Alexa+ Simulated Experience
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                    Voice & Text
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <span>EcoPilot Intelligence</span>
                  <span>•</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    {sessionId ? `Session: ${sessionId.substring(0, 13)}...` : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Session Reset & Audio Speech Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSession}
                title="Terminate active session via DELETE /api/mcp and reconnect"
                className="p-2 rounded-xl text-xs text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">New Session</span>
              </button>

              <button
                onClick={() => {
                  if (audioEnabled) {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                  }
                  setAudioEnabled(!audioEnabled);
                }}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  audioEnabled
                    ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
                title={audioEnabled ? 'Mute Alexa voice' : 'Enable Alexa speech synthesis'}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">{audioEnabled ? 'Voice On' : 'Voice Off'}</span>
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50/30">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-cyan-100 border border-cyan-300 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
                    </div>
                  )}

                  <div className="max-w-[88%] space-y-1.5">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-emerald-700 text-white font-medium rounded-tr-none'
                          : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Render Inline MCP Apps based on executed tool */}
                      {!isUser && msg.toolUsed === 'optimize_saving_plan' && (
                        <InlineKnapsackApp
                          initialBudget={msg.structuredData?.budget || 1000}
                          tariffRate={tariff.ratePerKwh}
                          onSelectAction={(actionTitle) => handleSendPrompt(`What is the payback for ${actionTitle}?`)}
                        />
                      )}

                      {!isUser && msg.toolUsed === 'simulate_energy_action' && (
                        <InlineWhatIfApp tariffRate={tariff.ratePerKwh} />
                      )}

                      {!isUser && msg.toolUsed === 'get_impact_summary' && (
                        <InlineBreakdownApp appliances={appliances} tariff={tariff} />
                      )}

                      {/* Tool Executed Pill */}
                      {msg.toolUsed && (
                        <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-emerald-700" />
                            <span>Tool: {msg.toolUsed}</span>
                          </span>
                          {msg.toolActivityId && (
                            <button
                              onClick={() => setSelectedActivityId(msg.toolActivityId!)}
                              className="text-cyan-700 hover:underline flex items-center gap-0.5 text-[10px] cursor-pointer"
                            >
                              <span>Inspect In Panel</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-[10px] text-stone-400 px-1 font-mono ${
                        isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-stone-500 p-2 font-mono">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin" />
                <span>Alexa+ querying Streamable HTTP MCP tools...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Chips */}
          <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-stone-400 shrink-0">Try Asking:</span>
            {REQUIRED_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(q)}
                disabled={isProcessing}
                className="text-xs px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 whitespace-nowrap transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-stone-200 flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
              placeholder="Ask Alexa+: 'Find the best saving actions within ₹1,000'..."
              className="flex-1 bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-cyan-600 focus:bg-white"
            />
            <button
              onClick={() => handleSendPrompt()}
              disabled={!inputText.trim() || isProcessing}
              className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 text-white font-semibold rounded-2xl transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visible Tool-Call Activity Panel */}
        <div className="lg:col-span-5 bg-white border border-stone-200/90 rounded-3xl p-5 flex flex-col h-[670px] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-bold text-sm text-stone-900">Tool-Call Activity Panel</h3>
                <p className="text-[11px] text-stone-500">Real-time MCP protocol inspection</p>
              </div>
            </div>

            <button
              onClick={() => mcpClient.clearActivities()}
              className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Activity List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs space-y-2">
                <Code2 className="w-8 h-8 mx-auto text-stone-300" />
                <p>No MCP tool executions yet.</p>
                <p className="text-[11px]">
                  Click any query on the left to see live input sanitization, status, and raw JSON payloads.
                </p>
              </div>
            ) : (
              activities.map((act) => {
                const isSelected = selectedActivityId === act.id;
                const isExpanded = expandedDetails[act.id];

                return (
                  <div
                    key={act.id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {/* Header line: Tool Name + Execution Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="p-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          {act.toolName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-stone-500">
                          {act.latencyMs}ms
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            act.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : act.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                    </div>

                    {/* Sanitized Input */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Sanitized Input Parameters:
                      </div>
                      <pre className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto">
                        {JSON.stringify(act.sanitizedInput, null, 2)}
                      </pre>
                    </div>

                    {/* Mathematical Formula / Algorithm Transparency */}
                    {act.formulaOrAlgorithm && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-mono">
                        <strong className="text-emerald-800">Math Proof: </strong>
                        {act.formulaOrAlgorithm}
                      </div>
                    )}

                    {/* Actual Result Preview */}
                    {act.actualResult && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          <span>Actual Structured Result:</span>
                          <button
                            onClick={() => toggleExpand(act.id)}
                            className="text-cyan-700 hover:underline flex items-center gap-0.5 lowercase font-normal cursor-pointer"
                          >
                            <span>{isExpanded ? 'hide raw' : 'view raw json-rpc'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* High level highlights */}
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-[11px] font-mono text-stone-800 space-y-1 shadow-2xs">
                          {act.actualResult.monthly_cost !== undefined && (
                            <div>
                              Monthly Bill: <span className="text-emerald-800 font-bold">₹{act.actualResult.monthly_cost}</span> ({act.actualResult.monthly_kwh} kWh)
                            </div>
                          )}
                          {act.actualResult.total_upfront_cost !== undefined && (
                            <div>
                              Cost: <span className="text-stone-900 font-bold">₹{act.actualResult.total_upfront_cost}</span> • Monthly Savings: <span className="text-emerald-800 font-bold">₹{act.actualResult.estimated_monthly_savings}</span> (Payback: {act.actualResult.payback_period_months} mo)
                            </div>
                          )}
                          {act.actualResult.total_monthly_bill !== undefined && (
                            <div>
                              Total Monthly: <span className="text-emerald-800 font-bold">₹{act.actualResult.total_monthly_bill}</span> ({act.actualResult.total_monthly_kwh} kWh)
                            </div>
                          )}
                          {act.actualResult.delta?.monthly_cost_saved !== undefined && (
                            <div>
                              Saved: <span className="text-emerald-800 font-bold">₹{act.actualResult.delta.monthly_cost_saved}/mo</span> ({act.actualResult.delta.monthly_kwh_saved} kWh)
                            </div>
                          )}
                        </div>

                        {/* Raw JSON-RPC Expandable */}
                        {isExpanded && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-stone-500 font-mono">Raw Streamable HTTP MCP Response:</span>
                            <pre className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-[10px] font-mono text-teal-300 overflow-x-auto max-h-44">
                              {JSON.stringify(act.rawResponse, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="pt-3 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between font-mono">
            <span>Protocol: {mcpStatus === 'connected' ? '2025-11-25' : 'Offline'}</span>
            <span>Tools Discovered: 5</span>
          </div>
        </div>
      </div>

      {/* Agent Skills Catalog Modal */}
      {showSkillsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Agent Skills Catalog</h3>
                  <p className="text-[11px] text-stone-500">Autonomous skills orchestrating MCP tools & MCP Apps</p>
                </div>
              </div>
              <button
                onClick={() => setShowSkillsModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {AGENT_SKILLS.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs hover:border-emerald-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">{skill.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      {skill.category}
                    </span>
                  </div>

                  <p className="text-stone-600 leading-relaxed">{skill.description}</p>

                  <div className="p-2 rounded-xl bg-white border border-stone-200 font-mono text-[11px] text-emerald-900">
                    <strong className="text-emerald-800">Formula / Proof: </strong>
                    {skill.formulaOrProof}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-1 text-stone-500">
                      <span>Orchestrates:</span>
                      {skill.orchestratedTools.map((t) => (
                        <span key={t} className="font-mono text-emerald-800 font-semibold px-1 rounded bg-stone-100">
                          {t}
                        </span>
                      ))}
                    </div>

                    {skill.mcpAppResource && (
                      <span className="font-mono text-[10px] text-cyan-700 font-semibold">
                        {skill.mcpAppResource}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-200">
                    <div className="text-[10px] uppercase font-bold text-stone-400 mb-1.5">
                      Sample Invocation Phrases:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skill.triggerPhrases.map((phrase, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => {
                            setShowSkillsModal(false);
                            handleSendPrompt(phrase);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 transition cursor-pointer text-[11px]"
                        >
                          "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setShowSkillsModal(false)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
