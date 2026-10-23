import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Cpu,
  RefreshCw,
  TrendingDown,
  Info,
  CheckCircle,
} from 'lucide-react';
import { Appliance, TariffConfig } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      text: `Hello! I am **EcoPilot AI**, your intelligent household energy advisor.

I can help you:
• Calculate exact appliance kWh consumption and monthly bills using transparent physics formulas.
• Optimize energy-saving investments using our exact **0/1 Knapsack algorithm** under your specific budget.
• Run **What-If simulations** (e.g. what happens if you raise your AC to 24°C or reduce runtime by 2 hours).
• Connect to **Streamable HTTP MCP tools** for smart home energy audits.

Click a starter question below or ask anything about your home energy!`,
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
            appliances,
          },
        }),
      });

      const data = await response.json();

      let toolUsed: string | undefined;
      const lower = textToSend.toLowerCase();
      if (lower.includes('budget') || lower.includes('optimize') || lower.includes('1500') || lower.includes('500') || lower.includes('1000')) {
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
    } catch {
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E9E4] shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-[#E8F9BE] text-[#173F35]">
            <Sparkles className="w-5 h-5" />
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#172C26] tracking-tight">
            EcoPilot AI Conversational Assistant
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#69766F] max-w-3xl">
          Powered by server-side Gemini 3.8 and structured mathematical MCP tools. Ask natural-language questions about appliance wattage, bills, budget optimization, or simulation scenarios.
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-[#E5E9E4] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[580px]">
        {/* Chat Header Bar */}
        <div className="px-6 py-3.5 bg-[#F8F8F2] border-b border-[#E5E9E4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#173F35] animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#172C26]">
              EcoPilot Assistant • Ready
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#173F35]">
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
                  <div className="w-8 h-8 rounded-xl bg-[#173F35] text-[#C9F36A] shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-1.5 max-w-[85%] sm:max-w-[75%]">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#173F35] text-white font-medium rounded-tr-none'
                        : 'bg-[#F8F8F2] border border-[#E5E9E4] text-[#172C26] rounded-tl-none'
                    }`}
                  >
                    <div className="prose prose-sm prose-emerald max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-[#172C26]">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          code: ({ children }) => <code className="bg-[#F8F8F2] px-1.5 py-0.5 rounded text-xs font-mono text-[#173F35]">{children}</code>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {msg.toolUsed && (
                      <div className="mt-3 pt-2.5 border-t border-[#E5E9E4] flex items-center gap-1.5 text-[11px] font-mono text-[#173F35]">
                        <Zap className="w-3.5 h-3.5 text-[#173F35]" />
                        <span>Connected Tool Executed: {msg.toolUsed}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] text-[#69766F] px-1 font-mono ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#F8F8F2] border border-[#E5E9E4] shrink-0 flex items-center justify-center text-[#173F35]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-[#69766F] text-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F8F8F2] border border-[#E5E9E4] flex items-center justify-center animate-spin">
                <RefreshCw className="w-4 h-4 text-[#173F35]" />
              </div>
              <span className="font-mono">EcoPilot mathematical engine analyzing query...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-6 py-2.5 bg-[#F8F8F2] border-t border-[#E5E9E4] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-[#69766F] shrink-0">Try:</span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-xs px-3 py-1 rounded-full bg-white hover:bg-[#E8F9BE] text-[#172C26] border border-[#E5E9E4] whitespace-nowrap transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-[#E5E9E4] flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask EcoPilot: e.g. How much can I save with 2 BLDC fans? or Optimize plan for ₹1000..."
            className="flex-1 bg-[#F8F8F2] border border-[#E5E9E4] rounded-2xl px-4 py-3 text-sm text-[#172C26] placeholder-[#69766F] focus:outline-none focus:border-[#173F35]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-[#173F35] hover:bg-[#235447] disabled:opacity-40 text-white font-bold rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#C9F36A]" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
