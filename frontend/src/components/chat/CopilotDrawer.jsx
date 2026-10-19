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
    prompt: 'Investigate the major budget variances across businesses and highlight top drivers.',
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
    prompt: 'Show revenue and EBITDA breakdown by business with an interactive chart.',
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
      let answer = res.answer || res.response || res.result || 'No response returned from Finance AI Assistant.';

      const chartOpt = res.chart_option || (res.visualization && (res.visualization.series || res.visualization.xAxis) ? res.visualization : null);
      if (chartOpt && !answer.includes('```echarts') && !answer.includes('```chart')) {
        answer += `\n\n\`\`\`echarts\n${JSON.stringify(chartOpt, null, 2)}\n\`\`\``;
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

  useEffect(() => {
    if (isAiOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsAiOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isAiOpen]);

  return (
    <>
      {/* Mobile & Desktop Backdrop */}
      {isAiOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsAiOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[540px] max-w-full sm:max-w-[92vw] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isAiOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        id="copilotPanel"
      >
        <div className="px-4 py-3.5 border-b border-[#1D2939] flex items-center justify-between bg-[#101828] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#246BFD] flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B981] animate-pulse" />
                <span className="text-xs font-bold text-white block leading-tight">
                  Finance AI Analyst
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Enterprise Financial Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              id="copilotClose"
              onClick={() => setIsAiOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F5F7FB] custom-scroll" id="copilotMessages">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="p-4 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF8FF] border border-[#B2DDFF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#246BFD]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#101828]">Finance360 AI Analyst</h3>
                    <span className="text-[11px] font-semibold text-[#667085]">Context: {activeScopeText}</span>
                  </div>
                </div>
                <p className="text-xs text-[#475467] font-normal leading-relaxed pt-1">
                  Ask any question about revenue, EBITDA drivers, budget variances, or request chart visualizations.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider px-1">
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
                        className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#F0F5FF]/60 border border-[#E4E7EC] hover:border-[#246BFD]/40 transition-all cursor-pointer shadow-2xs group flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E4E7EC] group-hover:bg-[#EFF8FF] group-hover:border-[#B2DDFF] flex items-center justify-center shrink-0 transition-colors">
                            <ItemIcon className="w-4 h-4 text-[#475467] group-hover:text-[#246BFD]" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#101828] group-hover:text-[#246BFD] truncate">
                              {item.title}
                            </span>
                            <span className="text-xs text-[#667085] font-normal truncate">
                              {item.description}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#246BFD] shrink-0 transition-colors" />
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
                  <div className="w-6 h-6 rounded-md bg-[#EFF8FF] border border-[#B2DDFF] text-[#246BFD] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed shadow-xs ${m.role === 'user'
                    ? 'max-w-[85%] bg-[#246BFD] text-white font-medium'
                    : 'w-full max-w-[95%] sm:max-w-[93%] bg-white border border-[#E4E7EC] text-[#101828] font-normal min-w-0'
                    }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-[#101828] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#E4E7EC] text-[#475467] font-medium text-xs shadow-xs max-w-[85%]">
              <Loader2 className="w-3.5 h-3.5 text-[#246BFD] animate-spin" />
              <span>Analyzing financial data and computing metrics...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-[#E4E7EC] flex items-center gap-2">
          <input
            type="text"
            id="copilotInput"
            className="flex-1 bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-2 text-xs text-[#101828] font-medium placeholder-[#98A2B3] outline-none focus:bg-white focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD] transition-all"
            placeholder="Ask about revenue, EBITDA, budget variances, KPIs..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            type="button"
            id="copilotSend"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#246BFD] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
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
