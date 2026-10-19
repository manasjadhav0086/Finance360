
import { useState, useMemo } from 'react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { normalizeQuarter } from '../../utils/periodUtils';

const TREND_SUMMARY_ROWS = [
  { key: 'Order Intake', label: 'Order Intake', bold: true, hl: 'bg-amber-100 border-l-4 border-l-amber-500 font-bold' },
  { key: 'Revenue', label: 'Revenue', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' },
  { key: 'Variable Cost', label: 'Variable Cost' },
  { key: 'VC%', label: 'VC%', unit: 'pct' },
  { key: 'Throughput', label: 'Throughput', bold: true },
  { key: 'People Cost', label: 'People Cost' },
  { key: 'Marketing Expenses', label: 'Marketing Expenses' },
  {
    key: 'Fixed Costs',
    label: 'Fixed Costs',
    bold: true,
    hl: 'bg-slate-100 font-bold',
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
  { key: 'Total Opex', label: 'Total Opex', bold: true, hl: 'bg-orange-100 border-l-4 border-l-orange-500 font-bold' },
  { key: 'EBITDA Contribution', label: 'EBITDA Contribution', bold: true },
  { key: 'EBITDA Contribution %', label: 'EBITDA Contribution %', unit: 'pct', bold: true },
  { key: 'IPR Creation', label: 'IPR Creation' },
  { key: 'EBITDA', label: 'EBITDA', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'EBITDA %', label: 'EBITDA %', unit: 'pct', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Gross Profit', label: 'Gross Profit', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Gross Margin %', label: 'Gross Margin %', unit: 'pct', bold: true },
  { key: 'Collection', label: 'Collection', bold: true, hl: 'bg-amber-100 border-l-4 border-l-amber-500 font-bold' },
  { key: 'Capex', label: 'Capex', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
  { key: 'Net Cash', label: 'Net Cash', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
];

const TREND_DIS_ROWS = [
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
    group: 'trendOtherDirect',
  },
  { key: 'People_Dir', label: 'People_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Marketing Expenses_Dir', label: 'Marketing Expenses_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Premises_Dir', label: 'Premises_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Travel_Dir', label: 'Travel_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Telecom_Dir', label: 'Telecom_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Legal & Professional_Dir', label: 'Legal & Professional_Dir', level: 2, group: 'trendOtherDirect', bullet: true },
  { key: 'Total Direct Cost', label: 'Total Direct Cost', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-600 font-bold' },
  { key: 'Gross Profit', label: 'Gross Profit', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Gross Margin %', label: 'Gross Margin %', unit: 'pct', bold: true },
  {
    key: 'S&M Cost',
    label: 'S&M Cost',
    bold: true,
    hl: 'bg-slate-100 font-bold',
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
    hl: 'bg-slate-100 font-bold',
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
  { key: 'Total Operating Expenses', label: 'Total Operating Expenses', bold: true, hl: 'bg-orange-100 border-l-4 border-l-orange-500 font-bold' },
  { key: 'EBITDA Contribution', label: 'EBITDA Contribution', bold: true },
  { key: 'IPR Creation', label: 'IPR Creation' },
  { key: 'EBITDA', label: 'EBITDA', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'EBITDA %', label: 'EBITDA %', unit: 'pct', bold: true, hl: 'bg-emerald-100 border-l-4 border-l-emerald-600 font-bold' },
  { key: 'Collection', label: 'Collection', bold: true, hl: 'bg-amber-100 border-l-4 border-l-amber-500 font-bold' },
  { key: 'Capex', label: 'Capex', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
  { key: 'Net Cash', label: 'Net Cash', bold: true, hl: 'bg-blue-100 border-l-4 border-l-blue-500 font-bold' },
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">P&amp;L Trend</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi-Year Quarter-by-Quarter Matrix</span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'summary' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setMode('summary')}
          >
            P&amp;L Summary Trend
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'dis' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setMode('dis')}
          >
            P&amp;L DIS Trend
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-white tracking-tight">
              {mode === 'dis' ? 'P&L Direct/Indirect Functional Trend' : 'P&L Summary Multi-Year Trend'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-300 font-medium">{visibleColumns.length} Periods Visible</span>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[850px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead className="bg-[#249791]">
              <tr className="bg-[#249791] text-white font-bold h-[32px]">
                <th
                  rowSpan={2}
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'particulars' })}
                  className={`py-2 px-3 text-left sticky top-0 left-0 z-20 min-w-[220px] w-[220px] border-r border-b border-[#1d827d] align-middle bg-[#249791] text-white font-bold transition-all duration-150 ${hoveredCell.col === 'particulars' ? 'bg-[#1c7b76]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  Particulars (INR Mn)
                </th>
                {ygMeta.map((yg) => (
                  <th
                    key={`${yg.year}_${yg.ab}`}
                    className={`py-1.5 px-3 text-center sticky top-0 z-20 border-r border-b border-[#1d827d] bg-[#249791] cursor-pointer select-none transition-colors ${hoveredCell.col && hoveredCell.col.startsWith(yg.year) ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white hover:bg-[#1f8782]'}`}
                    colSpan={yg.colspan}
                    onClick={() => yg.isCollapsible && toggleYear(yg.year)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {yg.isCollapsible && (
                        <span className="text-teal-200 font-bold">{yg.isExpanded ? '▾' : '▸'}</span>
                      )}
                      {yg.label}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="bg-[#1e8580] text-white font-semibold text-[11px] h-[30px]">
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    onMouseEnter={() => setHoveredCell({ row: null, col: c.key })}
                    className={`py-1.5 px-2.5 text-right sticky top-[32px] z-20 border-r border-b border-[#176a66] min-w-[80px] bg-[#1e8580] transition-colors ${hoveredCell.col === c.key ? 'bg-[#176a66] text-white font-bold' : 'bg-[#1e8580] text-white font-semibold'}`}
                  >
                    {c.subLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] sm:text-[13.5px]">
              {matrixData.map((row, idx) => {
                const level = row.level || 1;
                if (row.group && level === 2 && !openGroups[row.group]) {
                  return null;
                }

                const isPct = row.unit === 'pct';
                const rowBg = row.hl ? row.hl : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                return (
                  <tr key={idx} className={`${row.bold ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'particulars' })}
                      className={`py-2 px-3 font-sans sticky left-0 z-10 border-r border-b border-slate-200 transition-all duration-100 ${getCellBg(idx, 'particulars', rowBg)} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''} ${row.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}
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

                    {visibleColumns.map((c) => {
                      const v = row.cells[c.key];
                      const isNeg = v !== null && v !== undefined && v < 0;
                      return (
                        <td
                          key={c.key}
                          onMouseEnter={() => setHoveredCell({ row: idx, col: c.key })}
                          className={`py-2 px-2.5 text-right border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, c.key, rowBg)} ${isNeg ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}
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
