
import { useState, useMemo } from 'react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { normalizeQuarter } from '../../utils/periodUtils';

const TREND_SUMMARY_ROWS = [
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
  { key: 'People Cost', label: 'People Cost' },
  { key: 'Marketing Expenses', label: 'Marketing Expenses' },
  {
    key: 'Fixed Costs',
    label: 'Fixed Costs',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    accentBorder: 'border-l-[3.5px] border-l-[#64748B]',
    dotColor: 'bg-[#64748B]',
    groupable: true,
    group: 'trendFixed',
  },
  { key: 'Premises', label: 'Premises', level: 2, group: 'trendFixed', bullet: true },
  { key: 'Travel', label: 'Travel', level: 2, group: 'trendFixed', bullet: true },
  { key: 'Telecom', label: 'Telecom', level: 2, group: 'trendFixed', bullet: true },
  { key: 'Legal & Professional', label: 'Legal & Professional', level: 2, group: 'trendFixed', bullet: true },
  { key: 'Administration', label: 'Administration', level: 2, group: 'trendFixed', bullet: true },
  { key: 'PICA', label: 'PICA' },
  { key: 'Corp Allocation', label: 'Corp Allocation' },
  {
    key: 'Total Opex',
    label: 'Total Opex',
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
  {
    key: 'EBITDA Contribution %',
    label: 'EBITDA Contribution %',
    unit: 'pct',
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

const TREND_DIS_ROWS = [
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
    group: 'trendOtherDirect',
  },
  { key: 'People_Dir', label: 'People_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Marketing Expenses_Dir', label: 'Marketing Expenses_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Premises_Dir', label: 'Premises_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Travel_Dir', label: 'Travel_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Telecom_Dir', label: 'Telecom_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Legal & Professional_Dir', label: 'Legal & Professional_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
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
    group: 'trendSm',
  },
  { key: 'People_S&M', label: 'People_S&M', level: 2, group: 'trendSm', bullet: true },
  { key: 'Marketing Expenses_S&M', label: 'Marketing Expenses_S&M', level: 2, group: 'trendSm', bullet: true },
  { key: 'Premises_S&M', label: 'Premises_S&M', level: 2, group: 'trendSm', bullet: true },
  { key: 'Travel_S&M', label: 'Travel_S&M', level: 2, group: 'trendSm', bullet: true },
  { key: 'Telecom_S&M', label: 'Telecom_S&M', level: 2, group: 'trendSm', bullet: true },
  { key: 'Legal & Professional - S&M', label: 'Legal & Professional - S&M', level: 2, group: 'trendSm', bullet: true },
  {
    key: 'Indirect Cost',
    label: 'Indirect Cost',
    bold: true,
    hl: 'bg-[#F8FAFC] font-semibold text-[#334155]',
    textCol: 'text-[#334155]',
    groupable: true,
    group: 'trendIndirect',
  },
  { key: 'People_Indirect', label: 'People_Indirect', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Marketing Expenses_Ind', label: 'Marketing Expenses_Ind', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Travel_Indirect', label: 'Travel_Indirect', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Premises_Indirect', label: 'Premises_Indirect', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Telecom_Ind', label: 'Telecom_Ind', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Legal & Professional - Ind', label: 'Legal & Professional - Ind', level: 2, group: 'trendIndirect', bullet: true },
  { key: 'Administration', label: 'Administration', level: 2, group: 'trendIndirect', bullet: true },
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

function fyShift(fy, delta) {
  const n = parseInt(String(fy || '').replace(/\D/g, ''), 10);
  if (isNaN(n)) return null;
  const next = n + delta;
  return 'FY' + (next < 10 ? '0' + next : String(next));
}

export default function PnLTrendTab({
  dashboardData = {},
  filters = {},
  getScopedMetric = () => 0,
  isUpdating = false,
}) {
  const [mode, setMode] = useState('summary');
  const [openGroups, setOpenGroups] = useState({
    trendFixed: true,
    trendOtherDirect: true,
    trendSm: true,
    trendIndirect: true,
  });
  const [yearExpanded, setYearExpanded] = useState({
    FY24: true,
    FY25: true,
    FY26: true,
  });
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();

  const toggleGroup = (g) => {
    setOpenGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  };

  const toggleYear = (yr) => {
    setYearExpanded((prev) => ({ ...prev, [yr]: !prev[yr] }));
  };

  const currentFy = filters.fy || dashboardData?.meta?.budget_fy || dashboardData?.meta?.fys?.slice(-1)[0] || 'FY26';
  const allFys = dashboardData?.meta?.fys || ['FY24', 'FY25', 'FY26'];

  const { yearGroups, columns } = useMemo(() => {
    const yg = [];
    const idx = allFys.indexOf(currentFy);
    const pastFys = idx >= 0 ? allFys.slice(Math.max(0, idx - 2), idx + 1) : [fyShift(currentFy, -2), fyShift(currentFy, -1), currentFy].filter(Boolean);

    pastFys.forEach((y) => {
      yg.push({ year: y, ab: 'ACT', label: `${y} Actual` });
    });

    const rawQ = filters.quarter;
    const allFinancialQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    let selectedQuarters = [];

    if (Array.isArray(rawQ)) {
      selectedQuarters = rawQ
        .map((q) => normalizeQuarter(q))
        .filter((q) => q && q !== 'Total' && q !== 'ALL');
    } else if (typeof rawQ === 'string' && rawQ && rawQ !== 'Total' && rawQ !== 'ALL') {
      selectedQuarters = rawQ
        .split(/[+,]/)
        .map((q) => normalizeQuarter(q))
        .filter((q) => q && q !== 'Total' && q !== 'ALL');
    }

    // Deduplicate and sort strictly in financial quarter order: Q1 -> Q2 -> Q3 -> Q4
    selectedQuarters = Array.from(new Set(selectedQuarters)).sort(
      (a, b) => allFinancialQuarters.indexOf(a) - allFinancialQuarters.indexOf(b)
    );

    let qList = [];
    if (selectedQuarters.length === 0 || selectedQuarters.length === 4) {
      // STATE A: No quarter filter or all quarters selected -> show Q1..Q4 + FY Total
      qList = [
        { code: 'Q1', sub: 'Q1' },
        { code: 'Q2', sub: 'Q2' },
        { code: 'Q3', sub: 'Q3' },
        { code: 'Q4', sub: 'Q4' },
        { code: 'Total', sub: 'Full Year' },
      ];
    } else {
      // STATE B & C: 1 or multiple specific quarters selected -> each quarter is its own separate column
      qList = selectedQuarters.map((q) => ({ code: q, sub: q }));
    }

    const allCols = [];
    yg.forEach((g) => {
      qList.forEach((qq) => {
        allCols.push({
          key: `${g.year}|${g.ab}|${qq.code}`,
          year: g.year,
          ab: g.ab,
          quarter: qq.code,
          isTotal: qq.code === 'Total',
          groupLabel: g.label,
          subLabel: qq.code === 'Total' ? `${g.year} ${g.ab === 'BUD' ? 'Budget' : 'Actual'}` : `${qq.code} ${g.year}`,
        });
      });
    });

    return { yearGroups: yg, columns: allCols };
  }, [allFys, currentFy, filters.quarter]);

  const { visibleColumns, ygMeta } = useMemo(() => {
    const visible = [];
    const ygList = yearGroups.map((yg) => {
      const colsForYg = columns.filter((c) => c.year === yg.year && c.ab === yg.ab);
      const isCollapsible = colsForYg.length > 1;
      const isExpanded = isCollapsible ? !!yearExpanded[yg.year] : true;
      let visibleCols;
      if (isExpanded) {
        visibleCols = colsForYg;
      } else {
        const totalCol = colsForYg.find((c) => c.isTotal) || colsForYg[colsForYg.length - 1];
        visibleCols = totalCol ? [totalCol] : colsForYg;
      }
      visibleCols.forEach((c) => visible.push(c));
      return {
        ...yg,
        isCollapsible,
        isExpanded,
        colspan: visibleCols.length,
      };
    });
    return { visibleColumns: visible, ygMeta: ygList };
  }, [yearGroups, columns, yearExpanded]);

  const rowDefs = useMemo(() => {
    if (mode === 'dis') {
      return TREND_DIS_ROWS;
    }
    return TREND_SUMMARY_ROWS;
  }, [mode]);

  const matrixData = useMemo(() => {
    return rowDefs.map((row) => {
      const cells = {};

      columns.forEach(({ year, ab, quarter, key }) => {
        const val = getScopedMetric(row.key, year, ab, quarter);
        cells[key] = val;
      });

      return {
        ...row,
        cells,
      };
    });
  }, [rowDefs, columns, getScopedMetric]);

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
          <h1 className="text-xl font-bold tracking-tight text-[#101828]">P&amp;L Trend</h1>
          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Multi-Year Quarter-by-Quarter Matrix</span>
        </div>

        <div className="inline-flex rounded-lg bg-[#F2F4F7] p-1 border border-[#E4E7EC] self-start sm:self-auto">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'summary' ? 'bg-[#246BFD] text-white shadow-xs' : 'text-[#667085] hover:text-[#101828]'}`}
            onClick={() => setMode('summary')}
          >
            P&amp;L Summary Trend
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${mode === 'dis' ? 'bg-[#246BFD] text-white shadow-xs' : 'text-[#667085] hover:text-[#101828]'}`}
            onClick={() => setMode('dis')}
          >
            P&amp;L DIS Trend
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-[#101828] border-b border-[#1D2939] flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#246BFD] shrink-0" />
            <span className="text-sm font-semibold text-white tracking-tight">
              {mode === 'dis' ? 'P&L Direct/Indirect Functional Trend' : 'P&L Summary Multi-Year Trend'}
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#98A2B3] font-medium">{visibleColumns.length} Periods Visible</span>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[850px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead className="bg-[#101828]">
              {/* Row 1: Year Group Headers */}
              <tr className="bg-[#101828] text-white font-semibold h-[34px]">
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'particulars' })}
                  className={`py-2 px-3 text-left sticky top-0 left-0 z-30 min-w-[240px] w-[240px] max-w-[240px] border-r border-b border-[#1D2939] bg-[#101828] text-white font-semibold text-xs transition-all duration-150 ${hoveredCell.col === 'particulars' ? 'bg-[#1D2939]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  Particulars (INR Mn)
                </th>
                {ygMeta.map((yg) => (
                  <th
                    key={`${yg.year}_${yg.ab}`}
                    className={`py-1.5 px-3 text-center sticky top-0 z-20 border-r border-b border-[#1D2939] bg-[#101828] text-white font-semibold cursor-pointer select-none transition-colors ${hoveredCell.col && hoveredCell.col.startsWith(yg.year) ? 'bg-[#1D2939]' : 'hover:bg-[#1D2939]'}`}
                    colSpan={yg.colspan}
                    onClick={() => yg.isCollapsible && toggleYear(yg.year)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {yg.isCollapsible && (
                        <span className="text-[#98A2B3] text-xs font-bold">{yg.isExpanded ? '▾' : '▸'}</span>
                      )}
                      <span>{yg.label}</span>
                    </span>
                  </th>
                ))}
              </tr>
              {/* Row 2: Quarter Sub-headers */}
              <tr className="bg-[#1D2939] text-[#D0D5DD] font-medium text-[11px] h-[30px]">
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'particulars' })}
                  className={`py-1.5 px-3 text-left sticky top-[34px] left-0 z-30 min-w-[240px] w-[240px] max-w-[240px] border-r border-b border-[#344054] bg-[#1D2939] text-[#98A2B3] text-[10px] uppercase font-semibold transition-all duration-150 ${hoveredCell.col === 'particulars' ? 'bg-[#344054] text-white' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  Financial Statement Line Item
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    onMouseEnter={() => setHoveredCell({ row: null, col: c.key })}
                    className={`py-1.5 px-2.5 text-right sticky top-[34px] z-20 border-r border-b border-[#344054] min-w-[90px] w-[90px] bg-[#1D2939] transition-colors ${hoveredCell.col === c.key ? 'bg-[#344054] text-white font-semibold' : 'text-[#D0D5DD]'}`}
                  >
                    {c.subLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-[13px]">
              {matrixData.map((row, idx) => {
                const level = row.level || 1;
                if (row.group && level === 2 && !openGroups[row.group]) {
                  return null;
                }

                const isPct = row.unit === 'pct';
                const rowBg = row.hl ? row.hl : idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]';

                return (
                  <tr key={idx} className={`${row.bold ? 'font-semibold text-[#101828]' : 'text-[#344054]'}`}>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'particulars' })}
                      className={`py-2 px-3 font-sans sticky left-0 z-10 min-w-[240px] w-[240px] max-w-[240px] border-r border-b border-[#E4E7EC] transition-all duration-100 ${row.accentBorder || ''} ${getCellBg(idx, 'particulars', rowBg)} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''} ${row.bold ? 'font-semibold' : 'text-[#344054]'}`}
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
                        <span className={row.textCol || ''}>{row.label || row.key}</span>
                      </div>
                    </td>

                    {visibleColumns.map((c) => {
                      const v = row.cells[c.key];
                      const isNeg = v !== null && v !== undefined && v < 0;
                      return (
                        <td
                          key={c.key}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: c.key })}
                          className={`py-2 px-2.5 text-right min-w-[90px] w-[90px] border-r border-b border-[#E4E7EC] transition-colors duration-100 ${getCellBg(idx, c.key, rowBg)} ${isNeg ? 'text-[#D92D20] font-medium' : 'text-[#344054]'}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : isPct ? pnlFmtPct(v) : pnlFmtAmt(v)}
                        </td>
                      );
                    })}
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
