import React, { useState, useMemo, useEffect } from 'react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import {
  getPeriodLabels,
  normalizeMonth,
  normalizeQuarter,
  getQuarterForMonth,
  getPreviousQuarter,
  getHighestQuarter,
  getMonthContext,
} from '../../utils/periodUtils';

const HEATMAP_METRICS = [
  { key: 'Order Intake', label: 'Order Intake', isPct: false },
  { key: 'Revenue', label: 'Revenue', isPct: false },
  { key: 'Gross Profit', label: 'Gross Profit', isPct: false },
  { key: 'GM %', label: 'GM %', isPct: true },
  { key: 'SG&A Cost', label: 'SG&A Cost', isPct: false },
  { key: 'SG&A Cost %', label: 'SG&A Cost %', isPct: true },
  { key: 'EBITDA Contribution', label: 'EBITDA Contribution', isPct: false },
  { key: 'EBITDA Contribution %', label: 'EBITDA Contribution %', isPct: true },
  { key: 'EBITDA', label: 'EBITDA', isPct: false },
  { key: 'OM %', label: 'OM %', isPct: true },
];

export default function HeatmapTab({
  filters = {},
  dashboardData = {},
  getScopedMetric = () => 0,
  isUpdating = false,
}) {
  const normM = normalizeMonth(filters.month);
  const isMonthSelected = normM && normM !== 'ALL';

  const [grain, setGrain] = useState(isMonthSelected ? 'monthly' : 'quarterly');
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();

  useEffect(() => {
    if (isMonthSelected) {
      setGrain('monthly');
    }
  }, [isMonthSelected]);

  const activeQuarter = useMemo(() => {
    const qVal = filters.quarter;
    const normQ = normalizeQuarter(qVal);
    const isMultiQuarter = typeof normQ === 'string' && normQ.includes('+');

    if (grain === 'yearly') {
      return isMultiQuarter ? normQ : 'Total';
    }
    if (isMonthSelected) {
      return getQuarterForMonth(normM);
    }
    if (normQ === 'Total') {
      return grain === 'monthly' ? 'Total' : (dashboardData?.meta?.quarter || 'Q4');
    }
    if (isMultiQuarter) {
      return getHighestQuarter(normQ);
    }
    return normQ;
  }, [grain, filters.quarter, isMonthSelected, normM, dashboardData]);

  const periodLabels = useMemo(() => {
    if (grain === 'monthly' && !isMonthSelected) {
      const fallbackMonth =
        activeQuarter === 'Q1'
          ? 'June'
          : activeQuarter === 'Q2'
          ? 'September'
          : activeQuarter === 'Q3'
          ? 'December'
          : 'March';
      return getPeriodLabels(filters, dashboardData, activeQuarter, fallbackMonth);
    }
    return getPeriodLabels(filters, dashboardData, activeQuarter);
  }, [grain, filters, dashboardData, activeQuarter, isMonthSelected]);

  const tableRows = useMemo(() => {
    const fy = periodLabels.currentFy;
    const priorFy = periodLabels.priorFy;

    if (grain === 'monthly') {
      const effectiveMonth = isMonthSelected
        ? normM
        : periodLabels.month && periodLabels.month !== 'ALL'
        ? periodLabels.month
        : activeQuarter === 'Q1'
        ? 'June'
        : activeQuarter === 'Q2'
        ? 'September'
        : activeQuarter === 'Q3'
        ? 'December'
        : 'March';

      const mCtx = getMonthContext(effectiveMonth, fy);
      const curQ = getQuarterForMonth(effectiveMonth);
      const prevM = mCtx?.prevMonth || 'February';
      const prevMFy = mCtx?.prevMonthFy || fy;
      const prevMQ = mCtx?.prevMonthQuarter || getQuarterForMonth(prevM);

      return HEATMAP_METRICS.map((m) => {
        const act = getScopedMetric(m.key, fy, 'ACT', curQ, { ...filters, month: effectiveMonth });
        const bud = getScopedMetric(m.key, fy, 'BUD', curQ, { ...filters, month: effectiveMonth });
        const ly = priorFy
          ? getScopedMetric(m.key, priorFy, 'ACT', curQ, { ...filters, month: effectiveMonth })
          : 0;
        const prev = getScopedMetric(m.key, prevMFy, 'ACT', prevMQ, { ...filters, month: prevM });

        const budAch = bud > 0 ? (act / bud) * 100 : null;
        const seq = prev !== 0 && prev != null ? ((act - prev) / Math.abs(prev)) * 100 : null;
        const yoy = ly !== 0 && ly != null ? ((act - ly) / Math.abs(ly)) * 100 : null;

        return {
          metric: m.label,
          uom: m.isPct ? '%' : 'INR Mn',
          isPct: m.isPct,
          ly,
          prev,
          bud,
          act,
          budAch,
          seq,
          yoy,
        };
      });
    }

    if (grain === 'yearly') {
      return HEATMAP_METRICS.map((m) => {
        const act = getScopedMetric(m.key, fy, 'ACT', 'Total', { ...filters, month: 'ALL' });
        const bud = getScopedMetric(m.key, fy, 'BUD', 'Total', { ...filters, month: 'ALL' });
        const ly = priorFy
          ? getScopedMetric(m.key, priorFy, 'ACT', 'Total', { ...filters, month: 'ALL' })
          : 0;
        const prev = ly;

        const budAch = bud > 0 ? (act / bud) * 100 : null;
        const seq = null;
        const yoy = ly !== 0 && ly != null ? ((act - ly) / Math.abs(ly)) * 100 : null;

        return {
          metric: m.label,
          uom: m.isPct ? '%' : 'INR Mn',
          isPct: m.isPct,
          ly,
          prev,
          bud,
          act,
          budAch,
          seq,
          yoy,
        };
      });
    }

    // Quarterly (Default)
    const q = activeQuarter;
    const prevQObj = getPreviousQuarter(q, fy);
    const prevQCode = prevQObj?.quarter !== 'Total' ? prevQObj.quarter : null;
    const prevQYear = prevQObj?.fy || fy;

    return HEATMAP_METRICS.map((m) => {
      const act = getScopedMetric(m.key, fy, 'ACT', q, { ...filters, month: 'ALL' });
      const bud = getScopedMetric(m.key, fy, 'BUD', q, { ...filters, month: 'ALL' });
      const ly = priorFy ? getScopedMetric(m.key, priorFy, 'ACT', q, { ...filters, month: 'ALL' }) : 0;
      const prev = prevQCode
        ? getScopedMetric(m.key, prevQYear, 'ACT', prevQCode, { ...filters, month: 'ALL' })
        : ly;

      const budAch = bud > 0 ? (act / bud) * 100 : null;
      const seq = prev !== 0 && prev != null ? ((act - prev) / Math.abs(prev)) * 100 : null;
      const yoy = ly !== 0 && ly != null ? ((act - ly) / Math.abs(ly)) * 100 : null;

      return {
        metric: m.label,
        uom: m.isPct ? '%' : 'INR Mn',
        isPct: m.isPct,
        ly,
        prev,
        bud,
        act,
        budAch,
        seq,
        yoy,
      };
    });
  }, [grain, periodLabels, activeQuarter, isMonthSelected, normM, filters, getScopedMetric]);

  const fmtAmt = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Math.round(v).toLocaleString('en-IN');
  };

  const fmtPct = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return `${Math.round(v)}%`;
  };

  const grainLabel = grain === 'monthly' ? 'Monthly' : grain === 'yearly' ? 'Yearly' : 'Quarterly';

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Heatmap</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi-Period Performance Matrix</span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${grain === 'monthly' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setGrain('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${grain === 'quarterly' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setGrain('quarterly')}
          >
            Quarterly
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${grain === 'yearly' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => setGrain('yearly')}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-white tracking-tight">{grainLabel} Heatmap Comparison ({periodLabels.currentPeriod})</span>
          </div>
          <span className="text-xs font-mono text-slate-300 font-medium">{tableRows.length} Metrics</span>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[750px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead>
              <tr className="bg-[#249791] text-white font-bold sticky top-0 z-20 shadow-xs">
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'metric' })}
                  className={`py-2.5 px-3 text-left sticky top-0 left-0 z-40 min-w-[200px] border-r border-b border-[#1d827d] bg-[#249791] text-white font-bold transition-all duration-150 ${hoveredCell.col === 'metric' ? 'bg-[#1c7b76]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  {grain === 'monthly' ? 'Monthly Metric' : grain === 'quarterly' ? 'Quarterly Metric' : 'Yearly Metric'}
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'uom' })}
                  className={`py-2.5 px-3 text-left sticky top-0 z-20 min-w-[80px] border-r border-b border-[#1d827d] bg-[#249791] text-white font-bold transition-colors ${hoveredCell.col === 'uom' ? 'bg-[#1c7b76]' : ''}`}
                >
                  UOM
                </th>
                {grain === 'monthly' ? (
                  <>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      LY Actual
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'prev' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'prev' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      Prev Month
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'seq' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'seq' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      MoM %
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                ) : grain === 'quarterly' ? (
                  <>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'prev' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'prev' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.lastQtrActualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'seq' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'seq' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.qoqLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'ly' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'ly' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.lyActualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'bud' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'bud' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budgetLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'act' })}
                      className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'act' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.actualLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.budAchLabel}
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: 'yoy' })}
                      className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'yoy' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                    >
                      {periodLabels.yoyLabel}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] sm:text-[13.5px]">
              {tableRows.map((r, idx) => {
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                return (
                  <tr key={idx}>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'metric' })}
                      className={`py-2 px-3 font-sans font-semibold text-slate-900 sticky left-0 z-10 ${getCellBg(idx, 'metric', rowBg)} border-r border-b border-slate-200 transition-all duration-100 ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''}`}
                    >
                      {r.metric}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'uom' })}
                      className={`py-2 px-3 font-sans text-slate-500 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'uom', rowBg)}`}
                    >
                      {r.uom}
                    </td>

                    {grain === 'monthly' ? (
                      <>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.ly) : fmtAmt(r.ly)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'prev' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'prev', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.prev) : fmtAmt(r.prev)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.bud) : fmtAmt(r.bud)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                          className={`py-2 px-3 text-right font-semibold text-slate-900 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.act) : fmtAmt(r.act)}
                        </td>
                        {r.isPct ? (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)}`}
                            >
                              —
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'seq' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'seq', rowBg)}`}
                            >
                              —
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)}`}
                            >
                              —
                            </td>
                          </>
                        ) : (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${r.budAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.budAch)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'seq' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'seq', rowBg)} ${r.seq >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.seq)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${r.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.yoy)}
                            </td>
                          </>
                        )}
                      </>
                    ) : grain === 'quarterly' ? (
                      <>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.ly) : fmtAmt(r.ly)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'prev' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'prev', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.prev) : fmtAmt(r.prev)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.bud) : fmtAmt(r.bud)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                          className={`py-2 px-3 text-right font-semibold text-slate-900 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.act) : fmtAmt(r.act)}
                        </td>
                        {r.isPct ? (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)}`}
                            >
                              —
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'seq' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'seq', rowBg)}`}
                            >
                              —
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)}`}
                            >
                              —
                            </td>
                          </>
                        ) : (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${r.budAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.budAch)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'seq' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'seq', rowBg)} ${r.seq >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.seq)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${r.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.yoy)}
                            </td>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'ly' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ly', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.ly) : fmtAmt(r.ly)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'bud' })}
                          className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bud', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.bud) : fmtAmt(r.bud)}
                        </td>
                        <td
                          onMouseEnter={() => setHoveredCell({ row: idx, col: 'act' })}
                          className={`py-2 px-3 text-right font-semibold text-slate-900 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'act', rowBg)}`}
                        >
                          {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : r.isPct ? fmtPct(r.act) : fmtAmt(r.act)}
                        </td>
                        {r.isPct ? (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)}`}
                            >
                              —
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right text-slate-300 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)}`}
                            >
                              —
                            </td>
                          </>
                        ) : (
                          <>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${r.budAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.budAch)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: idx, col: 'yoy' })}
                              className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'yoy', rowBg)} ${r.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : fmtPct(r.yoy)}
                            </td>
                          </>
                        )}
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
