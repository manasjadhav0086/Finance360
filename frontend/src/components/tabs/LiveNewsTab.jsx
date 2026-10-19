import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import { apiEndpoints } from '../../apiEndpoints';
import MarkdownRenderer from '../chat/MarkdownRenderer';
import {
  RefreshCw,
  Globe,
  Compass,
  Newspaper,
  ArrowUpRight,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  Layers,
  DollarSign,
  ShieldAlert,
  Building2,
  Calendar,
  Check,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { NEWS_INDUSTRIES, NEWS_COUNTRIES } from '../../utils/newsMetadata';

/**
 * Searchable Single-Select Dropdown Popover
 */
function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  renderOption,
  renderSelected,
  placeholder = 'Search...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => {
      const text = typeof opt === 'string' ? opt : opt.name || opt.label || '';
      return text.toLowerCase().includes(q);
    });
  }, [options, query]);

  return (
    <div className="relative flex flex-col min-w-[200px]" ref={containerRef}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#667085] mb-1 select-none">
        {label}
      </span>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none min-h-[38px] ${
          isOpen
            ? 'bg-white border-[#246BFD] ring-2 ring-[#246BFD]/15 text-[#101828] shadow-sm'
            : 'bg-[#F9FAFB] border-[#D0D5DD] text-[#101828] hover:bg-white hover:border-[#98A2B3] shadow-2xs'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate flex items-center gap-1.5">
          {renderSelected ? renderSelected(value) : value}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#667085] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#246BFD]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 bg-white border border-[#E4E7EC] rounded-xl shadow-xl w-full min-w-[230px] p-2 flex flex-col gap-1.5 animate-in fade-in duration-150">
          <div className="relative px-1 pt-0.5">
            <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-2.5 py-1 text-xs border border-[#E4E7EC] rounded-lg outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD] bg-[#F9FAFB] placeholder:text-[#98A2B3]"
            />
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pr-1 mt-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="text-[11px] text-[#98A2B3] text-center py-3">No matches found</div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = typeof opt === 'string' ? opt : opt.name;
                const isSelected = optVal === value;
                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF4FF] text-[#1D4ED8] font-bold'
                        : 'text-[#344054] hover:bg-[#F2F4F7]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {renderOption ? renderOption(opt) : optVal}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#246BFD] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveNewsTab() {
  const [industry, setIndustry] = useState('Financial Services');
  const [country, setCountry] = useState('India');
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dynamic lists from backend with instant fallback
  const [industryList, setIndustryList] = useState(NEWS_INDUSTRIES);
  const [countryList, setCountryList] = useState(NEWS_COUNTRIES);

  // Load available meta on mount
  useEffect(() => {
    let mounted = true;
    async function loadMeta() {
      try {
        const res = await api.get(`${apiEndpoints.LIVE_NEWS}/meta`);
        if (mounted && res.data) {
          if (Array.isArray(res.data.industries) && res.data.industries.length > 0) {
            setIndustryList(res.data.industries);
          }
          if (Array.isArray(res.data.countries) && res.data.countries.length > 0) {
            setCountryList(res.data.countries);
          }
        }
      } catch {
        // Fallback already preloaded
      }
    }
    loadMeta();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch news handler
  const loadNews = async (force = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(apiEndpoints.LIVE_NEWS, {
        industry,
        country,
        forceRefresh: force,
      });

      setNewsData(res.data);
      setLastUpdated(res.data.fetched_at ? new Date(res.data.fetched_at) : new Date());
    } catch (err) {
      console.error('Error fetching live news:', err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to retrieve real-time market news.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch on first mount or when industry/country changes
  useEffect(() => {
    loadNews(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, country]);

  // Selected Country Object helper
  const selectedCountryObj = useMemo(() => {
    return countryList.find((c) => c.name === country) || { name: country, flag: '🌐' };
  }, [countryList, country]);

  // Helper for Direction Badges
  const renderDirectionBadge = (dir) => {
    const d = (dir || 'Mixed').toLowerCase();
    if (d === 'positive') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          <TrendingUp className="w-3 h-3 stroke-[2.5]" />
          Positive
        </span>
      );
    }
    if (d === 'negative') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
          <TrendingDown className="w-3 h-3 stroke-[2.5]" />
          Negative
        </span>
      );
    }
    if (d === 'mixed') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
          <Activity className="w-3 h-3" />
          Mixed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
        Uncertain
      </span>
    );
  };

  // Helper for Impact Level Badges
  const renderImpactLevelBadge = (level) => {
    const l = (level || 'Medium').toLowerCase();
    if (l === 'high') {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]">
          High Impact
        </span>
      );
    }
    if (l === 'medium') {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
          Medium Impact
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
        Low Impact
      </span>
    );
  };

  return (
    <div id="page-livenews" className="space-y-4">
      {/* 1. Header & Targeted Market Intelligence Controls */}
      <section className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg md:text-xl font-bold text-[#101828] tracking-tight">
              Live Market News &amp; Macro Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#246BFD] animate-pulse" />
              Live Grounded Feed
            </span>
          </div>
          <p className="text-xs text-[#667085] font-medium max-w-xl">
            Real-time external industry developments, central bank/regulatory shifts, and grounded
            financial impact analysis across corporate performance dimensions.
          </p>
        </div>

        {/* Filter Area: Searchable Industry & Country Dropdowns */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
          {/* Industry Searchable Dropdown */}
          <SearchableSelect
            id="industry-select"
            label="Target Industry"
            value={industry}
            options={industryList}
            onChange={(val) => setIndustry(val)}
            renderSelected={(val) => (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#246BFD] shrink-0" />
                <span className="truncate">{val}</span>
              </>
            )}
            renderOption={(opt) => (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                <span className="truncate">{opt}</span>
              </>
            )}
            placeholder="Search industry..."
            disabled={loading}
          />

          {/* Country Searchable Dropdown */}
          <SearchableSelect
            id="country-select"
            label="Target Geography"
            value={country}
            options={countryList}
            onChange={(val) => setCountry(val)}
            renderSelected={(val) => (
              <>
                <span className="text-sm shrink-0">{selectedCountryObj.flag || '🌐'}</span>
                <span className="truncate">{val}</span>
              </>
            )}
            renderOption={(opt) => (
              <>
                <span className="text-sm shrink-0">{opt.flag || '🌐'}</span>
                <span className="truncate">{opt.name}</span>
                {opt.code && (
                  <span className="text-[10px] text-[#98A2B3] ml-auto font-mono">({opt.code})</span>
                )}
              </>
            )}
            placeholder="Search country..."
            disabled={loading}
          />

          {/* Fetch Latest News CTA */}
          <button
            id="fetch-news-btn"
            type="button"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#246BFD] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 min-h-[38px] shrink-0 mt-auto"
            onClick={() => loadNews(true)}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Retrieving Live News...' : 'Fetch Latest News'}</span>
          </button>
        </div>
      </section>

      {/* Freshness Status & Refresh Indicator Bar */}
      {newsData && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="font-semibold text-[#1E293B]">
              Active Scope: {newsData.industry} · {newsData.country}
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span>
              Retrieved {newsData.articles_count || newsData.articles?.length || 0} authenticated stories
            </span>
            {newsData.is_cached && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                Cached Session
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>
              Last fetched:{' '}
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </span>
          </div>
        </div>
      )}

      {/* Error Banner with Graceful Retention */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] p-4 rounded-xl text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>
              <strong>Live Retrieval Error:</strong> {error}
              {newsData ? ' (Displaying previously fetched verified intelligence)' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadNews(true)}
            className="px-3 py-1 bg-white border border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2] rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Shimmer State */}
      {loading && !newsData && (
        <div className="p-12 text-center text-[#667085] bg-white rounded-xl border border-[#E4E7EC] flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#246BFD] animate-spin" />
          <div className="text-sm font-bold text-[#101828]">
            Querying Live Market Sources for {industry} in {country}...
          </div>
          <p className="text-xs text-[#98A2B3] max-w-md">
            Retrieving authenticated articles, extracting recency timestamps, and generating
            source-grounded financial impact assessments...
          </p>
        </div>
      )}

      {/* Empty State if completely empty and not loading */}
      {!newsData && !loading && !error && (
        <div className="p-12 text-center text-[#667085] bg-white rounded-xl border border-[#E4E7EC] flex flex-col items-center justify-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#EFF8FF] flex items-center justify-center text-[#246BFD]">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#101828]">No Intelligence Fetched Yet</h3>
            <p className="text-xs text-[#667085] max-w-md">
              Select your target Industry and Country above, then click Fetch Latest News to retrieve live
              market intelligence.
            </p>
          </div>
          <button
            type="button"
            className="mt-2 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#246BFD] hover:bg-[#1D4ED8] text-white rounded-xl transition-colors cursor-pointer shadow-xs"
            onClick={() => loadNews(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Fetch Latest News</span>
          </button>
        </div>
      )}

      {/* Main Content Dashboard */}
      {newsData && (
        <div className="space-y-4">
          {/* 2. Market Intelligence Brief */}
          {newsData.market_brief && (
            <div className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-[#101828] border-b border-[#1D2939] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#246BFD] shrink-0" />
                  <span className="text-sm font-bold text-white tracking-tight">
                    Executive Market Intelligence Brief
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#98A2B3]">
                  {newsData.industry} · {newsData.country}
                </span>
              </div>
              <div className="p-5 text-[#344054] text-sm leading-relaxed prose prose-sm max-w-none">
                <MarkdownRenderer content={newsData.market_brief} />
              </div>
            </div>
          )}

          {/* 3. Key Market and Macro Drivers */}
          {newsData.macro_drivers && newsData.macro_drivers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#101828]">
                  <Compass className="w-4 h-4 text-[#246BFD]" />
                  <span>Key Market &amp; Macro Drivers</span>
                </div>
                <span className="text-xs text-[#667085]">
                  Derived from live developments across {newsData.country}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {newsData.macro_drivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#E4E7EC] rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-[#246BFD]/50 transition-all hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded">
                          {driver.category || 'Macro Factor'}
                        </span>
                        {renderImpactLevelBadge(driver.impact)}
                      </div>
                      <h4 className="text-xs font-bold text-[#101828] mb-1.5 leading-snug">
                        {driver.name}
                      </h4>
                      <p className="text-xs text-[#667085] leading-relaxed">
                        {driver.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Financial Impact Overview (The 6 Core Corporate Dimensions) */}
          {newsData.financial_impact_overview && newsData.financial_impact_overview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#101828]">
                  <DollarSign className="w-4 h-4 text-[#10B981]" />
                  <span>Financial Impact Matrix across Corporate Dimensions</span>
                </div>
                <span className="text-xs text-[#667085]">
                  Observed developments evaluated for {newsData.industry}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {newsData.financial_impact_overview.map((dim) => (
                  <div
                    key={dim.id}
                    className="bg-white border border-[#E4E7EC] rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-[#10B981]/50 transition-all hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-[#101828]">{dim.title}</span>
                        {renderDirectionBadge(dim.direction)}
                      </div>
                      <p className="text-xs text-[#475467] leading-relaxed mb-3">
                        {dim.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F2F4F7] flex items-center justify-between text-[10.5px]">
                      <span className="text-[#667085] font-medium">Horizon: {dim.time_horizon}</span>
                      {renderImpactLevelBadge(dim.impact_level)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Latest Grounded News Feed */}
          {newsData.articles && newsData.articles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#101828]">
                  <Newspaper className="w-4 h-4 text-[#246BFD]" />
                  <span>Authenticated News Feed &amp; Attribution</span>
                </div>
                <span className="text-xs text-[#667085]">
                  Sorted by freshness · Attributed to primary publications
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {newsData.articles.map((art, idx) => {
                  const impact = art.financial_impact || {};
                  return (
                    <article
                      key={idx}
                      className="bg-white border border-[#E4E7EC] rounded-xl p-4.5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-[#246BFD]/40 transition-all"
                    >
                      <div>
                        {/* Source & Publication Timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#F2F4F7] text-[#1D2939] border border-[#E4E7EC]">
                            {art.source}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-[#667085] font-medium">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                art.is_fresh
                                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {art.published_relative || 'Recent'}
                            </span>
                          </div>
                        </div>

                        {/* Article Headline */}
                        <h3 className="text-xs md:text-sm font-bold text-[#101828] mb-2 leading-snug">
                          {art.title}
                        </h3>

                        {/* Factual Summary */}
                        <p className="text-xs text-[#475467] leading-relaxed mb-3 line-clamp-3">
                          {art.summary}
                        </p>

                        {/* Grounded Financial Impact Box */}
                        {impact.inferred_impact && (
                          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-3 text-xs space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                                {impact.dimension || 'Financial Impact'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {renderDirectionBadge(impact.direction)}
                                {renderImpactLevelBadge(impact.impact_level)}
                              </div>
                            </div>

                            <div>
                              <span className="font-bold text-[#1E293B]">Inferred Consequence: </span>
                              <span className="text-[#334155]">{impact.inferred_impact}</span>
                            </div>

                            {impact.affected_businesses && (
                              <div className="text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                                <span className="font-semibold text-[#475569]">Affected Profiles: </span>
                                {impact.affected_businesses}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Working Attribution Link */}
                      {art.url && (
                        <div className="pt-2 border-t border-[#F2F4F7] mt-auto flex items-center justify-between">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#246BFD] hover:text-[#1D4ED8] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Read Verified Article</span>
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </a>
                          <span className="text-[10px] text-[#98A2B3]">
                            {art.is_fresh ? 'Verified < 72h' : 'Archive Source'}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Practical Finance Action Points */}
          {newsData.action_points && newsData.action_points.length > 0 && (
            <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#246BFD]" />
                <h3 className="text-sm font-bold text-[#101828]">
                  Finance Leadership Action Points &amp; Considerations
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {newsData.action_points.map((ap, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#E4E7EC] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-[#101828]">{ap.area}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {ap.urgency || 'Review'}
                        </span>
                      </div>
                      <p className="text-xs text-[#475467] leading-relaxed">
                        {ap.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
