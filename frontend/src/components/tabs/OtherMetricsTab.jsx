import React, { useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTableHover } from '../../utils/tableHighlight';
import Shimmer from '../ui/Shimmer';

const MONTH_MAP = {
  Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September',
  Oct: 'October', Nov: 'November', Dec: 'December',
  Jan: 'January', Feb: 'February', Mar: 'March',
};

const QUARTERS = {
  Q1: ['Apr', 'May', 'Jun'],
  Q2: ['Jul', 'Aug', 'Sep'],
  Q3: ['Oct', 'Nov', 'Dec'],
  Q4: ['Jan', 'Feb', 'Mar'],
};

/**
 * OtherMetricsTab
 * Displays Collection and Order Intake quarterly (Q1, Q2, Q3, Q4, Total)
 * with collapsible Business Group hierarchy, sorted high to low by default.
 */
export default function OtherMetricsTab({
  filters = {},
  dashboardData = {},
  getScopedMetric = () => 0,
  isUpdating = false,
}) {
  // Metric Mode: 'collection' (Collection) | 'oi' (Order Intake)
  const [metricMode, setMetricMode] = useState('collection');
  const [isScrolledX, setIsScrolledX] = useState(false);
  const { setHoveredCell } = useTableHover();

  // Sorting state: default high to low ('desc') by 'Total_act'
  const [sortField, setSortField] = useState('Total_act');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'groupName' || field === 'business' ? 'asc' : 'desc');
    }
  };

  const fy = filters.fy || dashboardData?.meta?.budget_fy || dashboardData?.meta?.fys?.slice(-1)[0] || 'FY26';

  // Extract authoritatively mapped (Business Group, Business) pairs from metadata
  const mappedPairs = useMemo(() => {
    const bm = dashboardData?.meta?.business_mapping || [];
    const buSegment = dashboardData?.meta?.bu_segment || {};
    const pairs = [];
    const seen = new Set();

    if (Array.isArray(bm) && bm.length > 0) {
      bm.forEach((r) => {
        const seg = (r.segment_n || r.segment || r.Segment || '').trim();
        const biz = (r.biz1_n || r.biz1 || r.Biz1 || '').trim();

        if (!biz) return;

        const key = `${seg}:::${biz}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({
            businessGroup: seg || 'Other Group',
            business: biz,
            rawSeg: r.segment || seg,
            rawBiz: r.biz1 || biz,
          });
        }
      });
    }

    // Fallback if business_mapping is empty
    if (pairs.length === 0 && dashboardData?.meta?.biz_units) {
      dashboardData.meta.biz_units.forEach((b) => {
        if (!b) return;
        const seg = buSegment[b] || 'Other Group';
        const key = `${seg}:::${b}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({
            businessGroup: seg,
            business: b,
            rawSeg: seg,
            rawBiz: b,
          });
        }
      });
    }

    return pairs;
  }, [dashboardData]);

  // Apply global Business Group and Business filters
  const filteredPairs = useMemo(() => {
    const segFilter = filters.segment || 'ALL';
    const buFilter = filters.bu || 'ALL';

    const segList = Array.isArray(segFilter) ? segFilter : [segFilter];
    const isSegAll = segList.includes('ALL') || segList.length === 0;

    const buList = Array.isArray(buFilter) ? buFilter : [buFilter];
    const isBuAll = buList.includes('ALL') || buList.length === 0;

    return mappedPairs.filter((pair) => {
      // 1. Business Group check
      let matchesSeg = isSegAll;
      if (!isSegAll) {
        matchesSeg = segList.some((chosenSeg) => {
          if (chosenSeg === 'ALL') return true;
          const chosenNorm = String(chosenSeg).replace(/^\d+\s*/, '').trim().toLowerCase();
          const pairSegNorm = pair.businessGroup.replace(/^\d+\s*/, '').trim().toLowerCase();
          const rawSegNorm = String(pair.rawSeg || '').replace(/^\d+\s*/, '').trim().toLowerCase();
          return (
            String(chosenSeg).toLowerCase() === pair.businessGroup.toLowerCase() ||
            chosenNorm === pairSegNorm ||
            chosenNorm === rawSegNorm
          );
        });
      }

      // 2. Business check
      let matchesBu = isBuAll;
      if (!isBuAll) {
        matchesBu = buList.some((chosenBu) => {
          if (chosenBu === 'ALL') return true;
          return (
            String(chosenBu).toLowerCase() === pair.business.toLowerCase() ||
            String(chosenBu).toLowerCase() === String(pair.rawBiz || '').toLowerCase()
          );
        });
      }

      return matchesSeg && matchesBu;
    });
  }, [mappedPairs, filters.segment, filters.bu]);

  // Group by Business Group and calculate Q1, Q2, Q3, Q4, Total (Actual & Budget) with high-to-low sorting
  const groupedData = useMemo(() => {
    const metricKey = metricMode === 'collection' ? 'Collection' : 'Order Intake';

    const groupsMap = new Map();

    filteredPairs.forEach((pair) => {
      const groupName = pair.businessGroup;
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }

      const bu = pair.business;
      const rawBiz = pair.rawBiz;
      const fyClean = `FY${String(fy).replace(/\D/g, '')}`;

      const buTreeAct = dashboardData?.monthly?.bu?.[bu]?.[fy]?.['ACT'] ||
        dashboardData?.monthly?.bu?.[rawBiz]?.[fy]?.['ACT'] ||
        dashboardData?.monthly?.bu?.[bu]?.[fyClean]?.['ACT'] ||
        dashboardData?.monthly?.bu?.[rawBiz]?.[fyClean]?.['ACT'];

      const buTreeBud = dashboardData?.monthly?.bu?.[bu]?.[fy]?.['BUD'] ||
        dashboardData?.monthly?.bu?.[rawBiz]?.[fy]?.['BUD'] ||
        dashboardData?.monthly?.bu?.[bu]?.[fyClean]?.['BUD'] ||
        dashboardData?.monthly?.bu?.[rawBiz]?.[fyClean]?.['BUD'];

      const getMonthValFromTree = (tree, mShort) => {
        if (!tree) return undefined;
        const mFull = MONTH_MAP[mShort];
        const monthNode = tree[mShort] || tree[mFull] || tree[mShort?.toLowerCase()] || tree[mFull?.toLowerCase()];
        if (!monthNode) return undefined;
        if (monthNode[metricKey] !== undefined && monthNode[metricKey] !== null && !isNaN(monthNode[metricKey])) {
          return Number(monthNode[metricKey]);
        }
        if (metricKey === 'Collection') {
          for (const alias of ['Collection', 'Collections', 'Amount']) {
            if (monthNode[alias] !== undefined && monthNode[alias] !== null && !isNaN(monthNode[alias])) {
              return Number(monthNode[alias]);
            }
          }
        }
        if (metricKey === 'Order Intake') {
          for (const alias of ['Order Intake', 'OI', 'Total Order Intake', 'Order_Intake', 'OrderIntake', 'Amount']) {
            if (monthNode[alias] !== undefined && monthNode[alias] !== null && !isNaN(monthNode[alias])) {
              return Number(monthNode[alias]);
            }
          }
        }
        return undefined;
      };

      const qValues = {
        Q1_act: 0, Q1_bud: 0,
        Q2_act: 0, Q2_bud: 0,
        Q3_act: 0, Q3_bud: 0,
        Q4_act: 0, Q4_bud: 0,
        Total_act: 0, Total_bud: 0,
      };

      ['act', 'bud'].forEach((scenKey) => {
        const tree = scenKey === 'act' ? buTreeAct : buTreeBud;
        const scenUpper = scenKey.toUpperCase();

        // Collection and Order Intake: sum across months for each quarter
        let totalSum = 0;

        ['Q1', 'Q2', 'Q3', 'Q4'].forEach((qKey) => {
          let qSum = 0;
          let hasData = false;
          QUARTERS[qKey].forEach((mShort) => {
            const val = getMonthValFromTree(tree, mShort);
            if (val !== undefined && val !== null && !isNaN(val)) {
              qSum += Number(val);
              hasData = true;
            }
          });

          if (!hasData && typeof getScopedMetric === 'function') {
            const fallback = getScopedMetric(metricKey, fy, scenUpper, qKey, { ...filters, bu, quarter: qKey });
            if (fallback > 0) qSum = fallback;
          }

          qValues[`${qKey}_${scenKey}`] = qSum;
          totalSum += qSum;
        });

        qValues[`Total_${scenKey}`] = totalSum;
      });

      groupsMap.get(groupName).push({
        ...pair,
        values: qValues,
      });
    });

    // Build hierarchical group structure with aggregated totals
    const result = [];
    const metricCols = [
      'Q1_act', 'Q1_bud',
      'Q2_act', 'Q2_bud',
      'Q3_act', 'Q3_bud',
      'Q4_act', 'Q4_bud',
      'Total_act', 'Total_bud'
    ];

    groupsMap.forEach((businesses, groupName) => {
      const groupTotals = {
        Q1_act: 0, Q1_bud: 0,
        Q2_act: 0, Q2_bud: 0,
        Q3_act: 0, Q3_bud: 0,
        Q4_act: 0, Q4_bud: 0,
        Total_act: 0, Total_bud: 0,
      };

      businesses.forEach((b) => {
        metricCols.forEach((col) => {
          groupTotals[col] += b.values[col] || 0;
        });
      });

      // Sort child businesses high to low based on sortField
      businesses.sort((a, b) => {
        if (sortField === 'business') {
          const valA = a.business.toLowerCase();
          const valB = b.business.toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          const valA = Number(a.values[sortField] ?? a.values.Total_act ?? 0);
          const valB = Number(b.values[sortField] ?? b.values.Total_act ?? 0);
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
      });

      result.push({
        groupName,
        businesses,
        totals: groupTotals,
      });
    });

    // Sort business groups high to low based on sortField
    result.sort((a, b) => {
      if (sortField === 'groupName') {
        const valA = a.groupName.toLowerCase();
        const valB = b.groupName.toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortField === 'business') {
        return a.groupName.localeCompare(b.groupName);
      } else {
        const valA = Number(a.totals[sortField] ?? a.totals.Total_act ?? 0);
        const valB = Number(b.totals[sortField] ?? b.totals.Total_act ?? 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [filteredPairs, metricMode, dashboardData, fy, filters, getScopedMetric, sortField, sortDirection]);

  // Expand/Collapse state: default all groups collapsed
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const isAllExpanded = groupedData.length > 0 && groupedData.every((g) => expandedGroups.has(g.groupName));
  const hasAnyExpanded = expandedGroups.size > 0;

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groupedData.map((g) => g.groupName)));
    }
  };

  // Grand totals across all groups
  const grandTotals = useMemo(() => {
    const totals = {
      Q1_act: 0, Q1_bud: 0,
      Q2_act: 0, Q2_bud: 0,
      Q3_act: 0, Q3_bud: 0,
      Q4_act: 0, Q4_bud: 0,
      Total_act: 0, Total_bud: 0,
    };
    groupedData.forEach((g) => {
      Object.keys(totals).forEach((k) => {
        totals[k] += g.totals[k] || 0;
      });
    });
    return totals;
  }, [groupedData]);

  // Format metric values (currency amounts in INR Mn)
  const formatMetricVal = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val === 0) return '0.00';
    const num = Number(val);
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const metricLabel = metricMode === 'collection' ? 'Collection (INR Mn)' : 'Order Intake (INR Mn)';

  const totalBusinessesCount = groupedData.reduce((acc, g) => acc + g.businesses.length, 0);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'desc' ? (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  const quartersList = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Other Metrics</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quarterly Breakdown (Budget vs Actual)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Switcher: Collection | Order Intake */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${metricMode === 'collection'
                ? 'bg-[#249791] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              onClick={() => setMetricMode('collection')}
            >
              Collection
            </button>
            <button
              type="button"
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${metricMode === 'oi'
                ? 'bg-[#249791] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              onClick={() => setMetricMode('oi')}
            >
              Order Intake
            </button>
          </div>

          {/* Expand / Collapse All */}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            title={isAllExpanded ? 'Collapse all segments' : 'Expand all segments'}
          >
            {isAllExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B] border-b border-slate-800/80 border-l-4 border-l-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-white tracking-tight">
              {metricLabel}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-medium border border-slate-700">
              {fy}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-teal-300 font-medium border border-slate-700">
              Bud: Budget · Act: Actuals
            </span>
          </div>
          <span className="text-xs font-mono text-slate-300">
            {groupedData.length} Segments · {totalBusinessesCount} Businesses
          </span>
        </div>

        {isUpdating ? (
          <div className="p-6">
            <Shimmer height="h-64" rounded="rounded-lg" />
          </div>
        ) : (
          <div
            className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] overflow-y-auto custom-scroll"
            onScroll={(e) => setIsScrolledX(e.currentTarget.scrollLeft > 0)}
          >
            <table
              className="w-full border-separate border-spacing-0 text-xs min-w-[850px]"
              onMouseLeave={() => setHoveredCell({ row: null, col: null })}
            >
              <thead className="bg-[#249791]">
                {/* Level 1 Header: Periods */}
                <tr className="bg-[#249791] text-white font-bold h-[32px]">
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('groupName')}
                    className={`py-2 px-3 text-left border-b border-r border-[#1d827d] min-w-[200px] sm:min-w-[230px] w-[240px] bg-[#249791] text-white font-bold sticky top-0 left-0 z-20 transition-colors cursor-pointer group hover:bg-[#1c7b76] select-none ${
                      isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Segment</span>
                      {renderSortIcon('groupName')}
                    </div>
                  </th>

                  {quartersList.map((qKey) => (
                    <th
                      key={qKey}
                      colSpan={2}
                      className="py-1.5 px-2 text-center sticky top-0 z-10 border-b border-r border-[#1d827d] bg-[#249791] font-bold text-white select-none"
                    >
                      {qKey}
                    </th>
                  ))}

                  <th
                    colSpan={2}
                    className="py-1.5 px-2 text-center sticky top-0 z-10 border-b border-[#1d827d] bg-[#1c7b76] font-bold text-white select-none"
                  >
                    Total
                  </th>
                </tr>

                {/* Level 2 Sub-Header: Bud | Act */}
                <tr className="bg-[#1e8580] text-[11px] text-white font-semibold h-[30px]">
                  {quartersList.map((qKey) => (
                    <Fragment key={qKey}>
                      <th
                        onClick={() => handleSort(`${qKey}_bud`)}
                        className="py-1.5 px-2 text-right sticky top-[32px] z-10 border-b border-r border-[#176a66] bg-[#23928c] text-teal-50 font-semibold cursor-pointer group hover:bg-[#1c7b76] select-none w-[70px]"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-teal-50">Bud</span>
                          {renderSortIcon(`${qKey}_bud`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`${qKey}_act`)}
                        className="py-1.5 px-2 text-right sticky top-[32px] z-10 border-b border-r border-[#176a66] bg-[#1e8580] text-white font-bold cursor-pointer group hover:bg-[#176a66] select-none w-[70px]"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-white font-bold">Act</span>
                          {renderSortIcon(`${qKey}_act`)}
                        </div>
                      </th>
                    </Fragment>
                  ))}

                  {/* Total Bud | Act */}
                  <th
                    onClick={() => handleSort('Total_bud')}
                    className="py-1.5 px-2 text-right sticky top-[32px] z-10 border-b border-r border-[#176a66] bg-[#1c7873] text-teal-50 font-bold cursor-pointer group hover:bg-[#166460] select-none w-[80px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-teal-50 font-bold">Bud</span>
                      {renderSortIcon('Total_bud')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('Total_act')}
                    className="py-1.5 px-2 text-right sticky top-[32px] z-10 border-b border-[#176a66] bg-[#176a66] text-white font-bold cursor-pointer group hover:bg-[#125552] select-none w-[80px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-white font-bold">Act</span>
                      {renderSortIcon('Total_act')}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono text-[13px] sm:text-[13.5px]">
                {groupedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No matching records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  groupedData.map((group) => {
                    const isExpanded = expandedGroups.has(group.groupName);

                    return (
                      <Fragment key={group.groupName}>
                        {/* Segment Header Row (Collapsible) */}
                        <tr
                          onClick={() => toggleGroup(group.groupName)}
                          className="bg-slate-50/95 hover:bg-slate-100/95 cursor-pointer select-none transition-colors border-t border-b border-slate-200 font-semibold"
                        >
                          <td
                            className={`py-2 px-3 text-slate-900 sticky left-0 z-10 bg-slate-50/95 border-r border-slate-200 ${
                              isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-slate-200/90 text-slate-700 hover:bg-[#249791] hover:text-white transition-all shadow-xs border border-slate-300/80 inline-flex items-center justify-center shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                )}
                              </span>
                              <span className="font-bold text-slate-900 truncate" title={group.groupName}>
                                {group.groupName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium ml-auto pr-1 shrink-0">
                                ({group.businesses.length})
                              </span>
                            </div>
                          </td>

                          {quartersList.map((qKey) => (
                            <Fragment key={qKey}>
                              <td className="py-2 px-2 text-right font-mono text-slate-600 font-medium bg-slate-100/50 border-r border-slate-200">
                                {formatMetricVal(group.totals[`${qKey}_bud`])}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-900 font-bold border-r border-slate-200">
                                {formatMetricVal(group.totals[`${qKey}_act`])}
                              </td>
                            </Fragment>
                          ))}

                          <td className="py-2 px-2 text-right font-mono text-slate-800 font-bold bg-amber-50/40 border-r border-slate-200 text-sm sm:text-[14.5px]">
                            {formatMetricVal(group.totals.Total_bud)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-900 font-bold bg-blue-50/50 text-sm sm:text-[14.5px]">
                            {formatMetricVal(group.totals.Total_act)}
                          </td>
                        </tr>

                        {/* Child Business Rows (Rendered as subcategory directly under Segment) */}
                        {isExpanded &&
                          group.businesses.map((biz) => (
                            <tr
                              key={`${group.groupName}-${biz.business}`}
                              className="bg-white hover:bg-slate-50/80 transition-colors"
                            >
                              <td
                                className={`py-1.5 px-3 pl-8 sm:pl-9 text-slate-700 border-b border-r border-slate-100 sticky left-0 z-10 bg-white ${
                                  isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-teal-600/80 font-mono text-[12px] select-none shrink-0">↳</span>
                                  <span className="font-medium text-slate-800 text-xs truncate" title={biz.business}>
                                    {biz.business}
                                  </span>
                                </div>
                              </td>

                              {quartersList.map((qKey) => (
                                <Fragment key={qKey}>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-500 bg-slate-50/40 border-b border-r border-slate-100">
                                    {formatMetricVal(biz.values[`${qKey}_bud`])}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-800 border-b border-r border-slate-100">
                                    {formatMetricVal(biz.values[`${qKey}_act`])}
                                  </td>
                                </Fragment>
                              ))}

                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-700 border-b border-r border-slate-100 bg-amber-50/20 text-xs sm:text-[13px]">
                                {formatMetricVal(biz.values.Total_bud)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 border-b border-slate-100 bg-blue-50/20 text-xs sm:text-[13px]">
                                {formatMetricVal(biz.values.Total_act)}
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>

              {groupedData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                    <td
                      className={`py-2.5 px-3 border-t border-r border-slate-300 sticky left-0 z-20 bg-slate-100 text-sm sm:text-base font-bold text-slate-900 ${
                        isScrolledX ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Total</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          ({totalBusinessesCount} BUs)
                        </span>
                      </div>
                    </td>

                    {quartersList.map((qKey) => (
                      <Fragment key={qKey}>
                        <td className="py-2.5 px-2 text-right font-mono text-[13px] border-t border-r border-slate-300 text-slate-700 bg-slate-200/30 font-semibold">
                          {formatMetricVal(grandTotals[`${qKey}_bud`])}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[13px] border-t border-r border-slate-300 text-slate-900 font-bold">
                          {formatMetricVal(grandTotals[`${qKey}_act`])}
                        </td>
                      </Fragment>
                    ))}

                    <td className="py-2.5 px-2 text-right font-mono text-sm sm:text-base border-t border-r border-slate-300 text-slate-900 font-bold bg-amber-100/60">
                      {formatMetricVal(grandTotals.Total_bud)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-sm sm:text-base border-t border-slate-300 text-slate-900 font-bold bg-blue-100/60">
                      {formatMetricVal(grandTotals.Total_act)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
