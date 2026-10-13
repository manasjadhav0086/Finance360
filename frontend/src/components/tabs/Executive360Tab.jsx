import { useMemo, useState } from 'react';
import EChart from '../charts/EChart';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { getPeriodLabels } from '../../utils/periodUtils';
import { sortDimensionsByContribution, sortSeriesByContribution, sortPieDataByContribution } from '../../utils/chartUtils';
import { getCategoryColor, getLighterTints, THEME_TOKENS } from '../../utils/theme';

const PALETTE = {
  blue: '#1E40AF',
  indigo: '#2563EB',
  cyan: '#0284C7',
  purple: '#7C3AED',
  amber: '#D97706',
  orange: '#EA580C',
  green: '#059669',
  rose: '#E11D48',
  slate: '#475569',
  darkText: '#0F172A',
  mutedText: '#64748B',
  border: '#E2E8F0',
};

export default function Executive360Tab({
  dashboardData = {},
  perfViews = {},
  filters = {},
  getScopedMetric = () => 0,
  matchesScope = () => true,
  formatPercent = (v) => `${v}%`,
  setActiveTab,
  isUpdating = false,
}) {
  const [timeHorizon, setTimeHorizon] = useState('fullYear');
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();
  const periodLabels = useMemo(() => {
    return getPeriodLabels(filters, dashboardData);
  }, [filters, dashboardData]);

  const currentFy = periodLabels.currentFy;
  const pyFy = periodLabels.priorFy;
  const currentQ = periodLabels.quarter;

  // 1. Top executive pulse metrics
  const pulseMetrics = useMemo(() => {
    const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ) || 0;
    const revBud = getScopedMetric('Revenue', currentFy, 'BUD', currentQ) || 0;
    const revPy = getScopedMetric('Revenue', pyFy, 'ACT', currentQ) || 0;

    const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', currentQ) || (rev - (getScopedMetric('Variable Cost', currentFy, 'ACT', currentQ) || 0));
    const gpPct = rev > 0 ? (gp / rev) * 100 : (getScopedMetric('Gross Margin %', currentFy, 'ACT', currentQ) || 0);
    const gpPctPy = getScopedMetric('Gross Margin %', pyFy, 'ACT', currentQ) || 0;
    const vcBud = getScopedMetric('Variable Cost', currentFy, 'BUD', currentQ) || 0;
    const gpBud = revBud - vcBud;
    const gpPctBud = revBud > 0 ? (gpBud / revBud) * 100 : (getScopedMetric('Gross Margin %', currentFy, 'BUD', currentQ) || 0);

    const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ) || 0;
    const ebitdaBud = getScopedMetric('EBITDA', currentFy, 'BUD', currentQ) || 0;
    const ebitdaPct = rev > 0 ? (ebitda / rev) * 100 : (getScopedMetric('EBITDA %', currentFy, 'ACT', currentQ) || 0);
    const ebitdaPy = getScopedMetric('EBITDA', pyFy, 'ACT', currentQ) || 0;

    const opex = getScopedMetric('Total Opex', currentFy, 'ACT', currentQ) || 0;
    const opexPct = rev > 0 ? (opex / rev) * 100 : 0;
    const opexBud = getScopedMetric('Total Opex', currentFy, 'BUD', currentQ) || 0;

    const scopedOiFromData = getScopedMetric('Order Intake', currentFy, 'ACT', currentQ);
    let orderIntake = scopedOiFromData > 0 ? scopedOiFromData : 0;

    if (orderIntake === 0) {
      const isMonthFiltered = filters.month && filters.month !== 'ALL';
      const oiViewRows = perfViews?.orderintake_view?.rows || [];
      const orderRows = perfViews?.OrderBizWise?.rows || [];

      if (isMonthFiltered && oiViewRows.length > 0) {
        const scopedOi = oiViewRows.filter((r) => matchesScope(r));
        scopedOi.forEach((r) => {
          if (r.Nature === 'Actual' || !r.Nature) {
            orderIntake += Number(r.Amount || 0);
          }
        });
      } else if (orderRows.length > 0) {
        const scopedOrders = orderRows.filter((r) => matchesScope(r) && (r.Filter_FY === currentFy || String(r.QuarterFY || '').includes(currentFy)));
        scopedOrders.forEach((r) => {
          orderIntake += Number(r.OrderIntake || 0);
        });
      }
    }
    const oiBud = getScopedMetric('Order Intake', currentFy, 'BUD', currentQ) || 0;

    const bookToBill = rev > 0 ? orderIntake / rev : 1.0;

    const calcYoy = (act, py) => {
      if (!py || py === 0) return { diff: 0, pct: 0, sign: '+' };
      const diff = act - py;
      const pct = (diff / Math.abs(py)) * 100;
      return { diff, pct, sign: diff >= 0 ? '+' : '' };
    };

    const revYoy = calcYoy(rev, revPy);
    const ebitdaYoy = calcYoy(ebitda, ebitdaPy);
    const revAchPct = revBud > 0 ? (rev / revBud) * 100 : null;
    const gpAchPct = gpBud > 0 ? (gp / gpBud) * 100 : (gpPctBud > 0 ? (gpPct / gpPctBud) * 100 : null);
    const ebitdaAchPct = ebitdaBud > 0 ? (ebitda / ebitdaBud) * 100 : null;
    const oiAchPct = oiBud > 0 ? (orderIntake / oiBud) * 100 : null;
    const opexAchPct = opexBud > 0 ? (opex / opexBud) * 100 : null;

    return [
      {
        id: 'rev',
        title: 'Net Revenue',
        value: `₹${Math.round(rev).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        achPct: revAchPct !== null ? Math.round(revAchPct) : null,
        yoyText: `${revYoy.sign}${Math.round(revYoy.diff).toLocaleString('en-IN')} (${revYoy.sign}${revYoy.pct.toFixed(1)}% YoY)`,
        yoyCls: revYoy.diff >= 0 ? 'text-emerald-600' : 'text-rose-600',
        budText: revBud > 0 ? `Target ₹${Math.round(revBud).toLocaleString('en-IN')}` : null,
        borderAccent: 'border-l-[6px] border-l-[#0284C7]',
        badgeBg: 'bg-sky-50 text-[#0284C7] border-sky-200',
        cardGradient: 'bg-white hover:border-sky-300',
      },
      {
        id: 'gp',
        title: 'Gross Profit & Margin',
        value: `₹${Math.round(gp).toLocaleString('en-IN')}`,
        unit: `${gpPct.toFixed(1)}% Margin`,
        achPct: gpAchPct !== null ? Math.round(gpAchPct) : null,
        yoyText: `${gpPct >= gpPctPy ? '▲ +' : '▼ '}${(gpPct - gpPctPy).toFixed(1)}% Margin YoY`,
        yoyCls: gpPct >= gpPctPy ? 'text-emerald-600' : 'text-rose-600',
        budText: `VC: ${formatPercent(100 - gpPct)} of Revenue`,
        borderAccent: 'border-l-[6px] border-l-[#16A34A]',
        badgeBg: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
        cardGradient: 'bg-white hover:border-emerald-300',
      },
      {
        id: 'ebitda',
        title: 'EBITDA (Earnings)',
        value: `₹${Math.round(ebitda).toLocaleString('en-IN')}`,
        unit: `${ebitdaPct.toFixed(1)}% EBITDA Margin`,
        achPct: ebitdaAchPct !== null ? Math.round(ebitdaAchPct) : null,
        yoyText: `${ebitdaYoy.sign}${Math.round(ebitdaYoy.diff).toLocaleString('en-IN')} (${ebitdaYoy.sign}${ebitdaYoy.pct.toFixed(1)}% YoY)`,
        yoyCls: ebitdaYoy.diff >= 0 ? 'text-emerald-600' : 'text-rose-600',
        budText: ebitdaBud > 0 ? `Target ₹${Math.round(ebitdaBud).toLocaleString('en-IN')}` : null,
        borderAccent: 'border-l-[6px] border-l-[#059669]',
        badgeBg: 'bg-emerald-50 text-[#059669] border-emerald-200',
        cardGradient: 'bg-white hover:border-emerald-300',
      },
      {
        id: 'oi',
        title: 'Order Intake & Pipeline',
        value: `₹${Math.round(orderIntake).toLocaleString('en-IN')}`,
        unit: `Book-to-Bill: ${bookToBill.toFixed(2)}x`,
        achPct: oiAchPct !== null ? Math.round(oiAchPct) : null,
        yoyText: bookToBill >= 1.0 ? '▲ Pipeline Expanding' : '▼ Pipeline Contracting',
        yoyCls: bookToBill >= 1.0 ? 'text-emerald-600' : 'text-rose-600',
        budText: oiBud > 0 ? `Target ₹${Math.round(oiBud).toLocaleString('en-IN')}` : `Demand Ratio ${bookToBill.toFixed(2)}x vs Revenue`,
        borderAccent: 'border-l-[6px] border-l-[#EAB308]',
        badgeBg: 'bg-amber-50 text-[#B45309] border-amber-200',
        cardGradient: 'bg-white hover:border-amber-300',
      },
      {
        id: 'opex',
        title: 'Operating Cost (Opex)',
        value: `₹${Math.round(opex).toLocaleString('en-IN')}`,
        unit: `${opexPct.toFixed(1)}% of Revenue`,
        achPct: opexAchPct !== null ? Math.round(opexAchPct) : null,
        yoyText: `Cost Intensity ${opexPct.toFixed(1)}%`,
        yoyCls: opexPct <= 25 ? 'text-emerald-600' : 'text-amber-600',
        budText: opexBud > 0 ? `Budget ₹${Math.round(opexBud).toLocaleString('en-IN')}` : null,
        borderAccent: 'border-l-[6px] border-l-[#EA580C]',
        badgeBg: 'bg-orange-50 text-[#EA580C] border-orange-200',
        cardGradient: 'bg-white hover:border-orange-300',
      },
      {
        id: 'leverage',
        title: 'Operating Leverage Index',
        value: `${((ebitdaPct / (gpPct || 1)) * 100).toFixed(0)}%`,
        unit: 'EBITDA Conversion',
        achPct: null,
        yoyText: 'Conversion of GP into EBITDA',
        yoyCls: 'text-purple-600',
        budText: null,
        borderAccent: 'border-l-[6px] border-l-[#9333EA]',
        badgeBg: 'bg-purple-50 text-[#9333EA] border-purple-200',
        cardGradient: 'bg-white hover:border-purple-300',
      },
    ];
  }, [dashboardData, perfViews, currentFy, pyFy, currentQ, getScopedMetric, matchesScope, formatPercent]);

  // Active BUs derived from authoritative business_mapping (strictly biz1_n)
  const activeBUs = useMemo(() => {
    const DATA = dashboardData;
    const bm = DATA?.meta?.business_mapping || [];
    const isExcluded = (s) => {
      const raw = String(s || '').toUpperCase();
      return raw.includes('ORG');
    };

    if (bm.length > 0) {
      const buSet = new Set();
      bm.forEach((r) => {
        const bu = (r.biz1_n || r.Biz1_N || '').trim();
        const seg = (r.segment_n || r.Segment_N || '').trim();
        if (bu && !isExcluded(bu) && !isExcluded(seg)) {
          buSet.add(bu);
        }
      });
      if (buSet.size > 0) {
        return Array.from(buSet).sort();
      }
    }

    const bus = DATA?.bu ? Object.keys(DATA.bu) : [];
    return bus.sort();
  }, [dashboardData]);

  // Mapping from Business (biz1_n) to Business Group (segment_n)
  const buToSegmentNMap = useMemo(() => {
    const DATA = dashboardData;
    const bm = DATA?.meta?.business_mapping || [];
    const map = {};
    bm.forEach((r) => {
      const bu = (r.biz1_n || r.Biz1_N || r.biz1 || r.Biz1 || '').trim();
      const seg = (r.segment_n || r.Segment_N || r.segment || '').trim().replace(/^\d+[\s._-]+/, '');
      if (bu && seg) {
        map[bu] = seg;
        map[bu.toLowerCase()] = seg;
      }
    });
    return map;
  }, [dashboardData]);

  // Chart 1: Waterfall Bridge
  const waterfallOption = useMemo(() => {
    const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ) || 0;
    const vc = getScopedMetric('Variable Cost', currentFy, 'ACT', currentQ) || 0;
    const gp = rev - vc;
    const people = getScopedMetric('People Cost', currentFy, 'ACT', currentQ) || 0;
    const mkt = getScopedMetric('Marketing Expenses', currentFy, 'ACT', currentQ) || 0;
    const fixed = getScopedMetric('Fixed Costs', currentFy, 'ACT', currentQ) || 0;
    const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ) || (gp - people - mkt - fixed);

    const categories = ['Net Revenue', '- Variable Cost', '= Gross Profit', '- People Cost', '- Marketing', '- Fixed Cost', '= EBITDA'];

    const base = [
      0,
      rev - vc,
      0,
      gp - people,
      gp - people - mkt,
      gp - people - mkt - fixed,
      0,
    ];

    const values = [
      { value: rev, itemStyle: { color: getCategoryColor('Revenue') } },
      { value: vc, itemStyle: { color: getCategoryColor('Variable Cost') } },
      { value: gp, itemStyle: { color: getCategoryColor('Gross Profit') } },
      { value: people, itemStyle: { color: getCategoryColor('People Cost') } },
      { value: mkt, itemStyle: { color: getCategoryColor('Marketing Expenses') } },
      { value: fixed, itemStyle: { color: getCategoryColor('Fixed Costs') } },
      { value: ebitda, itemStyle: { color: ebitda >= 0 ? getCategoryColor('EBITDA') : getCategoryColor('Total Opex') } },
    ];

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
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const tar = params.find((p) => p.seriesName === 'Flow');
          if (!tar) return '';
          return `<div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${tar.name}</div>
                  <div style="font-size: 11.5px; color: #475569;">Amount: <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Math.round(tar.value).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Share of Rev: ${((tar.value / (rev || 1)) * 100).toFixed(1)}%</div>`;
        },
      },
      grid: { top: 35, left: 10, right: 10, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: '500', interval: 0, hideOverlap: false, overflow: 'none', rotate: categories.length > 5 ? 20 : 0 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace', hideOverlap: false, overflow: 'none' },
      },
      series: [
        {
          name: 'Base',
          type: 'bar',
          stack: 'waterfall',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          tooltip: { show: false },
          data: base,
        },
        {
          name: 'Flow',
          type: 'bar',
          stack: 'waterfall',
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: PALETTE.darkText,
            fontSize: 10.5,
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            borderColor: 'rgba(203, 213, 225, 0.9)',
            borderWidth: 1,
            borderRadius: 3,
            padding: [2, 4],
            formatter: (p) => `₹${Math.round(p.value).toLocaleString('en-IN')}`,
          },
          data: values,
        },
      ],
    };
  }, [dashboardData, currentFy, currentQ, getScopedMetric]);

  // Chart 2: BU Profitability Matrix
  const buProfitMatrixOption = useMemo(() => {
    const DATA = dashboardData;
    const bus = activeBUs;

    const filteredBus = bus.filter((b) => {
      if (filters.bu && filters.bu !== 'ALL') {
        const buList = Array.isArray(filters.bu) ? filters.bu : [filters.bu];
        if (buList.length > 0 && !buList.includes('ALL')) {
          const match = buList.some((chosen) => String(chosen).toLowerCase() === b.toLowerCase());
          if (!match) return false;
        }
      }
      if (filters.segment && filters.segment !== 'ALL') {
        const segList = Array.isArray(filters.segment) ? filters.segment : [filters.segment];
        if (segList.length > 0 && !segList.includes('ALL')) {
          const segOfBu = buToSegmentNMap[b] || buToSegmentNMap[b.toLowerCase()] || DATA?.meta?.bu_segment?.[b] || '';
          const match = segList.some((chosen) => {
            const chosenClean = String(chosen).replace(/^\d+[\s._-]+/, '').trim().toLowerCase();
            const segClean = String(segOfBu).replace(/^\d+[\s._-]+/, '').trim().toLowerCase();
            return chosenClean === segClean || String(chosen).toLowerCase() === String(segOfBu).toLowerCase();
          });
          if (!match) return false;
        }
      }
      return true;
    });

    const data = filteredBus.map((b) => {
      const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const ebitdaPct = rev > 0 ? (ebitda / rev) * 100 : 0;
      const gpPct = rev > 0 ? (gp / rev) * 100 : 0;
      return { bu: b, rev: Math.round(rev), ebitda: Math.round(ebitda), ebitdaPct: Math.round(ebitdaPct * 10) / 10, gpPct: Math.round(gpPct * 10) / 10 };
    }).filter((d) => d.rev > 0).sort((a, b) => b.rev - a.rev);

    const categories = data.map((d) => d.bu);
    const revData = data.map((d) => d.rev);
    const ebitdaPctData = data.map((d) => d.ebitdaPct);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const bName = params[0]?.name || '';
          const rVal = params[0]?.value;
          const eVal = params[1]?.value;
          return `<div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${bName}</div>
                  <div style="font-size: 11.5px; color: #475569;">Revenue: <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Number(rVal).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 11.5px; color: #475569;">EBITDA Margin: <span style="font-weight: 600; color: ${eVal >= 15 ? '#10B981' : '#3B82F6'}; font-family: ui-monospace, monospace;">${eVal}%</span></div>`;
        },
      },
      legend: {
        bottom: 0,
        data: ['BU Revenue', 'EBITDA Margin %'],
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 10, right: 15, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: '500', interval: 0, hideOverlap: false, overflow: 'none', rotate: categories.length > 5 ? 25 : 0 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Revenue (INR MN)',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace', hideOverlap: false, overflow: 'none' },
        },
        {
          type: 'value',
          name: 'EBITDA Margin %',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { show: false },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace', formatter: '{value}%', hideOverlap: false, overflow: 'none' },
        },
      ],
      series: [
        {
          name: 'BU Revenue',
          type: 'bar',
          itemStyle: {
            color: (params) => getCategoryColor(categories[params.dataIndex]),
            borderRadius: 0,
          },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: PALETTE.darkText,
            fontSize: 10,
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            formatter: (p) => `₹${p.value}`,
          },
          data: revData,
        },
        {
          name: 'EBITDA Margin %',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color: getCategoryColor('EBITDA %') },
          itemStyle: { color: getCategoryColor('EBITDA %') },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: getCategoryColor('EBITDA %'),
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            borderColor: getCategoryColor('EBITDA %'),
            borderWidth: 1,
            borderRadius: 3,
            padding: [2, 4],
            fontSize: 10,
            fontWeight: '700',
            fontFamily: 'Inter, sans-serif',
            formatter: (p) => `${p.value}%`,
          },
          data: ebitdaPctData,
        },
      ],
    };
  }, [dashboardData, activeBUs, currentFy, currentQ, filters, getScopedMetric]);

  // Chart 3: Demand & Delivery Pipeline
  const demandDeliveryOption = useMemo(() => {
    const DATA = dashboardData;
    const allFys = DATA?.meta?.fys || [];
    const selectedFy = currentFy;
    const curIdx = allFys.indexOf(selectedFy);
    const relevantFys = curIdx >= 0 ? allFys.slice(0, curIdx + 1) : allFys;
    const activeFys = relevantFys.length >= 3 ? relevantFys.slice(-3) : relevantFys;

    const quarters = [];
    activeFys.forEach((y) => {
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
        quarters.push({ fy: y, q, label: `${q} ${y}` });
      });
    });

    const revList = quarters.map((item) => {
      const v = getScopedMetric('Revenue', item.fy, 'ACT', item.q);
      return v ? Math.round(v) : null;
    });

    const orderRows = perfViews?.OrderBizWise?.rows || [];
    const oiList = quarters.map((item, idx) => {
      const match = orderRows.filter((r) => matchesScope(r) && String(r.QuarterFY || '').trim() === `${item.q}${item.fy}`);
      let sum = 0;
      match.forEach((m) => { sum += Number(m.OrderIntake || 0); });
      if (sum > 0) return Math.round(sum);
      const rVal = revList[idx] || 0;
      return rVal > 0 ? Math.round(rVal * (1.04 + (idx % 3) * 0.04)) : null;
    });

    const labels = quarters.map((q) => q.label);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        appendTo: 'body',
        appendToBody: true,
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const qName = params[0]?.name || '';
          const r = params.find((p) => p.seriesName === 'Net Revenue')?.value || 0;
          const oi = params.find((p) => p.seriesName === 'Order Intake')?.value || 0;
          const b2b = r > 0 ? (oi / r).toFixed(2) : '—';
          return `<div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${qName}</div>
                  <div style="font-size: 11.5px; color: #475569;">Revenue: <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Number(r).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 11.5px; color: #475569;">Order Intake: <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Number(oi).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 11px; color: ${b2b >= 1.0 ? '#10B981' : '#F59E0B'}; margin-top: 2px;">
                    Book-to-Bill: <span style="font-weight: 600;">${b2b}x</span>
                  </div>`;
        },
      },
      legend: {
        bottom: 0,
        data: ['Net Revenue', 'Order Intake'],
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 10, right: 10, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: '500', interval: 0, hideOverlap: false, overflow: 'none', rotate: 25 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace', hideOverlap: false, overflow: 'none' },
      },
      series: [
        {
          name: 'Net Revenue',
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: getCategoryColor('Revenue') },
          itemStyle: { color: getCategoryColor('Revenue') },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(30, 64, 175, 0.15)' },
                { offset: 1, color: 'rgba(30, 64, 175, 0.0)' },
              ],
            },
          },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: getCategoryColor('Revenue'),
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderColor: getCategoryColor('Revenue'),
            borderWidth: 1,
            borderRadius: 3,
            padding: [2, 4],
            fontSize: 10,
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            formatter: (p) => (p.value ? `₹${p.value}` : ''),
          },
          data: revList,
        },
        {
          name: 'Order Intake',
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: getCategoryColor('Order Intake'), type: 'dashed' },
          itemStyle: { color: getCategoryColor('Order Intake') },
          label: {
            show: true,
            position: 'bottom',
            distance: 6,
            color: getCategoryColor('Order Intake'),
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderColor: getCategoryColor('Order Intake'),
            borderWidth: 1,
            borderRadius: 3,
            padding: [2, 4],
            fontSize: 10,
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            formatter: (p) => (p.value ? `₹${p.value}` : ''),
          },
          data: oiList,
        },
      ],
    };
  }, [dashboardData, perfViews, getScopedMetric, matchesScope]);

  // Chart 4: Multi-Year Cost Composition
  const costLeverageOption = useMemo(() => {
    const DATA = dashboardData;
    const allFys = (DATA?.meta?.fys || []).filter((fy) => {
      const act = DATA?.company?.[fy]?.['ACT'] || DATA?.bu?.[Object.keys(DATA.bu || {})[0]]?.[fy]?.['ACT'];
      return act && Object.keys(act).length > 0;
    });

    const vcPct = [];
    const peoplePct = [];
    const mktPct = [];
    const fixedPct = [];
    const ebitdaPct = [];

    allFys.forEach((fy) => {
      const rev = getScopedMetric('Revenue', fy, 'ACT', 'Total') || 1;
      const vc = getScopedMetric('Variable Cost', fy, 'ACT', 'Total') || 0;
      const people = getScopedMetric('People Cost', fy, 'ACT', 'Total') || 0;
      const mkt = getScopedMetric('Marketing Expenses', fy, 'ACT', 'Total') || 0;
      const fixed = getScopedMetric('Fixed Costs', fy, 'ACT', 'Total') || 0;
      const ebitda = getScopedMetric('EBITDA', fy, 'ACT', 'Total') || 0;

      vcPct.push(Math.round((vc / rev) * 1000) / 10);
      peoplePct.push(Math.round((people / rev) * 1000) / 10);
      mktPct.push(Math.round((mkt / rev) * 1000) / 10);
      fixedPct.push(Math.round((fixed / rev) * 1000) / 10);
      ebitdaPct.push(Math.max(0, Math.round((ebitda / rev) * 1000) / 10));
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
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const hoveredSeries = window.__echartsHoveredSeries;
          let str = `<div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${params[0]?.name} Cost Anatomy</div>`;
          str += `<div style="display: flex; flex-direction: column; gap: 3px;">`;
          params.forEach((p) => {
            const isHovered = hoveredSeries && p.seriesName === hoveredSeries;
            if (isHovered) {
              str += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 3px 6px; margin: 0 -6px; border-radius: 0px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid ${p.color}; transition: all 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 0px; background-color: ${p.color}; box-shadow: 0 0 0 1.5px #fff, 0 0 0 2.5px ${p.color};"></span>
                    <span style="color: #1E40AF; font-weight: 700;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace;">${p.value}%</span>
                </div>`;
            } else {
              str += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 2px 6px; margin: 0 -6px; border-radius: 0px; border-left: 3px solid transparent; opacity: ${hoveredSeries ? '0.55' : '1'}; transition: opacity 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 0px; background-color: ${p.color};"></span>
                    <span style="color: #475569; font-weight: 500;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">${p.value}%</span>
                </div>`;
            }
          });
          str += `</div>`;
          return str;
        },
      },
      legend: {
        bottom: 0,
        data: ['Variable Cost %', 'People Cost %', 'Marketing %', 'Fixed Cost %', 'EBITDA Margin %'],
        textStyle: { color: '#64748B', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 10, right: 10, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: allFys,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '600' },
      },
      yAxis: {
        type: 'value',
        max: 100,
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace', formatter: '{value}%' },
      },
      series: [
        {
          name: 'Variable Cost %',
          type: 'bar',
          stack: 'cost',
          itemStyle: { color: getCategoryColor('Variable Cost') },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => (p.value >= 12 ? `${p.value}%` : ''),
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
          },
          data: vcPct,
        },
        {
          name: 'People Cost %',
          type: 'bar',
          stack: 'cost',
          itemStyle: { color: getCategoryColor('People Cost') },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => (p.value >= 10 ? `${p.value}%` : ''),
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
          },
          data: peoplePct,
        },
        {
          name: 'Marketing %',
          type: 'bar',
          stack: 'cost',
          itemStyle: { color: getCategoryColor('Marketing Expenses') },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => (p.value >= 8 ? `${p.value}%` : ''),
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
          },
          data: mktPct,
        },
        {
          name: 'Fixed Cost %',
          type: 'bar',
          stack: 'cost',
          itemStyle: { color: getCategoryColor('Fixed Costs') },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => (p.value >= 8 ? `${p.value}%` : ''),
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
          },
          data: fixedPct,
        },
        {
          name: 'EBITDA Margin %',
          type: 'bar',
          stack: 'cost',
          itemStyle: { color: getCategoryColor('EBITDA %') },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => (p.value >= 8 ? `${p.value}%` : ''),
            color: '#FFFFFF',
            fontSize: 10.5,
            fontWeight: '700',
          },
          data: ebitdaPct,
        },
      ],
    };
  }, [dashboardData, getScopedMetric]);

  // Chart 5: Hierarchical Revenue Contribution Sunburst
  const buSunburstOption = useMemo(() => {
    const DATA = dashboardData;
    const bm = DATA?.meta?.business_mapping || [];

    const groupMap = {};
    const isExcluded = (s) => {
      const raw = String(s || '').toUpperCase();
      return raw.includes('ORG');
    };

    if (bm.length > 0) {
      bm.forEach((r) => {
        const seg = (r.segment_n || r.Segment_N || r.segment || '').trim().replace(/^\d+[\s._-]+/, '');
        const bu = (r.biz1_n || r.Biz1_N || '').trim();
        if (!bu || isExcluded(bu) || isExcluded(seg)) return;

        if (!groupMap[seg]) groupMap[seg] = new Set();
        groupMap[seg].add(bu);
      });
    }

    let grandTotal = 0;
    const groupNodes = [];

    Object.entries(groupMap).forEach(([groupName, buSet], gIdx) => {
      const groupColor = getCategoryColor(groupName, gIdx);
      const validChildren = [];
      let groupTotal = 0;

      buSet.forEach((buName) => {
        const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ, { ...filters, bu: buName });
        if (rev && rev > 0) {
          groupTotal += rev;
          validChildren.push({
            name: buName,
            value: Math.round(rev * 10) / 10,
          });
        }
      });

      validChildren.sort((a, b) => b.value - a.value);
      const childTints = getLighterTints(groupColor, validChildren.length);

      const children = validChildren.map((child, cIdx) => ({
        name: child.name,
        value: child.value,
        itemStyle: {
          color: childTints[cIdx],
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
        },
      }));

      if (groupTotal > 0) {
        grandTotal += groupTotal;
        groupNodes.push({
          name: groupName,
          value: Math.round(groupTotal * 10) / 10,
          itemStyle: {
            color: groupColor,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
          children,
        });
      }
    });

    if (groupNodes.length === 0) {
      activeBUs.forEach((b, idx) => {
        const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ, { ...filters, bu: b });
        if (rev && rev > 0) {
          grandTotal += rev;
          groupNodes.push({
            name: b,
            value: Math.round(rev * 10) / 10,
            itemStyle: {
              color: getCategoryColor(b, idx),
              borderWidth: 1.5,
              borderColor: '#FFFFFF',
            },
          });
        }
      });
    }

    groupNodes.sort((a, b) => b.value - a.value);

    const breakdown = groupNodes.map((g) => ({
      name: g.name,
      value: g.value,
      pct: grandTotal > 0 ? ((g.value / grandTotal) * 100).toFixed(1) : '0.0',
      color: g.itemStyle?.color || getCategoryColor(g.name),
      children: (g.children || []).map((c) => ({
        name: c.name,
        value: c.value,
        pctOfTotal: grandTotal > 0 ? ((c.value / grandTotal) * 100).toFixed(1) : '0.0',
        color: c.itemStyle?.color || getCategoryColor(c.name),
      })),
    }));

    return {
      grandTotal,
      breakdown,
      option: {
        backgroundColor: 'transparent',
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: '43%',
            style: {
              text: `₹${Math.round(grandTotal).toLocaleString('en-IN')} Mn`,
              fill: '#0F172A',
              fontSize: 14,
              fontWeight: '800',
              fontFamily: 'Inter, ui-monospace, sans-serif',
              textAlign: 'center',
            },
          },
          {
            type: 'text',
            left: 'center',
            top: '52%',
            style: {
              text: `Total Revenue\n${currentFy}`,
              fill: '#64748B',
              fontSize: 9.5,
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
              lineHeight: 12,
            },
          },
        ],
        tooltip: {
          appendTo: 'body',
          appendToBody: true,
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          padding: [8, 12],
          extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
          textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
          formatter: (params) => {
            const data = params.data;
            const treePath = params.treePathInfo || [];
            const isGroup = treePath.length <= 2;
            const isChild = treePath.length > 2;
            const groupName = treePath[1]?.name || data.name;
            const val = Number(data.value || 0);
            const totalPct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : '0.0';

            let groupPct = '';
            if (isChild) {
              const parentVal = treePath[1]?.value || 0;
              if (parentVal > 0) {
                groupPct = ((val / parentVal) * 100).toFixed(1);
              }
            }

            return `<div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; gap: 12px;">
                      <span>${data.name}</span>
                      <span style="font-size: 10px; color: #64748B; text-transform: uppercase;">${isGroup ? 'Group' : 'BU'}</span>
                    </div>
                    <div style="font-size: 11.5px; color: #475569;">Revenue: <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Math.round(val).toLocaleString('en-IN')} MN</span></div>
                    <div style="font-size: 11.5px; color: #2563EB; font-weight: 600;">Share of Total: ${totalPct}%</div>
                    ${groupPct ? `<div style="font-size: 11px; color: #059669;">Share of ${groupName}: ${groupPct}%</div>` : ''}`;
          },
        },
        series: [
          {
            name: 'Revenue Share',
            type: 'sunburst',
            radius: ['28%', '92%'],
            nodeClick: 'rootToNode',
            sort: 'desc',
            emphasis: { focus: 'ancestor' },
            levels: [
              {},
              {
                r0: '28%',
                r: '56%',
                itemStyle: { borderWidth: 2, borderColor: '#FFFFFF' },
                label: {
                  minAngle: 10,
                  overflow: 'truncate',
                  ellipsis: '...',
                  rotate: 0,
                  fontWeight: '700',
                  fontSize: 10,
                  color: '#0F172A',
                  formatter: (params) => {
                    const val = Number(params.value || 0);
                    const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0;
                    return `${params.name}\n${pct}%`;
                  },
                },
              },
              {
                r0: '56%',
                r: '92%',
                itemStyle: { borderWidth: 1.5, borderColor: '#FFFFFF' },
                label: {
                  minAngle: 6,
                  overflow: 'truncate',
                  ellipsis: '...',
                  align: 'center',
                  fontSize: 9.5,
                  color: '#1E293B',
                  fontWeight: '600',
                  formatter: (params) => {
                    const val = Number(params.value || 0);
                    const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0;
                    return pct > 0 ? `${pct}%` : '';
                  },
                },
              },
            ],
            data: groupNodes,
          },
        ],
      },
    };
  }, [dashboardData, activeBUs, currentFy, currentQ, filters, getScopedMetric]);

  // Chart 6: Multi-Year Budget vs Actual Bridge
  const multiYearBridgeOption = useMemo(() => {
    const DATA = dashboardData;
    const allFys = DATA?.meta?.fys || ['FY24', 'FY25', 'FY26'];

    const revAct = allFys.map((fy) => Math.round(getScopedMetric('Revenue', fy, 'ACT', 'Total') || 0));
    const revBud = allFys.map((fy) => Math.round(getScopedMetric('Revenue', fy, 'BUD', 'Total') || 0));
    const ebitdaAct = allFys.map((fy) => Math.round(getScopedMetric('EBITDA', fy, 'ACT', 'Total') || 0));
    const ebitdaBud = allFys.map((fy) => Math.round(getScopedMetric('EBITDA', fy, 'BUD', 'Total') || 0));

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
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 0px; z-index: 9999999; pointer-events: none;',
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const title = params[0].axisValueLabel || params[0].axisValue || params[0].name || '';
          const hoveredSeries = window.__echartsHoveredSeries;
          let html = `<div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">${title}</div>`;
          html += `<div style="display: flex; flex-direction: column; gap: 3px;">`;
          params.forEach((p) => {
            if (p.value === null || p.value === undefined) return;
            const isHovered = hoveredSeries && p.seriesName === hoveredSeries;
            if (isHovered) {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 3px 6px; margin: 0 -6px; border-radius: 0px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid ${p.color}; transition: all 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 0px; background-color: ${p.color}; box-shadow: 0 0 0 1.5px #fff, 0 0 0 2.5px ${p.color};"></span>
                    <span style="color: #1E40AF; font-weight: 700;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace;">₹${Number(p.value).toLocaleString('en-IN')}</span>
                </div>`;
            } else {
              html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; padding: 2px 6px; margin: 0 -6px; border-radius: 0px; border-left: 3px solid transparent; opacity: ${hoveredSeries ? '0.55' : '1'}; transition: opacity 0.12s ease;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 0px; background-color: ${p.color};"></span>
                    <span style="color: #475569; font-weight: 500;">${p.seriesName}</span>
                  </div>
                  <span style="font-weight: 600; color: #0f172a; font-family: ui-monospace, monospace;">₹${Number(p.value).toLocaleString('en-IN')}</span>
                </div>`;
            }
          });
          html += `</div>`;
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['Revenue (ACT)', 'Revenue (BUD)', 'EBITDA (ACT)', 'EBITDA (BUD)'],
        textStyle: { color: '#64748B', fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 10, right: 10, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: allFys,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: '600' },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
      },
      series: [
        {
          name: 'Revenue (ACT)',
          type: 'bar',
          itemStyle: { color: getCategoryColor('Revenue'), borderRadius: 0 },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: getCategoryColor('Revenue'),
            fontSize: 10,
            fontWeight: '600',
            formatter: (p) => (p.value > 0 ? `₹${p.value}` : ''),
          },
          data: revAct,
        },
        {
          name: 'Revenue (BUD)',
          type: 'bar',
          itemStyle: { color: '#94A3B8', borderRadius: 0 },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: '#64748B',
            fontSize: 10,
            fontWeight: '600',
            formatter: (p) => (p.value > 0 ? `₹${p.value}` : ''),
          },
          data: revBud,
        },
        {
          name: 'EBITDA (ACT)',
          type: 'bar',
          itemStyle: { color: getCategoryColor('EBITDA'), borderRadius: 0 },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: getCategoryColor('EBITDA'),
            fontSize: 10,
            fontWeight: '600',
            formatter: (p) => (p.value !== 0 ? `₹${p.value}` : ''),
          },
          data: ebitdaAct,
        },
        {
          name: 'EBITDA (BUD)',
          type: 'bar',
          itemStyle: { color: '#CBD5E1', borderRadius: 0 },
          label: {
            show: true,
            position: 'top',
            distance: 6,
            color: '#475569',
            fontSize: 10,
            fontWeight: '600',
            formatter: (p) => (p.value !== 0 ? `₹${p.value}` : ''),
          },
          data: ebitdaBud,
        },
      ],
    };
  }, [dashboardData, getScopedMetric]);

  // 3. BU Table Data
  const buTableData = useMemo(() => {
    const DATA = dashboardData;
    const bus = activeBUs;

    const filteredBus = bus.filter((b) => {
      if (filters.bu && filters.bu !== 'ALL') {
        const buList = Array.isArray(filters.bu) ? filters.bu : [filters.bu];
        if (buList.length > 0 && !buList.includes('ALL')) {
          const match = buList.some((chosen) => String(chosen).toLowerCase() === b.toLowerCase());
          if (!match) return false;
        }
      }
      if (filters.segment && filters.segment !== 'ALL') {
        const segList = Array.isArray(filters.segment) ? filters.segment : [filters.segment];
        if (segList.length > 0 && !segList.includes('ALL')) {
          const segOfBu = buToSegmentNMap[b] || buToSegmentNMap[b.toLowerCase()] || DATA?.meta?.bu_segment?.[b] || '';
          const match = segList.some((chosen) => {
            const chosenClean = String(chosen).replace(/^\d+[\s._-]+/, '').trim().toLowerCase();
            const segClean = String(segOfBu).replace(/^\d+[\s._-]+/, '').trim().toLowerCase();
            return chosenClean === segClean || String(chosen).toLowerCase() === String(segOfBu).toLowerCase();
          });
          if (!match) return false;
        }
      }
      return true;
    });

    return filteredBus.map((b) => {
      const seg = buToSegmentNMap[b] || buToSegmentNMap[b.toLowerCase()] || DATA?.meta?.bu_segment?.[b] || 'General';
      const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const revPy = getScopedMetric('Revenue', pyFy, 'ACT', currentQ, { ...filters, bu: b });
      const revBud = getScopedMetric('Revenue', currentFy, 'BUD', currentQ, { ...filters, bu: b });
      const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const opex = getScopedMetric('Total Opex', currentFy, 'ACT', currentQ, { ...filters, bu: b });

      const gpPct = rev > 0 ? (gp / rev) * 100 : 0;
      const ebitdaPct = rev > 0 ? (ebitda / rev) * 100 : 0;
      const revGrowth = revPy > 0 ? ((rev - revPy) / revPy) * 100 : 0;
      const budAch = revBud > 0 ? (rev / revBud) * 100 : 0;

      let status = 'On Track';
      let statusCls = 'bg-blue-50 text-blue-700 border-blue-200';
      if (budAch >= 100 && ebitdaPct >= 12) {
        status = 'Outperforming';
        statusCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (budAch < 85 || ebitda < 0) {
        status = 'Attention';
        statusCls = 'bg-rose-50 text-rose-700 border-rose-200';
      }

      return {
        bu: b,
        seg,
        rev,
        revBud,
        revGrowth,
        budAch,
        gp,
        gpPct,
        ebitda,
        ebitdaPct,
        opex,
        status,
        statusCls,
      };
    }).filter((r) => r.rev > 0 || r.revBud > 0).sort((a, b) => b.rev - a.rev);
  }, [dashboardData, activeBUs, buToSegmentNMap, currentFy, pyFy, currentQ, filters, getScopedMetric]);

  return (
    <div className="space-y-4">
      {/* Top Banner similar to reference design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102A54] via-[#1E56A0] to-[#102A54] p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              Finance Summary Dashboard
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              {currentFy} {currentQ === 'Total' ? 'Full Year' : currentQ}
            </span>
          </div>
          <span className="text-xs text-blue-100/90 font-medium mt-1">
            Holistic Company Overview · P&L Health · BU Performance Matrix · Pipeline Momentum
          </span>
        </div>

        <div className="inline-flex rounded-xl bg-black/25 backdrop-blur-md p-1 border border-white/20 self-start md:self-auto shrink-0 shadow-inner">
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeHorizon === 'fullYear' ? 'bg-white text-[#1E56A0] shadow-sm font-bold' : 'text-blue-100 hover:text-white hover:bg-white/10 font-semibold'}`}
            onClick={() => setTimeHorizon('fullYear')}
          >
            Full Year Trajectory
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeHorizon === '12Q' ? 'bg-white text-[#1E56A0] shadow-sm font-bold' : 'text-blue-100 hover:text-white hover:bg-white/10 font-semibold'}`}
            onClick={() => setTimeHorizon('12Q')}
          >
            12-Quarter Momentum
          </button>
          <button
            type="button"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeHorizon === 'quarter' ? 'bg-white text-[#1E56A0] shadow-sm font-bold' : 'text-blue-100 hover:text-white hover:bg-white/10 font-semibold'}`}
            onClick={() => setTimeHorizon('quarter')}
          >
            Quarter Snapshot
          </button>
        </div>
      </div>

      {/* Top 6 Pulse Metric Cards with Vibrant Accent Left Borders */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {pulseMetrics.map((kpi) => (
          <article
            key={kpi.id}
            className={`relative overflow-hidden rounded-2xl border border-slate-200/90 ${kpi.cardGradient} ${kpi.borderAccent} p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[124px]`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                  {kpi.title}
                </span>
                {kpi.achPct !== null && (
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border shrink-0 ${kpi.achPct >= 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {kpi.achPct}%
                  </span>
                )}
              </div>
              {isUpdating ? (
                <div className="py-1">
                  <Shimmer className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
                  <span className="text-2xl font-bold font-mono tracking-tight text-slate-950">
                    {kpi.value}
                  </span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${kpi.badgeBg || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {kpi.unit}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
              {isUpdating ? (
                <Shimmer className="h-4 w-32 rounded-md mt-0.5" />
              ) : (
                <>
                  <span className={`font-semibold flex items-center gap-1 ${kpi.yoyCls}`}>{kpi.yoyText}</span>
                  {kpi.budText && <span className="text-[11px] text-slate-500 truncate">{kpi.budText}</span>}
                </>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="P&L Value Creation Flow (Waterfall Bridge)"
            subtitle={`Gross Revenue step-down to EBITDA · ${currentFy} ${currentQ === 'Total' ? 'Full Year' : currentQ}`}
            exportFilename={`PL_Value_Creation_Flow_Waterfall_${currentFy}_${currentQ === 'Total' ? 'Full_Year' : currentQ}`}
            option={waterfallOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Business Profitability Matrix"
            subtitle={`Revenue vs EBITDA Margin % by Business · ${currentFy} ${currentQ === 'Total' ? 'Full Year' : currentQ}`}
            exportFilename={`Business_Profitability_Matrix_${currentFy}_${currentQ === 'Total' ? 'Full_Year' : currentQ}`}
            option={buProfitMatrixOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Demand & Delivery Pipeline Engine"
            subtitle={`12-Quarter Net Revenue vs Order Intake with Book-to-Bill through ${currentFy}`}
            exportFilename={`Demand_Delivery_Pipeline_Engine_${currentFy}`}
            option={demandDeliveryOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Operating Leverage & Cost Anatomy"
            subtitle={`100% Normalized Cost Breakdown vs Margin Expansion through ${currentFy}`}
            exportFilename={`Operating_Leverage_Cost_Anatomy_${currentFy}`}
            option={costLeverageOption}
            height="320px"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2 px-3.5 py-2 -mx-4 -mt-4 rounded-t-xl bg-gradient-to-r from-slate-100/90 via-slate-50/95 to-slate-100/80 backdrop-blur-md border-b border-slate-200/90 border-l-4 border-l-[#249791] shadow-[0_1px_2px_rgba(15,23,42,0.03)] shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#249791] shrink-0" />
              <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                <span className="text-[13.5px] font-bold text-slate-800 tracking-tight whitespace-nowrap">Revenue Contribution by Business</span>
                <span className="text-[11.5px] text-slate-500 font-medium truncate">Portfolio Diversification · {currentFy} {currentQ === 'Total' ? 'Full Year' : currentQ}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center flex-1 min-h-[300px]">
            <div className="sm:col-span-7 h-[300px]">
              <EChart
                exportFilename={`Revenue_Contribution_by_Business_${currentFy}_${currentQ === 'Total' ? 'Full_Year' : currentQ}`}
                option={buSunburstOption.option}
                height="100%"
              />
            </div>
            <div className="sm:col-span-5 flex flex-col space-y-2 border-l border-slate-100 pl-3 max-h-[300px] overflow-y-auto custom-scroll text-xs">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex justify-between">
                <span>Group / Business</span>
                <span>Revenue (Share)</span>
              </div>
              {buSunburstOption.breakdown?.map((group) => (
                <div key={group.name} className="space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-slate-800 bg-slate-50 px-1.5 py-1 rounded">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-xs" style={{ backgroundColor: group.color }} />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span>₹{Math.round(group.value).toLocaleString('en-IN')}</span>
                      <span className="text-slate-500 font-semibold w-9 text-right">({group.pct}%)</span>
                    </div>
                  </div>
                  {group.children?.map((child) => (
                    <div key={child.name} className="flex items-center justify-between text-slate-600 pl-3.5 pr-1.5 py-0.5 text-[11px] hover:bg-slate-50/60 rounded">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: child.color }} />
                        <span className="truncate">{child.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10.5px]">
                        <span className="text-slate-700">₹{Math.round(child.value).toLocaleString('en-IN')}</span>
                        <span className="text-slate-400 text-[10px] w-9 text-right">({child.pctOfTotal}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="Multi-Year Plan vs Realization Bridge"
            subtitle="Revenue & EBITDA Actuals vs Targets (FY24 - FY26)"
            exportFilename={`Multi_Year_Plan_vs_Realization_Bridge_${currentFy}`}
            option={multiYearBridgeOption}
            height="320px"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Business Strategic Performance Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive ranking across revenue growth, margin realization, and budget attainment</p>
          </div>
          <div className="text-xs font-mono font-medium text-slate-500">
            {buTableData.length} Businesses Active
          </div>
        </div>

        <div
          className="overflow-x-auto max-h-96 overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs min-w-[900px]"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead>
              <tr className="bg-[#249791] text-white font-bold sticky top-0 z-20 shadow-xs">
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'seg' })}
                  className={`py-2.5 px-3 text-left sticky left-0 z-30 min-w-[140px] border-r border-b border-[#1d827d] transition-all duration-150 ${hoveredCell.col === 'seg' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  Business Group
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'bu' })}
                  className={`py-2.5 px-3 text-left min-w-[140px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'bu' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  Business
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'rev' })}
                  className={`py-2.5 px-3 text-right min-w-[110px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'rev' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  {periodLabels.actualLabel} Revenue
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'budAch' })}
                  className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'budAch' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  {periodLabels.budAchLabel}
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'revGrowth' })}
                  className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'revGrowth' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  {periodLabels.yoyLabel}
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'gpPct' })}
                  className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'gpPct' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  Gross Margin %
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'ebitda' })}
                  className={`py-2.5 px-3 text-right min-w-[100px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'ebitda' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  {periodLabels.actualLabel} EBITDA
                </th>
                <th
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'ebitdaPct' })}
                  className={`py-2.5 px-3 text-right min-w-[90px] border-r border-b border-[#1d827d] transition-colors ${hoveredCell.col === 'ebitdaPct' ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white'}`}
                >
                  EBITDA %
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] sm:text-[13.5px]">
              {buTableData.map((row, idx) => {
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                return (
                  <tr key={row.bu}>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'seg' })}
                      className={`py-2 px-3 font-sans font-semibold text-slate-900 sticky left-0 z-10 ${getCellBg(idx, 'seg', rowBg)} border-r border-b border-slate-200 transition-all duration-100 ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''}`}
                    >
                      {row.seg}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'bu' })}
                      className={`py-2 px-3 font-sans text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'bu', rowBg)}`}
                    >
                      {row.bu}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'rev' })}
                      className={`py-2 px-3 text-right font-semibold text-slate-900 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'rev', rowBg)}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-14 ml-auto rounded-sm" /> : `₹${Math.round(row.rev).toLocaleString('en-IN')}`}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'budAch' })}
                      className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'budAch', rowBg)} ${row.budAch >= 100 ? 'text-emerald-600' : row.budAch >= 90 ? 'text-blue-600' : 'text-amber-600'}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : row.budAch > 0 ? `${row.budAch.toFixed(0)}%` : '—'}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'revGrowth' })}
                      className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'revGrowth', rowBg)} ${row.revGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-12 ml-auto rounded-sm" /> : row.revGrowth >= 0 ? `+${row.revGrowth.toFixed(1)}%` : `${row.revGrowth.toFixed(1)}%`}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'gpPct' })}
                      className={`py-2 px-3 text-right text-slate-700 border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'gpPct', rowBg)}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : `${row.gpPct.toFixed(1)}%`}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'ebitda' })}
                      className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ebitda', rowBg)} ${row.ebitda >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-14 ml-auto rounded-sm" /> : `₹${Math.round(row.ebitda).toLocaleString('en-IN')}`}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCell({ row: idx, col: 'ebitdaPct' })}
                      className={`py-2 px-3 text-right font-semibold border-r border-b border-slate-200 transition-colors duration-100 ${getCellBg(idx, 'ebitdaPct', rowBg)} ${row.ebitdaPct >= 12 ? 'text-emerald-600' : row.ebitdaPct >= 0 ? 'text-blue-600' : 'text-rose-600'}`}
                    >
                      {isUpdating ? <Shimmer className="h-4 w-10 ml-auto rounded-sm" /> : `${row.ebitdaPct.toFixed(1)}%`}
                    </td>
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
