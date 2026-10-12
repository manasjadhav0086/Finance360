import { useState, useMemo, useEffect } from 'react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { getPeriodLabels, normalizeMonth, normalizeQuarter, getQuarterForMonth, getPreviousQuarter, getHighestQuarter } from '../../utils/periodUtils';

const PNL_DIS_ROWS = [
  { key: 'Order Intake', label: 'Order Intake', bold: true, hl: 'bg-amber-100 border-l-4 border-l-amber-500 font-bold' },
  { key: 'Revenue', label: 'Revenue', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' },
  { key: 'Variable Cost', label: 'Variable Cost' },
  { key: 'VC%', label: 'VC%', unit: 'pct' },
  { key: 'Throughput', label: 'Throughput', bold: true },
  {
    key: 'Other Direct Cost',
    label: 'Other Direct Cost',
    bold: true,
    hl: 'bg-slate-100 font-bold',
    groupable: true,
    group: 'otherDirect',
  },
  { key: 'People_Dir', label: 'People_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Marketing Expenses_Dir', label: 'Marketing Expenses_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Premises_Dir', label: 'Premises_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Travel_Dir', label: 'Travel_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Telecom_Dir', label: 'Telecom_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Legal & Professional_Dir', label: 'Legal & Professional_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Total Direct Cost', label: 'Total Direct Cost', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' },
  { key: 'Gross Profit', label: 'Gross Profit', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Gross Margin %', label: 'Gross Margin %', unit: 'pct', bold: true },
  {
    key: 'S&M Cost',
    label: 'S&M Cost',
    bold: true,
    hl: 'bg-slate-100 font-bold',
    groupable: true,
    group: 'smCost',
  },
  { key: 'People_S&M', label: 'People_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Marketing Expenses_S&M', label: 'Marketing Expenses_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Premises_S&M', label: 'Premises_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Travel_S&M', label: 'Travel_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Telecom_S&M', label: 'Telecom_S&M', level: 2, group: 'smCost', bullet: true },
  {
    key: 'Indirect Cost',
    label: 'Indirect Cost',
    bold: true,
    hl: 'bg-slate-100 font-bold',
    groupable: true,
    group: 'indirectCost',
  },
  { key: 'People_Indirect', label: 'People_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Travel_Indirect', label: 'Travel_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Premises_Indirect', label: 'Premises_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Telecom_Ind', label: 'Telecom_Ind', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Legal & Professional - Ind', label: 'Legal & Professional - Ind', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Administration', label: 'Administration', level: 2, group: 'indirectCost', bullet: true },
  { key: 'PICA', label: 'PICA' },
  { key: 'Corp Allocation', label: 'Corp Allocation' },
  { key: 'Total Operating Expenses', label: 'Total Operating Expenses', bold: true, hl: 'bg-orange-100 border-l-4 border-l-orange-500 font-bold' },
  { key: 'EBITDA Contribution', label: 'EBITDA Contribution', bold: true },
  { key: 'IPR Creation', label: 'IPR Creation' },
  { key: 'EBITDA', label: 'EBITDA', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'EBITDA %', label: 'EBITDA %', unit: 'pct', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Collection', label: 'Collection', bold: true, hl: 'bg-amber-100 border-l-4 border-l-amber-500 font-bold' },
  { key: 'Capex', label: 'Capex', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
  { key: 'Net Cash', label: 'Net Cash', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
  { key: 'Headcount', label: 'Headcount', unit: 'count', bold: true, hl: 'bg-cyan-100 border-l-4 border-l-cyan-600 font-bold' },
  { key: 'Learners Count', label: 'Learners Count', unit: 'count', bold: true, hl: 'bg-teal-100 border-l-4 border-l-teal-600 font-bold' },
];

export default function PnLDISTab({
  filters = {},
  dashboardData = {},
  getScopedMetric = () => 0,
  isUpdating = false,
}) {
  const normM = normalizeMonth(filters.month);
  const isMonthSelected = normM && normM !== 'ALL';
  const normQ = normalizeQuarter(filters.quarter);
  const isMultiQuarter = typeof normQ === 'string' && normQ.includes('+');
  const isSingleQuarter = normQ !== 'Total' && !isMultiQuarter;

  // Single quarter -> Quarterly view ('q')
  // 2+ quarters or Full Year -> Full Year view ('fy')
  const [mode, setMode] = useState(isSingleQuarter || isMonthSelected ? 'q' : 'fy');
  const [openGroups, setOpenGroups] = useState({
    otherDirect: true,
    smCost: true,
    indirectCost: true,
  });
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();

  useEffect(() => {
    if (isSingleQuarter || isMonthSelected) {
      setMode('q');
    } else {
      setMode('fy');
    }
  }, [isSingleQuarter, isMonthSelected, filters.quarter, filters.month]);

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const activeQuarter = useMemo(() => {
    if (mode === 'fy') {
      if (isMonthSelected) return getQuarterForMonth(normM);
      if (isMultiQuarter) return normQ; // Q1+Q2 for Full Year
      return 'Total';
    }
    // mode === 'q' (Quarterly):
    if (isMonthSelected) {
      return getQuarterForMonth(normM);
    }
    if (isMultiQuarter) {
      // In quarterly mode, show ONLY the highest quarter among selected (e.g. Q2 for Q1+Q2)
      return getHighestQuarter(normQ);
    }
    if (isSingleQuarter) {
      return normQ;
    }
    return dashboardData?.meta?.quarter || 'Q4';
  }, [mode, isMonthSelected, isMultiQuarter, isSingleQuarter, normM, normQ, dashboardData]);

  const periodLabels = useMemo(() => {
    return getPeriodLabels(filters, dashboardData, activeQuarter);
  }, [filters, dashboardData, activeQuarter]);

  const tableData = useMemo(() => {
    const DATA = dashboardData;
    const fy = periodLabels.currentFy;
    const q = activeQuarter;

    const priorFy = periodLabels.priorFy;
    const prevQObj = getPreviousQuarter(q, fy);
    const prevQCode = prevQObj?.quarter !== 'Total' ? prevQObj.quarter : null;
    const prevQYear = prevQObj?.fy || (mode === 'fy' ? priorFy : fy);

    return PNL_DIS_ROWS.map((row) => {
      const act = getScopedMetric(row.key, fy, 'ACT', q);
      const bud = getScopedMetric(row.key, fy, 'BUD', q);
      const ly = priorFy ? getScopedMetric(row.key, priorFy, 'ACT', q) : null;
      const prevQ = prevQCode ? getScopedMetric(row.key, prevQYear, 'ACT', prevQCode) : null;

      const budAch = bud > 0 ? (act / bud) * 100 : null;
      const yoy = ly !== 0 && ly != null ? ((act - ly) / Math.abs(ly)) * 100 : null;
      const qoq = prevQ !== 0 && prevQ != null ? ((act - prevQ) / Math.abs(prevQ)) * 100 : null;

      return {
        ...row,
        act,
        bud,
        ly,
        prevQ,
        budAch,
        yoy,
        qoq,
      };
    });
  }, [dashboardData, periodLabels, activeQuarter, mode, getScopedMetric]);

  const pnlFmtAmt = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Math.round(v).toLocaleString('en-IN');
  };

  const pnlFmtPct = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return `${Math.round(v)}%`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">P&amp;L DIS</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct, Indirect &amp; S&amp;M Functional Statement</span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'fy' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setMode('fy')}
          >
            Full Year
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'q' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setMode('q')}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-white tracking-tight">
              {mode === 'q' ? `P&L DIS Quarterly View (${periodLabels.currentPeriod})` : `P&L DIS Full Year Statement (${periodLabels.currentPeriod})`}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-300 font-medium">{tableData.length} Functional Items</span>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[750px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead className="bg-[#249791]">
              <tr className="bg-[#249791] text-white font-bold h-[32px]">
                <th
                  className={`py-2 px-3 text-left sticky top-0 left-0 z-30 min-w-[220px] w-[220px] border-r border-b border-[#1d827d] bg-[#249791] text-white font-bold transition-all duration-150 ${hoveredCell.col === 'particulars' ? 'bg-[#1c7b76]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'particulars' })}
                >
                  Particulars (INR Mn)
                </th>
                {mode === 'q' ? (
                  <>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'prevQ' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'prevQ' })}
                    >
                      {periodLabels.lastQtrActualLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'qoq' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'qoq' })}
                    >
                      {periodLabels.qoqLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      className={`py-2.5 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] sm:text-[13.5px]">
              {tableData.map((row, idx) => {
                const level = row.level || 1;
                if (row.group && level === 2 && !openGroups[row.group]) {
                  return null;
                }

                const isPct = row.unit === 'pct';
                const rowBg = row.hl ? row.hl : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                return (
                  <tr key={idx} className={`${row.bold ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    <td
                      className={`py-2 px-3 font-sans sticky left-0 z-10 border-r border-b border-slate-200 transition-all duration-100 ${getCellBg(idx, 'particulars', rowBg)} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''} ${row.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'particulars' })}
                    >
                      <div className={`flex items-center gap-1.5 ${level === 2 ? 'pl-5 text-slate-500 font-normal' : ''}`}>
                        {row.groupable && (
                          <button
                            type="button"
                            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                            onClick={() => toggleGroup(row.group)}
                          >
                            {openGroups[row.group] ? '▾' : '▸'}
                          </button>
                        )}
                        {row.bullet && <span className="text-slate-400">•</span>}
                        <span>{row.label}</span>
                      </div>
                    </td>

                    {mode === 'q' ? (
                      <>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)} ${row.ly < 0 ? 'text-rose-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.ly) : pnlFmtAmt(row.ly)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'prevQ', rowBg)} ${row.prevQ < 0 ? 'text-rose-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'prevQ' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.prevQ) : pnlFmtAmt(row.prevQ)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)} ${row.bud < 0 ? 'text-rose-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.bud) : pnlFmtAmt(row.bud)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)} ${row.act < 0 ? 'text-rose-600' : 'text-slate-900'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.act) : pnlFmtAmt(row.act)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${row.budAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.budAch)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'qoq', rowBg)} ${row.qoq >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'qoq' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.qoq)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${row.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.yoy)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)} ${row.ly < 0 ? 'text-rose-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.ly) : pnlFmtAmt(row.ly)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)} ${row.bud < 0 ? 'text-rose-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.bud) : pnlFmtAmt(row.bud)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)} ${row.act < 0 ? 'text-rose-600' : 'text-slate-900'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.act) : pnlFmtAmt(row.act)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${row.budAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.budAch)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${row.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.yoy)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-400 italic">
        Note: Learners count under Budget contains data for B2C business units only.
      </div>
    </div>
  );
}
