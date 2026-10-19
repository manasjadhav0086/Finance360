import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, RotateCcw, CheckCheck, X, Sparkles, Menu, SlidersHorizontal } from 'lucide-react';
import { getMonthsForQuarter } from '../utils/periodUtils';

function CustomDropdown({
  label,
  options = [],
  value,
  onChange,
  multi = false,
  allOptionLabel = 'All',
  searchable = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allValues = useMemo(() => {
    return options.map((opt) => (typeof opt === 'object' ? opt.value : opt));
  }, [options]);

  const selectedValues = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (value === 'ALL' || value === 'Total') {
      return allValues;
    }
    if (!value || value === '') return [];
    return [value];
  }, [value, allValues]);

  const isAllSelected =
    allValues.length > 0 &&
    (value === 'ALL' ||
      value === 'Total' ||
      selectedValues.length === allValues.length);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) =>
      String(opt.label || opt).toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [options, search]);

  const handleToggleOption = (optVal) => {
    if (!multi) {
      onChange(optVal);
      setIsOpen(false);
      return;
    }

    const allOptionValue = label === 'Quarter' ? 'Total' : 'ALL';

    if (optVal === 'ALL' || optVal === 'Total') {
      if (isAllSelected) {
        onChange([]);
      } else {
        onChange(allOptionValue);
      }
      return;
    }

    let next;
    if (isAllSelected) {
      next = allValues.filter((v) => v !== optVal);
    } else if (selectedValues.includes(optVal)) {
      next = selectedValues.filter((v) => v !== optVal);
    } else {
      next = [...selectedValues, optVal];
      if (allValues.length > 0 && next.length === allValues.length) {
        next = allOptionValue;
      }
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    onChange(label === 'Quarter' ? 'Total' : 'ALL');
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (isAllSelected) return allOptionLabel;
    if (selectedValues.length === 0) return 'None';
    if (selectedValues.length === 1) {
      const match = options.find((o) => (typeof o === 'object' ? o.value : o) === selectedValues[0]);
      const raw = match?.label || selectedValues[0];
      return String(raw).replace(/^\d+[\s._-]+/, '').trim() || raw;
    }
    if (label === 'Month' && selectedValues.length <= 2) {
      return selectedValues.map((v) => (typeof v === 'string' ? v.slice(0, 3) : v)).join(', ');
    }
    if (label === 'Quarter' && selectedValues.length <= 2) {
      return selectedValues.join(', ');
    }
    return `${selectedValues.length} Selected`;
  }, [isAllSelected, selectedValues, allOptionLabel, options, label]);

  return (
    <div className="relative flex flex-col" ref={dropdownRef}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 select-none">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border text-xs transition-all cursor-pointer select-none ${isOpen
          ? 'bg-white border-blue-600 ring-2 ring-blue-600/20 text-slate-950 shadow-xs font-semibold'
          : !isAllSelected
            ? 'bg-blue-50 border-blue-600 text-blue-950 font-semibold shadow-xs'
            : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 shadow-2xs font-medium'
          }`}
      >
        <span className={`max-w-[140px] truncate ${!isAllSelected ? 'text-blue-950 font-semibold' : 'text-slate-900 font-medium'}`}>
          {displayText}
        </span>
        {!isAllSelected && multi && selectedValues.length > 1 && (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs ml-auto">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-700' : !isAllSelected ? 'text-blue-800' : 'text-slate-700'}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto right-auto sm:right-0 mt-1.5 z-50 bg-white border border-slate-300 rounded-lg shadow-xl w-full sm:w-auto min-w-[220px] max-w-[calc(100vw-32px)] p-2 flex flex-col gap-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-200 text-[11px]">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Filter {label}
            </span>
            {multi && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  All
                </button>
                <span className="text-slate-300 font-bold">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {searchable && options.length > 5 && (
            <div className="relative px-1 pt-0.5">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-900 font-medium placeholder-slate-400"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pt-1 pr-0.5 custom-scroll">
            {multi && (
              <button
                type="button"
                onClick={() => handleToggleOption('ALL')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors cursor-pointer ${isAllSelected
                  ? 'bg-blue-50 border border-blue-200 text-blue-950 font-semibold'
                  : 'text-slate-800 hover:bg-slate-50 border border-transparent'
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${isAllSelected
                    ? 'border-2 border-blue-600 bg-blue-600 text-white'
                    : 'border-2 border-slate-400 bg-white'
                    }`}
                >
                  {isAllSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                </div>
                <span className="truncate">{allOptionLabel}</span>
              </button>
            )}

            {filteredOptions.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const text = typeof opt === 'object' ? opt.label : opt;
              const isSelected = isAllSelected || selectedValues.includes(val);

              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleToggleOption(val)}
                  className={`w-full flex items-center ${multi ? 'gap-2.5 justify-start' : 'justify-between'} px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors cursor-pointer ${isSelected
                    ? 'bg-blue-50 border border-blue-200 text-blue-950 font-semibold'
                    : 'text-slate-800 hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  {multi ? (
                    <>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${isSelected
                          ? 'border-2 border-blue-600 bg-blue-600 text-white'
                          : 'border-2 border-slate-400 bg-white'
                          }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                      </div>
                      <span className="truncate">{text}</span>
                    </>
                  ) : (
                    <>
                      <span className="truncate">{text}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 stroke-[2.5] shrink-0 ml-auto" />
                      )}
                    </>
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-3 text-center text-xs text-slate-500 font-medium italic">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({
  onToggleSidebar,
  filters = {},
  updateFilters,
  dashboardData,
  loading,
  refreshAll,
  getActiveBusinesses,
  isAdmin,
  user,
  onOpenAi,
  hideFilters = false,
}) {
  const fys = dashboardData?.meta?.fys || [];
  const quarters = [
    { value: 'Q1', label: 'Q1' },
    { value: 'Q2', label: 'Q2' },
    { value: 'Q3', label: 'Q3' },
    { value: 'Q4', label: 'Q4' },
  ];

  const monthOptions = useMemo(() => {
    const availableMonths = getMonthsForQuarter(filters.quarter);
    return availableMonths.map((m) => ({ value: m, label: m }));
  }, [filters.quarter]);

  const handleQuarterChange = (val) => {
    const normQ = val === 'ALL' || (Array.isArray(val) && val.length === quarters.length) ? 'Total' : val;
    const availableMonths = getMonthsForQuarter(normQ);

    let nextMonth = filters.month;
    if (nextMonth && nextMonth !== 'ALL') {
      if (Array.isArray(nextMonth)) {
        const validMonths = nextMonth.filter((m) => availableMonths.includes(m));
        nextMonth = validMonths.length > 0 ? (validMonths.length === availableMonths.length ? 'ALL' : validMonths) : 'ALL';
      } else if (!availableMonths.includes(nextMonth)) {
        nextMonth = 'ALL';
      }
    }

    updateFilters({
      quarter: normQ,
      month: nextMonth,
    });
  };

  const handleYearChange = (val) => {
    const fyVal = Array.isArray(val) ? val[0] : val;
    updateFilters({
      fy: fyVal,
    });
  };

  const cleanLabel = (text) => {
    if (!text) return '';
    return String(text).replace(/^\d+[\s._-]+/, '').trim() || text;
  };

  const segments = useMemo(() => {
    const meta = dashboardData?.meta;
    let list = [];
    if (meta?.business_mapping && Array.isArray(meta.business_mapping)) {
      const seen = {};
      meta.business_mapping.forEach((r) => {
        const s = (r.segment_n || r.segment || r.Segment || '').trim();
        if (s && !seen[s]) {
          seen[s] = true;
          list.push(s);
        }
      });
      list.sort();
    } else {
      list = meta?.segments ? [...meta.segments] : [];
    }
    return list.map((s) => ({
      value: s,
      label: cleanLabel(s),
    }));
  }, [dashboardData]);

  const businesses = useMemo(() => {
    let rawList = [];
    if (typeof getActiveBusinesses === 'function') {
      try {
        rawList = getActiveBusinesses(filters.segment) || [];
      } catch {
        // Fall back to mapping
      }
    }
    if (!rawList.length) {
      const meta = dashboardData?.meta;
      if (meta?.business_mapping && Array.isArray(meta.business_mapping)) {
        const selectedSegs = Array.isArray(filters.segment)
          ? filters.segment
          : filters.segment && filters.segment !== 'ALL'
            ? [filters.segment]
            : [];
        const seen = {};
        meta.business_mapping.forEach((r) => {
          const segN = (r.segment_n || '').trim();
          const segOld = (r.segment || r.Segment || '').trim();
          const buN = (r.biz1_n || r.Biz1_N || '').trim();
          if (selectedSegs.length > 0) {
            const matchesSelected = selectedSegs.some(
              (s) => s.toLowerCase() === segN.toLowerCase() || s.toLowerCase() === segOld.toLowerCase()
            );
            if (!matchesSelected) return;
          }
          if (buN && !seen[buN]) {
            seen[buN] = true;
            rawList.push(buN);
          }
        });
        rawList.sort();
      } else {
        rawList = meta?.biz_units ? [...meta.biz_units] : [];
      }
    }
    return rawList.map((b) => {
      const val = typeof b === 'object' ? b.value || b.label : b;
      const lbl = typeof b === 'object' ? b.label || b.value : b;
      return {
        value: val,
        label: cleanLabel(lbl),
      };
    });
  }, [getActiveBusinesses, filters.segment, dashboardData]);

  const segmentOptions = useMemo(() => {
    return segments.filter((s) => (typeof s === 'object' ? s.value : s) !== 'ALL');
  }, [segments]);

  const businessOptions = useMemo(() => {
    return businesses.filter((b) => (typeof b === 'object' ? b.value : b) !== 'ALL');
  }, [businesses]);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quarter && filters.quarter !== 'Total' && filters.quarter !== 'ALL') count++;
    if (filters.month && filters.month !== 'ALL') count++;
    if (filters.segment && filters.segment !== 'ALL') count++;
    if (filters.bu && filters.bu !== 'ALL') count++;
    return count;
  }, [filters]);

  const resetFilters = () => {
    const defaultFy =
      dashboardData?.meta?.budget_fy ||
      (dashboardData?.meta?.fys?.length
        ? dashboardData.meta.fys[dashboardData.meta.fys.length - 1]
        : 'FY26');
    const resetValues = {
      fy: defaultFy,
      quarter: 'Total',
      month: 'ALL',
      segment: 'ALL',
      bu: 'ALL',
    };
    updateFilters(resetValues);
  };

  const filterControls = (
    <>
      <CustomDropdown
        label="Year"
        options={fys}
        value={filters.fy}
        onChange={handleYearChange}
        multi={false}
        searchable={true}
      />

      <CustomDropdown
        label="Quarter"
        options={quarters}
        value={filters.quarter}
        onChange={handleQuarterChange}
        multi={true}
        allOptionLabel="Full Year"
      />

      <CustomDropdown
        label="Month"
        options={monthOptions}
        value={filters.month || 'ALL'}
        onChange={(val) => updateFilters({ month: val })}
        multi={true}
        searchable={true}
        allOptionLabel="All Months"
      />

      <CustomDropdown
        label="Business Group"
        options={segmentOptions}
        value={filters.segment}
        onChange={(val) => {
          let nextBu = filters.bu;
          if (nextBu && nextBu !== 'ALL') {
            const validBUs = typeof getActiveBusinesses === 'function' ? getActiveBusinesses(val) : [];
            if (validBUs.length > 0) {
              const isStillValid = Array.isArray(nextBu)
                ? nextBu.every((b) => validBUs.includes(b))
                : validBUs.includes(nextBu);
              if (!isStillValid) {
                nextBu = 'ALL';
              }
            }
          }
          updateFilters({ segment: val, bu: nextBu });
        }}
        multi={true}
        searchable={true}
        allOptionLabel="All Business Groups"
      />

      <CustomDropdown
        label="Business"
        options={businessOptions}
        value={filters.bu}
        onChange={(val) => updateFilters({ bu: val })}
        multi={true}
        searchable={true}
        allOptionLabel="All Businesses"
      />
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 shadow-xs">
      {/* Mobile Header Bar: Menu toggle, Logo, Filter toggle & AI button */}
      <div className="flex lg:hidden items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-slate-700 hover:text-[#1E56A0] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Open navigation menu"
            id="mobileMenuBtn"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <img
              src="/fin/finance360_logo.png"
              alt="Finance360"
              className="h-6 w-6 object-contain rounded-full bg-slate-100"
            />
            <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">Finance360</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!hideFilters && (
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer min-h-[36px] ${
                isMobileFilterOpen || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              aria-expanded={isMobileFilterOpen}
              aria-label="Toggle filters"
              id="mobileFilterToggleBtn"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-xs">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer min-h-[36px]"
            id="mobileAskAiBtn"
            title="Open Finance AI Copilot"
            onClick={onOpenAi}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden xs:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Filter Drawer/Panel */}
      {!hideFilters && isMobileFilterOpen && (
        <div className="lg:hidden mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-inner flex flex-col gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Dashboard Filters {activeFilterCount > 0 ? `(${activeFilterCount} Active)` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filterControls}
          </div>
        </div>
      )}

      {/* Desktop Filter Bar (Preserved Horizontal Layout on lg and above) */}
      <div className="hidden lg:flex lg:flex-row lg:items-end justify-between gap-4 w-full">
        {!hideFilters ? (
          <div className="flex items-end gap-3 flex-wrap flex-1">
            {filterControls}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Finance360 Suite</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap self-end pb-0.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all cursor-pointer shadow-xs group shrink-0 min-h-[34px]"
            id="askFinanceAiBtn"
            title="Open Finance AI Copilot"
            onClick={onOpenAi}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200 group-hover:scale-110 transition-transform" />
            <span>Ask Finance AI</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer shadow-2xs min-h-[34px]"
            id="resetFiltersBtn"
            title="Reset all filters to default"
            onClick={resetFilters}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
