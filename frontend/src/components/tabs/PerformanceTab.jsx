import { useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Coins,
  PieChart,
  FileText,
  TrendingUp,
  LineChart,
} from 'lucide-react';
import EChart from '../charts/EChart';
import Shimmer from '../ui/Shimmer';
import { getPeriodLabels, getEffectiveFilterContext, getTrailingQuarters } from '../../utils/periodUtils';
import { sortDimensionsByContribution, sortSeriesByContribution } from '../../utils/chartUtils';
import { getCategoryColor, get3DBarGradient, getLighterTints } from '../../utils/theme';

const getDimColor = (dim, idx) => {
  return getCategoryColor(dim, idx);
};

const PERF_KPI_META = {
  Revenue: {
    label: 'Revenue',
    icon: BarChart3,
    borderAccent: 'border-l-[6px] border-l-[#0284C7]',
    badgeBg: 'bg-sky-50 text-[#0284C7] border-sky-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300',
  },
  'Variable Cost': {
    label: 'Variable Cost',
    icon: Coins,
    borderAccent: 'border-l-[6px] border-l-[#EA580C]',
    badgeBg: 'bg-orange-50 text-[#EA580C] border-orange-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-orange-300',
  },
  'Gross Margin %': {
    label: 'Gross Margin',
    icon: PieChart,
    borderAccent: 'border-l-[6px] border-l-[#16A34A]',
    badgeBg: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300',
  },
  'Total Opex': {
    label: 'Total Opex',
    icon: FileText,
    borderAccent: 'border-l-[6px] border-l-[#9333EA]',
    badgeBg: 'bg-purple-50 text-[#9333EA] border-purple-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300',
  },
  'EBITDA Contribution': {
    label: 'EBITDA Contrib',
    icon: TrendingUp,
    borderAccent: 'border-l-[6px] border-l-[#0D9488]',
    badgeBg: 'bg-teal-50 text-[#0D9488] border-teal-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-300',
  },
  EBITDA: {
    label: 'EBITDA',
    icon: LineChart,
    borderAccent: 'border-l-[6px] border-l-[#059669]',
    badgeBg: 'bg-emerald-50 text-[#059669] border-emerald-200',
    cardGradient: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300',
  },
};

// Darker, vibrant colors specifically optimized for line charts and trend charts
const LINE_METRIC_COLORS = {
  'GP %': '#16A34A',                   // Vibrant Fresh Emerald Green
  'Gross Margin %': '#16A34A',
  'Gross Profit': '#16A34A',
  'EBITDA %': '#EAB308',                // Vibrant Golden Amber
  'EBITDA': '#059669',                  // Rich Forest Green
  'EBITDA Contribution %': '#E11D48',   // Vibrant Crimson Rose
  'EBITDA Contribution': '#E11D48',
  'Variable Cost': '#EA580C',           // Vibrant Tangerine Orange
  'VC%': '#EA580C',
  'People Cost': '#6366F1',             // Vibrant Royal Indigo
  'Fixed Costs': '#64748B',             // Crisp Slate
  'Marketing Expenses': '#0D9488',      // Vibrant Rich Teal
  'Revenue': '#0284C7',                 // Vibrant Sky Blue
  'Order Intake': '#0EA5E9',            // Bright Electric Cyan
};

const getLineMetricColor = (name, fallbackIdx = 0) => {
  if (LINE_METRIC_COLORS[name]) return LINE_METRIC_COLORS[name];
  return getCategoryColor(name, fallbackIdx);
};

const getLineLabelPosition = (seriesName, index) => {
  const name = (seriesName || '').toLowerCase();
  if (name.includes('ebitda contribution') || name.includes('marketing') || name.includes('variable cost')) {
    return 'bottom';
  }
  if (name.includes('gp') || name.includes('people') || name.includes('fixed') || name.includes('ebitda')) {
    return 'top';
  }
  return index % 2 === 0 ? 'top' : 'bottom';
};

