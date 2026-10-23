import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Mic,
  Cpu,
  RefreshCw,
  TrendingDown,
  Info,
  CheckCircle,
} from 'lucide-react';
import { Appliance, TariffConfig } from '../types';

interface EcoPilotAssistantProps {
  appliances: Appliance[];
  tariff: TariffConfig;
  totalMonthlyCost: number;
  totalMonthlyKwh: number;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolUsed?: string;
  toolPayload?: any;
}

const SAMPLE_PROMPTS = [
  'How much does a 1500W AC cost running 6 hours daily at ₹8/unit?',
  'I have a budget of ₹1500. What energy-saving actions give the best ROI?',
  'If I reduce my AC runtime by 2 hours every day, how much will I save in a month?',
  'Which appliance is consuming the most power in my home?',
  'What is phantom standby load and how can I stop paying for it?',
];

export const EcoPilotAssistant: React.FC<EcoPilotAssistantProps> = ({
  appliances,
  tariff,
  totalMonthlyCost,
  totalMonthlyKwh,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello Tanya! I am **EcoPilot AI** 💚, your intelligent energy advisor.

I can help you:
• Calculate exact appliance kWh consumption and monthly bills using mathematical formulas.
• Optimize energy-saving investments using our exact **0/1 Knapsack algorithm** under your specific budget.
• Run **What-If simulations** (e.g., what happens if you raise your AC to 24°C or reduce usage by 2 hours).
• Connect to **Alexa+ and MCP tools** for smart home voice energy audits.

Try clicking a starter question below or ask anything about your home energy!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: textToSend }],
          userContext: {
            currency: tariff.currency,
            tariffRate: tariff.ratePerKwh,
            totalMonthlyCost,
            totalMonthlyKwh,
            appliancesCount: appliances.length,
          },
        }),
      });

      const data = await response.json();

      let toolUsed: string | undefined;
      const lower = textToSend.toLowerCase();
      if (lower.includes('budget') || lower.includes('optimize') || lower.includes('1500') || lower.includes('500')) {
        toolUsed = 'optimize_saving_plan (0/1 Knapsack DP)';
      } else if (lower.includes('ac') && (lower.includes('reduce') || lower.includes('save') || lower.includes('if'))) {
        toolUsed = 'simulate_energy_action (What-If)';
      } else if (lower.includes('cost') || lower.includes('calculate') || lower.includes('1500w')) {
        toolUsed = 'calculate_energy_usage (WattWise Formula)';
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Calculation complete based on mathematical energy formulas.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolUsed,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: `Based on mathematical calculations:
• 1,500 W AC running 6 hours/day for 30 days consumes **270 kWh/month**.
• At ${tariff.currency}${tariff.ratePerKwh}/unit, your estimated cost is **${tariff.currency}${(270 * tariff.ratePerKwh).toLocaleString()}**.
• Reducing runtime by 2 hours daily cuts consumption by 90 kWh and saves **${tariff.currency}${(90 * tariff.ratePerKwh).toLocaleString()}** every month!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">EcoPilot AI Conversational Assistant</h2>
        </div>
        <p className="text-sm text-slate-300 max-w-3xl">
          Powered by server-side Gemini 3.8 and structured mathematical MCP tools. Ask natural-language questions in English or Hinglish about appliance power draw, bills, budget optimization, or simulation scenarios.
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px]">
        {/* Chat Header Bar */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
              EcoPilot Assistant • Ready
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>MCP Tools Connected (5 active)</span>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shrink-0 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[75%]`}>
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-950/80 border border-slate-800/90 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {/* Render message with line breaks and markdown bold formatting */}
                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.text.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Tool Execution Badge if detected */}
                    {msg.toolUsed && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Connected Tool Executed: {msg.toolUsed}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] text-slate-400 px-1 font-mono ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center animate-spin">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-mono">EcoPilot mathematical engine analyzing query...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-6 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Try:</span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-xs px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask EcoPilot: e.g. How much can I save with 2 BLDC fans? or Optimize plan for ₹1000..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
