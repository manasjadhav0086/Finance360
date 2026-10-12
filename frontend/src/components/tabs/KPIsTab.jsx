import React, { useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';

const ENTERPRISE_KEYWORDS = ['tech', 'lateral', 'sse', 'etls', 'bips', 'rps', 'stackroute', 'enterprise'];
const CONSUMER_KEYWORDS = ['digital', 'china', 'tpaas', 'em', 'skills', 'snc'];

const KPI_DEFINITIONS = {
  enterprise: [
    {
      id: 'oi',
      label: 'Total Order Intake',
      uom: 'INR Mn / sum',
      type: 'amount',
      decimals: 1,
    },
    {
      id: 'sales_prod',
      label: 'Sales Person Productivity',
      uom: 'INR K / month',
      type: 'amount',
      decimals: 0,
    },
    {
      id: 'rev_fte',
      label: 'Revenue per FTE',
      uom: 'INR K / month',
      type: 'amount',
      decimals: 0,
    },
    {
      id: 'cost_fte',
      label: 'Cost per FTE',
      uom: 'INR K / month',
      type: 'amount',
      decimals: 0,
    },
    {
      id: 'people_cost_fte',
      label: 'People Cost per FTE',
      uom: 'INR K / month',
      type: 'amount',
      decimals: 0,
    },
  ],
  consumer: [
    {
      id: 'enrolments',
      label: 'Enrolments',
      uom: 'Count',
      type: 'count',
      decimals: 0,
    },
    {
      id: 'cac',
      label: 'Avg Cost of Acquisition',
      uom: '%',
      type: 'percent',
      decimals: 1,
    },
    {
      id: 'asf',
      label: 'ASF',
      uom: 'INR K / month',
      type: 'amount',
      decimals: 1,
    },
    {
      id: 'order_intake',
      label: 'Order Intake',
      uom: 'INR Mn',
      type: 'amount',
      decimals: 1,
    },
  ],
  financial: [
    { id: 'rev', key: 'Revenue', label: 'Revenue', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'vc', key: 'Variable Cost', label: 'Variable Cost', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'gm_pct', key: 'Gross Margin %', label: 'Gross Margin %', uom: '%', type: 'percent', isRatio: 'gp' },
    { id: 'opex', key: 'Total Opex', label: 'Total Opex', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'ebc', key: 'EBITDA Contribution', label: 'EBITDA Contribution', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'ebc_pct', key: 'EBITDA Contribution %', label: 'EBITDA Contribution %', uom: '%', type: 'percent', isRatio: 'ebc' },
    { id: 'ebitda', key: 'EBITDA', label: 'EBITDA', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'ebitda_pct', key: 'EBITDA %', label: 'EBITDA %', uom: '%', type: 'percent', isRatio: 'ebitda' },
    { id: 'collection', key: 'Collection', label: 'Collection', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'capex', key: 'Capex', label: 'Capex', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'net_cash', key: 'Net Cash', label: 'Net Cash', uom: 'INR Mn', type: 'amount', direct: true },
  ],
  business: [
    { id: 'tot_oi', key: 'Order Intake', label: 'Total Order Intake', uom: 'INR Mn', type: 'amount', direct: true },
    { id: 'b_rev_fte', key: 'Revenue', label: 'Revenue per FTE', uom: 'INR K / month', type: 'amount', isRatio: 'rev_hc' },
    { id: 'b_sales_prod', key: 'Order Intake', label: 'Sales Person Productivity', uom: 'INR K / month', type: 'amount', isRatio: 'sales_prod' },
    { id: 'b_cost_fte', key: 'Total Opex', label: 'Cost per FTE', uom: 'INR K / month', type: 'amount', isRatio: 'cost_hc' },
    { id: 'b_vc_pct', key: 'VC%', label: 'Avg Cost of Acquisition', uom: '%', type: 'percent', isRatio: 'vc' },
    { id: 'b_ppl_fte', key: 'People Cost', label: 'People Cost per FTE', uom: 'INR K / month', type: 'amount', isRatio: 'people_hc' },
    { id: 'b_enrol', key: 'Learners Count', label: 'Enrolments', uom: 'Count', type: 'count', direct: true },
    { id: 'b_asf', key: 'Revenue', label: 'ASF', uom: 'INR K / month', type: 'amount', isRatio: 'asf' },
  ],
};

export default function KPIsTab({
  filters = {},
  dashboardData = {},
  getScopedMetric = () => 0,
  isUpdating = false,
}) {
  const [mode, setMode] = useState('enterprise');
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { hoveredCell, setHoveredCell, getCellBg } = useTableHover();

  const fy = filters.fy || dashboardData?.meta?.budget_fy || dashboardData?.meta?.fys?.slice(-1)[0] || 'FY26';
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'Total'];

  // Drill-down expanded sets
  const [expandedMetrics, setExpandedMetrics] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Build Business Groups and Businesses hierarchy based on active mode
  const hierarchy = useMemo(() => {
    const bm = dashboardData?.meta?.business_mapping || [];
    const buSegment = dashboardData?.meta?.bu_segment || {};
    const allBus = dashboardData?.meta?.biz_units || Object.keys(dashboardData?.bu || {});

    const groupMap = new Map();

    const addPair = (group, bu) => {
      const gNorm = String(group || '').trim();
      const bNorm = String(bu || '').trim();
      if (!bNorm || bNorm.toUpperCase() === 'NYJ' || bNorm.toUpperCase().includes('DCO')) return;
      if (gNorm.toUpperCase().includes('DCO')) return;

      const norm = bNorm.toLowerCase();
      const gLow = gNorm.toLowerCase();

      if (mode === 'enterprise') {
        const isEnt = ENTERPRISE_KEYWORDS.some((kw) => norm.includes(kw) || gLow.includes(kw));
        const isCons = ['china', 'tpaas', 'em'].some((kw) => norm === kw || norm.includes(kw)) ||
          (gLow.includes('digital') && (norm === 'digital' || norm.includes('skills') || norm.includes('snc')));
        if (!isEnt || isCons) return;
      } else if (mode === 'consumer') {
        const isCons = CONSUMER_KEYWORDS.some((kw) => norm.includes(kw) || gLow.includes(kw));
        const isEnt = ['lateral', 'tech', 'sse', 'etls'].some((kw) => norm === kw || norm.includes(kw)) ||
          (gLow.includes('etls') || gLow.includes('bips'));
        if (!isCons || isEnt) return;
      }

      const cleanGroup = gNorm.replace(/^\d+\s*/, '') || 'Other Group';
      if (!groupMap.has(cleanGroup)) {
        groupMap.set(cleanGroup, new Set());
      }
      groupMap.get(cleanGroup).add(bNorm);
    };

    if (Array.isArray(bm) && bm.length > 0) {
      bm.forEach((r) => {
        const seg = r.segment_n || r.segment || r.Segment || '';
        const biz = r.biz1_n || r.biz1 || r.Biz1 || '';
        addPair(seg, biz);
      });
    }

    allBus.forEach((b) => {
      const seg = buSegment[b] || 'Other Group';
      addPair(seg, b);
    });

    return Array.from(groupMap.entries())
      .map(([groupName, buSet]) => ({
        groupName,
        businesses: Array.from(buSet).sort(),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [dashboardData, mode]);

  // All matching BUs for top-level mode
  const allMatchingBus = useMemo(() => {
    const set = new Set();
    hierarchy.forEach((h) => {
      h.businesses.forEach((b) => set.add(b));
    });
    return Array.from(set);
  }, [hierarchy]);

  // Helper to extract metric sum for a set of BUs
  const getScopedGroupMetric = useMemo(() => {
    return (targetBus, metric, scenario, q) => {
      if (!targetBus || targetBus.length === 0) return 0;
      let sum = 0;
      let found = false;

      for (const bu of targetBus) {
        const node = dashboardData?.bu?.[bu]?.[fy]?.[scenario]?.[q];
        if (node && node[metric] !== undefined && node[metric] !== null && !isNaN(node[metric])) {
          sum += Number(node[metric]);
          found = true;
        }
      }

      return found ? sum : 0;
    };
  }, [dashboardData, fy]);

  // Calculate cell values for a given metric and target BUs
  const calculateCells = useMemo(() => {
    return (row, targetBus) => {
      const cells = {};

      quarters.forEach((q) => {
        const monthCount = q === 'Total' ? 12 : 3;
        let finalAct = null;
        let finalBud = null;

        if (mode === 'enterprise') {
          const oiAct = getScopedGroupMetric(targetBus, 'Order Intake', 'ACT', q);
          const oiBud = getScopedGroupMetric(targetBus, 'Order Intake', 'BUD', q);
          const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
          const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
          const opexAct = getScopedGroupMetric(targetBus, 'Total Opex', 'ACT', q) || getScopedGroupMetric(targetBus, 'SG&A Cost', 'ACT', q);
          const opexBud = getScopedGroupMetric(targetBus, 'Total Opex', 'BUD', q) || getScopedGroupMetric(targetBus, 'SG&A Cost', 'BUD', q);
          const peopleAct = getScopedGroupMetric(targetBus, 'People Cost', 'ACT', q);
          const peopleBud = getScopedGroupMetric(targetBus, 'People Cost', 'BUD', q);
          const hcAct = getScopedGroupMetric(targetBus, 'Headcount', 'ACT', q);
          const hcBud = getScopedGroupMetric(targetBus, 'Headcount', 'BUD', q);
          const shcAct = getScopedGroupMetric(targetBus, 'Sales Headcount', 'ACT', q) || (hcAct > 0 ? hcAct : 0);
          const shcBud = getScopedGroupMetric(targetBus, 'Sales Headcount', 'BUD', q) || (hcBud > 0 ? hcBud : 0);

          if (row.id === 'oi') {
            finalAct = oiAct;
            finalBud = oiBud;
          } else if (row.id === 'sales_prod') {
            finalAct = shcAct > 0 ? (oiAct * 1000) / (shcAct * monthCount) : null;
            finalBud = shcBud > 0 ? (oiBud * 1000) / (shcBud * monthCount) : null;
          } else if (row.id === 'rev_fte') {
            finalAct = hcAct > 0 ? (revAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (revBud * 1000) / (hcBud * monthCount) : null;
          } else if (row.id === 'cost_fte') {
            finalAct = hcAct > 0 ? (opexAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (opexBud * 1000) / (hcBud * monthCount) : null;
          } else if (row.id === 'people_cost_fte') {
            finalAct = hcAct > 0 ? (peopleAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (peopleBud * 1000) / (hcBud * monthCount) : null;
          }
        } else if (mode === 'consumer') {
          const enrolAct = getScopedGroupMetric(targetBus, 'Learners Count', 'ACT', q);
          const enrolBud = getScopedGroupMetric(targetBus, 'Learners Count', 'BUD', q);
          const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
          const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
          const vcAct = getScopedGroupMetric(targetBus, 'Variable Cost', 'ACT', q);
          const vcBud = getScopedGroupMetric(targetBus, 'Variable Cost', 'BUD', q);
          const oiAct = getScopedGroupMetric(targetBus, 'Order Intake', 'ACT', q);
          const oiBud = getScopedGroupMetric(targetBus, 'Order Intake', 'BUD', q);

          if (row.id === 'enrolments') {
            finalAct = enrolAct;
            finalBud = enrolBud;
          } else if (row.id === 'cac') {
            finalAct = revAct > 0 ? (vcAct / revAct) * 100 : null;
            finalBud = revBud > 0 ? (vcBud / revBud) * 100 : null;
          } else if (row.id === 'asf') {
            const baseAct = revAct > 0 ? revAct : oiAct;
            const baseBud = revBud > 0 ? revBud : oiBud;
            finalAct = enrolAct > 0 ? (baseAct * 1000) / enrolAct : null;
            finalBud = enrolBud > 0 ? (baseBud * 1000) / enrolBud : null;
          } else if (row.id === 'order_intake') {
            finalAct = oiAct;
            finalBud = oiBud;
          }
        } else if (mode === 'financial') {
          if (row.isRatio === 'gp') {
            const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
            const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
            const gpAct = getScopedGroupMetric(targetBus, 'Gross Profit', 'ACT', q);
            const gpBud = getScopedGroupMetric(targetBus, 'Gross Profit', 'BUD', q);
            finalAct = revAct > 0 ? (gpAct / revAct) * 100 : null;
            finalBud = revBud > 0 ? (gpBud / revBud) * 100 : null;
          } else if (row.isRatio === 'ebitda') {
            const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
            const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
            const ebAct = getScopedGroupMetric(targetBus, 'EBITDA', 'ACT', q);
            const ebBud = getScopedGroupMetric(targetBus, 'EBITDA', 'BUD', q);
            finalAct = revAct > 0 ? (ebAct / revAct) * 100 : null;
            finalBud = revBud > 0 ? (ebBud / revBud) * 100 : null;
          } else if (row.isRatio === 'ebc') {
            const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
            const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
            const ebcAct = getScopedGroupMetric(targetBus, 'EBITDA Contribution', 'ACT', q);
            const ebcBud = getScopedGroupMetric(targetBus, 'EBITDA Contribution', 'BUD', q);
            finalAct = revAct > 0 ? (ebcAct / revAct) * 100 : null;
            finalBud = revBud > 0 ? (ebcBud / revBud) * 100 : null;
          } else {
            finalAct = getScopedGroupMetric(targetBus, row.key, 'ACT', q);
            finalBud = getScopedGroupMetric(targetBus, row.key, 'BUD', q);
          }
        } else {
          // Consolidated Business KPIs
          const revAct = getScopedGroupMetric(targetBus, 'Revenue', 'ACT', q);
          const revBud = getScopedGroupMetric(targetBus, 'Revenue', 'BUD', q);
          const hcAct = getScopedGroupMetric(targetBus, 'Headcount', 'ACT', q);
          const hcBud = getScopedGroupMetric(targetBus, 'Headcount', 'BUD', q);
          const shcAct = getScopedGroupMetric(targetBus, 'Sales Headcount', 'ACT', q) || hcAct;
          const shcBud = getScopedGroupMetric(targetBus, 'Sales Headcount', 'BUD', q) || hcBud;

          if (row.isRatio === 'vc') {
            const vcAct = getScopedGroupMetric(targetBus, 'Variable Cost', 'ACT', q);
            const vcBud = getScopedGroupMetric(targetBus, 'Variable Cost', 'BUD', q);
            finalAct = revAct > 0 ? (vcAct / revAct) * 100 : null;
            finalBud = revBud > 0 ? (vcBud / revBud) * 100 : null;
          } else if (row.isRatio === 'rev_hc') {
            finalAct = hcAct > 0 ? (revAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (revBud * 1000) / (hcBud * monthCount) : null;
          } else if (row.isRatio === 'sales_prod') {
            const oiAct = getScopedGroupMetric(targetBus, 'Order Intake', 'ACT', q);
            const oiBud = getScopedGroupMetric(targetBus, 'Order Intake', 'BUD', q);
            finalAct = shcAct > 0 ? (oiAct * 1000) / (shcAct * monthCount) : null;
            finalBud = shcBud > 0 ? (oiBud * 1000) / (shcBud * monthCount) : null;
          } else if (row.isRatio === 'cost_hc') {
            const opexAct = getScopedGroupMetric(targetBus, 'Total Opex', 'ACT', q) || getScopedGroupMetric(targetBus, 'SG&A Cost', 'ACT', q);
            const opexBud = getScopedGroupMetric(targetBus, 'Total Opex', 'BUD', q) || getScopedGroupMetric(targetBus, 'SG&A Cost', 'BUD', q);
            finalAct = hcAct > 0 ? (opexAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (opexBud * 1000) / (hcBud * monthCount) : null;
          } else if (row.isRatio === 'people_hc') {
            const pAct = getScopedGroupMetric(targetBus, 'People Cost', 'ACT', q);
            const pBud = getScopedGroupMetric(targetBus, 'People Cost', 'BUD', q);
            finalAct = hcAct > 0 ? (pAct * 1000) / (hcAct * monthCount) : null;
            finalBud = hcBud > 0 ? (pBud * 1000) / (hcBud * monthCount) : null;
          } else if (row.isRatio === 'asf') {
            const enrolAct = getScopedGroupMetric(targetBus, 'Learners Count', 'ACT', q);
            const enrolBud = getScopedGroupMetric(targetBus, 'Learners Count', 'BUD', q);
            finalAct = enrolAct > 0 ? (revAct * 1000) / enrolAct : null;
            finalBud = enrolBud > 0 ? (revBud * 1000) / enrolBud : null;
          } else {
            finalAct = getScopedGroupMetric(targetBus, row.key, 'ACT', q);
            finalBud = getScopedGroupMetric(targetBus, row.key, 'BUD', q);
          }
        }

        cells[q] = { budget: finalBud, actual: finalAct };
      });

      return cells;
    };
  }, [mode, quarters, getScopedGroupMetric]);

  const rows = KPI_DEFINITIONS[mode] || KPI_DEFINITIONS.enterprise;

  // Build complete table tree: Metric -> Business Group -> Business
  const tableTree = useMemo(() => {
    return rows.map((metricRow) => {
      const topCells = calculateCells(metricRow, allMatchingBus);

      const groups = hierarchy.map((g) => {
        const groupCells = calculateCells(metricRow, g.businesses);
        const businesses = g.businesses.map((b) => {
          const buCells = calculateCells(metricRow, [b]);
          return {
            business: b,
            cells: buCells,
          };
        });

        return {
          groupName: g.groupName,
          cells: groupCells,
          businesses,
        };
      });

      return {
        ...metricRow,
        cells: topCells,
        groups,
      };
    });
  }, [rows, hierarchy, allMatchingBus, calculateCells]);

  // Toggle helpers
  const toggleMetric = (metricId) => {
    setExpandedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  };

  const toggleGroup = (metricId, groupName) => {
    const key = `${metricId}:::${groupName}`;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isAllExpanded = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((r) => expandedMetrics.has(r.id));
  }, [rows, expandedMetrics]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedMetrics(new Set());
      setExpandedGroups(new Set());
    } else {
      const allM = new Set(rows.map((r) => r.id));
      const allG = new Set();
      rows.forEach((r) => {
        hierarchy.forEach((h) => {
          allG.add(`${r.id}:::${h.groupName}`);
        });
      });
      setExpandedMetrics(allM);
      setExpandedGroups(allG);
    }
  };

  const pnlFmtAmt = (v, decimals = 0) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (Math.abs(v) < 0.001) return '0';
    if (decimals > 0) {
      return Number(v).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return Math.round(v).toLocaleString('en-IN');
  };

  const pnlFmtPct = (v, decimals = 1) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return `${Number(v).toFixed(decimals)}%`;
  };

  const pnlFmtCount = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Math.round(v).toLocaleString('en-IN');
  };

  const renderValue = (val, row) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (row.type === 'percent') return pnlFmtPct(val, row.decimals ?? 1);
    if (row.type === 'count') return pnlFmtCount(val);
    return pnlFmtAmt(val, row.decimals ?? 0);
  };

  const getTabTitle = () => {
    switch (mode) {
      case 'enterprise':
        return 'Enterprise / Sales Productivity (ETLS & BIPS)';
      case 'consumer':
        return 'Consumer / Learner Unit Economics (Digital, China, TPaaS, EM)';
      case 'financial':
        return 'Financial & Cash Flow Indicators';
      case 'business':
      default:
        return 'Consolidated Business Operations KPIs';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">KPIs</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Performance Indicators</span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto shadow-xs flex-wrap gap-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'enterprise' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => {
              setMode('enterprise');
              setExpandedMetrics(new Set());
              setExpandedGroups(new Set());
            }}
          >
            🏢 Enterprise Productivity
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'consumer' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => {
              setMode('consumer');
              setExpandedMetrics(new Set());
              setExpandedGroups(new Set());
            }}
          >
            👥 Consumer Economics
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'financial' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => {
              setMode('financial');
              setExpandedMetrics(new Set());
              setExpandedGroups(new Set());
            }}
          >
            📈 Financial KPIs
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${mode === 'business' ? 'bg-[#249791] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}
            onClick={() => {
              setMode('business');
              setExpandedMetrics(new Set());
              setExpandedGroups(new Set());
            }}
          >
            📊 Consolidated KPIs
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-white tracking-tight">
              {getTabTitle()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 cursor-pointer shadow-xs"
            >
              {isAllExpanded ? (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5 text-teal-400" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-teal-400" />
                  <span>Expand All</span>
                </>
              )}
            </button>
            <span className="text-xs font-mono text-slate-300 font-medium">{tableTree.length} Indicators</span>
          </div>
        </div>

        <div
          className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
          onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
        >
          <table
            className="w-full border-separate border-spacing-0 text-xs"
            onMouseLeave={() => setHoveredCell({ row: null, col: null })}
          >
            <thead className="bg-[#249791]">
              <tr className="bg-[#249791] text-white font-bold h-[32px]">
                <th
                  rowSpan={2}
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'kpi' })}
                  className={`py-2 px-3 text-left sticky top-0 left-0 z-40 min-w-[240px] border-r border-b border-[#1d827d] align-middle bg-[#249791] text-white font-bold transition-all duration-150 ${hoveredCell.col === 'kpi' ? 'bg-[#1c7b76]' : ''} ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''}`}
                >
                  Metric / Hierarchy
                </th>
                <th
                  rowSpan={2}
                  onMouseEnter={() => setHoveredCell({ row: null, col: 'uom' })}
                  className={`py-2 px-2.5 text-left sticky top-0 z-20 min-w-[95px] border-r border-b border-[#1d827d] align-middle bg-[#249791] text-white font-bold transition-colors ${hoveredCell.col === 'uom' ? 'bg-[#1c7b76]' : ''}`}
                >
                  UOM
                </th>
                {quarters.map((q) => (
                  <th
                    key={q}
                    className={`py-1.5 px-2 text-center sticky top-0 z-20 border-r border-b border-[#1d827d] bg-[#249791] transition-colors ${hoveredCell.col === `${q}_budget` || hoveredCell.col === `${q}_actual` ? 'bg-[#1c7b76] text-white' : 'bg-[#249791] text-white font-bold'}`}
                    colSpan={2}
                  >
                    {q === 'Total' ? `${fy} Full Year` : `${q} ${fy}`}
                  </th>
                ))}
              </tr>
              <tr className="bg-[#1e8580] text-white font-semibold text-[11px] h-[28px]">
                {quarters.map((q) => (
                  <React.Fragment key={q}>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: `${q}_budget` })}
                      className={`py-1 px-2 text-right sticky top-[32px] z-20 border-r border-b border-[#176a66] min-w-[55px] transition-colors ${hoveredCell.col === `${q}_budget` ? 'bg-[#1c7873] text-teal-50 font-bold' : 'bg-[#23928c] text-teal-50 font-semibold'}`}
                    >
                      Bud.
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCell({ row: null, col: `${q}_actual` })}
                      className={`py-1 px-2 text-right sticky top-[32px] z-20 border-r border-b border-[#176a66] min-w-[55px] transition-colors ${hoveredCell.col === `${q}_actual` ? 'bg-[#176a66] text-white font-bold' : 'bg-[#1e8580] text-white font-bold'}`}
                    >
                      Act.
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[12.5px]">
              {tableTree.map((metricRow, mIdx) => {
                const isMetricExpanded = expandedMetrics.has(metricRow.id);
                const hasSubGroups = (metricRow.groups || []).length > 0;

                return (
                  <Fragment key={metricRow.id}>
                    {/* Top Level Metric Row */}
                    <tr className="bg-slate-100/90 font-bold border-b border-slate-300">
                      <td
                        onMouseEnter={() => setHoveredCell({ row: metricRow.id, col: 'kpi' })}
                        className={`py-2.5 px-3 font-sans font-bold text-slate-900 sticky left-0 z-10 min-w-[240px] bg-slate-100 border-r border-b border-slate-300 transition-shadow duration-150 ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]' : ''}`}
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none hover:text-[#249791] transition-colors"
                          onClick={() => hasSubGroups && toggleMetric(metricRow.id)}
                        >
                          {hasSubGroups ? (
                            isMetricExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#249791] shrink-0 stroke-[2.5]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 stroke-[2.5]" />
                            )
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className="text-[13px]">{metricRow.label}</span>
                        </div>
                      </td>
                      <td
                        onMouseEnter={() => setHoveredCell({ row: metricRow.id, col: 'uom' })}
                        className="py-2.5 px-2.5 font-sans font-medium text-slate-500 min-w-[95px] bg-slate-100 border-r border-b border-slate-300"
                      >
                        <span className="inline-block px-1.5 py-0.5 rounded bg-white text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                          {metricRow.uom}
                        </span>
                      </td>

                      {quarters.map((q) => {
                        const c = metricRow.cells?.[q] || {};
                        const isNegAct = c.actual !== null && c.actual < 0;
                        const isNegBud = c.budget !== null && c.budget < 0;

                        return (
                          <React.Fragment key={q}>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: metricRow.id, col: `${q}_budget` })}
                              className={`py-2.5 px-2 text-right border-r border-b border-slate-300 bg-slate-100 font-bold ${isNegBud ? 'text-rose-600' : 'text-slate-700'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.budget, metricRow)}
                            </td>
                            <td
                              onMouseEnter={() => setHoveredCell({ row: metricRow.id, col: `${q}_actual` })}
                              className={`py-2.5 px-2 text-right font-bold border-r border-b border-slate-300 bg-slate-100 ${isNegAct ? 'text-rose-600' : 'text-slate-950'}`}
                            >
                              {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.actual, metricRow)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Business Group Level */}
                    {isMetricExpanded &&
                      metricRow.groups.map((group) => {
                        const gKey = `${metricRow.id}:::${group.groupName}`;
                        const isGroupExpanded = expandedGroups.has(gKey);
                        const hasBus = (group.businesses || []).length > 0;

                        return (
                          <Fragment key={gKey}>
                            <tr className="bg-slate-50/80 font-semibold border-b border-slate-200 hover:bg-teal-50/20 transition-colors">
                              <td
                                onMouseEnter={() => setHoveredCell({ row: gKey, col: 'kpi' })}
                                className={`py-2 pl-7 pr-3 font-sans font-semibold text-slate-800 sticky left-0 z-10 min-w-[240px] bg-slate-50 border-r border-b border-slate-200 transition-shadow duration-150 ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''}`}
                              >
                                <div
                                  className="flex items-center gap-1.5 cursor-pointer select-none hover:text-[#249791] transition-colors"
                                  onClick={() => hasBus && toggleGroup(metricRow.id, group.groupName)}
                                >
                                  {hasBus ? (
                                    isGroupExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )
                                  ) : (
                                    <span className="w-3.5" />
                                  )}
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200/80 text-[11.5px] font-bold">
                                    {group.groupName}
                                  </span>
                                </div>
                              </td>
                              <td
                                onMouseEnter={() => setHoveredCell({ row: gKey, col: 'uom' })}
                                className="py-2 px-2.5 font-sans text-slate-400 min-w-[95px] bg-slate-50 border-r border-b border-slate-200"
                              >
                                <span className="font-mono text-[10.5px] text-slate-400">{metricRow.uom}</span>
                              </td>

                              {quarters.map((q) => {
                                const c = group.cells?.[q] || {};
                                const isNegAct = c.actual !== null && c.actual < 0;
                                const isNegBud = c.budget !== null && c.budget < 0;

                                return (
                                  <React.Fragment key={q}>
                                    <td
                                      onMouseEnter={() => setHoveredCell({ row: gKey, col: `${q}_budget` })}
                                      className={`py-2 px-2 text-right border-r border-b border-slate-200 bg-slate-50 font-medium ${isNegBud ? 'text-rose-600' : 'text-slate-600'}`}
                                    >
                                      {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.budget, metricRow)}
                                    </td>
                                    <td
                                      onMouseEnter={() => setHoveredCell({ row: gKey, col: `${q}_actual` })}
                                      className={`py-2 px-2 text-right font-semibold border-r border-b border-slate-200 bg-slate-50 ${isNegAct ? 'text-rose-600' : 'text-slate-800'}`}
                                    >
                                      {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.actual, metricRow)}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>

                            {/* Individual Business Level */}
                            {isGroupExpanded &&
                              group.businesses.map((buItem) => {
                                const bKey = `${gKey}:::${buItem.business}`;

                                return (
                                  <tr
                                    key={bKey}
                                    className="bg-white hover:bg-teal-50/30 transition-colors border-b border-slate-100"
                                  >
                                    <td
                                      onMouseEnter={() => setHoveredCell({ row: bKey, col: 'kpi' })}
                                      className={`py-1.5 pl-12 pr-3 font-sans text-slate-600 sticky left-0 z-10 min-w-[240px] bg-white border-r border-b border-slate-100 transition-shadow duration-150 ${isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''}`}
                                    >
                                      <div className="flex items-center gap-1.5 text-[11.5px]">
                                        <span className="text-slate-300 select-none">↳</span>
                                        <span className="font-medium text-slate-700">{buItem.business}</span>
                                      </div>
                                    </td>
                                    <td
                                      onMouseEnter={() => setHoveredCell({ row: bKey, col: 'uom' })}
                                      className="py-1.5 px-2.5 font-sans text-slate-400 min-w-[95px] bg-white border-r border-b border-slate-100"
                                    >
                                      <span className="font-mono text-[10px] text-slate-400">{metricRow.uom}</span>
                                    </td>

                                    {quarters.map((q) => {
                                      const c = buItem.cells?.[q] || {};
                                      const isNegAct = c.actual !== null && c.actual < 0;
                                      const isNegBud = c.budget !== null && c.budget < 0;

                                      return (
                                        <React.Fragment key={q}>
                                          <td
                                            onMouseEnter={() => setHoveredCell({ row: bKey, col: `${q}_budget` })}
                                            className={`py-1.5 px-2 text-right border-r border-b border-slate-100 bg-white text-[11.5px] ${isNegBud ? 'text-rose-600' : 'text-slate-500'}`}
                                          >
                                            {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.budget, metricRow)}
                                          </td>
                                          <td
                                            onMouseEnter={() => setHoveredCell({ row: bKey, col: `${q}_actual` })}
                                            className={`py-1.5 px-2 text-right font-medium border-r border-b border-slate-100 bg-white text-[11.5px] ${isNegAct ? 'text-rose-600' : 'text-slate-700'}`}
                                          >
                                            {isUpdating ? <Shimmer className="h-4 w-8 ml-auto rounded-sm" /> : renderValue(c.actual, metricRow)}
                                          </td>
                                        </React.Fragment>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                          </Fragment>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
