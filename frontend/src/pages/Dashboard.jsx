import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import Loader from '../components/ui/Loader';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { matchesMonthFilter, getQuarterForMonth, normalizeMonth } from '../utils/periodUtils';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import CopilotDrawer from '../components/chat/CopilotDrawer';
import SettingsModal from '../components/SettingsModal';

import Executive360Tab from '../components/tabs/Executive360Tab';
import PerformanceTab from '../components/tabs/PerformanceTab';
import HeatmapTab from '../components/tabs/HeatmapTab';
import PnLSummaryTab from '../components/tabs/PnLSummaryTab';
import PnLDISTab from '../components/tabs/PnLDISTab';
import PnLTrendTab from '../components/tabs/PnLTrendTab';
import OtherMetricsTab from '../components/tabs/OtherMetricsTab';
import LiveNewsTab from '../components/tabs/LiveNewsTab';

export default function Dashboard({ isAdmin, user }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filters, setFilters] = useState({
    fy: '',
    quarter: 'Total',
    month: 'ALL',
    segment: 'ALL',
    bu: 'ALL',
    currency: 'INR',
  });

  const getInitialTab = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const validTabs = ['overview360', 'performance', 'heatmap', 'othermetrics', 'pnlsummary', 'pnldis', 'pnltrend', 'livenews'];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return 'performance';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (err) {
      console.error('Failed to sync URL param:', err);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam) {
        setActiveTabState(tabParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [dashboardData, setDashboardData] = useState(null);
  const [perfViews, setPerfViews] = useState(null);
  const [loading, setLoading] = useState(() => getInitialTab() !== 'livenews');
  const [perfLoading, setPerfLoading] = useState(() => getInitialTab() !== 'livenews');
  const [error, setError] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Frontend in-memory cache to retain data until page reload
  const dataCacheRef = useRef({});
  const perfCacheRef = useRef({});

  // Initial and refresh loader for main dashboard dataset
  const loadDashboardData = useCallback(async (forceRefresh = false, activeFilters = filters) => {
    if (!forceRefresh && dataCacheRef.current['master']) {
      setDashboardData(dataCacheRef.current['master']);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (forceRefresh) params.force_refresh = 'true';

      const res = await api.get(apiEndpoints.DASHBOARD_DATA, { params });
      dataCacheRef.current['master'] = res.data;
      setDashboardData(res.data);
      if (!activeFilters.fy && (res.data?.meta?.budget_fy || res.data?.meta?.fys?.length)) {
        const defaultFy = res.data.meta.budget_fy || res.data.meta.fys[res.data.meta.fys.length - 1];
        setFilters((prev) => ({ ...prev, fy: defaultFy }));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Performance views loader (dataai_view, RevBizWise, OrderBizWise, orderintake_view)
  const loadPerfViews = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && perfCacheRef.current['master']) {
      setPerfViews(perfCacheRef.current['master']);
      setPerfLoading(false);
      return;
    }

    try {
      setPerfLoading(true);
      const params = {};
      if (forceRefresh) params.force_refresh = 'true';

      const res = await api.get(apiEndpoints.PERFORMANCE_VIEWS, { params });
      perfCacheRef.current['master'] = res.data;
      setPerfViews(res.data);
    } catch (err) {
      console.error('Error loading performance views:', err);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'livenews') {
      if (!dataCacheRef.current['master']) {
        loadDashboardData(false, filters);
      }
      if (!perfCacheRef.current['master']) {
        loadPerfViews(false);
      }
    }
  }, [activeTab, loadDashboardData, loadPerfViews, filters]);

  // Alias lookup map builder
  // Multi-alias lookup map builder
  const aliasMap = useMemo(() => {
    const segments = {};
    const businesses = {};

    // From dashboard metadata
    if (dashboardData?.meta?.business_mapping) {
      dashboardData.meta.business_mapping.forEach((bm) => {
        const s = (bm.segment || '').trim();
        const sn = (bm.segment_n || '').trim();
        const b = (bm.biz1 || '').trim();
        const bn = (bm.biz1_n || '').trim();
        if (s && sn) {
          if (!segments[s]) segments[s] = new Set();
          if (!segments[sn]) segments[sn] = new Set();
          segments[s].add(sn);
          segments[sn].add(s);
        }
        if (b && bn) {
          if (!businesses[b]) businesses[b] = new Set();
          if (!businesses[bn]) businesses[bn] = new Set();
          businesses[b].add(bn);
          businesses[bn].add(b);
        }
      });
    }

    return { segments, businesses };
  }, [dashboardData]);

  // Alias set resolver
  const aliasSet = useCallback(
    (value, kind) => {
      const out = {};
      if (!value || value === 'ALL') return out;
      out[value] = true;
      const map = kind === 'segment' ? aliasMap.segments : aliasMap.businesses;
      if (map && map[value]) {
        map[value].forEach((alias) => {
          out[alias] = true;
        });
      }
      return out;
    },
    [aliasMap]
  );

  // Authoritative list of valid businesses for a given segment (or all valid businesses) - strictly biz1_n
  const getActiveBusinesses = useCallback(
    (segmentFilter = filters.segment) => {
      const meta = dashboardData?.meta;
      if (!meta) return [];

      const segArray = Array.isArray(segmentFilter)
        ? segmentFilter
        : [segmentFilter || 'ALL'];

      const isAll = segArray.includes('ALL') || segArray.length === 0;
      const bus = new Set();

      if (meta.business_mapping && Array.isArray(meta.business_mapping)) {
        meta.business_mapping.forEach((r) => {
          const sn = (r.segment_n || '').trim();
          const s = (r.segment || r.Segment || '').trim();
          const bn = (r.biz1_n || r.Biz1_N || r.biz1 || r.Biz1 || '').trim();
          if (!bn) return;

          if (isAll) {
            bus.add(bn);
          } else {
            const matchesSeg = segArray.some((chosenSeg) => {
              if (chosenSeg === 'ALL') return true;
              const chosenNorm = String(chosenSeg).replace(/^\d+\s*/, '').trim().toLowerCase();
              const snNorm = sn.replace(/^\d+\s*/, '').trim().toLowerCase();
              const sNorm = s.replace(/^\d+\s*/, '').trim().toLowerCase();
              return (
                chosenSeg.toLowerCase() === sn.toLowerCase() ||
                chosenNorm === snNorm ||
                (chosenSeg.toLowerCase() === s.toLowerCase() &&
                  !meta.business_mapping.some(
                    (other) =>
                      other.segment_n &&
                      chosenNorm === other.segment_n.replace(/^\d+\s*/, '').trim().toLowerCase()
                  )) ||
                (sNorm === chosenNorm &&
                  !meta.business_mapping.some(
                    (other) =>
                      other.segment_n &&
                      chosenNorm === other.segment_n.replace(/^\d+\s*/, '').trim().toLowerCase()
                  ))
              );
            });
            if (matchesSeg) {
              bus.add(bn);
            }
          }
        });
      }

      if (bus.size === 0 && meta.biz_units) {
        meta.biz_units.forEach((b) => {
          if (b) {
            bus.add(b);
          }
        });
      }

      return Array.from(bus).sort();
    },
    [dashboardData, filters.segment]
  );

  // Scope filter matcher
  const matchesScope = useCallback(
    (row, activeFilters = filters) => {
      if (!row) return false;
      const seg = (row.segment_n || row.Segment_n || row.segment || row.Segment || '').trim();
      const biz = (row.biz1_n || row.Biz1_n || row.biz1 || row.Biz1 || row.biz || row.Biz || '').trim();

      // Month & Period filter matching
      if (!matchesMonthFilter(row, activeFilters)) {
        return false;
      }

      // 1. If Business is chosen
      const buFilter = activeFilters.bu;
      const buArray = Array.isArray(buFilter) ? buFilter : (buFilter ? [buFilter] : ['ALL']);
      if (!buArray.includes('ALL') && buArray.length > 0) {
        const matchesAnyBu = buArray.some((targetBu) => {
          if (targetBu === 'ALL') return true;
          const bizOk = aliasSet(targetBu, 'business');
          return bizOk[biz] || biz.toLowerCase() === targetBu.toLowerCase();
        });
        if (!matchesAnyBu) return false;
      }

      // 2. If Segment is chosen
      const segFilter = activeFilters.segment;
      const segArray = Array.isArray(segFilter) ? segFilter : (segFilter ? [segFilter] : ['ALL']);
      if (!segArray.includes('ALL') && segArray.length > 0) {
        const validBusForSeg = getActiveBusinesses(segArray);
        if (biz) {
          const bizOk = aliasSet(biz, 'business');
          const isIncluded = validBusForSeg.some(
            (validB) => validB.toLowerCase() === biz.toLowerCase() || bizOk[validB]
          );
          if (!isIncluded) return false;
        } else if (seg) {
          const matchesAnySeg = segArray.some((targetSeg) => {
            if (targetSeg === 'ALL') return true;
            const segOk = aliasSet(targetSeg, 'segment');
            const targetNorm = targetSeg.replace(/^\d+\s*/, '').trim().toLowerCase();
            const segNorm = seg.replace(/^\d+\s*/, '').trim().toLowerCase();
            return (
              segOk[seg] ||
              seg.toLowerCase() === targetSeg.toLowerCase() ||
              segNorm === targetNorm
            );
          });
          if (!matchesAnySeg) return false;
        }
      }

      return true;
    },
    [aliasSet, getActiveBusinesses, filters]
  );

  // Value formatting helpers
  const formatCurrency = useCallback(
    (val, decimals = 1, showSymbol = true) => {
      if (val === null || val === undefined || isNaN(val)) return '—';
      const num = Number(val);
      const symbol = showSymbol ? (filters.currency === 'USD' ? '$' : '₹') : '';
      return `${symbol}${num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
    [filters.currency]
  );

  const formatPercent = useCallback((val, decimals = 1) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${Number(val).toFixed(decimals)}%`;
  }, []);

  // Universal metric retriever that respects Scope (Company vs Segment vs BU) and Period (Quarter vs Month)
  const getScopedDataNode = useCallback(
    (targetFy = filters.fy, scenario = 'ACT', targetQ = filters.quarter || 'Total', activeFilters = filters) => {
      const DATA = dashboardData;
      if (!DATA) return null;
      const fy = targetFy || DATA?.meta?.budget_fy || DATA?.meta?.fys?.slice(-1)[0] || '';

      const buFilter = activeFilters.bu;
      const isBuSelected = buFilter && buFilter !== 'ALL' && !(Array.isArray(buFilter) && (buFilter.length === 0 || buFilter.includes('ALL')));
      const buList = isBuSelected ? (Array.isArray(buFilter) ? buFilter : [buFilter]) : [];

      const segFilter = activeFilters.segment;
      const isSegSelected = segFilter && segFilter !== 'ALL' && !(Array.isArray(segFilter) && (segFilter.length === 0 || segFilter.includes('ALL')));
      const segList = isSegSelected ? (Array.isArray(segFilter) ? segFilter : [segFilter]) : [];

      // Month filter handling
      const rawMonth = activeFilters.month;
      const normMonth = normalizeMonth(rawMonth);
      const isMonthly = normMonth && normMonth !== 'ALL';
      const monthsList = isMonthly ? (Array.isArray(normMonth) ? normMonth : [normMonth]) : [];

      // Quarter handling
      let rawQ = targetQ;
      if (Array.isArray(rawQ) && rawQ.length === 1) rawQ = rawQ[0];

      if (isMonthly && monthsList.length > 0 && DATA?.monthly) {
        let applicableMonths = monthsList;
        if (rawQ && rawQ !== 'Total' && rawQ !== 'ALL') {
          const qList = Array.isArray(rawQ)
            ? rawQ
            : String(rawQ).split(/[+,]/).map((s) => s.trim()).filter(Boolean);
          if (qList.length > 0 && qList.length < 4 && !qList.includes('Total') && !qList.includes('ALL')) {
            applicableMonths = monthsList.filter((m) => qList.includes(getQuarterForMonth(m)));
            if (applicableMonths.length === 0) return null;
          }
        }

        const isCompanyScope = !isSegSelected && !isBuSelected;

        // Helper to retrieve monthly node for an entity
        const getMonthlyEntityNode = (tree, entityKey) => {
          if (!tree || !entityKey) return null;
          const agg = {};
          applicableMonths.forEach((m) => {
            const mNode = tree[entityKey]?.[fy]?.[scenario]?.[m];
            if (!mNode) return;
            Object.entries(mNode).forEach(([k, val]) => {
              if (val === null || val === undefined || isNaN(val) || k === 'Headcount' || k === 'Learners Count') return;
              if (DATA?.meta?.metric_type?.[k] === 'Percentage' || k.endsWith('%')) return;
              agg[k] = Number(((agg[k] || 0) + Number(val)).toFixed(4));
            });
          });

          if (Object.keys(agg).length === 0) return null;

          const totalRev = agg['Revenue'] || 0;
          const totalVc = agg['Variable Cost'] !== undefined
            ? agg['Variable Cost']
            : (agg['Gross Profit'] !== undefined ? totalRev - agg['Gross Profit'] : 0);
          const totalGp = agg['Gross Profit'] !== undefined
            ? agg['Gross Profit']
            : (totalRev - (agg['Total Direct Cost'] || totalVc));
          const totalEbitda = agg['EBITDA'] || 0;
          const totalEbitdaContrib = agg['EBITDA Contribution'] || 0;

          agg['Variable Cost'] = totalVc;
          agg['Gross Profit'] = totalGp;
          if (agg['SG&A Cost'] === undefined) {
            if (agg['Total Opex'] !== undefined) agg['SG&A Cost'] = agg['Total Opex'];
            else if (agg['Total Operating Expenses'] !== undefined) agg['SG&A Cost'] = agg['Total Operating Expenses'];
          }
          if (agg['Total Opex'] === undefined && agg['SG&A Cost'] !== undefined) {
            agg['Total Opex'] = agg['SG&A Cost'];
            agg['Total Operating Expenses'] = agg['SG&A Cost'];
          }

          if (totalRev > 0) {
            agg['VC%'] = Number(((totalVc / totalRev) * 100).toFixed(4));
            agg['Gross Margin %'] = Number(((totalGp / totalRev) * 100).toFixed(4));
            agg['GP %'] = agg['Gross Margin %'];
            agg['GM %'] = agg['Gross Margin %'];
            agg['GM%'] = agg['Gross Margin %'];
            if (agg['SG&A Cost'] !== undefined) {
              agg['SG&A Cost %'] = Number(((agg['SG&A Cost'] / totalRev) * 100).toFixed(4));
              agg['SG&A %'] = agg['SG&A Cost %'];
            }
            agg['EBITDA %'] = Number(((totalEbitda / totalRev) * 100).toFixed(4));
            agg['OM %'] = agg['EBITDA %'];
            agg['OM%'] = agg['EBITDA %'];
            agg['EBITDA Contribution %'] = Number(((totalEbitdaContrib / totalRev) * 100).toFixed(4));
          }

          return agg;
        };

        if (isCompanyScope) {
          const compTree = { COMPANY: DATA?.monthly?.company };
          return getMonthlyEntityNode(compTree, 'COMPANY');
        }

        // If BU is selected
        if (isBuSelected) {
          // If Segment is also selected, verify that selected BUs belong to the Segment
          if (isSegSelected) {
            const validBUsForSeg = getActiveBusinesses(segList);
            const matchingBUs = buList.filter((b) => validBUsForSeg.includes(b));
            if (matchingBUs.length === 0) return null;
          }

          if (buList.length === 1) {
            const bu = buList[0];
            let node = getMonthlyEntityNode(DATA?.monthly?.bu, bu);
            if (node) return node;
            const aliasBus = aliasMap.businesses?.[bu];
            if (aliasBus) {
              for (const a of aliasBus) {
                node = getMonthlyEntityNode(DATA?.monthly?.bu, a);
                if (node) return node;
              }
            }
          }
        }

        // If Segment is selected and no BU is selected
        if (isSegSelected && !isBuSelected && segList.length === 1) {
          const seg = segList[0];
          let node = getMonthlyEntityNode(DATA?.monthly?.segment, seg);
          if (node) return node;
          const aliasSegs = aliasMap.segments?.[seg];
          if (aliasSegs) {
            for (const a of aliasSegs) {
              node = getMonthlyEntityNode(DATA?.monthly?.segment, a);
              if (node) return node;
            }
          }
        }

        // Aggregate across matched BUs
        const bus = DATA?.monthly?.bu ? Object.keys(DATA.monthly.bu) : [];
        const matchedBUs = bus.filter((b) =>
          matchesScope({ Biz1: b, Segment: DATA?.meta?.bu_segment?.[b] }, activeFilters)
        );
        if (matchedBUs.length === 0) return null;

        const aggNode = {};
        let latestHc = null;

        matchedBUs.forEach((b) => {
          applicableMonths.forEach((m) => {
            const mNode = DATA?.monthly?.bu?.[b]?.[fy]?.[scenario]?.[m];
            if (!mNode) return;
            Object.entries(mNode).forEach(([k, val]) => {
              if (val === null || val === undefined || isNaN(val) || k === 'Headcount' || k === 'Learners Count') return;
              if (DATA?.meta?.metric_type?.[k] === 'Percentage' || k.endsWith('%')) return;
              aggNode[k] = Number(((aggNode[k] || 0) + Number(val)).toFixed(4));
            });
          });
        });

        if (Object.keys(aggNode).length === 0) return null;

        const totalRev = aggNode['Revenue'] || 0;
        const totalVc = aggNode['Variable Cost'] !== undefined
          ? aggNode['Variable Cost']
          : (aggNode['Gross Profit'] !== undefined ? totalRev - aggNode['Gross Profit'] : 0);
        const totalGp = aggNode['Gross Profit'] !== undefined
          ? aggNode['Gross Profit']
          : (totalRev - (aggNode['Total Direct Cost'] || totalVc));
        const totalEbitda = aggNode['EBITDA'] || 0;
        const totalEbitdaContrib = aggNode['EBITDA Contribution'] || 0;

        aggNode['Variable Cost'] = totalVc;
        aggNode['Gross Profit'] = totalGp;
        aggNode['Throughput'] = Number((totalRev - totalVc).toFixed(4));

        if (aggNode['SG&A Cost'] === undefined) {
          if (aggNode['Total Opex'] !== undefined) aggNode['SG&A Cost'] = aggNode['Total Opex'];
          else if (aggNode['Total Operating Expenses'] !== undefined) aggNode['SG&A Cost'] = aggNode['Total Operating Expenses'];
        }
        if (aggNode['Total Opex'] === undefined && aggNode['SG&A Cost'] !== undefined) {
          aggNode['Total Opex'] = aggNode['SG&A Cost'];
          aggNode['Total Operating Expenses'] = aggNode['SG&A Cost'];
        }

        if (totalRev > 0) {
          aggNode['VC%'] = Number(((totalVc / totalRev) * 100).toFixed(4));
          aggNode['Gross Margin %'] = Number(((totalGp / totalRev) * 100).toFixed(4));
          aggNode['GP %'] = aggNode['Gross Margin %'];
          aggNode['GM %'] = aggNode['Gross Margin %'];
          aggNode['GM%'] = aggNode['Gross Margin %'];
          if (aggNode['SG&A Cost'] !== undefined) {
            aggNode['SG&A Cost %'] = Number(((aggNode['SG&A Cost'] / totalRev) * 100).toFixed(4));
            aggNode['SG&A %'] = aggNode['SG&A Cost %'];
          }
          aggNode['EBITDA %'] = Number(((totalEbitda / totalRev) * 100).toFixed(4));
          aggNode['OM %'] = aggNode['EBITDA %'];
          aggNode['OM%'] = aggNode['EBITDA %'];
          aggNode['EBITDA Contribution %'] = Number(((totalEbitdaContrib / totalRev) * 100).toFixed(4));
        }

        return aggNode;
      }

      rawQ = targetQ;
      let qList = null;

      if (Array.isArray(rawQ)) {
        if (rawQ.length === 0 || rawQ.length >= 4 || rawQ.includes('Total') || rawQ.includes('ALL')) {
          rawQ = 'Total';
        } else if (rawQ.length === 1) {
          rawQ = rawQ[0];
        } else {
          qList = rawQ;
        }
      } else if (typeof rawQ === 'string' && (rawQ.includes('+') || rawQ.includes(','))) {
        const parts = rawQ.split(/[+,]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0 || parts.length >= 4 || parts.includes('Total') || parts.includes('ALL')) {
          rawQ = 'Total';
        } else if (parts.length === 1) {
          rawQ = parts[0];
        } else {
          qList = parts;
        }
      } else if (!rawQ || rawQ === 'ALL' || rawQ === 'Total') {
        rawQ = 'Total';
      }

      if (qList && qList.length > 0) {
        const aggQuarterNode = {};
        let latestHc = null;

        qList.forEach((subQ) => {
          const subNode = getScopedDataNode(fy, scenario, subQ, activeFilters);
          if (!subNode) return;
          Object.entries(subNode).forEach(([k, val]) => {
            if (val === null || val === undefined || isNaN(val) || k === 'Headcount' || k === 'Learners Count') return;
            if (DATA?.meta?.metric_type?.[k] === 'Percentage' || k.endsWith('%')) return;
            aggQuarterNode[k] = Number(((aggQuarterNode[k] || 0) + Number(val)).toFixed(4));
          });
        });

        if (Object.keys(aggQuarterNode).length === 0) return null;

        const totalRev = aggQuarterNode['Revenue'] || 0;
        const totalVc = aggQuarterNode['Variable Cost'] !== undefined
          ? aggQuarterNode['Variable Cost']
          : (aggQuarterNode['Gross Profit'] !== undefined ? totalRev - aggQuarterNode['Gross Profit'] : 0);
        const totalGp = aggQuarterNode['Gross Profit'] !== undefined
          ? aggQuarterNode['Gross Profit']
          : (totalRev - (aggQuarterNode['Total Direct Cost'] || totalVc));
        const totalEbitda = aggQuarterNode['EBITDA'] || 0;
        const totalEbitdaContrib = aggQuarterNode['EBITDA Contribution'] || 0;

        aggQuarterNode['Variable Cost'] = totalVc;
        aggQuarterNode['Gross Profit'] = totalGp;
        aggQuarterNode['Throughput'] = Number((totalRev - totalVc).toFixed(4));

        if (aggQuarterNode['SG&A Cost'] === undefined) {
          if (aggQuarterNode['Total Opex'] !== undefined) aggQuarterNode['SG&A Cost'] = aggQuarterNode['Total Opex'];
          else if (aggQuarterNode['Total Operating Expenses'] !== undefined) aggQuarterNode['SG&A Cost'] = aggQuarterNode['Total Operating Expenses'];
        }
        if (aggQuarterNode['Total Opex'] === undefined && aggQuarterNode['SG&A Cost'] !== undefined) {
          aggQuarterNode['Total Opex'] = aggQuarterNode['SG&A Cost'];
          aggQuarterNode['Total Operating Expenses'] = aggQuarterNode['SG&A Cost'];
        }

        if (totalRev > 0) {
          aggQuarterNode['VC%'] = Number(((totalVc / totalRev) * 100).toFixed(4));
          aggQuarterNode['Gross Margin %'] = Number(((totalGp / totalRev) * 100).toFixed(4));
          aggQuarterNode['GP %'] = aggQuarterNode['Gross Margin %'];
          aggQuarterNode['GM %'] = aggQuarterNode['Gross Margin %'];
          aggQuarterNode['GM%'] = aggQuarterNode['Gross Margin %'];
          if (aggQuarterNode['SG&A Cost'] !== undefined) {
            aggQuarterNode['SG&A Cost %'] = Number(((aggQuarterNode['SG&A Cost'] / totalRev) * 100).toFixed(4));
            aggQuarterNode['SG&A %'] = aggQuarterNode['SG&A Cost %'];
          }
          aggQuarterNode['EBITDA %'] = Number(((totalEbitda / totalRev) * 100).toFixed(4));
          aggQuarterNode['OM %'] = aggQuarterNode['EBITDA %'];
          aggQuarterNode['OM%'] = aggQuarterNode['EBITDA %'];
          aggQuarterNode['EBITDA Contribution %'] = Number(((totalEbitdaContrib / totalRev) * 100).toFixed(4));
        }

        return aggQuarterNode;
      }

      const q = rawQ;
      const isCompanyScope = !isSegSelected && !isBuSelected;

      if (isCompanyScope) {
        return DATA?.company?.[fy]?.[scenario]?.[q] || null;
      }

      // If BU is selected
      if (isBuSelected) {
        // If Segment is also selected, verify that selected BUs belong to the Segment
        if (isSegSelected) {
          const validBUsForSeg = getActiveBusinesses(segList);
          const matchingBUs = buList.filter((b) => validBUsForSeg.includes(b));
          if (matchingBUs.length === 0) return null;
        }

        if (buList.length === 1) {
          const bu = buList[0];
          if (DATA?.bu?.[bu]?.[fy]?.[scenario]?.[q]) return DATA.bu[bu][fy][scenario][q];
          const aliasBus = aliasMap.businesses?.[bu];
          if (aliasBus) {
            for (const a of aliasBus) {
              if (DATA?.bu?.[a]?.[fy]?.[scenario]?.[q]) return DATA.bu[a][fy][scenario][q];
            }
          }
        }
      }

      // If Segment is selected and no BU is selected
      if (isSegSelected && !isBuSelected && segList.length === 1) {
        const seg = segList[0];
        if (DATA?.segment?.[seg]?.[fy]?.[scenario]?.[q]) return DATA.segment[seg][fy][scenario][q];
        const aliasSegs = aliasMap.segments?.[seg];
        if (aliasSegs) {
          for (const a of aliasSegs) {
            if (DATA?.segment?.[a]?.[fy]?.[scenario]?.[q]) return DATA.segment[a][fy][scenario][q];
          }
        }
      }

      // Aggregate across matched BUs if no single node found
      const bus = DATA?.bu ? Object.keys(DATA.bu) : [];
      const matchedBUs = bus.filter((b) =>
        matchesScope({ Biz1: b, Segment: DATA?.meta?.bu_segment?.[b] }, activeFilters)
      );
      if (matchedBUs.length === 0) return null;

      const aggNode = {};
      let totalRev = 0;
      let totalVc = 0;
      let totalGp = 0;
      let totalEbitda = 0;
      let totalEbitdaContrib = 0;

      matchedBUs.forEach((b) => {
        const node = DATA?.bu?.[b]?.[fy]?.[scenario]?.[q];
        if (!node) return;
        Object.entries(node).forEach(([k, val]) => {
          if (val === null || val === undefined || isNaN(val)) return;
          if (DATA?.meta?.metric_type?.[k] === 'Percentage' || k.endsWith('%')) return;
          aggNode[k] = (aggNode[k] || 0) + Number(val);
        });
      });

      // Recalculate percentage metrics from sums
      totalRev = aggNode['Revenue'] || 0;
      totalVc = aggNode['Variable Cost'] || 0;
      totalGp = aggNode['Gross Profit'] !== undefined ? aggNode['Gross Profit'] : (totalRev - (aggNode['Total Direct Cost'] || totalVc));
      totalEbitda = aggNode['EBITDA'] || 0;
      totalEbitdaContrib = aggNode['EBITDA Contribution'] || 0;

      if (aggNode['SG&A Cost'] === undefined) {
        if (aggNode['Total Opex'] !== undefined) aggNode['SG&A Cost'] = aggNode['Total Opex'];
        else if (aggNode['Total Operating Expenses'] !== undefined) aggNode['SG&A Cost'] = aggNode['Total Operating Expenses'];
      }
      if (aggNode['Total Opex'] === undefined && aggNode['SG&A Cost'] !== undefined) {
        aggNode['Total Opex'] = aggNode['SG&A Cost'];
        aggNode['Total Operating Expenses'] = aggNode['SG&A Cost'];
      }

      if (totalRev > 0) {
        aggNode['VC%'] = (totalVc / totalRev) * 100;
        aggNode['Gross Margin %'] = (totalGp / totalRev) * 100;
        aggNode['GP %'] = aggNode['Gross Margin %'];
        aggNode['GM %'] = aggNode['Gross Margin %'];
        aggNode['GM%'] = aggNode['Gross Margin %'];
        if (aggNode['SG&A Cost'] !== undefined) {
          aggNode['SG&A Cost %'] = (aggNode['SG&A Cost'] / totalRev) * 100;
          aggNode['SG&A %'] = aggNode['SG&A Cost %'];
        }
        aggNode['EBITDA %'] = (totalEbitda / totalRev) * 100;
        aggNode['OM %'] = aggNode['EBITDA %'];
        aggNode['OM%'] = aggNode['EBITDA %'];
        aggNode['EBITDA Contribution %'] = (totalEbitdaContrib / totalRev) * 100;
      }

      return aggNode;
    },
    [dashboardData, filters, aliasMap, matchesScope, getActiveBusinesses]
  );

  const getScopedMetric = useCallback(
    (metricName, targetFy = filters.fy, scenario = 'ACT', targetQ = filters.quarter || 'Total', activeFilters = filters) => {
      const node = getScopedDataNode(targetFy, scenario, targetQ, activeFilters);
      if (!node) return 0;
      const val = node[metricName];
      if (val !== undefined && val !== null && !isNaN(val)) {
        return Number(val);
      }
      // Aliases and derived ratio fallbacks
      if (metricName === 'Total Opex' && node['Total Operating Expenses'] !== undefined) {
        return Number(node['Total Operating Expenses']);
      }
      if (metricName === 'Total Operating Expenses' && node['Total Opex'] !== undefined) {
        return Number(node['Total Opex']);
      }
      if (metricName === 'Fixed Costs' && node['Fixed Cost'] !== undefined) {
        return Number(node['Fixed Cost']);
      }
      if (metricName === 'Fixed Cost' && node['Fixed Costs'] !== undefined) {
        return Number(node['Fixed Costs']);
      }
      if (metricName === 'Fixed Costs' || metricName === 'Fixed Cost') {
        const fcSum = (Number(node['Premises']) || 0) + (Number(node['Travel']) || 0) + (Number(node['Telecom']) || 0) + (Number(node['Legal & Professional']) || 0) + (Number(node['Administration']) || 0);
        if (fcSum > 0) return fcSum;
      }
      if (metricName === 'SG&A Cost' || metricName === 'SG&A') {
        const sgaVal = node['SG&A Cost'] ?? node['Total Opex'] ?? node['Total Operating Expenses'];
        if (sgaVal !== undefined && sgaVal !== null) return Number(sgaVal);
      }
      if (metricName === 'SG&A Cost %' || metricName === 'SG&A %') {
        if (node['SG&A Cost %'] !== undefined) return Number(node['SG&A Cost %']);
        if (node['SG&A %'] !== undefined) return Number(node['SG&A %']);
        const rev = Number(node['Revenue']) || 0;
        const sga = Number(node['SG&A Cost'] ?? node['Total Opex'] ?? node['Total Operating Expenses'] ?? 0);
        return rev > 0 ? (sga / rev) * 100 : 0;
      }
      if (metricName === 'Gross Profit' || metricName === 'Gross Margin') {
        if (node['Gross Profit'] !== undefined) return Number(node['Gross Profit']);
        const rev = Number(node['Revenue']) || 0;
        const vc = Number(node['Variable Cost'] ?? node['Total Direct Cost'] ?? 0);
        return rev - vc;
      }
      if (metricName === 'Gross Margin %' || metricName === 'GP %' || metricName === 'GM %' || metricName === 'GM%') {
        if (node['Gross Margin %'] !== undefined) return Number(node['Gross Margin %']);
        if (node['GP %'] !== undefined) return Number(node['GP %']);
        if (node['GM %'] !== undefined) return Number(node['GM %']);
        if (node['GM%'] !== undefined) return Number(node['GM%']);
        const rev = Number(node['Revenue']) || 0;
        const gp = Number(node['Gross Profit'] !== undefined ? node['Gross Profit'] : (rev - (node['Variable Cost'] ?? node['Total Direct Cost'] ?? 0)));
        return rev > 0 ? (gp / rev) * 100 : 0;
      }
      if (metricName === 'OM %' || metricName === 'OM%' || metricName === 'Operating Margin %' || metricName === 'EBITDA %') {
        if (node['OM %'] !== undefined) return Number(node['OM %']);
        if (node['OM%'] !== undefined) return Number(node['OM%']);
        if (node['EBITDA %'] !== undefined) return Number(node['EBITDA %']);
        const rev = Number(node['Revenue']) || 0;
        const ebitda = Number(node['EBITDA']) || 0;
        return rev > 0 ? (ebitda / rev) * 100 : 0;
      }
      if (metricName === 'EBITDA Contribution %') {
        if (node['EBITDA Contribution %'] !== undefined) return Number(node['EBITDA Contribution %']);
        const rev = Number(node['Revenue']) || 0;
        const ebitdaContrib = Number(node['EBITDA Contribution']) || 0;
        return rev > 0 ? (ebitdaContrib / rev) * 100 : 0;
      }
      return 0;
    },
    [getScopedDataNode, filters]
  );

  const [isFilterUpdating, setIsFilterUpdating] = useState(false);
  const filterTimerRef = useRef(null);

  const updateFilters = useCallback((newFilters) => {
    setIsFilterUpdating(true);
    setFilters((prev) => ({ ...prev, ...newFilters }));
    if (filterTimerRef.current) {
      clearTimeout(filterTimerRef.current);
    }
    filterTimerRef.current = setTimeout(() => {
      setIsFilterUpdating(false);
    }, 350);
  }, []);

  const refreshAll = useCallback(() => {
    dataCacheRef.current = {};
    perfCacheRef.current = {};
    loadDashboardData(true, filters);
    if (activeTab === 'performance') {
      loadPerfViews(true, filters);
    }
  }, [filters, activeTab, loadDashboardData, loadPerfViews]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview360':
        return (
          <Executive360Tab
            dashboardData={dashboardData}
            perfViews={perfViews}
            filters={filters}
            getScopedMetric={getScopedMetric}
            matchesScope={matchesScope}
            formatPercent={formatPercent}
            setActiveTab={setActiveTab}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'performance':
        return (
          <PerformanceTab
            dashboardData={dashboardData}
            perfViews={perfViews}
            filters={filters}
            matchesScope={matchesScope}
            getScopedMetric={getScopedMetric}
            getActiveBusinesses={getActiveBusinesses}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'heatmap':
        return (
          <HeatmapTab
            dashboardData={dashboardData}
            filters={filters}
            getScopedMetric={getScopedMetric}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'pnlsummary':
        return (
          <PnLSummaryTab
            dashboardData={dashboardData}
            filters={filters}
            getScopedMetric={getScopedMetric}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'pnldis':
        return (
          <PnLDISTab
            dashboardData={dashboardData}
            filters={filters}
            getScopedMetric={getScopedMetric}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'pnltrend':
        return (
          <PnLTrendTab
            dashboardData={dashboardData}
            filters={filters}
            getScopedMetric={getScopedMetric}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'othermetrics':
        return (
          <OtherMetricsTab
            dashboardData={dashboardData}
            filters={filters}
            getScopedMetric={getScopedMetric}
            getActiveBusinesses={getActiveBusinesses}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
      case 'livenews':
        return <LiveNewsTab isAdmin={isAdmin} user={user} />;
      default:
        return (
          <PerformanceTab
            dashboardData={dashboardData}
            perfViews={perfViews}
            filters={filters}
            matchesScope={matchesScope}
            getScopedMetric={getScopedMetric}
            getActiveBusinesses={getActiveBusinesses}
            isAdmin={isAdmin}
            user={user}
            isUpdating={isFilterUpdating}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#EDF3F9] text-slate-900 font-sans antialiased">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {activeTab !== 'livenews' && (
          <Topbar
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            filters={filters}
            updateFilters={updateFilters}
            dashboardData={dashboardData}
            loading={loading}
            refreshAll={refreshAll}
            getActiveBusinesses={getActiveBusinesses}
            isAdmin={isAdmin}
            user={user}
            onOpenAi={() => setIsAiOpen(true)}
          />
        )}

        <main id="mainContent" className="p-6 flex-1 min-w-0 max-w-full overflow-x-hidden">
          {activeTab !== 'livenews' && loading ? (
            <Loader />
          ) : activeTab !== 'livenews' && error ? (
            <div className="bg-white rounded-md border border-red-200 border-l-4 border-l-red-600 text-red-700 p-4 mb-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <strong className="font-semibold text-sm">Connection Error:</strong>
                <span className="text-xs text-red-600">{error}</span>
              </div>
              <div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                  onClick={refreshAll}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>

      <CopilotDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        isAiOpen={isAiOpen}
        setIsAiOpen={setIsAiOpen}
        filters={filters}
        dashboardData={dashboardData}
        isAdmin={isAdmin}
        user={user}
      />

      {isAdmin && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={user}
        />
      )}
    </div>
  );
}