export default function PerformanceTab({
  filters = {},
  dashboardData = {},
  perfViews = {},
  matchesScope = () => true,
  getScopedMetric = () => 0,
  getActiveBusinesses = () => [],
  isUpdating = false,
}) {
  const periodLabels = useMemo(() => {
    return getPeriodLabels(filters, dashboardData);
  }, [filters, dashboardData]);

  const currentFy = periodLabels.currentFy;
  const currentQ = periodLabels.quarter;
  const scopeTimeframe = periodLabels.scopeDescription;
  const fileTimeframe = String(periodLabels.timeframeLabel).replace(/\s+/g, '_');

  const cardMetrics = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const fy = filterCtx.financialYear;
    const q = filterCtx.effectiveQuarter;
    const allFys = dashboardData?.meta?.fys || [];
    const curIdx = allFys.indexOf(fy);
    const priorFy = curIdx > 0 ? allFys[curIdx - 1] : null;

    const rev = getScopedMetric('Revenue', fy, 'ACT', q);
    const revBud = getScopedMetric('Revenue', fy, 'BUD', q);
    const revPy = priorFy ? getScopedMetric('Revenue', priorFy, 'ACT', q) : 0;

    const vc = getScopedMetric('Variable Cost', fy, 'ACT', q);
    const vcBud = getScopedMetric('Variable Cost', fy, 'BUD', q);
    const vcPy = priorFy ? getScopedMetric('Variable Cost', priorFy, 'ACT', q) : 0;

    const gpPct = getScopedMetric('Gross Margin %', fy, 'ACT', q);
    const gpPctBud = getScopedMetric('Gross Margin %', fy, 'BUD', q);
    const gpPctPy = priorFy ? getScopedMetric('Gross Margin %', priorFy, 'ACT', q) : 0;

    const opex = getScopedMetric('Total Opex', fy, 'ACT', q);
    const opexBud = getScopedMetric('Total Opex', fy, 'BUD', q);
    const opexPy = priorFy ? getScopedMetric('Total Opex', priorFy, 'ACT', q) : 0;

    const ebitdaContrib = getScopedMetric('EBITDA Contribution', fy, 'ACT', q);
    const ebitdaContribBud = getScopedMetric('EBITDA Contribution', fy, 'BUD', q);
    const ebitdaContribPy = priorFy ? getScopedMetric('EBITDA Contribution', priorFy, 'ACT', q) : 0;

    const ebitda = getScopedMetric('EBITDA', fy, 'ACT', q);
    const ebitdaBud = getScopedMetric('EBITDA', fy, 'BUD', q);
    const ebitdaPy = priorFy ? getScopedMetric('EBITDA', priorFy, 'ACT', q) : 0;

    const fmtVal = (v, isPct) => {
      if (v === null || v === undefined || isNaN(v)) return '—';
      if (isPct) return `${Math.round(v)}%`;
      const rounded = Math.round(v);
      return `₹${rounded < 0 ? '-' + Math.abs(rounded).toLocaleString('en-IN') : rounded.toLocaleString('en-IN')}`;
    };

    const buildCard = (key, actual, budget, py, isPct = false) => {
      const meta = PERF_KPI_META[key] || { theme: 'bg-blue-500', label: key };
      let diff = null;
      let yoyPct = null;
      if (py != null && !isNaN(py) && py !== 0) {
        diff = actual - py;
        yoyPct = ((actual - py) / Math.abs(py)) * 100;
      }

      let achStr = '';
      if (!isPct && budget != null && budget > 0 && actual >= 0) {
        const achPct = (actual / budget) * 100;
        if (!isNaN(achPct)) {
          achStr = ` (${Math.round(achPct)}% of budget)`;
        }
      }

      let yoyHtml = '—';
      let yoyCls = 'is-neutral';
      if (diff != null && !isNaN(diff)) {
        if (Math.abs(yoyPct || 0) >= 0.05) {
          yoyCls = (yoyPct || 0) >= 0 ? 'is-pos' : 'is-neg';
        }
        const arrow = diff >= 0 ? '▲ ' : '▼ ';
        const diffSign = diff >= 0 ? '+' : '-';
        const diffAbs = Math.abs(Math.round(diff));
        const diffText = isPct
          ? `${diffSign}${diffAbs}%`
          : `${diffSign}₹${diffAbs.toLocaleString('en-IN')}`;
        const yoyPctText = `${yoyPct >= 0 ? '+' : ''}${Math.round(yoyPct)}% YoY`;
        yoyHtml = `${arrow}${diffText} (${yoyPctText})`;
      }

      const budgetStr = budget != null ? fmtVal(budget, isPct) : null;
      const achPct = budget != null && budget > 0 && actual >= 0 ? Math.round((actual / budget) * 100) : null;

      return {
        key,
        icon: meta.icon,
        iconBg: meta.iconBg,
        cardGradient: meta.cardGradient,
        accentColor: meta.accentColor,
        indicatorBg: meta.indicatorBg,
        label: meta.label,
        value: fmtVal(actual, isPct),
        budget: budgetStr,
        achStr,
        achPct,
        yoyHtml,
        yoyCls,
        isPct,
      };
    };

    return [
      buildCard('Revenue', rev, revBud, revPy),
      buildCard('Variable Cost', vc, vcBud, vcPy),
      buildCard('Gross Margin %', gpPct, gpPctBud, gpPctPy, true),
      buildCard('Total Opex', opex, opexBud, opexPy),
      buildCard('EBITDA Contribution', ebitdaContrib, ebitdaContribBud, ebitdaContribPy),
      buildCard('EBITDA', ebitda, ebitdaBud, ebitdaPy),
    ];
  }, [dashboardData, filters, getScopedMetric]);

  const buildStackedBarOption = (categories, dimensions, matrix) => {
    const sortedDimensions = sortDimensionsByContribution(dimensions, categories, matrix);

    const totals = categories.map((cat) => {
      let sum = 0;
      sortedDimensions.forEach((dim) => {
        sum += matrix[`${cat}||${dim}`] || 0;
      });
      return sum;
    });

    const series = sortedDimensions.map((dim, idx) => {
      const color = getDimColor(dim, idx);
      return {
        name: dim,
        type: 'bar',
        stack: 's1',
        barGap: '10%',
        emphasis: {
          focus: 'series',
        },
        itemStyle: {
          color: color,
          opacity: 0.9,
          borderWidth: 0,
          borderColor: 'transparent',
          borderRadius: 0,
        },
        data: categories.map((cat) => {
          const v = matrix[`${cat}||${dim}`];
          return v ? Math.round(v * 10) / 10 : 0;
        }),
      };
    });

    series.push({
      name: 'Total',
      type: 'bar',
      stack: 's1',
      tooltip: { show: false },
      data: categories.map(() => 0),
      label: {
        show: true,
        position: 'top',
        distance: 6,
        hideOverlap: false,
        overflow: 'none',
        formatter: (params) => {
          const tot = totals[params.dataIndex];
          return tot > 0 ? Math.round(tot).toLocaleString('en-IN') : '';
        },
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 10.5,
        fontFamily: 'Inter, sans-serif',
      },
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(15, 23, 42, 0.04)',
          },
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const title = params[0].axisValueLabel || params[0].axisValue || params[0].name || '';
          let total = 0;
          params.forEach((p) => {
            if (p.seriesName !== 'Total' && p.value != null && !isNaN(Number(p.value))) {
              total += Number(p.value);
            }
          });

          const hoveredSeries = window.__echartsHoveredSeries;

          let html = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-weight: 700; color: #0F172A; font-size: 12px;">${title}</span>
              <span style="font-weight: 700; color: #1E40AF; font-size: 11.5px; font-family: ui-monospace, monospace;">Total: ₹${Math.round(total).toLocaleString('en-IN')}</span>
            </div>`;

          html += `<div style="display: flex; flex-direction: column; gap: 3px;">`;
          params.forEach((p) => {
            if (p.value === null || p.value === undefined || p.seriesName === 'Total') return;
            const num = Number(p.value);
            if (num <= 0) return;
            const valStr = num.toFixed(1);
            const share = total > 0 ? ((num / total) * 100).toFixed(1) : '0.0';
            const isHovered = hoveredSeries && p.seriesName === hoveredSeries;

            if (isHovered) {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 4px 6px; margin: 0 -6px; border-radius: 0px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid ${p.color}; transition: all 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 0px; background-color: ${p.color}; box-shadow: 0 0 0 1.5px #fff, 0 0 0 2.5px ${p.color};"></span>
                    <span style="color: #1E40AF; font-weight: 700;">${p.seriesName}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #2563EB; font-size: 10px; font-weight: 700;">${share}%</span>
                    <span style="font-weight: 700; color: #0F172A; font-family: ui-monospace, monospace; font-size: 12px;">₹${valStr}</span>
                  </div>
                </div>`;
            } else {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 2px 6px; margin: 0 -6px; border-radius: 0px; border-left: 3px solid transparent; opacity: ${hoveredSeries ? '0.55' : '1'}; transition: opacity 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 0px; background-color: ${p.color};"></span>
                    <span style="color: #475569; font-weight: 500;">${p.seriesName}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #94A3B8; font-size: 10px;">${share}%</span>
                    <span style="font-weight: 600; color: #0F172A; font-family: ui-monospace, monospace;">₹${valStr}</span>
                  </div>
                </div>`;
            }
          });
          html += `</div>`;
          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 7,
        itemGap: 12,
        data: sortedDimensions,
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: {
        top: 34,
        left: 10,
        right: 14,
        bottom: categories.length > 6 ? 48 : 36,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
        axisLabel: {
          color: '#475569',
          fontSize: 10.5,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '500',
          interval: 0,
          hideOverlap: false,
          overflow: 'none',
          rotate: categories.length > 6 ? 25 : 0,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: (value) => (value.max > 0 ? Math.ceil(value.max * 1.15) : undefined),
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: '#64748B', fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
      },
      series,
    };
  };

  const buildLineOption = (categories, seriesList, isPercentage = true, showLabels = true) => {
    const sortedSeriesList = sortSeriesByContribution(seriesList);
    const series = sortedSeriesList.map((s, idx) => {
      const lineColor = getLineMetricColor(s.name, idx);
      const labelPos = getLineLabelPosition(s.name, idx);
      return {
        name: s.name,
        type: 'line',
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: {
          color: lineColor,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
        lineStyle: {
          width: 2.8,
          color: lineColor,
          shadowColor: 'rgba(15, 23, 42, 0.12)',
          shadowBlur: 4,
        },
        label: {
          show: showLabels,
          position: labelPos,
          distance: 5,
          color: lineColor,
          fontSize: 10,
          fontWeight: '700',
          fontFamily: 'Inter, sans-serif',
          hideOverlap: true,
          formatter: (params) => (params.value != null ? (isPercentage ? `${Number(params.value).toFixed(1)}%` : Math.round(params.value).toLocaleString('en-IN')) : ''),
        },
        data: s.data.map((v) => (v != null ? Math.round(v * 10) / 10 : null)),
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const title = params[0].axisValueLabel || params[0].axisValue || params[0].name || '';
          const hoveredSeries = window.__echartsHoveredSeries;

          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 12px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9;">${title}</div>`;
          html += `<div style="display: flex; flex-direction: column; gap: 3px;">`;
          params.forEach((p) => {
            if (p.value === null || p.value === undefined) return;
            const num = Number(p.value);
            const valStr = isPercentage ? `${num.toFixed(1)}%` : Math.round(num).toLocaleString('en-IN');
            const isHovered = hoveredSeries && p.seriesName === hoveredSeries;

            if (isHovered) {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 4px 6px; margin: 0 -6px; border-radius: 0px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid ${p.color}; transition: all 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 0px; background-color: ${p.color}; box-shadow: 0 0 0 1.5px #fff, 0 0 0 2.5px ${p.color};"></span>
                    <span style="color: #1E40AF; font-weight: 700;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 700; color: #0F172A; font-family: ui-monospace, monospace; font-size: 12px;">${valStr}</span>
                </div>`;
            } else {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 2px 6px; margin: 0 -6px; border-radius: 0px; border-left: 3px solid transparent; opacity: ${hoveredSeries ? '0.55' : '1'}; transition: opacity 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 0px; background-color: ${p.color};"></span>
                    <span style="color: #475569; font-weight: 500;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 600; color: #0F172A; font-family: ui-monospace, monospace;">${valStr}</span>
                </div>`;
            }
          });
          html += `</div>`;
          return html;
        },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        data: sortedSeriesList.map((s) => s.name),
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: {
        top: 40,
        left: 10,
        right: 14,
        bottom: categories.length > 6 ? 48 : 36,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
        axisLabel: {
          color: '#475569',
          fontSize: 10.5,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '500',
          interval: 0,
          hideOverlap: false,
          overflow: 'none',
          rotate: categories.length > 6 ? 25 : 0,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          formatter: (v) => (isPercentage ? `${v}%` : `${v}`),
        },
      },
      series,
    };
  };

  // Helper to normalize Business Group labels
  const cleanLabel = (text) => String(text || '').replace(/^\d+[\s._-]+/, '').trim();

  // Get authoritative Business Groups from business_mapping (strictly Segment_N, excluding Orgs and DCO)
  const getActiveBusinessGroups = () => {
    let bgs = [];
    const isExcluded = (s) => {
      const cl = cleanLabel(s).toUpperCase();
      const raw = String(s || '').toUpperCase();
      return cl === 'ORGS' || cl === 'ORG' || cl.includes('DCO') || raw.includes('ORG') || raw.includes('DCO');
    };

    if (filters.segment && filters.segment !== 'ALL' && !(Array.isArray(filters.segment) && (filters.segment.length === 0 || filters.segment.includes('ALL')))) {
      const selected = Array.isArray(filters.segment) ? filters.segment : [filters.segment];
      selected.forEach((s) => {
        if (!isExcluded(s)) {
          const cl = cleanLabel(s);
          if (cl && !bgs.includes(cl)) bgs.push(cl);
        }
      });
    } else {
      const bm = dashboardData?.meta?.business_mapping || [];
      const seen = new Set();
      bm.forEach((r) => {
        const rawSeg = (r.segment_n || r.Segment_N || '').trim();
        const cl = cleanLabel(rawSeg);
        if (cl && !isExcluded(rawSeg) && !seen.has(cl)) {
          seen.add(cl);
          bgs.push(cl);
        }
      });
      if (!bgs.length && dashboardData?.meta?.segments) {
        dashboardData.meta.segments.forEach((s) => {
          const rawSeg = String(s).trim();
          const cl = cleanLabel(rawSeg);
          if (cl && !isExcluded(rawSeg) && !seen.has(cl)) {
            seen.add(cl);
            bgs.push(cl);
          }
        });
      }
      bgs.sort();
    }
    return bgs;
  };

  // Helper to calculate a Business Group's metric by summing its member BUs from business mapping
  const getBgMetric = (metricName, targetFy, scenario, targetQ, bg, baseFilters = {}) => {
    // If BU is explicitly selected in topbar filter
    if (baseFilters.bu && baseFilters.bu !== 'ALL' && !(Array.isArray(baseFilters.bu) && (baseFilters.bu.length === 0 || baseFilters.bu.includes('ALL')))) {
      const buList = Array.isArray(baseFilters.bu) ? baseFilters.bu : [baseFilters.bu];
      const validBusForBg = (typeof getActiveBusinesses === 'function' ? getActiveBusinesses(bg) : []).map((b) => b.toLowerCase());
      const matching = buList.filter((b) => validBusForBg.includes(b.toLowerCase()));
      if (matching.length === 0) return 0;
      let sum = 0;
      matching.forEach((b) => {
        sum += getScopedMetric(metricName, targetFy, scenario, targetQ, { ...baseFilters, bu: b });
      });
      return sum;
    }

    // Get all valid BUs for this Business Group from business_mapping
    const validBus = typeof getActiveBusinesses === 'function' ? getActiveBusinesses(bg) : [];
    if (validBus.length > 0) {
      let sum = 0;
      validBus.forEach((b) => {
        sum += getScopedMetric(metricName, targetFy, scenario, targetQ, { ...baseFilters, bu: b });
      });
      return sum;
    }

    // Fallback directly to segment scoped metric
    return getScopedMetric(metricName, targetFy, scenario, targetQ, { ...baseFilters, segment: bg, bu: 'ALL' });
  };

  const revTrendOption = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const fy = filterCtx.financialYear;
    const q = filterCtx.effectiveQuarter;

    // Strictly Business Groups (from business_mapping, excluding Orgs)
    const bgs = getActiveBusinessGroups();

    const fys = dashboardData?.meta?.fys || [];
    const curIdx = fys.indexOf(fy);
    const priorFy = curIdx > 0 ? fys[curIdx - 1] : null;

    let periodDesc = '';
    if (filterCtx.isMonthly) {
      periodDesc = Array.isArray(filterCtx.effectiveMonth)
        ? filterCtx.effectiveMonth.map((m) => m.slice(0, 3)).join('+')
        : filterCtx.effectiveMonth.slice(0, 3);
    } else if (filterCtx.isQuarterly) {
      periodDesc = filterCtx.effectiveQuarter;
    }

    const actCat = periodDesc ? `${periodDesc} ${fy} A` : `${fy} A`;
    const budCat = periodDesc ? `${periodDesc} ${fy} B` : `${fy} B`;
    const pyCat = priorFy ? (periodDesc ? `${periodDesc} ${priorFy} A` : `${priorFy} A`) : null;

    const categories = pyCat ? [pyCat, budCat, actCat] : [budCat, actCat];
    const matrix = {};

    bgs.forEach((bg) => {
      const actVal = getBgMetric('Revenue', fy, 'ACT', q, bg, filters);
      const budVal = getBgMetric('Revenue', fy, 'BUD', q, bg, filters);
      if (actVal > 0) matrix[`${actCat}||${bg}`] = actVal;
      if (budVal > 0) matrix[`${budCat}||${bg}`] = budVal;
      if (pyCat) {
        const pyVal = getBgMetric('Revenue', priorFy, 'ACT', q, bg, filters);
        if (pyVal > 0) matrix[`${pyCat}||${bg}`] = pyVal;
      }
    });

    return buildStackedBarOption(categories, bgs, matrix);
  }, [filters, dashboardData, getScopedMetric, getActiveBusinesses]);

  const { rev12Option, rev12Count } = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const trailingQuarters = filterCtx.trailingQuarters || [];

    // Strictly Business Groups (from business_mapping, excluding Orgs)
    const bgs = getActiveBusinessGroups();

    const matrix = {};
    const validCategories = [];

    trailingQuarters.forEach((tq) => {
      let quarterTotal = 0;
      bgs.forEach((bg) => {
        const key = `${tq.label}||${bg}`;
        const val = getBgMetric('Revenue', tq.fy, 'ACT', tq.quarter, bg, { ...filters, month: 'ALL' });
        if (val !== null && val !== undefined && !isNaN(val) && val > 0) {
          matrix[key] = val;
          quarterTotal += val;
        }
      });
      if (quarterTotal > 0) {
        validCategories.push(tq.label);
      }
    });

    return {
      rev12Option: buildStackedBarOption(validCategories, bgs, matrix),
      rev12Count: validCategories.length || 8,
    };
  }, [dashboardData, filters, getScopedMetric, getActiveBusinesses]);

  const oiTrendOption = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const fy = filterCtx.financialYear;
    const q = filterCtx.effectiveQuarter;

    const bgs = getActiveBusinessGroups();

    const fys = dashboardData?.meta?.fys || [];
    const curIdx = fys.indexOf(fy);
    const priorFy = curIdx > 0 ? fys[curIdx - 1] : null;

    let periodDesc = '';
    if (filterCtx.isMonthly) {
      periodDesc = Array.isArray(filterCtx.effectiveMonth)
        ? filterCtx.effectiveMonth.map((m) => m.slice(0, 3)).join('+')
        : filterCtx.effectiveMonth.slice(0, 3);
    } else if (filterCtx.isQuarterly) {
      periodDesc = filterCtx.effectiveQuarter;
    }

    const actCat = periodDesc ? `${periodDesc} ${fy} A` : `${fy} A`;
    const budCat = periodDesc ? `${periodDesc} ${fy} B` : `${fy} B`;
    const pyCat = priorFy ? (periodDesc ? `${periodDesc} ${priorFy} A` : `${priorFy} A`) : null;

    const categories = pyCat ? [pyCat, budCat, actCat] : [budCat, actCat];
    const matrix = {};

    bgs.forEach((bg) => {
      const actVal = getBgMetric('Order Intake', fy, 'ACT', q, bg, filters);
      const budVal = getBgMetric('Order Intake', fy, 'BUD', q, bg, filters);
      if (actVal > 0) matrix[`${actCat}||${bg}`] = actVal;
      if (budVal > 0) matrix[`${budCat}||${bg}`] = budVal;
      if (pyCat) {
        const pyVal = getBgMetric('Order Intake', priorFy, 'ACT', q, bg, filters);
        if (pyVal > 0) matrix[`${pyCat}||${bg}`] = pyVal;
      }
    });

    return buildStackedBarOption(categories, bgs, matrix);
  }, [filters, dashboardData, getScopedMetric, getActiveBusinesses]);

  const { oi12Option, oi12Count } = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const trailingQuarters = filterCtx.trailingQuarters || [];

    const bgs = getActiveBusinessGroups();

    const matrix = {};
    const validCategories = [];

    trailingQuarters.forEach((tq) => {
      let quarterTotal = 0;
      bgs.forEach((bg) => {
        const key = `${tq.label}||${bg}`;
        const val = getBgMetric('Order Intake', tq.fy, 'ACT', tq.quarter, bg, { ...filters, month: 'ALL' });
        if (val !== null && val !== undefined && !isNaN(val) && val > 0) {
          matrix[key] = val;
          quarterTotal += val;
        }
      });
      if (quarterTotal > 0) {
        validCategories.push(tq.label);
      }
    });

    return {
      oi12Option: buildStackedBarOption(validCategories, bgs, matrix),
      oi12Count: validCategories.length || 8,
    };
  }, [dashboardData, filters, getScopedMetric, getActiveBusinesses]);


  const bizWiseRevHorizontalOption = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const fy = filterCtx.financialYear;
    const q = filterCtx.effectiveQuarter;
    const bgs = getActiveBusinessGroups();

    let grandTotal = 0;
    const groupData = [];
    const allBuNames = new Set();
    const buColorMap = {};

    bgs.forEach((bg, gIdx) => {
      const groupColor = getDimColor(bg, gIdx);
      const childBus = typeof getActiveBusinesses === 'function' ? getActiveBusinesses(bg) : [];
      const validChildItems = [];
      const buValues = {};
      let groupTotal = 0;

      childBus.forEach((buName) => {
        if (filters.bu && filters.bu !== 'ALL' && !(Array.isArray(filters.bu) && (filters.bu.length === 0 || filters.bu.includes('ALL')))) {
          const buList = Array.isArray(filters.bu) ? filters.bu : [filters.bu];
          if (!buList.map((b) => b.toLowerCase()).includes(buName.toLowerCase())) return;
        }

        const buVal = getScopedMetric('Revenue', fy, 'ACT', q, { ...filters, bu: buName });
        if (buVal && buVal > 0) {
          const v = Math.round(buVal * 10) / 10;
          buValues[buName] = v;
          groupTotal += v;
          validChildItems.push({ name: buName, value: v });
          allBuNames.add(buName);
        }
      });

      validChildItems.sort((a, b) => b.value - a.value);
      const childTints = getLighterTints(groupColor, validChildItems.length);
      validChildItems.forEach((item, idx) => {
        buColorMap[item.name] = childTints[idx];
      });

      if (groupTotal === 0) {
        const bgVal = getBgMetric('Revenue', fy, 'ACT', q, bg, filters);
        if (bgVal > 0) {
          buValues[bg] = Math.round(bgVal * 10) / 10;
          groupTotal = bgVal;
          allBuNames.add(bg);
          buColorMap[bg] = getLighterTints(groupColor, 1)[0];
        }
      }

      if (groupTotal > 0) {
        grandTotal += groupTotal;
        groupData.push({
          group: bg,
          groupColor,
          groupTotal: Math.round(groupTotal * 10) / 10,
          buValues,
        });
      }
    });

    groupData.sort((a, b) => a.groupTotal - b.groupTotal);
    const categories = groupData.map((g) => g.group);
    const buList = Array.from(allBuNames);

    const series = buList.map((buName) => {
      const buColor = buColorMap[buName] || getCategoryColor(buName);
      return {
        name: buName,
        type: 'bar',
        stack: 'total',
        barWidth: 24,
        itemStyle: {
          color: buColor,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
        },
        emphasis: {
          focus: 'series',
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params) => {
            const val = Number(params.value || 0);
            if (val <= 0 || grandTotal <= 0) return '';
            const share = ((val / grandTotal) * 100).toFixed(0);
            return Number(share) >= 4 ? `${share}%` : '';
          },
          fontSize: 9.5,
          fontFamily: 'Inter, sans-serif',
          color: '#0F172A',
          fontWeight: '700',
        },
        data: groupData.map((g) => ({
          value: g.buValues[buName] || 0,
          itemStyle: {
            color: buColor,
            borderColor: '#FFFFFF',
            borderWidth: 1.5,
          },
        })),
      };
    });

    series.push({
      name: 'Total',
      type: 'bar',
      stack: 'total',
      barWidth: 24,
      itemStyle: { color: 'transparent' },
      tooltip: { show: false },
      data: groupData.map(() => 0),
      label: {
        show: true,
        position: 'right',
        distance: 8,
        formatter: (params) => {
          const g = groupData[params.dataIndex];
          if (!g || !g.groupTotal) return '';
          const pct = grandTotal > 0 ? ((g.groupTotal / grandTotal) * 100).toFixed(1) : '0.0';
          return `₹${Math.round(g.groupTotal).toLocaleString('en-IN')} MN (${pct}%)`;
        },
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 11,
        fontFamily: 'Inter, ui-monospace, sans-serif',
      },
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const groupName = params[0].axisValueLabel || params[0].axisValue || '';
          let totalGroupRev = 0;
          params.forEach((p) => {
            if (p.seriesName !== 'Total' && p.value != null && !isNaN(Number(p.value))) {
              totalGroupRev += Number(p.value);
            }
          });

          const groupShare = grandTotal > 0 ? ((totalGroupRev / grandTotal) * 100).toFixed(1) : '0.0';
          let html = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-weight: 700; color: #0F172A; font-size: 12.5px;">${groupName}</span>
              <span style="font-weight: 700; color: #1E40AF; font-size: 11.5px; font-family: ui-monospace, monospace;">Total: ₹${Math.round(totalGroupRev).toLocaleString('en-IN')} MN (${groupShare}%)</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">`;

          params.forEach((p) => {
            if (p.seriesName === 'Total' || !p.value || Number(p.value) <= 0) return;
            const buVal = Number(p.value);
            const buGroupPct = totalGroupRev > 0 ? ((buVal / totalGroupRev) * 100).toFixed(1) : '0.0';
            const buTotalPct = grandTotal > 0 ? ((buVal / grandTotal) * 100).toFixed(1) : '0.0';
            const swatchColor = buColorMap[p.seriesName] || p.color;

            html += `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 2px 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background-color: ${swatchColor}; border: 1px solid rgba(0,0,0,0.1);"></span>
                  <span style="color: #334155; font-weight: 600;">${p.seriesName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-family: ui-monospace, monospace;">
                  <span style="color: #64748B; font-size: 10.5px;">${buGroupPct}% of grp · ${buTotalPct}% total</span>
                  <span style="font-weight: 700; color: #0F172A;">₹${Math.round(buVal).toLocaleString('en-IN')} MN</span>
                </div>
              </div>`;
          });

          html += `</div>`;
          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 8,
        itemGap: 12,
        data: buList,
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: {
        top: 24,
        left: 10,
        right: 145,
        bottom: 34,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          formatter: (v) => `₹${v.toLocaleString('en-IN')}`,
        },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
        axisLabel: {
          color: '#0F172A',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '700',
        },
      },
      series,
    };
  }, [filters, dashboardData, getScopedMetric, getActiveBusinesses]);

  const { costTrendOption, costTrendCount } = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const trailingQuarters = filterCtx.trailingQuarters || [];
    const bgs = getActiveBusinessGroups();

    const categories = [];
    const fixedData = [];
    const varData = [];

    trailingQuarters.forEach((tq) => {
      let fixed = 0;
      let variable = 0;

      bgs.forEach((bg) => {
        fixed += getBgMetric('Fixed Costs', tq.fy, 'ACT', tq.quarter, bg, { ...filters, month: 'ALL' }) || 0;
        variable += getBgMetric('Variable Cost', tq.fy, 'ACT', tq.quarter, bg, { ...filters, month: 'ALL' }) || 0;
      });

      if (fixed === 0) {
        fixed = getScopedMetric('Fixed Costs', tq.fy, 'ACT', tq.quarter) ||
          getScopedMetric('Fixed Cost', tq.fy, 'ACT', tq.quarter) ||
          (
            (getScopedMetric('Premises', tq.fy, 'ACT', tq.quarter) || 0) +
            (getScopedMetric('Travel', tq.fy, 'ACT', tq.quarter) || 0) +
            (getScopedMetric('Telecom', tq.fy, 'ACT', tq.quarter) || 0) +
            (getScopedMetric('Legal & Professional', tq.fy, 'ACT', tq.quarter) || 0) +
            (getScopedMetric('Administration', tq.fy, 'ACT', tq.quarter) || 0)
          );
      }
      if (variable === 0) {
        variable = getScopedMetric('Variable Cost', tq.fy, 'ACT', tq.quarter) || 0;
      }

      if (fixed > 0 || variable > 0) {
        categories.push(tq.label);
        fixedData.push(Math.round(fixed * 10) / 10);
        varData.push(Math.round(variable * 10) / 10);
      }
    });

    const minData = categories.map((_, i) => Math.min(fixedData[i] || 0, varData[i] || 0));
    const diffData = categories.map((_, i) => Math.max(0, Math.round(Math.abs((fixedData[i] || 0) - (varData[i] || 0)) * 10) / 10));

    return {
      costTrendCount: categories.length || 8,
      costTrendOption: {
        preserveSeriesOrder: true,
        backgroundColor: 'transparent',
        tooltip: {
          appendTo: 'body',
          appendToBody: true,
          trigger: 'axis',
          axisPointer: {
            type: 'line',
            lineStyle: { color: '#CBD5E1', type: 'dashed' },
          },
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          padding: [10, 14],
          extraCssText: 'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1); border-radius: 0px; z-index: 9999999; pointer-events: none;',
          textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Inter, sans-serif' },
          formatter: (params) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            const title = params[0].axisValueLabel || params[0].axisValue || '';
            const idx = params[0].dataIndex;
            const fixedVal = fixedData[idx] || 0;
            const varVal = varData[idx] || 0;
            const totalCost = fixedVal + varVal;
            const gap = Math.abs(fixedVal - varVal);
            const fixedPct = totalCost > 0 ? ((fixedVal / totalCost) * 100).toFixed(1) : '0.0';
            const varPct = totalCost > 0 ? ((varVal / totalCost) * 100).toFixed(1) : '0.0';

            return `
              <div style="font-weight: 700; color: #0F172A; font-size: 12px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; gap: 16px;">
                <span>${title}</span>
                <span style="color: #0F172A; font-family: ui-monospace, monospace;">Total Cost: ₹${Math.round(totalCost).toLocaleString('en-IN')} MN</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11.5px;">
                <div style="display: flex; justify-content: space-between; gap: 16px; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                    <span style="color: #475569; font-weight: 500;">Variable Cost:</span>
                  </span>
                  <span style="font-weight: 700; color: #D97706; font-family: ui-monospace, monospace;">₹${Math.round(varVal).toLocaleString('en-IN')} MN (${varPct}%)</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8; display: inline-block;"></span>
                    <span style="color: #475569; font-weight: 500;">Fixed Costs:</span>
                  </span>
                  <span style="font-weight: 700; color: #64748B; font-family: ui-monospace, monospace;">₹${Math.round(fixedVal).toLocaleString('en-IN')} MN (${fixedPct}%)</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #E2E8F0; font-size: 10.5px;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 2px; background: #BFDBFE; display: inline-block;"></span>
                    <span style="color: #3B82F6;">Cost Mix Gap:</span>
                  </span>
                  <span style="font-weight: 600; color: #2563EB; font-family: ui-monospace, monospace;">₹${Math.round(gap).toLocaleString('en-IN')} MN</span>
                </div>
              </div>
            `;
          },
        },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 20,
          data: [
            { name: 'Fixed Costs', itemStyle: { color: '#94A3B8' } },
            { name: 'Variable Cost', itemStyle: { color: '#F59E0B' } },
          ],
          textStyle: { color: '#64748B', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
        },
        grid: {
          top: 36,
          left: 10,
          right: 20,
          bottom: categories.length > 6 ? 48 : 36,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: categories,
          axisLine: { lineStyle: { color: '#CBD5E1' } },
          axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
          axisLabel: {
            color: '#475569',
            fontSize: 10.5,
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            interval: 0,
            rotate: categories.length > 6 ? 25 : 0,
          },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: {
            color: '#64748B',
            fontSize: 10,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            formatter: (v) => `₹${v.toLocaleString('en-IN')}`,
          },
        },
        series: [
          // 1. Transparent baseline up to min(fixed, variable)
          {
            type: 'line',
            stack: 'cost_mix_gap',
            smooth: 0.35,
            symbol: 'none',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { opacity: 0 },
            silent: true,
            tooltip: { show: false },
            data: minData,
          },
          // 2. Light Blue shaded gap fill from min up to max
          {
            type: 'line',
            stack: 'cost_mix_gap',
            smooth: 0.35,
            symbol: 'none',
            lineStyle: { opacity: 0, width: 0 },
            itemStyle: { opacity: 0 },
            areaStyle: {
              color: 'rgba(2, 132, 199, 0.14)', // soft sky blue tint
            },
            silent: true,
            tooltip: { show: false },
            data: diffData,
          },
          // 3. Fixed Cost Line (Vibrant Royal Indigo)
          {
            name: 'Fixed Costs',
            type: 'line',
            smooth: 0.35,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 3.2, color: '#6366F1' },
            itemStyle: { color: '#6366F1', borderColor: '#FFFFFF', borderWidth: 1.5 },
            emphasis: { focus: 'series' },
            data: fixedData,
          },
          // 4. Variable Cost Line (Vibrant Tangerine Orange)
          {
            name: 'Variable Cost',
            type: 'line',
            smooth: 0.35,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 3.2, color: '#EA580C' },
            itemStyle: { color: '#EA580C', borderColor: '#FFFFFF', borderWidth: 1.5 },
            emphasis: { focus: 'series' },
            data: varData,
          },
        ],
      },
    };
  }, [dashboardData, filters, getScopedMetric, getActiveBusinesses]);

  const fyRatioData = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const DATA = dashboardData;
    const allFys = DATA?.meta?.fys || [];
    const q = filterCtx.effectiveQuarter;
    const fys = allFys.filter((fy) => {
      const actNode = DATA?.company?.[fy]?.['ACT'] || DATA?.bu?.[Object.keys(DATA.bu || {})[0]]?.[fy]?.['ACT'];
      return actNode && Object.keys(actNode).length > 0;
    });

    const calcMetricPct = (metric) => {
      return fys.map((fy) => {
        const rev = getScopedMetric('Revenue', fy, 'ACT', q);
        if (!rev || rev <= 0) return null;
        if (metric === 'Gross Profit' || metric === 'Gross Margin %') {
          return getScopedMetric('Gross Margin %', fy, 'ACT', q);
        }
        if (metric === 'EBITDA Contribution' || metric === 'EBITDA Contribution %') {
          return getScopedMetric('EBITDA Contribution %', fy, 'ACT', q);
        }
        if (metric === 'EBITDA' || metric === 'EBITDA %') {
          return getScopedMetric('EBITDA %', fy, 'ACT', q);
        }
        if (metric === 'Variable Cost' || metric === 'VC%') {
          return getScopedMetric('VC%', fy, 'ACT', q);
        }
        const met = getScopedMetric(metric, fy, 'ACT', q);
        return (met / rev) * 100;
      });
    };

    return {
      fys,
      gp: calcMetricPct('Gross Margin %'),
      ebitdaContrib: calcMetricPct('EBITDA Contribution %'),
      ebitda: calcMetricPct('EBITDA %'),
      people: calcMetricPct('People Cost'),
      variable: calcMetricPct('VC%'),
      marketing: calcMetricPct('Marketing Expenses'),
      fixed: calcMetricPct('Fixed Costs'),
    };
  }, [dashboardData, filters, getScopedMetric]);

  const quarterRatioData = useMemo(() => {
    const filterCtx = getEffectiveFilterContext(filters, dashboardData);
    const validQuarters = (filterCtx.trailingQuarters || []).filter((item) => {
      const rev = getScopedMetric('Revenue', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
      return rev && rev > 0;
    });

    const calcQuarterPct = (metric) => {
      return validQuarters.map((item) => {
        const rev = getScopedMetric('Revenue', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        if (!rev || rev <= 0) return null;
        if (metric === 'Gross Profit' || metric === 'Gross Margin %') {
          return getScopedMetric('Gross Margin %', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        }
        if (metric === 'EBITDA Contribution' || metric === 'EBITDA Contribution %') {
          return getScopedMetric('EBITDA Contribution %', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        }
        if (metric === 'EBITDA' || metric === 'EBITDA %') {
          return getScopedMetric('EBITDA %', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        }
        if (metric === 'Variable Cost' || metric === 'VC%') {
          return getScopedMetric('VC%', item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        }
        const met = getScopedMetric(metric, item.fy, 'ACT', item.quarter, { bu: filters.bu, segment: filters.segment, month: 'ALL' });
        return (met / rev) * 100;
      });
    };

    return {
      labels: validQuarters.map((q) => q.label),
      gp: calcQuarterPct('Gross Margin %'),
      ebitdaContrib: calcQuarterPct('EBITDA Contribution %'),
      ebitda: calcQuarterPct('EBITDA %'),
      people: calcQuarterPct('People Cost'),
      variable: calcQuarterPct('VC%'),
      marketing: calcQuarterPct('Marketing Expenses'),
      fixed: calcQuarterPct('Fixed Costs'),
    };
  }, [dashboardData, filters, getScopedMetric]);

  const kpiQuartersCount = quarterRatioData.labels?.length || 8;

  return (
    <div className="space-y-4">
      {/* Top Banner similar to reference design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102A54] via-[#1E56A0] to-[#102A54] p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              Performance Analytics & Summary
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              {periodLabels.scopeDescription}
            </span>
          </div>
          <span className="text-xs text-blue-100/90 font-medium mt-1">
            Revenue Trajectory · Order Intake Momentum · P&L Ratio Decomposition · Multi-Quarter Analysis
          </span>
        </div>
      </div>

      {/* Top 6 KPI Metric Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {cardMetrics.map((card) => {
          return (
            <article
              key={card.key}
              className={`group relative overflow-hidden rounded-2xl border ${card.cardGradient} ${card.borderAccent || 'border-l-[6px] border-l-[#0284C7]'} p-4 transition-all duration-200 flex flex-col justify-between min-h-[124px]`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                    {card.label}
                  </div>
                  {card.achPct !== null && (
                    <span className={`font-bold font-mono text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 ${card.achPct >= 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : card.achPct >= 85 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                      {card.achPct}%
                    </span>
                  )}
                </div>

                {isUpdating ? (
                  <div className="py-1">
                    <Shimmer className="h-7 w-24 rounded-md" />
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
                    <span className="text-2xl font-bold font-mono tracking-tight text-slate-950">
                      {card.value}
                    </span>
                    {!card.isPct && (
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-600 border-slate-200">
                        MN
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-100 flex flex-col gap-1 text-xs">
                {isUpdating ? (
                  <>
                    <Shimmer className="h-4 w-28 rounded-md" />
                    <Shimmer className="h-3 w-20 rounded-md mt-0.5" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-semibold inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md ${card.yoyCls === 'is-pos'
                        ? 'bg-emerald-100/80 text-emerald-700'
                        : card.yoyCls === 'is-neg'
                          ? 'bg-rose-100/80 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                        {card.yoyCls === 'is-pos' ? (
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                        ) : card.yoyCls === 'is-neg' ? (
                          <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {card.yoyHtml.replace(/^[▲▼]\s*/, '')}
                      </span>
                    </div>

                    {card.budget && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Budget: <b className="font-mono text-slate-700 font-semibold">{card.budget}</b></span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Chart Grid Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Revenue Trend"
            subtitle={`By business group · ${scopeTimeframe}`}
            exportFilename={`Revenue_Trend_${fileTimeframe}`}
            option={revTrendOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle={`Revenue - ${rev12Count} Quarters Trend`}
            subtitle={`Trailing ${rev12Count} quarters through ${currentFy}`}
            exportFilename={`Revenue_${rev12Count}_Quarters_Trend_${currentFy}`}
            option={rev12Option}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Biz-Wise Revenue Contribution"
            subtitle={`Horizontal stacked distribution by business group · ${scopeTimeframe}`}
            exportFilename={`Biz_Wise_Revenue_Contribution_Stacked_Bar_${fileTimeframe}`}
            option={bizWiseRevHorizontalOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle={`Fixed & Variable Cost Trend`}
            subtitle={`Trailing ${costTrendCount} quarters cost volume mix through ${currentFy}`}
            exportFilename={`Fixed_Variable_Cost_Trend_${currentFy}`}
            option={costTrendOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Order Intake Trend"
            subtitle={`By business · ${scopeTimeframe}`}
            exportFilename={`Order_Intake_Trend_${fileTimeframe}`}
            option={oiTrendOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle={`Order Intake - ${oi12Count} Quarters Trend`}
            subtitle={`Trailing ${oi12Count} quarters through ${currentFy}`}
            exportFilename={`Order_Intake_${oi12Count}_Quarters_Trend_${currentFy}`}
            option={oi12Option}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Financial KPI's"
            subtitle={`Margin ratios across financial years (${currentQ === 'Total' ? 'Full Year' : currentQ})`}
            exportFilename={`Financial_KPIs_FY_Comparison_${fileTimeframe}`}
            option={buildLineOption(
              fyRatioData.fys,
              [
                { name: 'GP %', data: fyRatioData.gp },
                { name: 'EBITDA Contribution %', data: fyRatioData.ebitdaContrib },
                { name: 'EBITDA %', data: fyRatioData.ebitda },
              ],
              true,
              true
            )}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle={`Financial KPI's ${kpiQuartersCount} Quarters Trend`}
            subtitle={`Trailing ${kpiQuartersCount} quarters through ${currentFy}`}
            exportFilename={`Financial_KPIs_${kpiQuartersCount}_Quarters_Trend_${currentFy}`}
            option={buildLineOption(
              quarterRatioData.labels,
              [
                { name: 'GP %', data: quarterRatioData.gp },
                { name: 'EBITDA Contribution %', data: quarterRatioData.ebitdaContrib },
                { name: 'EBITDA %', data: quarterRatioData.ebitda },
              ],
              true,
              true
            )}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Cost % of Revenue"
            subtitle={`Cost ratios across financial years (${currentQ === 'Total' ? 'Full Year' : currentQ})`}
            exportFilename={`Cost_Pct_Revenue_FY_Comparison_${fileTimeframe}`}
            option={buildLineOption(
              fyRatioData.fys,
              [
                { name: 'Variable Cost', data: fyRatioData.variable },
                { name: 'People Cost', data: fyRatioData.people },
                { name: 'Marketing Expenses', data: fyRatioData.marketing },
                { name: 'Fixed Costs', data: fyRatioData.fixed },
              ],
              true,
              true
            )}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle={`Cost % of Revenue ${kpiQuartersCount} Quarters Trend`}
            subtitle={`Trailing ${kpiQuartersCount} quarters through ${currentFy}`}
            exportFilename={`Cost_Pct_Revenue_${kpiQuartersCount}_Quarters_Trend_${currentFy}`}
            option={buildLineOption(
              quarterRatioData.labels,
              [
                { name: 'Variable Cost', data: quarterRatioData.variable },
                { name: 'People Cost', data: quarterRatioData.people },
                { name: 'Marketing Expenses', data: quarterRatioData.marketing },
                { name: 'Fixed Costs', data: quarterRatioData.fixed },
              ],
              true,
              true
            )}
            height="320px"
          />
        </div>
      </div>
    </div>
  );
}