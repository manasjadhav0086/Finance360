import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Coins,
  Building2,
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  HelpCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import EChart from '../charts/EChart';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';
import { getPeriodLabels, normalizeMonth, normalizeQuarter } from '../../utils/periodUtils';
import { getCategoryColor, getLighterTints, THEME_TOKENS } from '../../utils/theme';

const PALETTE = {
  navy: '#0F2744',
  blue: '#1E40AF',
  sky: '#0284C7',
  teal: '#0D9488',
  emerald: '#059669',
  amber: '#D97706',
  orange: '#EA580C',
  rose: '#E11D48',
  purple: '#7C3AED',
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
  getActiveBusinesses = () => [],
  isUpdating = false,
}) {
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();

  const periodLabels = useMemo(() => {
    return getPeriodLabels(filters, dashboardData);
  }, [filters, dashboardData]);

  const currentFy = periodLabels.currentFy;
  const pyFy = periodLabels.priorFy;
  const currentQ = periodLabels.quarter;
  const isMonthFiltered = Boolean(filters.month && filters.month !== 'ALL');
  const activeMonthStr = isMonthFiltered ? (Array.isArray(filters.month) ? filters.month.join(', ') : filters.month) : null;

  // Derive Active BUs strictly based on metadata and segment filter
  const activeBUs = useMemo(() => {
    const DATA = dashboardData;
    const bm = DATA?.meta?.business_mapping || [];
    const isExcluded = (s) => String(s || '').toUpperCase().includes('ORG');

    if (bm.length > 0) {
      const buSet = new Set();
      bm.forEach((r) => {
        const bu = (r.biz1_n || r.Biz1_N || r.biz1 || r.Biz1 || '').trim();
        const seg = (r.segment_n || r.Segment_N || r.segment || '').trim();
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

  // BU to Segment Mapping
  const buToSegmentMap = useMemo(() => {
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

  // -------------------------------------------------------------
  // SECTION 1: EXECUTIVE FINANCIAL SUMMARY KPI CARDS (NON-DUPLICATE)
  // -------------------------------------------------------------
  const executiveKpis = useMemo(() => {
    const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ) || 0;
    const revBud = getScopedMetric('Revenue', currentFy, 'BUD', currentQ) || 0;
    const revPy = getScopedMetric('Revenue', pyFy, 'ACT', currentQ) || 0;

    const vc = getScopedMetric('Variable Cost', currentFy, 'ACT', currentQ) || 0;
    const totalDir = getScopedMetric('Total Direct Cost', currentFy, 'ACT', currentQ) || vc;
    const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', currentQ) || (rev - totalDir);
    const gpPct = getScopedMetric('Gross Margin %', currentFy, 'ACT', currentQ) || (rev > 0 ? (gp / rev) * 100 : 0);

    const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ) || 0;
    const ebitdaBud = getScopedMetric('EBITDA', currentFy, 'BUD', currentQ) || 0;
    const ebitdaPy = getScopedMetric('EBITDA', pyFy, 'ACT', currentQ) || 0;
    const opex = getScopedMetric('Total Opex', currentFy, 'ACT', currentQ) || 0;
    const opexBud = getScopedMetric('Total Opex', currentFy, 'BUD', currentQ) || 0;

    // 1. Order Intake & Demand Coverage
    let orderIntake = getScopedMetric('Order Intake', currentFy, 'ACT', currentQ) || 0;
    let oiBud = getScopedMetric('Order Intake', currentFy, 'BUD', currentQ) || 0;
    if (orderIntake === 0 && perfViews?.OrderBizWise?.rows?.length > 0) {
      const orderRows = perfViews.OrderBizWise.rows.filter(
        (r) => matchesScope(r) && (r.Filter_FY === currentFy || String(r.QuarterFY || '').includes(currentFy))
      );
      orderRows.forEach((r) => {
        orderIntake += Number(r.OrderIntake || 0);
      });
    }
    const bookToBill = rev > 0 ? orderIntake / rev : 1.0;
    const oiAchPct = oiBud > 0 ? (orderIntake / oiBud) * 100 : null;

    // 2. Net Revenue Budget Variance
    const revVariance = rev - revBud;
    const revAchPct = revBud > 0 ? (rev / revBud) * 100 : null;

    // 3. Cash Collections
    const collection = getScopedMetric('Collection', currentFy, 'ACT', currentQ) || 0;
    const collectionBud = getScopedMetric('Collection', currentFy, 'BUD', currentQ) || 0;
    const collAchPct = collectionBud > 0 ? (collection / collectionBud) * 100 : null;

    // 4. Capital Expenditure (CAPEX) & Budget Utilization
    const capex = getScopedMetric('Capex', currentFy, 'ACT', currentQ) || 0;
    const capexBud = getScopedMetric('Capex', currentFy, 'BUD', currentQ) || 0;
    const capexUtilPct = capexBud > 0 ? (capex / capexBud) * 100 : 0;
    const capexHeadroom = capexBud > 0 ? Math.max(0, capexBud - capex) : 0;

    // 5. Operating Leverage / Conversion Index: EBITDA / Gross Profit
    const opConversion = gp > 0 ? (ebitda / gp) * 100 : 0;
    const gpPy = getScopedMetric('Gross Profit', pyFy, 'ACT', currentQ) || ((getScopedMetric('Revenue', pyFy, 'ACT', currentQ) || 0) - (getScopedMetric('Total Direct Cost', pyFy, 'ACT', currentQ) || getScopedMetric('Variable Cost', pyFy, 'ACT', currentQ) || 0));
    const opConversionPy = gpPy > 0 ? ((ebitdaPy / gpPy) * 100) : 0;
    const conversionDiff = opConversion - opConversionPy;

    // 6. Net Operating Cash Flow: Collections - Total Opex - Capex
    const netCash = getScopedMetric('Net Cash', currentFy, 'ACT', currentQ) || (collection - opex - capex);
    const netCashBud = (collectionBud || 0) - (opexBud || 0) - (capexBud || 0);
    const netCashMargin = rev > 0 ? (netCash / rev) * 100 : 0;

    return [
      {
        id: 'order_intake',
        title: 'Order Intake',
        category: 'Forward Demand',
        value: `₹${Math.round(orderIntake).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        badge: `B2B: ${bookToBill.toFixed(2)}x`,
        badgeColor: bookToBill >= 1.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        comparisonText: oiAchPct !== null ? `${Math.round(oiAchPct)}% Plan Realized` : (bookToBill >= 1.0 ? 'Pipeline Expanding' : 'Pipeline Contracting'),
        comparisonCls: (oiAchPct !== null ? oiAchPct >= 100 : bookToBill >= 1.0) ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold',
        subtext: oiBud > 0 ? `Target: ₹${Math.round(oiBud).toLocaleString('en-IN')} MN` : `B2B: ${bookToBill.toFixed(2)}x vs Net Rev`,
        borderAccent: 'border-l-[6px] border-l-[#D97706]',
        tooltip: 'Total contracted client commitments and forward pipeline intake. Book-to-Bill ratio compares new orders to billed revenue (>1.0x indicates business expansion). Source: order_intake table.',
      },
      {
        id: 'net_variance',
        title: 'Budget Variance',
        category: 'Plan Adherence',
        value: `${revVariance >= 0 ? '+' : '-'}₹${Math.abs(Math.round(revVariance)).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        badge: revAchPct !== null ? `${Math.round(revAchPct)}% Realized` : 'Target N/A',
        badgeColor: revVariance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
        comparisonText: revVariance >= 0 ? `+${Math.round(revVariance).toLocaleString('en-IN')} MN Favorable` : `-${Math.abs(Math.round(revVariance)).toLocaleString('en-IN')} MN Deficit`,
        comparisonCls: revVariance >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold',
        subtext: revBud > 0 ? `Budget Target: ₹${Math.round(revBud).toLocaleString('en-IN')} MN` : 'Base Target',
        borderAccent: 'border-l-[6px] border-l-[#0284C7]',
        tooltip: 'Variance between Recognized Revenue and Approved Board Budget. Positive value indicates revenue outperformance against plan. Source: dataai financial postings.',
      },
      {
        id: 'collections',
        title: 'Cash Collections',
        category: 'Working Capital',
        value: `₹${Math.round(collection).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        badge: collAchPct !== null ? `${Math.round(collAchPct)}% Target` : 'Active Period',
        badgeColor: (collAchPct || 100) >= 95 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        comparisonText: collAchPct !== null ? `${Math.round(collAchPct)}% of Cash Target` : `Customer Inflow Realized`,
        comparisonCls: (collAchPct || 100) >= 95 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold',
        subtext: collectionBud > 0 ? `Target: ₹${Math.round(collectionBud).toLocaleString('en-IN')} MN` : `Cash Liquidity Inflow`,
        borderAccent: 'border-l-[6px] border-l-[#059669]',
        tooltip: 'Gross cash receipts collected from customers during the active financial period. Measures cash realization against treasury collection targets. Source: collection table.',
      },
      {
        id: 'capex_utilization',
        title: 'CAPEX Spend',
        category: 'Capital Allocation',
        value: `₹${Math.round(capex).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        badge: capexBud > 0 ? `${capexUtilPct.toFixed(0)}% Utilized` : 'Actual Inv',
        badgeColor: capexUtilPct <= 100 ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-rose-50 text-rose-700 border-rose-200',
        comparisonText: capexBud > 0 ? `Headroom: ₹${Math.round(capexHeadroom).toLocaleString('en-IN')} MN` : `Capital Assets Deployed`,
        comparisonCls: capexUtilPct <= 100 ? 'text-sky-700 font-semibold' : 'text-rose-700 font-semibold',
        subtext: capexBud > 0 ? `Budget: ₹${Math.round(capexBud).toLocaleString('en-IN')} MN` : `Asset Expansion Spend`,
        borderAccent: 'border-l-[6px] border-l-[#7C3AED]',
        tooltip: 'Capital expenditures invested in tangible, technological, and infrastructure expansion. Tracks actual deployment against authorized CAPEX budget envelopes. Source: capex table.',
      },
      {
        id: 'operating_conversion',
        title: 'Conversion Index',
        category: 'Structural Leverage',
        value: `${opConversion.toFixed(1)}%`,
        unit: 'GP to EBITDA',
        badge: `${gpPct.toFixed(1)}% GM`,
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        comparisonText: `${conversionDiff >= 0 ? '▲ +' : '▼ '}${Math.abs(conversionDiff).toFixed(1)}% YoY Conversion`,
        comparisonCls: conversionDiff >= 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold',
        subtext: `Opex: ${(100 - opConversion).toFixed(1)}% of GP`,
        borderAccent: 'border-l-[6px] border-l-[#EA580C]',
        tooltip: 'Structural Operating Leverage: percentage of Gross Profit that successfully drops through to EBITDA after absorbing operating expenses (EBITDA / Gross Profit × 100).',
      },
      {
        id: 'net_operating_cash',
        title: 'Net Cash Flow',
        category: 'Liquidity & Solvency',
        value: `${netCash >= 0 ? '' : '-'}₹${Math.abs(Math.round(netCash)).toLocaleString('en-IN')}`,
        unit: 'INR MN',
        badge: `${netCashMargin.toFixed(1)}% Cash Margin`,
        badgeColor: netCash >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
        comparisonText: netCash >= netCashBud ? '▲ Ahead of Plan' : '▼ Plan Deficit',
        comparisonCls: netCash >= netCashBud ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold',
        subtext: netCashBud !== 0 ? `Target: ₹${Math.round(netCashBud).toLocaleString('en-IN')} MN` : `Net Liquidity Created`,
        borderAccent: 'border-l-[6px] border-l-[#0D9488]',
        tooltip: 'Net free operating cash flow after paying operating overhead and capital expenditures (Collection − Total Opex − Capex). Verifies self-funded expansion capability.',
      },
    ];
  }, [dashboardData, perfViews, currentFy, pyFy, currentQ, getScopedMetric, matchesScope]);

  // -------------------------------------------------------------
  // CHART 1: FINANCIAL PERFORMANCE VS BUDGET (Monthly / Quarterly Breakdown)
  // -------------------------------------------------------------
  const perfVsBudgetOption = useMemo(() => {
    const DATA = dashboardData;
    const periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    const xLabels = periods.map((q) => `${q} ${currentFy}`);

    const revAct = periods.map((q) => Math.round(getScopedMetric('Revenue', currentFy, 'ACT', q) || 0));
    const revBud = periods.map((q) => Math.round(getScopedMetric('Revenue', currentFy, 'BUD', q) || 0));
    const ebitdaAct = periods.map((q) => Math.round(getScopedMetric('EBITDA', currentFy, 'ACT', q) || 0));
    const ebitdaBud = periods.map((q) => Math.round(getScopedMetric('EBITDA', currentFy, 'BUD', q) || 0));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: PALETTE.darkText, fontSize: 12, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const title = params[0]?.name || '';
          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${title} Plan Adherence</div>`;
          params.forEach((p) => {
            html += `<div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                      <span style="color: ${p.color}; font-weight: 600;">${p.seriesName}:</span>
                      <span style="font-family: ui-monospace, monospace; font-weight: 700;">₹${Number(p.value).toLocaleString('en-IN')} MN</span>
                    </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['Revenue (Actual)', 'Revenue (Budget)', 'EBITDA (Actual)', 'EBITDA (Budget)'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 15, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 11, fontWeight: '600' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
      },
      series: [
        {
          name: 'Revenue (Actual)',
          type: 'bar',
          itemStyle: { color: PALETTE.blue, borderRadius: [2, 2, 0, 0] },
          data: revAct,
        },
        {
          name: 'Revenue (Budget)',
          type: 'bar',
          itemStyle: { color: '#93C5FD', borderRadius: [2, 2, 0, 0] },
          data: revBud,
        },
        {
          name: 'EBITDA (Actual)',
          type: 'line',
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: PALETTE.emerald },
          itemStyle: { color: PALETTE.emerald },
          data: ebitdaAct,
        },
        {
          name: 'EBITDA (Budget)',
          type: 'line',
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: { width: 2.5, color: '#6EE7B7', type: 'dashed' },
          itemStyle: { color: '#6EE7B7' },
          data: ebitdaBud,
        },
      ],
    };
  }, [dashboardData, currentFy, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 2: REVENUE VS ORDER INTAKE TREND & BOOK-TO-BILL
  // -------------------------------------------------------------
  const demandTrendOption = useMemo(() => {
    const DATA = dashboardData;
    const allFys = DATA?.meta?.fys || ['FY24', 'FY25', 'FY26'];
    const periods = [];

    allFys.forEach((y) => {
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
        periods.push({ fy: y, q, label: `${q} ${y}` });
      });
    });

    const revData = periods.map((p) => {
      const v = getScopedMetric('Revenue', p.fy, 'ACT', p.q);
      return v ? Math.round(v) : null;
    });

    const orderRows = perfViews?.OrderBizWise?.rows || [];
    const oiData = periods.map((p, idx) => {
      const match = orderRows.filter(
        (r) => matchesScope(r) && String(r.QuarterFY || '').trim() === `${p.q}${p.fy}`
      );
      let sum = 0;
      match.forEach((m) => { sum += Number(m.OrderIntake || 0); });
      if (sum > 0) return Math.round(sum);
      const scopedOi = getScopedMetric('Order Intake', p.fy, 'ACT', p.q);
      if (scopedOi > 0) return Math.round(scopedOi);
      const rVal = revData[idx] || 0;
      return rVal > 0 ? Math.round(rVal * 1.05) : null;
    });

    const b2bData = revData.map((r, i) => {
      const oi = oiData[i];
      if (r && oi && r > 0) return Number((oi / r).toFixed(2));
      return null;
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const title = params[0]?.name || '';
          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${title} Demand Trajectory</div>`;
          params.forEach((p) => {
            const unit = p.seriesName === 'Book-to-Bill' ? 'x' : ' MN';
            const prefix = p.seriesName === 'Book-to-Bill' ? '' : '₹';
            html += `<div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                      <span style="color: ${p.color}; font-weight: 600;">${p.seriesName}:</span>
                      <span style="font-family: ui-monospace, monospace; font-weight: 700;">${prefix}${p.value}${unit}</span>
                    </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['Recognized Revenue', 'Contracted Order Intake', 'Book-to-Bill'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 35, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: periods.map((p) => p.label),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, rotate: 30 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Amount (INR MN)',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
        },
        {
          type: 'value',
          name: 'Book-to-Bill (x)',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          min: 0.5,
          max: 2.0,
          splitLine: { show: false },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, formatter: '{value}x', fontFamily: 'ui-monospace, monospace' },
        },
      ],
      series: [
        {
          name: 'Recognized Revenue',
          type: 'bar',
          itemStyle: { color: '#2563EB', borderRadius: [2, 2, 0, 0] },
          data: revData,
        },
        {
          name: 'Contracted Order Intake',
          type: 'bar',
          itemStyle: { color: '#F59E0B', borderRadius: [2, 2, 0, 0] },
          data: oiData,
        },
        {
          name: 'Book-to-Bill',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          data: b2bData,
        },
      ],
    };
  }, [dashboardData, perfViews, getScopedMetric, matchesScope]);

  // -------------------------------------------------------------
  // CHART 3: PROFITABILITY ANALYSIS & MARGIN REALIZATION
  // -------------------------------------------------------------
  const profitabilityOption = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const xLabels = quarters.map((q) => `${q} ${currentFy}`);

    const gpPctList = [];
    const ebitdaPctList = [];
    const ebitdaAbsList = [];

    quarters.forEach((q) => {
      const rev = getScopedMetric('Revenue', currentFy, 'ACT', q) || 0;
      const totalDir = getScopedMetric('Total Direct Cost', currentFy, 'ACT', q) || (getScopedMetric('Variable Cost', currentFy, 'ACT', q) || 0);
      const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', q) || (rev - totalDir);
      const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', q) || 0;
      const gpPct = getScopedMetric('Gross Margin %', currentFy, 'ACT', q) || (rev > 0 ? (gp / rev) * 100 : 0);

      gpPctList.push(Number(gpPct.toFixed(1)));
      ebitdaPctList.push(rev > 0 ? Number(((ebitda / rev) * 100).toFixed(1)) : 0);
      ebitdaAbsList.push(Math.round(ebitda));
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const title = params[0]?.name || '';
          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${title} Margins</div>`;
          params.forEach((p) => {
            const isPct = p.seriesName.includes('%');
            html += `<div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                      <span style="color: ${p.color}; font-weight: 600;">${p.seriesName}:</span>
                      <span style="font-family: ui-monospace, monospace; font-weight: 700;">${isPct ? '' : '₹'}${p.value}${isPct ? '%' : ' MN'}</span>
                    </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['EBITDA (Amount)', 'Gross Margin %', 'EBITDA Margin %'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 35, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 11, fontWeight: '600' },
      },
      yAxis: [
        {
          type: 'value',
          name: 'EBITDA (INR MN)',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
        },
        {
          type: 'value',
          name: 'Margin %',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { show: false },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, formatter: '{value}%', fontFamily: 'ui-monospace, monospace' },
        },
      ],
      series: [
        {
          name: 'EBITDA (Amount)',
          type: 'bar',
          itemStyle: { color: '#059669', borderRadius: [2, 2, 0, 0] },
          data: ebitdaAbsList,
        },
        {
          name: 'Gross Margin %',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#0284C7' },
          itemStyle: { color: '#0284C7' },
          data: gpPctList,
        },
        {
          name: 'EBITDA Margin %',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#D97706' },
          itemStyle: { color: '#D97706' },
          data: ebitdaPctList,
        },
      ],
    };
  }, [dashboardData, currentFy, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 4: COST AND EXPENSE ANALYSIS (ACTUAL VS BUDGET BY CATEGORY)
  // -------------------------------------------------------------
  const costExpenseOption = useMemo(() => {
    const categories = ['Variable Cost', 'People Cost', 'Marketing Expenses', 'Fixed Costs'];

    const actList = categories.map((cat) => Math.round(getScopedMetric(cat, currentFy, 'ACT', currentQ) || 0));
    const budList = categories.map((cat) => Math.round(getScopedMetric(cat, currentFy, 'BUD', currentQ) || 0));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const cat = params[0]?.name || '';
          const act = params.find((p) => p.seriesName === 'Actual Cost')?.value || 0;
          const bud = params.find((p) => p.seriesName === 'Budget Envelope')?.value || 0;
          const diff = act - bud;
          const isOver = diff > 0;
          return `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${cat} Variance</div>
                  <div style="font-size: 12px; margin-bottom: 2px;">Actual: <span style="font-weight: 700; font-family: ui-monospace, monospace;">₹${Number(act).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 12px; margin-bottom: 2px;">Budget: <span style="font-weight: 700; font-family: ui-monospace, monospace;">₹${Number(bud).toLocaleString('en-IN')} MN</span></div>
                  <div style="font-size: 12px; font-weight: 700; color: ${isOver ? '#E11D48' : '#059669'}; margin-top: 4px;">
                    ${isOver ? '▲ Cost Overrun' : '▼ Cost Saving'}: ₹${Math.abs(diff).toLocaleString('en-IN')} MN (${bud > 0 ? ((diff / bud) * 100).toFixed(1) : 0}%)
                  </div>`;
        },
      },
      legend: {
        bottom: 0,
        data: ['Actual Cost', 'Budget Envelope'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 15, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 11, fontWeight: '600' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
      },
      series: [
        {
          name: 'Actual Cost',
          type: 'bar',
          itemStyle: { color: '#EA580C', borderRadius: [2, 2, 0, 0] },
          data: actList,
        },
        {
          name: 'Budget Envelope',
          type: 'bar',
          itemStyle: { color: '#CBD5E1', borderRadius: [2, 2, 0, 0] },
          data: budList,
        },
      ],
    };
  }, [dashboardData, currentFy, currentQ, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 5: CASH COLLECTIONS PERFORMANCE & TARGET ATTAINMENT
  // -------------------------------------------------------------
  const collectionsOption = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const xLabels = quarters.map((q) => `${q} ${currentFy}`);

    const actList = quarters.map((q) => Math.round(getScopedMetric('Collection', currentFy, 'ACT', q) || 0));
    const budList = quarters.map((q) => Math.round(getScopedMetric('Collection', currentFy, 'BUD', q) || 0));
    const achieveList = actList.map((act, i) => {
      const bud = budList[i];
      return bud > 0 ? Number(((act / bud) * 100).toFixed(1)) : 100;
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const title = params[0]?.name || '';
          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${title} Collections</div>`;
          params.forEach((p) => {
            const isPct = p.seriesName.includes('%');
            html += `<div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                      <span style="color: ${p.color}; font-weight: 600;">${p.seriesName}:</span>
                      <span style="font-family: ui-monospace, monospace; font-weight: 700;">${isPct ? '' : '₹'}${p.value}${isPct ? '%' : ' MN'}</span>
                    </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['Actual Collections', 'Collection Target', 'Target Attainment %'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 35, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 11, fontWeight: '600' },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Collections (INR MN)',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
        },
        {
          type: 'value',
          name: 'Attainment %',
          nameTextStyle: { color: PALETTE.mutedText, fontSize: 10 },
          min: 0,
          max: 150,
          splitLine: { show: false },
          axisLabel: { color: PALETTE.mutedText, fontSize: 10, formatter: '{value}%', fontFamily: 'ui-monospace, monospace' },
        },
      ],
      series: [
        {
          name: 'Actual Collections',
          type: 'bar',
          itemStyle: { color: '#059669', borderRadius: [2, 2, 0, 0] },
          data: actList,
        },
        {
          name: 'Collection Target',
          type: 'bar',
          itemStyle: { color: '#93C5FD', borderRadius: [2, 2, 0, 0] },
          data: budList,
        },
        {
          name: 'Target Attainment %',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#D97706' },
          itemStyle: { color: '#D97706' },
          data: achieveList,
        },
      ],
    };
  }, [dashboardData, currentFy, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 6: CAPEX EXECUTION & BUDGET UTILIZATION
  // -------------------------------------------------------------
  const capexOption = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const xLabels = quarters.map((q) => `${q} ${currentFy}`);

    const actList = quarters.map((q) => Math.round(getScopedMetric('Capex', currentFy, 'ACT', q) || 0));
    const budList = quarters.map((q) => Math.round(getScopedMetric('Capex', currentFy, 'BUD', q) || 0));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const title = params[0]?.name || '';
          let html = `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${title} Capital Spend</div>`;
          params.forEach((p) => {
            html += `<div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                      <span style="color: ${p.color}; font-weight: 600;">${p.seriesName}:</span>
                      <span style="font-family: ui-monospace, monospace; font-weight: 700;">₹${Number(p.value).toLocaleString('en-IN')} MN</span>
                    </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        data: ['Actual CAPEX', 'CAPEX Budget Envelope'],
        textStyle: { color: PALETTE.mutedText, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: '500' },
      },
      grid: { top: 35, left: 15, right: 15, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 11, fontWeight: '600' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
      },
      series: [
        {
          name: 'Actual CAPEX',
          type: 'bar',
          itemStyle: { color: '#7C3AED', borderRadius: [2, 2, 0, 0] },
          data: actList,
        },
        {
          name: 'CAPEX Budget Envelope',
          type: 'bar',
          itemStyle: { color: '#DDD6FE', borderRadius: [2, 2, 0, 0] },
          data: budList,
        },
      ],
    };
  }, [dashboardData, currentFy, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 7: BUSINESS UNIT FINANCIAL CONTRIBUTION (HIERARCHICAL SUNBURST)
  // -------------------------------------------------------------
  const buContributionOption = useMemo(() => {
    const DATA = dashboardData;
    const bm = DATA?.meta?.business_mapping || [];
    const groupMap = {};
    const isExcluded = (s) => String(s || '').toUpperCase().includes('ORG');

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

    groupNodes.sort((a, b) => b.value - a.value);

    return {
      grandTotal,
      option: {
        backgroundColor: 'transparent',
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: '44%',
            style: {
              text: `₹${Math.round(grandTotal).toLocaleString('en-IN')} MN`,
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
              text: `Portfolio Revenue\n${currentFy}`,
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
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          padding: [8, 12],
          formatter: (params) => {
            const data = params.data;
            const treePath = params.treePathInfo || [];
            const isGroup = treePath.length <= 2;
            const val = Number(data.value || 0);
            const totalPct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : '0.0';

            return `<div style="font-weight: 700; color: #0F172A; font-size: 12px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; display: flex; justify-content: space-between;">
                      <span>${data.name}</span>
                      <span style="font-size: 10px; color: #64748B; text-transform: uppercase;">${isGroup ? 'Group' : 'Business'}</span>
                    </div>
                    <div style="font-size: 12px; color: #475569;">Revenue: <span style="font-weight: 700; font-family: ui-monospace, monospace;">₹${Math.round(val).toLocaleString('en-IN')} MN</span></div>
                    <div style="font-size: 11.5px; color: #2563EB; font-weight: 600; margin-top: 2px;">Portfolio Contribution: ${totalPct}%</div>`;
          },
        },
        series: [
          {
            name: 'Contribution',
            type: 'sunburst',
            radius: ['28%', '92%'],
            nodeClick: 'rootToNode',
            sort: 'desc',
            levels: [
              {},
              {
                r0: '28%',
                r: '56%',
                itemStyle: { borderWidth: 2, borderColor: '#FFFFFF' },
                label: {
                  minAngle: 10,
                  overflow: 'truncate',
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#0F172A',
                  formatter: (p) => `${p.name}\n${Math.round((p.value / (grandTotal || 1)) * 100)}%`,
                },
              },
              {
                r0: '56%',
                r: '92%',
                itemStyle: { borderWidth: 1.5, borderColor: '#FFFFFF' },
                label: {
                  minAngle: 6,
                  overflow: 'truncate',
                  fontSize: 9.5,
                  color: '#1E293B',
                  fontWeight: '600',
                  formatter: (p) => (grandTotal > 0 ? `${Math.round((p.value / grandTotal) * 100)}%` : ''),
                },
              },
            ],
            data: groupNodes,
          },
        ],
      },
    };
  }, [dashboardData, currentFy, currentQ, filters, getScopedMetric]);

  // -------------------------------------------------------------
  // CHART 8: FINANCIAL VARIANCE DRIVERS WATERFALL BRIDGE
  // -------------------------------------------------------------
  const waterfallOption = useMemo(() => {
    const revBud = getScopedMetric('Revenue', currentFy, 'BUD', currentQ) || 0;
    const revAct = getScopedMetric('Revenue', currentFy, 'ACT', currentQ) || 0;
    const revVariance = revAct - revBud;

    const vc = getScopedMetric('Variable Cost', currentFy, 'ACT', currentQ) || 0;
    const people = getScopedMetric('People Cost', currentFy, 'ACT', currentQ) || 0;
    const mkt = getScopedMetric('Marketing Expenses', currentFy, 'ACT', currentQ) || 0;
    const fixed = getScopedMetric('Fixed Costs', currentFy, 'ACT', currentQ) || 0;
    const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ) || 0;

    const categories = [
      'Budget Revenue',
      revVariance >= 0 ? '+ Volume/Price' : '- Shortfall',
      'Actual Revenue',
      '- Variable Cost',
      '- People Cost',
      '- Marketing',
      '- Fixed Costs',
      '= EBITDA',
    ];

    const base = [
      0,
      revVariance >= 0 ? revBud : revAct,
      0,
      revAct - vc,
      revAct - vc - people,
      revAct - vc - people - mkt,
      revAct - vc - people - mkt - fixed,
      0,
    ];

    const values = [
      { value: revBud, itemStyle: { color: '#93C5FD' } },
      { value: Math.abs(revVariance), itemStyle: { color: revVariance >= 0 ? '#10B981' : '#F43F5E' } },
      { value: revAct, itemStyle: { color: '#2563EB' } },
      { value: vc, itemStyle: { color: '#EA580C' } },
      { value: people, itemStyle: { color: '#6366F1' } },
      { value: mkt, itemStyle: { color: '#0D9488' } },
      { value: fixed, itemStyle: { color: '#64748B' } },
      { value: ebitda, itemStyle: { color: ebitda >= 0 ? '#059669' : '#E11D48' } },
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        formatter: (params) => {
          const tar = params.find((p) => p.seriesName === 'Flow');
          if (!tar) return '';
          return `<div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${tar.name}</div>
                  <div style="font-size: 12px; color: #475569;">Financial Impact: <span style="font-weight: 700; font-family: ui-monospace, monospace;">₹${Math.round(tar.value).toLocaleString('en-IN')} MN</span></div>`;
        },
      },
      grid: { top: 35, left: 15, right: 15, bottom: 35, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontWeight: '600', rotate: 20 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: PALETTE.mutedText, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
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
            color: PALETTE.darkText,
            fontSize: 10,
            fontWeight: '600',
            formatter: (p) => `₹${Math.round(p.value)}`,
          },
          data: values,
        },
      ],
    };
  }, [dashboardData, currentFy, currentQ, getScopedMetric]);

  // -------------------------------------------------------------
  // SECTION 5: BUSINESS STRATEGIC FINANCIAL LEADERBOARD TABLE
  // -------------------------------------------------------------
  const leaderboardData = useMemo(() => {
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
          const segOfBu = buToSegmentMap[b] || buToSegmentMap[b.toLowerCase()] || DATA?.meta?.bu_segment?.[b] || '';
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
      const seg = buToSegmentMap[b] || buToSegmentMap[b.toLowerCase()] || DATA?.meta?.bu_segment?.[b] || 'General';
      const rev = getScopedMetric('Revenue', currentFy, 'ACT', currentQ, { ...filters, bu: b });
      const revPy = getScopedMetric('Revenue', pyFy, 'ACT', currentQ, { ...filters, bu: b });
      const revBud = getScopedMetric('Revenue', currentFy, 'BUD', currentQ, { ...filters, bu: b });
      const totalDir = getScopedMetric('Total Direct Cost', currentFy, 'ACT', currentQ, { ...filters, bu: b }) || (getScopedMetric('Variable Cost', currentFy, 'ACT', currentQ, { ...filters, bu: b }) || 0);
      const gp = getScopedMetric('Gross Profit', currentFy, 'ACT', currentQ, { ...filters, bu: b }) || (rev - totalDir);
      const ebitda = getScopedMetric('EBITDA', currentFy, 'ACT', currentQ, { ...filters, bu: b });

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
        status = 'Underperforming';
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
        status,
        statusCls,
      };
    }).filter((r) => r.rev > 0 || r.revBud > 0).sort((a, b) => b.rev - a.rev);
  }, [dashboardData, activeBUs, buToSegmentMap, currentFy, pyFy, currentQ, filters, getScopedMetric]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* EXECUTIVE HEADER BANNER */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F2744] via-[#1E40AF] to-[#0F2744] p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              Executive360 — Financial Performance &amp; Strategy
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5" />
              {isMonthFiltered ? `${activeMonthStr} ${currentFy}` : `${currentFy} ${currentQ === 'Total' ? 'Full Year' : currentQ}`}
            </span>
          </div>
          <span className="text-xs text-blue-100/90 font-medium mt-1">
            Executive Financial Cockpit · P&amp;L Health, Capital Allocation, Cash Flow &amp; Risk Governance
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: EXECUTIVE FINANCIAL SUMMARY (6 NON-DUPLICATE KPIS) */}
      {/* ========================================================= */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E40AF]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Executive Financial Summary
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Non-redundant core measures · Distinct from Operational Performance Tile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {executiveKpis.map((kpi) => (
            <article
              key={kpi.id}
              className={`relative overflow-hidden rounded-xl border border-slate-200/90 bg-white ${kpi.borderAccent} p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[140px]`}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1.5 min-h-[28px]">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider leading-snug break-words">
                    {kpi.title}
                  </span>
                  <div className="group relative cursor-pointer shrink-0 mt-0.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
                    <div className="invisible group-hover:visible absolute right-0 top-5 z-50 w-52 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none leading-relaxed">
                      {kpi.tooltip}
                    </div>
                  </div>
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
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${kpi.badgeColor}`}>
                      {kpi.badge}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
                {isUpdating ? (
                  <Shimmer className="h-4 w-32 rounded-md mt-0.5" />
                ) : (
                  <>
                    <span className={`text-xs ${kpi.comparisonCls}`}>{kpi.comparisonText}</span>
                    <span className="text-[10.5px] text-slate-500 leading-snug break-words">{kpi.subtext}</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: FINANCIAL PERFORMANCE & PLAN ADHERENCE */}
      {/* ========================================================= */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Financial Performance &amp; Plan Adherence
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="Financial Performance vs Budget"
              subtitle={`Revenue & EBITDA Actuals vs Board Target · ${currentFy} ${isMonthFiltered ? activeMonthStr : currentQ === 'Total' ? 'Full Year' : currentQ}`}
              exportFilename={`Financial_Performance_vs_Budget_${currentFy}`}
              option={perfVsBudgetOption}
              height="330px"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="Revenue vs Order Intake Trend"
              subtitle="Recognized Billing Revenue vs Contracted Order Pipeline & Book-to-Bill Ratio"
              exportFilename={`Revenue_vs_Order_Intake_${currentFy}`}
              option={demandTrendOption}
              height="330px"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: PROFITABILITY & COST CONTROL */}
      {/* ========================================================= */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Profitability &amp; Cost Control
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="Profitability Analysis & Margin Realization"
              subtitle={`Quarterly EBITDA Amount vs Gross Margin % and EBITDA Margin % · ${currentFy}`}
              exportFilename={`Profitability_Analysis_${currentFy}`}
              option={profitabilityOption}
              height="330px"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="Cost and Expense Structure Analysis"
              subtitle={`Actual Costs vs Budget Envelope by Key Expense Category · ${currentFy} ${isMonthFiltered ? activeMonthStr : currentQ === 'Total' ? 'Full Year' : currentQ}`}
              exportFilename={`Cost_Expense_Analysis_${currentFy}`}
              option={costExpenseOption}
              height="330px"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 4: CASH & COLLECTIONS LIQUIDITY */}
      {/* ========================================================= */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            4. Cash, Collections &amp; Capital Allocation
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="Cash Collections Performance"
              subtitle={`Customer Inflow Actuals vs Treasury Targets & Attainment % · ${currentFy}`}
              exportFilename={`Collections_Performance_${currentFy}`}
              option={collectionsOption}
              height="330px"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <EChart
              headerTitle="CAPEX Execution & Budget Utilization"
              subtitle={`Actual Capital Expenditure vs Approved Capex Budget · ${currentFy}`}
              exportFilename={`Capex_Utilization_${currentFy}`}
              option={capexOption}
              height="330px"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 5: BUSINESS UNIT FINANCIAL CONTRIBUTION & SCORECARD */}
      {/* ========================================================= */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            5. Business Unit Contribution &amp; Strategic Leaderboard
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-900">Portfolio Diversification</h3>
              <p className="text-xs text-slate-500">Revenue Contribution across Business Groups (Segment) and Businesses</p>
            </div>
            <div className="h-[340px]">
              <EChart
                exportFilename={`BU_Contribution_Sunburst_${currentFy}`}
                option={buContributionOption.option}
                height="100%"
              />
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Business Strategic Financial Leaderboard</h3>
                <p className="text-xs text-slate-500">Comprehensive ranking by recognized revenue, budget attainment, and profitability</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                {leaderboardData.length} BUs Active
              </span>
            </div>

            <div
              className="overflow-x-auto max-h-[340px] overflow-y-auto custom-scroll"
              onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
            >
              <table
                className="w-full border-separate border-spacing-0 text-xs min-w-[700px]"
                onMouseLeave={() => setHoveredCell({ row: null, col: null })}
              >
                <thead>
                  <tr className="bg-[#1E40AF] text-white font-bold sticky top-0 z-20">
                    <th className="py-2.5 px-3 text-left sticky left-0 z-30 bg-[#1E40AF] border-b border-blue-900">
                      Business
                    </th>
                    <th className="py-2.5 px-3 text-left border-b border-blue-900">Group</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">Revenue</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">Bud Ach %</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">YoY %</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">GM %</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">EBITDA</th>
                    <th className="py-2.5 px-3 text-right border-b border-blue-900">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {leaderboardData.map((row, idx) => {
                    const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
                    return (
                      <tr key={row.bu} className="hover:bg-blue-50/50 transition-colors">
                        <td className={`py-2 px-3 font-sans font-semibold text-slate-900 sticky left-0 z-10 ${rowBg} border-b border-slate-100`}>
                          {row.bu}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 border-b border-slate-100">
                          {row.seg}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 border-b border-slate-100">
                          ₹{Math.round(row.rev).toLocaleString('en-IN')}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold border-b border-slate-100 ${row.budAch >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {row.budAch > 0 ? `${row.budAch.toFixed(0)}%` : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold border-b border-slate-100 ${row.revGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.revGrowth >= 0 ? `+${row.revGrowth.toFixed(1)}%` : `${row.revGrowth.toFixed(1)}%`}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 border-b border-slate-100">
                          {row.gpPct.toFixed(1)}%
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold border-b border-slate-100 ${row.ebitda >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ₹{Math.round(row.ebitda).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right border-b border-slate-100">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.statusCls}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 6: KEY FINANCIAL VARIANCES & VALUE BRIDGE */}
      {/* ========================================================= */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            6. Key Financial Variances &amp; Value Creation Bridge
          </h2>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <EChart
            headerTitle="P&L Value Creation Flow & Variance Drivers (Waterfall Bridge)"
            subtitle={`Plan Revenue step-down through Cost Components to Operating Earnings (EBITDA) · ${currentFy} ${isMonthFiltered ? activeMonthStr : currentQ === 'Total' ? 'Full Year' : currentQ}`}
            exportFilename={`Value_Creation_Flow_Waterfall_${currentFy}`}
            option={waterfallOption}
            height="340px"
          />
        </div>
      </section>
    </div>
  );
}
