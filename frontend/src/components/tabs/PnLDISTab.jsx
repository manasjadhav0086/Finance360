import { useState, useMemo, useEffect } from 'react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { getPeriodLabels, normalizeMonth, normalizeQuarter, getQuarterForMonth, getPreviousQuarter, getHighestQuarter } from '../../utils/periodUtils';

const PNL_DIS_ROWS = [
  {
    key: 'Order Intake',
    label: 'Order Intake',
    bold: true,
    hl: 'bg-[#FFFBEB]/80 font-semibold text-[#92400E]',
    textCol: 'text-[#92400E]',
    accentBorder: 'border-l-[3.5px] border-l-[#D97706]',
    dotColor: 'bg-[#D97706]',
  },
  {
    key: 'Revenue',
    label: 'Revenue',
    bold: true,
    hl: 'bg-[#EFF6FF] font-semibold text-[#1E40AF]',
    textCol: 'text-[#1E40AF]',
    accentBorder: 'border-l-[3.5px] border-l-[#2563EB]',
    dotColor: 'bg-[#2563EB]',
  },
  { key: 'Variable Cost', label: 'Variable Cost' },
  { key: 'VC%', label: 'VC%', unit: 'pct' },
  {
    key: 'Throughput',
    label: 'Throughput',
    bold: true,
    hl: 'bg-[#F0FDF4] font-semibold text-[#166534]',
    textCol: 'text-[#166534]',
    accentBorder: 'border-l-[3.5px] border-l-[#16A34A]',
    dotColor: 'bg-[#16A34A]',
  },
  {
    key: 'Other Direct Cost',
    label: 'Other Direct Cost',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    accentBorder: 'border-l-[3.5px] border-l-[#64748B]',
    dotColor: 'bg-[#64748B]',
    groupable: true,
    group: 'otherDirect',
  },
  { key: 'People_Dir', label: 'People_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Marketing Expenses_Dir', label: 'Marketing Expenses_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Premises_Dir', label: 'Premises_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Travel_Dir', label: 'Travel_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Telecom_Dir', label: 'Telecom_Dir', level: 2, group: 'otherDirect', bullet: true },
  { key: 'Legal & Professional_Dir', label: 'Legal & Professional_Dir', level: 2, group: 'otherDirect', bullet: true },
  {
    key: 'Total Direct Cost',
    label: 'Total Direct Cost',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    accentBorder: 'border-l-[3.5px] border-l-[#64748B]',
    dotColor: 'bg-[#64748B]',
  },
  {
    key: 'Gross Profit',
    label: 'Gross Profit',
    bold: true,
    hl: 'bg-[#F0FDF4] font-semibold text-[#166534]',
    textCol: 'text-[#166534]',
    accentBorder: 'border-l-[3.5px] border-l-[#16A34A]',
    dotColor: 'bg-[#16A34A]',
  },
  {
    key: 'Gross Margin %',
    label: 'Gross Margin %',
    unit: 'pct',
    bold: true,
    hl: 'bg-[#F0FDF4] font-semibold text-[#166534]',
    textCol: 'text-[#166534]',
    accentBorder: 'border-l-[3.5px] border-l-[#16A34A]',
    dotColor: 'bg-[#16A34A]',
  },
  {
    key: 'S&M Cost',
    label: 'S&M Cost',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    groupable: true,
    group: 'smCost',
  },
  { key: 'People_S&M', label: 'People_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Marketing Expenses_S&M', label: 'Marketing Expenses_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Premises_S&M', label: 'Premises_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Travel_S&M', label: 'Travel_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Telecom_S&M', label: 'Telecom_S&M', level: 2, group: 'smCost', bullet: true },
  { key: 'Legal & Professional - S&M', label: 'Legal & Professional - S&M', level: 2, group: 'smCost', bullet: true },
  {
    key: 'Indirect Cost',
    label: 'Indirect Cost',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    groupable: true,
    group: 'indirectCost',
  },
  { key: 'People_Indirect', label: 'People_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Marketing Expenses_Ind', label: 'Marketing Expenses_Ind', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Travel_Indirect', label: 'Travel_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Premises_Indirect', label: 'Premises_Indirect', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Telecom_Ind', label: 'Telecom_Ind', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Legal & Professional - Ind', label: 'Legal & Professional - Ind', level: 2, group: 'indirectCost', bullet: true },
  { key: 'Administration', label: 'Administration', level: 2, group: 'indirectCost', bullet: true },
  { key: 'PICA', label: 'PICA' },
  { key: 'Corp Allocation', label: 'Corp Allocation' },
  {
    key: 'Total Operating Expenses',
    label: 'Total Operating Expenses',
    bold: true,
    hl: 'bg-[#FFF7ED] font-semibold text-[#9A3412]',
    textCol: 'text-[#9A3412]',
    accentBorder: 'border-l-[3.5px] border-l-[#EA580C]',
    dotColor: 'bg-[#EA580C]',
  },
  {
    key: 'EBITDA Contribution',
    label: 'EBITDA Contribution',
    bold: true,
    hl: 'bg-[#FFF1F2] font-semibold text-[#9F1239]',
    textCol: 'text-[#9F1239]',
    accentBorder: 'border-l-[3.5px] border-l-[#E11D48]',
    dotColor: 'bg-[#E11D48]',
  },
  { key: 'IPR Creation', label: 'IPR Creation' },
  {
    key: 'EBITDA',
    label: 'EBITDA',
    bold: true,
    hl: 'bg-[#ECFDF5] font-bold text-[#065F46]',
    textCol: 'text-[#065F46]',
    accentBorder: 'border-l-[3.5px] border-l-[#059669]',
    dotColor: 'bg-[#059669]',
  },
  {
    key: 'EBITDA %',
    label: 'EBITDA %',
    unit: 'pct',
    bold: true,
    hl: 'bg-[#ECFDF5] font-bold text-[#065F46]',
    textCol: 'text-[#065F46]',
    accentBorder: 'border-l-[3.5px] border-l-[#059669]',
    dotColor: 'bg-[#059669]',
  },
  {
    key: 'Collection',
    label: 'Collection',
    bold: true,
    hl: 'bg-[#F0FDFA] font-semibold text-[#115E59]',
    textCol: 'text-[#115E59]',
    accentBorder: 'border-l-[3.5px] border-l-[#0D9488]',
    dotColor: 'bg-[#0D9488]',
  },
  {
    key: 'Capex',
    label: 'Capex',
    bold: true,
    hl: 'bg-[#FAF5FF] font-semibold text-[#581C87]',
    textCol: 'text-[#581C87]',
    accentBorder: 'border-l-[3.5px] border-l-[#7C3AED]',
    dotColor: 'bg-[#7C3AED]',
  },
  {
    key: 'Net Cash',
    label: 'Net Cash',
    bold: true,
    hl: 'bg-[#F0F9FF] font-bold text-[#075985]',
    textCol: 'text-[#075985]',
    accentBorder: 'border-l-[3.5px] border-l-[#0284C7]',
    dotColor: 'bg-[#0284C7]',
  },
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
          <h1 className="text-xl font-bold tracking-tight text-[#101828]">P&amp;L DIS</h1>
          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Direct, Indirect &amp; S&amp;M Functional Statement</span>
        </div>

        <div className="inline-flex rounded-lg bg-[#F2F4F7] p-1 border border-[#E4E7EC] self-start sm:self-auto">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'fy' ? 'bg-[#246BFD] text-white shadow-xs' : 'text-[#667085] hover:text-[#101828]'}`}
            onClick={() => setMode('fy')}
          >
            Full Year
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'q' ? 'bg-[#246BFD] text-white shadow-xs' : 'text-[#667085] hover:text-[#101828]'}`}
            onClick={() => setMode('q')}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-[#101828] border-b border-[#1D2939] flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#246BFD] shrink-0" />
            <span className="text-sm font-semibold text-white tracking-tight">
              {mode === 'q' ? `P&L DIS Quarterly View (${periodLabels.currentPeriod})` : `P&L DIS Full Year Statement (${periodLabels.currentPeriod})`}
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#98A2B3] font-medium">{tableData.length} Functional Items</span>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[750px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead className="bg-[#101828]">
              <tr className="bg-[#101828] text-white font-semibold h-[34px]">
                <th
                  className={`py-2 px-3 text-left sticky top-0 left-0 z-30 min-w-[220px] w-[220px] border-r border-b border-[#1D2939] bg-[#101828] text-white font-semibold transition-all duration-150 ${hoveredCell.col === 'particulars' ? 'bg-[#1D2939]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'particulars' })}
                >
                  Particulars (INR Mn)
                </th>
                {mode === 'q' ? (
                  <>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'prevQ' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'prevQ' })}
                    >
                      {periodLabels.lastQtrActualLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'qoq' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'qoq' })}
                    >
                      {periodLabels.qoqLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[100px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[120px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      className={`py-2 px-3 text-right sticky top-0 z-20 min-w-[110px] border-r border-b border-[#1D2939] bg-[#101828] font-semibold text-xs transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1D2939] text-white' : 'text-[#D0D5DD]'}`}
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-[13px]">
              {tableData.map((row, idx) => {
                const level = row.level || 1;
                if (row.group && level === 2 && !openGroups[row.group]) {
                  return null;
                }

                const isPct = row.unit === 'pct';
                const rowBg = row.hl ? row.hl : idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]';

                return (
                  <tr key={idx} className={`${row.bold ? 'font-semibold text-[#101828]' : 'text-[#344054]'}`}>
                    <td
                      className={`py-2 px-3 font-sans sticky left-0 z-10 border-r border-b border-[#E4E7EC] transition-all duration-100 ${row.accentBorder || ''} ${getCellBg(idx, 'particulars', rowBg)} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''} ${row.bold ? 'font-semibold' : 'text-[#344054]'}`}
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'particulars' })}
                    >
                      <div className={`flex items-center gap-1.5 ${level === 2 ? 'pl-5 text-[#667085] font-normal' : ''}`}>
                        {row.groupable && (
                          <button
                            type="button"
                            className="w-4 h-4 flex items-center justify-center text-[#98A2B3] hover:text-[#101828] font-bold cursor-pointer"
                            onClick={() => toggleGroup(row.group)}
                          >
                            {openGroups[row.group] ? '▾' : '▸'}
                          </button>
                        )}
                        {row.dotColor && <span className={`w-2 h-2 rounded-full ${row.dotColor} shrink-0 inline-block shadow-xs mr-0.5`} />}
                        {row.bullet && <span className="text-[#98A2B3]">•</span>}
                        <span className={row.textCol || ''}>{row.label}</span>
                      </div>
                    </td>

                    {mode === 'q' ? (
                      <>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)} ${row.ly < 0 ? 'text-[#D92D20]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.ly) : pnlFmtAmt(row.ly)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'prevQ', rowBg)} ${row.prevQ < 0 ? 'text-[#D92D20]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'prevQ' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.prevQ) : pnlFmtAmt(row.prevQ)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)} ${row.bud < 0 ? 'text-[#D92D20]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.bud) : pnlFmtAmt(row.bud)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)} ${row.act < 0 ? 'text-[#D92D20]' : 'text-[#101828]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.act) : pnlFmtAmt(row.act)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${row.budAch >= 100 ? 'text-[#12B981]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.budAch)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'qoq', rowBg)} ${row.qoq >= 0 ? 'text-[#12B981]' : 'text-[#D92D20]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'qoq' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.qoq)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${row.yoy >= 0 ? 'text-[#12B981]' : 'text-[#D92D20]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.yoy)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)} ${row.ly < 0 ? 'text-[#D92D20]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.ly) : pnlFmtAmt(row.ly)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)} ${row.bud < 0 ? 'text-[#D92D20]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.bud) : pnlFmtAmt(row.bud)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)} ${row.act < 0 ? 'text-[#D92D20]' : 'text-[#101828]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(row.act) : pnlFmtAmt(row.act)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${row.budAch >= 100 ? 'text-[#12B981]' : 'text-[#344054]'}`}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : pnlFmtPct(row.budAch)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${row.yoy >= 0 ? 'text-[#12B981]' : 'text-[#D92D20]'}`}
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
    </div>
  );
}
