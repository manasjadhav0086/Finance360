import { useState, useEffect } from 'react';
import api from '../../services/api';
import { apiEndpoints } from '../../apiEndpoints';
import MarkdownRenderer from '../chat/MarkdownRenderer';
import { RefreshCw, Globe, Compass, Newspaper, ArrowUpRight, Loader2, Sparkles, Pin } from 'lucide-react';

export default function LiveNewsTab() {
  const [industry, setIndustry] = useState('BFSI');
  const [topic, setTopic] = useState('technology spending');
  const [location, setLocation] = useState('India');
  const [recency, setRecency] = useState('recent');
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNews = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(apiEndpoints.LIVE_NEWS, { industry, topic, location, recency });
      setNewsData(res.data);
    } catch (err) {
      console.error('Error fetching live news:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="page-livenews" className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Live Market News & Macro Intelligence
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Real-time external news and macroeconomic drivers grounded with Google Search
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            Industry:
            <input
              type="text"
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all w-28"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            Topic:
            <input
              type="text"
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all w-36"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            Location:
            <input
              type="text"
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all w-24"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
            onClick={loadNews}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Querying Vertex AI...' : 'Fetch Fresh News'}</span>
          </button>
        </div>
      </div>

      {!newsData && !loading && !error && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800">No News Fetched Yet</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Configure your industry, topic, and location above, then click Fetch Fresh News to query live Google Search grounded market intelligence.
            </p>
          </div>
          <button
            type="button"
            className="mt-2 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
            onClick={loadNews}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Fetch Fresh News</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <div className="text-sm font-semibold text-slate-700">Querying Google Vertex AI & Search Grounding...</div>
          <div className="text-xs text-slate-400">Synthesizing macroeconomic environmental factors...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 text-red-700 p-4 rounded-xl text-sm">
          <strong>Error retrieving live news:</strong> {error}
        </div>
      )}

      {newsData && !loading && (
        <div id="newsContentContainer" className="space-y-3">
          {newsData.query_summary && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
                  <span className="text-[14px] font-bold text-white tracking-tight">Market Landscape & Intelligence Summary</span>
                </div>
              </div>
              <div className="p-5">
                <MarkdownRenderer content={newsData.query_summary} />
              </div>
            </div>
          )}

          {newsData.environment_factors && newsData.environment_factors.length > 0 && (
            <div>
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Key Environmental & Macro Drivers</span>
                </div>
                <span className="text-xs text-slate-500">Identified through live Google Search grounding</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {newsData.environment_factors.map((factor, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-start gap-2.5">
                    <Pin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700 leading-relaxed">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newsData.articles && newsData.articles.length > 0 && (
            <div>
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Newspaper className="w-4 h-4 text-blue-600" />
                  <span>Grounded News & Market Sources</span>
                </div>
                <span className="text-xs text-slate-500">Verified web publications</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newsData.articles.map((art, idx) => (
                  <article key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">{art.source || 'News'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{art.published_date || 'Recent'}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mb-2 leading-snug line-clamp-2">{art.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">{art.summary || art.snippet}</p>
                      {art.relevance && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 mb-3">
                          <strong className="text-slate-700">Finance Relevance:</strong> {art.relevance}
                        </div>
                      )}
                    </div>
                    {art.url && (
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-auto pt-2 cursor-pointer"
                      >
                        <span>Read Grounded Source</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
