import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { apiEndpoints } from '../../apiEndpoints';
import MarkdownRenderer from './MarkdownRenderer';
import {
  Sparkles,
  Bot,
  User,
  X,
  Trash2,
  Send,
  Loader2,
  BarChart2,
  AlertTriangle,
  FileText,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  {
    title: 'Executive Brief',
    description: 'Summarize revenue, EBITDA, and plan variance highlights',
    icon: FileText,
    prompt: 'Generate a comprehensive executive summary of financial performance for the selected period.',
  },
  {
    title: 'Investigate Variances',
    description: 'Find primary drivers behind budget and forecast deviations',
    icon: AlertTriangle,
    prompt: 'Investigate the major budget variances across business units and highlight top drivers.',
  },
  {
    title: 'Margin & Cost Analysis',
    description: 'Analyze gross margin, variable, and fixed cost trends',
    icon: TrendingUp,
    prompt: 'Analyze gross margins and operating cost structure trends for the active scope.',
  },
  {
    title: 'Chart Breakdown',
    description: 'Plot revenue and EBITDA comparison with interactive charts',
    icon: BarChart2,
    prompt: 'Show revenue and EBITDA breakdown by business unit with an interactive chart.',
  },
];

export default function CopilotDrawer({
  isOpen,
  onClose,
  isAiOpen: isAiOpenProp,
  setIsAiOpen: setIsAiOpenProp,
  filters = {},
  dashboardData = {},
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpen !== undefined || isAiOpenProp !== undefined;
  const isAiOpen = isControlled ? Boolean(isOpen || isAiOpenProp) : internalOpen;

  const setIsAiOpen = (val) => {
    const nextVal = typeof val === 'function' ? val(isAiOpen) : Boolean(val);
    setInternalOpen(nextVal);
    if (!nextVal && onClose) onClose();
    if (setIsAiOpenProp) setIsAiOpenProp(nextVal);
  };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiOpen) {
      scrollToBottom();
    }
  }, [messages, isAiOpen]);

  const handleSend = async (textToSend = input, action = null) => {
    const question = (textToSend || '').trim();
    if (!question && !action) return;

    const userMessage = {
      id: String(Date.now()),
      role: 'user',
      content: question || `Action: ${action}`,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        message: question,
        filters: {
          fy: filters.fy,
          quarter: filters.quarter,
          month: filters.month,
          segment: filters.segment,
          bu: filters.bu,
        },
        action: action,
        context_data: {
          dashboard_meta: dashboardData?.meta,
        },
      };

      const response = await api.post(apiEndpoints.AI_ASSISTANT, payload);
      const res = response.data;
      let answer = res.answer || res.response || res.result || 'No response returned from BigQuery Data Agent.';

      if (res.chart_option) {
        answer += `\n\n\`\`\`echarts\n${JSON.stringify(res.chart_option, null, 2)}\n\`\`\``;
      }

      const botMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: answer,
        sources: res.sources,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('AI query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `**Error connecting to AI Agent:** ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeScopeText = `${filters.fy || 'All FY'} • ${filters.quarter || 'Total'}${filters.month && filters.month !== 'ALL' ? ` • ${filters.month}` : ''} • ${filters.bu && filters.bu !== 'ALL'
    ? `BU: ${Array.isArray(filters.bu) ? filters.bu.join(', ') : filters.bu}`
    : filters.segment && filters.segment !== 'ALL'
      ? `Seg: ${Array.isArray(filters.segment) ? filters.segment.join(', ') : filters.segment}`
      : 'Company Wide'
    }`;

  return (
    <>
      <div
        className={`fixed top-0 right-0 bottom-0 w-[600px] max-w-[96vw] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isAiOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        id="copilotPanel"
      >
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-950 block leading-tight">
                Finance AI Analyst
              </span>
              <span className="text-[11px] text-slate-700 font-semibold">
                BigQuery Financial Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              id="copilotClose"
              onClick={() => setIsAiOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40 custom-scroll" id="copilotMessages">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="p-4 rounded-md bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-950">FINsightEdge AI Analyst</h3>
                    <span className="text-xs font-bold text-slate-800">Context: {activeScopeText}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed pt-1">
                  Ask any question about revenue, EBITDA drivers, budget variances, or request chart visualizations.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
                  Suggested Prompts
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {PROMPT_SUGGESTIONS.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="w-full text-left p-3 rounded-md bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs group flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-300 flex items-center justify-center shrink-0 transition-colors">
                            <ItemIcon className="w-4 h-4 text-slate-700 group-hover:text-blue-800" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-950 group-hover:text-blue-950 truncate">
                              {item.title}
                            </span>
                            <span className="text-xs text-slate-700 font-medium truncate">
                              {item.description}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-800 shrink-0 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-3.5 rounded-md text-xs leading-relaxed shadow-xs ${m.role === 'user'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white border border-slate-200 text-slate-900 font-medium'
                    }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-xs shadow-xs max-w-[85%]">
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>Analyzing BigQuery views and computing metrics...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            id="copilotInput"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-950 font-medium placeholder-slate-500 outline-none focus:bg-white focus:border-blue-600 transition-all"
            placeholder="Ask about revenue, EBITDA, budget variances, KPIs..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            type="button"
            id="copilotSend"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </>
  );
}
