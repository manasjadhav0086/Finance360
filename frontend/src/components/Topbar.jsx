import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, RotateCcw, X, Sparkles, Menu, SlidersHorizontal } from 'lucide-react';
import { getMonthsForQuarter } from '../utils/periodUtils';

function CustomDropdown({
  label,
  options = [],
  value,
  onChange,
  multi = false,
  allOptionLabel = 'All',
  searchable = false,
  align = 'left',
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#667085] mb-1 select-none">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer select-none min-h-[34px] ${
          isOpen
            ? 'bg-white border-[#246BFD] ring-2 ring-[#246BFD]/15 text-[#101828] shadow-xs font-semibold'
            : !isAllSelected
            ? 'bg-[#EFF4FF] border-[#246BFD] text-[#1D4ED8] font-semibold shadow-xs'
            : 'bg-white border-[#D0D5DD] text-[#101828] hover:bg-[#F9FAFB] hover:border-[#98A2B3] shadow-xs font-medium'
        }`}
      >
        <span className={`max-w-[130px] truncate ${!isAllSelected ? 'text-[#1D4ED8] font-semibold' : 'text-[#101828] font-medium'}`}>
          {displayText}
        </span>
        {!isAllSelected && multi && selectedValues.length > 1 && (
          <span className="bg-[#246BFD] text-white text-[10px] font-bold px-1.5 py-0.2 rounded shadow-xs ml-auto">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#246BFD]' : !isAllSelected ? 'text-[#246BFD]' : 'text-[#667085]'
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 bg-white border border-[#E4E7EC] rounded-xl shadow-xl w-full sm:w-auto min-w-[220px] max-w-[calc(100vw-32px)] p-2 flex flex-col gap-1.5 animate-in fade-in duration-150 ${
            align === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-1.5 border-b border-[#F2F4F7] text-[11px]">
            <span className="font-bold text-[#101828] uppercase tracking-wider text-[10px]">
              Filter {label}
            </span>
            {multi && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-[#246BFD] hover:text-[#1D4ED8] cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#D0D5DD]">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {searchable && options.length > 5 && (
            <div className="relative px-1 pt-0.5">
              <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md outline-none focus:bg-white focus:border-[#246BFD] transition-all text-[#101828] font-medium placeholder-[#98A2B3]"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5 pt-1 pr-0.5 custom-scroll">
            {multi && (
              <button
                type="button"
                onClick={() => handleToggleOption('ALL')}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  isAllSelected
                    ? 'bg-[#EFF4FF] text-[#1D4ED8] font-semibold'
                    : 'text-[#344054] hover:bg-[#F9FAFB]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                    isAllSelected
                      ? 'border-2 border-[#246BFD] bg-[#246BFD] text-white'
                      : 'border-2 border-[#D0D5DD] bg-white'
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
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
                  className={`w-full flex items-center ${
                    multi ? 'gap-2.5 justify-start' : 'justify-between'
                  } px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EFF4FF] text-[#1D4ED8] font-semibold'
                      : 'text-[#344054] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {multi ? (
                    <>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-2 border-[#246BFD] bg-[#246BFD] text-white'
                            : 'border-2 border-[#D0D5DD] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                      </div>
                      <span className="truncate">{text}</span>
                    </>
                  ) : (
                    <>
                      <span className="truncate">{text}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#246BFD] stroke-[2.5]" />}
                    </>
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-4 text-center text-xs text-[#98A2B3]">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({
  activeTab = 'overview360',
  filters = {},
  updateFilters = () => {},
  dashboardData = {},
  onToggleSidebar = () => {},
  onOpenAi = () => {},
  hideFilters = false,
  getActiveBusinesses,
}) {
  const cleanLabel = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/^\d+[\s._-]+/, '').trim() || text;
  };

  const fys = useMemo(() => {
    const list = dashboardData?.meta?.fys || ['FY26', 'FY25'];
    return list.map((f) => ({ value: f, label: f }));
  }, [dashboardData]);

  const quarters = useMemo(() => {
    return [
      { value: 'Q1', label: 'Q1' },
      { value: 'Q2', label: 'Q2' },
      { value: 'Q3', label: 'Q3' },
      { value: 'Q4', label: 'Q4' },
    ];
  }, []);

  const handleYearChange = (newFy) => {
    updateFilters({ fy: newFy });
  };

  const handleQuarterChange = (newQuarter) => {
    updateFilters({ quarter: newQuarter });
  };

  const monthOptions = useMemo(() => {
    const months = getMonthsForQuarter(filters.quarter || 'Total');
    return months.map((m) => ({ value: m, label: m }));
  }, [filters.quarter]);

  const segments = useMemo(() => {
    const list = dashboardData?.meta?.segments || [];
    return list.map((s) => ({
      value: s,
      label: cleanLabel(s),
    }));
  }, [dashboardData]);

  const businesses = useMemo(() => {
    let rawList = [];
    if (typeof getActiveBusinesses === 'function') {
      rawList = getActiveBusinesses(filters.segment);
    } else {
      const meta = dashboardData?.meta;
      if (meta?.business_mapping && meta.business_mapping.length > 0) {
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
        label="Fiscal Year"
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
        align="right"
      />
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] px-3 sm:px-4 lg:px-6 py-2.5 shadow-xs">
      {/* Mobile Top Header: Menu toggle, Logo, Filter toggle & AI button */}
      <div className="flex lg:hidden items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-[#344054] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-lg transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Open navigation menu"
            id="mobileMenuBtn"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <img
              src="/fin/finance360_logo.png"
              alt="Finance360"
              className="h-6 w-6 object-contain rounded-md bg-[#F2F4F7] p-0.5"
            />
            <span className="font-bold text-sm sm:text-base text-[#101828] tracking-tight">Finance360</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!hideFilters && (
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer min-h-[36px] ${
                isMobileFilterOpen || activeFilterCount > 0
                  ? 'bg-[#EFF4FF] border-[#246BFD] text-[#1D4ED8] font-bold shadow-xs'
                  : 'bg-white border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'
              }`}
              aria-expanded={isMobileFilterOpen}
              aria-label="Toggle filters"
              id="mobileFilterToggleBtn"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-xs">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-[#246BFD] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#246BFD] hover:bg-[#1D4ED8] rounded-lg shadow-xs transition-colors cursor-pointer min-h-[36px]"
            id="mobileAskAiBtn"
            title="Open Finance AI Copilot"
            onClick={onOpenAi}
          >
            <Sparkles className="w-3.5 h-3.5 text-white/80" />
            <span className="hidden xs:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Filter Drawer/Panel */}
      {!hideFilters && isMobileFilterOpen && (
        <div className="lg:hidden mt-2 p-3.5 bg-[#F9FAFB] border border-[#E4E7EC] rounded-xl shadow-xs flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] text-xs">
            <span className="font-bold text-[#101828] uppercase tracking-wider text-[10px]">
              Filters {activeFilterCount > 0 ? `(${activeFilterCount} Active)` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-[#667085] hover:text-[#D92D20] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <span className="text-[#D0D5DD]">|</span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-[11px] font-semibold text-[#246BFD] hover:text-[#1D4ED8] cursor-pointer"
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
          <div className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
            <span>Finance360 Suite</span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap self-end pb-0.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#246BFD] hover:bg-[#1D4ED8] rounded-lg transition-all cursor-pointer shadow-xs group shrink-0 min-h-[34px]"
            id="askFinanceAiBtn"
            title="Open Finance AI Copilot"
            onClick={onOpenAi}
          >
            <Sparkles className="w-3.5 h-3.5 text-white/80 group-hover:scale-110 transition-transform" />
            <span>Ask Finance AI</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344054] hover:text-[#101828] bg-white hover:bg-[#F9FAFB] border border-[#D0D5DD] rounded-lg transition-colors cursor-pointer shadow-xs min-h-[34px]"
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
