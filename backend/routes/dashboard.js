/**
 * Dashboard Route & P&L Normalization Layer
 * Fetches and normalizes BigQuery pnldisqoq_view into the
 * standard Finance Intelligence Suite hierarchical data contract.
 */

import express from 'express';
import bqService from '../utils/bigqueryClient.js';
import { isDcoOrNyj } from '../utils/formatters.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';

const router = express.Router();

const project = process.env.GOOGLE_CLOUD_PROJECT || 'niit-finance-data';
const dataset = process.env.BIGQUERY_DATASET || 'Finance_View';
const view = process.env.BIGQUERY_VIEW || 'pnldisqoq_view';
const fullViewId = `${project}.${dataset}.${view}`;

export const METRIC_ORDER = [
  'Order Intake', 'Revenue', 'Variable Cost', 'VC%', 'Throughput',
  'People Cost', 'Marketing Expenses', 'Fixed Costs', 'SG&A Cost', 'SG&A Cost %',
  'Premises', 'Travel', 'Telecom', 'Legal & Professional', 'Administration',
  'PICA', 'Corp Allocation', 'Total Opex', 'EBITDA Contribution',
  'EBITDA Contribution %', 'IPR Creation', 'EBITDA', 'EBITDA %', 'OM %',
  'Gross Profit', 'Gross Margin %', 'GM %', 'Headcount', 'Sales Headcount', 'Learners Count',
  'Collection', 'Capex', 'Net Cash'
];

export const METRIC_TYPES = {
  'Order Intake': 'Amount', 'Revenue': 'Amount', 'Variable Cost': 'Amount',
  'VC%': 'Percentage', 'Throughput': 'Amount', 'People Cost': 'Amount',
  'Marketing Expenses': 'Amount', 'Fixed Costs': 'Amount', 'SG&A Cost': 'Amount',
  'SG&A Cost %': 'Percentage', 'Premises': 'Amount',
  'Travel': 'Amount', 'Telecom': 'Amount', 'Legal & Professional': 'Amount',
  'Administration': 'Amount', 'PICA': 'Amount', 'Corp Allocation': 'Amount',
  'Total Opex': 'Amount', 'EBITDA Contribution': 'Amount',
  'EBITDA Contribution %': 'Percentage', 'IPR Creation': 'Amount',
  'EBITDA': 'Amount', 'EBITDA %': 'Percentage', 'OM %': 'Percentage',
  'Gross Profit': 'Amount', 'Gross Margin %': 'Percentage', 'GM %': 'Percentage',
  'Headcount': 'Amount', 'Sales Headcount': 'Amount', 'Learners Count': 'Amount', 'Collection': 'Amount',
  'Capex': 'Amount', 'Net Cash': 'Amount'
};

async function fetchBusinessMappingRecords() {
  const bmQuery = `
    SELECT Segment, Biz1, Segment_N, Biz1_N 
    FROM \`${project}.finance_data.business_mapping\`
    WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
      AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
  `;
  const bmRaw = await bqService.executeQuery(bmQuery);
  const businessMappingRecords = [];

  for (const bmr of bmRaw || []) {
    const s_n = String(bmr.Segment_N || bmr.segment_n || '').trim();
    const s_old = String(bmr.Segment || bmr.segment || '').trim();
    const b_n = String(bmr.Biz1_N || bmr.biz1_n || '').trim();
    const b_old = String(bmr.Biz1 || bmr.biz1 || '').trim();

    if (isDcoOrNyj(s_n, b_n) || isDcoOrNyj(s_old, b_old)) continue;

    const s_effective = s_n || s_old;
    const b_effective = b_n || b_old;
    if (s_effective && b_effective) {
      businessMappingRecords.push({
        segment_n: s_n || s_effective,
        segment: s_old || s_effective,
        biz1_n: b_n || b_effective,
        biz1: b_old || b_effective
      });
    }
  }
  return businessMappingRecords;
}

async function fetchAndNormalize(options = {}) {
  const {
    fy = null,
    quarter = null,
    segment = null,
    biz1 = null,
    user = null
  } = options;

  const totalStart = performance.now();
  const whereClauses = ['`YEAR` IS NOT NULL'];
  const queryParams = {};

  const allBmRecords = await fetchBusinessMappingRecords();
  const userScope = resolveUserScope(user, allBmRecords);

  let bmRecords = allBmRecords;
  if (!userScope.isUnrestricted) {
    bmRecords = allBmRecords.filter((bmr) => {
      const sOld = String(bmr.segment || '').trim();
      const sNew = String(bmr.segment_n || '').trim();
      const bOld = String(bmr.biz1 || '').trim();
      const bNew = String(bmr.biz1_n || '').trim();

      if (userScope.allowedBizs && userScope.allowedBizs.length > 0) {
        return (userScope.allowedBizs || []).some(
          (b) => b.toLowerCase() === bOld.toLowerCase() || b.toLowerCase() === bNew.toLowerCase()
        );
      }
      return (userScope.allowedSegments || []).some(
        (s) => s.toLowerCase() === sOld.toLowerCase() || s.toLowerCase() === sNew.toLowerCase()
      );
    });

    const scopeConds = [];
    if (userScope.allowedBizs?.length > 0) {
      scopeConds.push('`Biz1` IN UNNEST(@user_allowed_bizs)');
      queryParams.user_allowed_bizs = userScope.allowedBizs;
    } else if (userScope.allowedSegments?.length > 0) {
      scopeConds.push('`Segment` IN UNNEST(@user_allowed_segments)');
      queryParams.user_allowed_segments = userScope.allowedSegments;
    } else {
      scopeConds.push('1 = 0');
    }
    whereClauses.push(`(${scopeConds.join(' AND ')})`);
  }

  if (fy && fy.toUpperCase() !== 'ALL') {
    whereClauses.push('`YEAR` = @target_fy');
    queryParams.target_fy = fy.trim();
  }

  if (quarter && !['Total', 'ALL'].includes(quarter)) {
    whereClauses.push('`Qtr` = @target_qtr');
    queryParams.target_qtr = quarter.trim();
  }

  if (segment && segment.toUpperCase() !== 'ALL') {
    const matchingBus = new Set();
    for (const bmr of bmRecords || []) {
      if (
        (bmr.segment_n || '').toLowerCase() === segment.trim().toLowerCase() ||
        (bmr.segment || '').toLowerCase() === segment.trim().toLowerCase()
      ) {
        if (bmr.biz1_n) matchingBus.add(bmr.biz1_n);
        if (bmr.biz1) matchingBus.add(bmr.biz1);
      }
    }

    if (matchingBus.size > 0) {
      whereClauses.push('(`Segment` = @target_segment OR `Biz1` IN UNNEST(@matching_bus))');
      queryParams.target_segment = segment.trim();
      queryParams.matching_bus = Array.from(matchingBus);
    } else {
      whereClauses.push('`Segment` = @target_segment');
      queryParams.target_segment = segment.trim();
    }
  }

  if (biz1 && biz1.toUpperCase() !== 'ALL') {
    whereClauses.push('`Biz1` = @target_biz1');
    queryParams.target_biz1 = biz1.trim();
  }

  whereClauses.push("(`Segment` IS NULL OR UPPER(`Segment`) NOT LIKE '%DCO%') AND (`Biz1` IS NULL OR UPPER(`Biz1`) NOT LIKE '%NYJ%')");
  const whereSql = whereClauses.join(' AND ');

  const query = `
      SELECT
        \`YEAR\` AS fy,
        \`Qtr\` AS quarter,
        \`Biz1\` AS biz,
        \`Segment\` AS segment,
        \`INR MN\` AS metric,
        \`metric_type\`,
        \`ACT - Current Qtr FY\` AS act_val,
        \`BUD - Current Qtr FY\` AS bud_val
      FROM \`${fullViewId}\`
      WHERE ${whereSql}
    `;

  const [rawResult, heatmapRaw, capexRaw, collRaw, enrollRaw, hcRaw] = await Promise.all([
    bqService.executeQuery(query, queryParams),
    bqService.executeQuery(`
      SELECT FY as fy, Month as month, Biz1 as biz, Segment as segment, \`INR MN\` as metric,
             \`ACT - Current Month\` as act_val, \`BUD - Current Month\` as bud_val
      FROM \`${project}.${dataset}.HeatMap_Monthly\`
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    bqService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, Amount
      FROM \`${project}.${dataset}.capex_view\`
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    bqService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, Amount
      FROM \`${project}.${dataset}.collection_view\`
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    bqService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, Amount
      FROM \`${project}.${dataset}.enrollment_view\`
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    bqService.executeQuery(`
      SELECT EXTRACT(YEAR FROM Period) as cal_year, EXTRACT(MONTH FROM Period) as cal_month,
             Biz1_N as biz, Segment_N as segment, Nature, Headcount,
             IFNULL(DIS_F, '') as DIS_F
      FROM \`${project}.finance_data.headcount\`
      WHERE (Segment_N IS NULL OR UPPER(Segment_N) NOT LIKE '%DCO%')
        AND (Biz1_N IS NULL OR UPPER(Biz1_N) NOT LIKE '%NYJ%')
    `)
  ]);

  const isRowAllowed = (rSeg, rBiz) => {
    if (userScope.isUnrestricted) return true;
    const segStr = String(rSeg || '').trim().toLowerCase();
    const bizStr = String(rBiz || '').trim().toLowerCase();

    if (userScope.allowedBizs && userScope.allowedBizs.length > 0) {
      if (bizStr) {
        return (userScope.allowedBizs || []).some((b) => b.toLowerCase() === bizStr);
      }
      return (userScope.allowedSegments || []).some((s) => s.toLowerCase() === segStr);
    }

    if (userScope.allowedSegments && userScope.allowedSegments.length > 0) {
      return (userScope.allowedSegments || []).some((s) => s.toLowerCase() === segStr);
    }

    return false;
  };

  const rawRows = (rawResult || []).filter((r) => !isDcoOrNyj(r.Segment || r.segment, r.Biz1 || r.biz) && isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));
  const heatmapRows = (heatmapRaw || []).filter((r) => isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));
  const capexRows = (capexRaw || []).filter((r) => isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));
  const collRows = (collRaw || []).filter((r) => isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));
  const enrollRows = (enrollRaw || []).filter((r) => isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));
  const hcRows = (hcRaw || []).filter((r) => isRowAllowed(r.Segment_N || r.segment, r.Biz1_N || r.biz));
  const bqFetchTimeMs = Math.round((performance.now() - totalStart) * 100) / 100;
  const transformStart = performance.now();

  const fysSet = new Set();
  const quartersSet = new Set();
  const segmentsSet = new Set();
  const bizUnitsSet = new Set();
  const buSegmentMap = {};
  const buBiz1NMap = {};
  const segSegmentNMap = {};
  const fyActBudMap = {};

  const companyAccum = new Map();
  const segmentAccum = new Map();
  const buAccum = new Map();

  for (const bmr of bmRecords || []) {
    const sEffective = bmr.segment_n || bmr.segment;
    const bEffective = bmr.biz1_n || bmr.biz1;
    if (isDcoOrNyj(sEffective, bEffective)) continue;

    buSegmentMap[bEffective] = sEffective;
    if (bmr.biz1) {
      buSegmentMap[bmr.biz1] = sEffective;
      if (bmr.biz1_n) buBiz1NMap[bmr.biz1] = bmr.biz1_n;
    }
    if (bmr.biz1_n) {
      buSegmentMap[bmr.biz1_n] = sEffective;
      buBiz1NMap[bmr.biz1_n] = bmr.biz1_n;
      bizUnitsSet.add(bmr.biz1_n);
    }
    if (bmr.biz1) {
      bizUnitsSet.add(bmr.biz1);
    }
    if (bmr.segment && bmr.segment_n) {
      segSegmentNMap[bmr.segment] = bmr.segment_n;
    }
    if (bmr.segment_n) segmentsSet.add(bmr.segment_n);
    if (bmr.segment) segmentsSet.add(bmr.segment);
  }

  const businessMappingRecords = (bmRecords || []).filter(
    bmr => !isDcoOrNyj(bmr.segment_n || bmr.segment, bmr.biz1_n || bmr.biz1)
  );

  for (const r of rawRows) {
    const rowFy = r.fy;
    const q = r.quarter;
    const biz = r.biz;
    const seg = r.segment;
    const metric = r.metric;

    fysSet.add(rowFy);
    quartersSet.add(q);
    if (seg && !isDcoOrNyj(seg, null)) {
      segmentsSet.add(seg);
    }
    if (biz && !isDcoOrNyj(null, biz)) {
      bizUnitsSet.add(biz);
      if (seg && !isDcoOrNyj(seg, null) && !buSegmentMap[biz]) {
        buSegmentMap[biz] = seg;
      }
    }

    const scenarios = [];
    if (r.act_val !== null && r.act_val !== undefined) {
      scenarios.push(['ACT', Number(r.act_val) || 0.0]);
    }
    if (r.bud_val !== null && r.bud_val !== undefined) {
      scenarios.push(['BUD', Number(r.bud_val) || 0.0]);
    }

    for (const [scen, val] of scenarios) {
      if (!fyActBudMap[rowFy]) {
        fyActBudMap[rowFy] = new Set();
      }
      fyActBudMap[rowFy].add(scen);

      // Company level
      const ck = `${rowFy}:::${scen}:::${q}:::${metric}`;
      companyAccum.set(ck, (companyAccum.get(ck) || 0.0) + val);

      // Segment level
      const targetSegs = new Set();
      if (seg && !isDcoOrNyj(seg, null)) {
        targetSegs.add(seg);
        if (segSegmentNMap[seg]) targetSegs.add(segSegmentNMap[seg]);
      }
      const mappedSeg = buSegmentMap[biz];
      if (mappedSeg && !isDcoOrNyj(mappedSeg, null)) {
        targetSegs.add(mappedSeg);
        if (segSegmentNMap[mappedSeg]) targetSegs.add(segSegmentNMap[mappedSeg]);
      }

      for (const sTarget of targetSegs) {
        const sk = `${sTarget}:::${rowFy}:::${scen}:::${q}:::${metric}`;
        segmentAccum.set(sk, (segmentAccum.get(sk) || 0.0) + val);
      }

      // Business Unit level (accumulate for raw biz and mapped biz1_n)
      const targetBus = new Set();
      if (biz && !isDcoOrNyj(null, biz)) {
        targetBus.add(biz);
        if (buBiz1NMap[biz]) targetBus.add(buBiz1NMap[biz]);
      }

      for (const bTarget of targetBus) {
        const bk = `${bTarget}:::${rowFy}:::${scen}:::${q}:::${metric}`;
        buAccum.set(bk, (buAccum.get(bk) || 0.0) + val);
      }
    }
  }

  // Monthly hierarchical aggregator
  const monthlyCompany = {};
  const monthlySegment = {};
  const monthlyBu = {};

  const MONTH_NAMES = {
    '1': { short: 'Jan', full: 'January' }, '01': { short: 'Jan', full: 'January' }, 'jan': { short: 'Jan', full: 'January' }, 'january': { short: 'Jan', full: 'January' },
    '2': { short: 'Feb', full: 'February' }, '02': { short: 'Feb', full: 'February' }, 'feb': { short: 'Feb', full: 'February' }, 'february': { short: 'Feb', full: 'February' },
    '3': { short: 'Mar', full: 'March' }, '03': { short: 'Mar', full: 'March' }, 'mar': { short: 'Mar', full: 'March' }, 'march': { short: 'Mar', full: 'March' },
    '4': { short: 'Apr', full: 'April' }, '04': { short: 'Apr', full: 'April' }, 'apr': { short: 'Apr', full: 'April' }, 'april': { short: 'Apr', full: 'April' },
    '5': { short: 'May', full: 'May' }, '05': { short: 'May', full: 'May' }, 'may': { short: 'May', full: 'May' },
    '6': { short: 'Jun', full: 'June' }, '06': { short: 'Jun', full: 'June' }, 'jun': { short: 'Jun', full: 'June' }, 'june': { short: 'Jun', full: 'June' },
    '7': { short: 'Jul', full: 'July' }, '07': { short: 'Jul', full: 'July' }, 'jul': { short: 'Jul', full: 'July' }, 'july': { short: 'Jul', full: 'July' },
    '8': { short: 'Aug', full: 'August' }, '08': { short: 'Aug', full: 'August' }, 'aug': { short: 'Aug', full: 'August' }, 'august': { short: 'Aug', full: 'August' },
    '9': { short: 'Sep', full: 'September' }, '09': { short: 'Sep', full: 'September' }, 'sep': { short: 'Sep', full: 'September' }, 'september': { short: 'Sep', full: 'September' },
    '10': { short: 'Oct', full: 'October' }, 'oct': { short: 'Oct', full: 'October' }, 'october': { short: 'Oct', full: 'October' },
    '11': { short: 'Nov', full: 'November' }, 'nov': { short: 'Nov', full: 'November' }, 'november': { short: 'Nov', full: 'November' },
    '12': { short: 'Dec', full: 'December' }, 'dec': { short: 'Dec', full: 'December' }, 'december': { short: 'Dec', full: 'December' }
  };

  const CAL_MONTH_MAP = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
  };

  function normalizeFy(raw) {
    if (!raw) return 'FY26';
    const s = String(raw).trim();
    const match = s.match(/\d+/);
    if (!match) return s;
    let num = parseInt(match[0], 10);
    if (num >= 2000) num = num % 100;
    return `FY${num < 10 ? '0' + num : num}`;
  }

  function resolveMonth(rawM) {
    if (!rawM) return null;
    const clean = String(rawM).trim().toLowerCase();
    return MONTH_NAMES[clean] || { short: String(rawM).trim(), full: String(rawM).trim() };
  }

  function addMonthlyVal(tree, key, rowFy, scen, mKey, metric, val) {
    if (!tree[key]) tree[key] = {};
    if (!tree[key][rowFy]) tree[key][rowFy] = {};
    if (!tree[key][rowFy][scen]) tree[key][rowFy][scen] = {};
    if (!tree[key][rowFy][scen][mKey]) tree[key][rowFy][scen][mKey] = {};
    tree[key][rowFy][scen][mKey][metric] = Number(((tree[key][rowFy][scen][mKey][metric] || 0.0) + val).toFixed(4));
  }

  function addMonthlyRecord(rawFy, rawM, biz, seg, metric, actVal, budVal) {
    const rowFy = normalizeFy(rawFy);
    const mObj = resolveMonth(rawM);
    if (!rowFy || !mObj) return;
    const mKeys = Array.from(new Set([mObj.short, mObj.full]));
    const scenarios = [];
    if (actVal !== null && actVal !== undefined && !isNaN(Number(actVal))) {
      scenarios.push(['ACT', Number(actVal) || 0.0]);
    }
    if (budVal !== null && budVal !== undefined && !isNaN(Number(budVal))) {
      scenarios.push(['BUD', Number(budVal) || 0.0]);
    }

    for (const [scen, val] of scenarios) {
      // Company level
      if (!monthlyCompany[rowFy]) monthlyCompany[rowFy] = {};
      if (!monthlyCompany[rowFy][scen]) monthlyCompany[rowFy][scen] = {};
      for (const mKey of mKeys) {
        if (!monthlyCompany[rowFy][scen][mKey]) monthlyCompany[rowFy][scen][mKey] = {};
        monthlyCompany[rowFy][scen][mKey][metric] = Number(((monthlyCompany[rowFy][scen][mKey][metric] || 0.0) + val).toFixed(4));
      }

      // Segment level
      const targetSegs = new Set();
      if (seg && !isDcoOrNyj(seg, null)) {
        targetSegs.add(seg);
        if (segSegmentNMap[seg]) targetSegs.add(segSegmentNMap[seg]);
      }
      const mappedSeg = buSegmentMap[biz];
      if (mappedSeg && !isDcoOrNyj(mappedSeg, null)) {
        targetSegs.add(mappedSeg);
        if (segSegmentNMap[mappedSeg]) targetSegs.add(segSegmentNMap[mappedSeg]);
      }
      for (const sTarget of targetSegs) {
        for (const mKey of mKeys) {
          addMonthlyVal(monthlySegment, sTarget, rowFy, scen, mKey, metric, val);
        }
      }

      // BU level
      const targetBus = new Set();
      if (biz && !isDcoOrNyj(null, biz)) {
        targetBus.add(biz);
        if (buBiz1NMap[biz]) targetBus.add(buBiz1NMap[biz]);
      }
      for (const bTarget of targetBus) {
        for (const mKey of mKeys) {
          addMonthlyVal(monthlyBu, bTarget, rowFy, scen, mKey, metric, val);
        }
      }
    }
  }

  // 1. Process HeatMap_Monthly rows
  for (const r of heatmapRows || []) {
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, r.metric, r.act_val, r.bud_val);
  }

  // 2. Process Capex
  for (const r of capexRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Capex', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // 3. Process Collection
  for (const r of collRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Collection', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // 4. Process Enrollment
  for (const r of enrollRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Learners Count', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // 5. Process Headcount
  for (const r of hcRows || []) {
    const calY = Number(r.cal_year);
    const calM = Number(r.cal_month);
    const shortM = CAL_MONTH_MAP[calM];
    if (!shortM) continue;
    const fyNum = calM >= 4 ? (calY + 1) % 100 : calY % 100;
    const rowFy = `FY${fyNum < 10 ? '0' + fyNum : fyNum}`;
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(rowFy, shortM, r.biz, r.segment, 'Headcount', scen === 'ACT' ? r.Headcount : null, scen === 'BUD' ? r.Headcount : null);

    const disF = String(r.DIS_F || '').trim().toUpperCase();
    if (disF === 'S') {
      addMonthlyRecord(rowFy, shortM, r.biz, r.segment, 'Sales Headcount', scen === 'ACT' ? r.Headcount : null, scen === 'BUD' ? r.Headcount : null);
    }
  }

  // Enrich all monthly nodes with derived calculations
  function enrichMonthlyNode(node) {
    if (!node) return;
    const rev = node['Revenue'] || 0;
    const vc = node['Variable Cost'] || 0;
    let gp = node['Gross Profit'] !== undefined ? node['Gross Profit'] : (rev - (node['Total Direct Cost'] || vc));
    node['Gross Profit'] = Number(gp.toFixed(4));

    if (gp !== null && node['Variable Cost'] === undefined && rev) {
      node['Variable Cost'] = Number((rev - gp).toFixed(4));
    }
    node['Throughput'] = Number((rev - (node['Variable Cost'] || 0)).toFixed(4));

    if (node['SG&A Cost'] === undefined) {
      if (node['Total Opex'] !== undefined) node['SG&A Cost'] = node['Total Opex'];
      else if (node['Total Operating Expenses'] !== undefined) node['SG&A Cost'] = node['Total Operating Expenses'];
    }
    if (node['Total Opex'] === undefined && node['SG&A Cost'] !== undefined) {
      node['Total Opex'] = node['SG&A Cost'];
      node['Total Operating Expenses'] = node['SG&A Cost'];
    }

    if (rev > 0) {
      node['VC%'] = Number((((node['Variable Cost'] || 0) / rev) * 100).toFixed(4));
      node['Gross Margin %'] = Number(((gp / rev) * 100).toFixed(4));
      node['GM %'] = node['Gross Margin %'];
      node['GM%'] = node['Gross Margin %'];
      if (node['SG&A Cost'] !== undefined) {
        node['SG&A Cost %'] = Number(((node['SG&A Cost'] / rev) * 100).toFixed(4));
        node['SG&A %'] = node['SG&A Cost %'];
      }
      if (node['EBITDA Contribution'] !== undefined) {
        node['EBITDA Contribution %'] = Number(((node['EBITDA Contribution'] / rev) * 100).toFixed(4));
      }
      if (node['EBITDA'] !== undefined) {
        node['EBITDA %'] = Number(((node['EBITDA'] / rev) * 100).toFixed(4));
        node['OM %'] = node['EBITDA %'];
        node['OM%'] = node['EBITDA %'];
      }
    }
  }

  for (const rowFy of Object.keys(monthlyCompany)) {
    for (const scen of Object.keys(monthlyCompany[rowFy])) {
      for (const m of Object.keys(monthlyCompany[rowFy][scen])) {
        enrichMonthlyNode(monthlyCompany[rowFy][scen][m]);
      }
    }
  }
  for (const seg of Object.keys(monthlySegment)) {
    for (const rowFy of Object.keys(monthlySegment[seg])) {
      for (const scen of Object.keys(monthlySegment[seg][rowFy])) {
        for (const m of Object.keys(monthlySegment[seg][rowFy][scen])) {
          enrichMonthlyNode(monthlySegment[seg][rowFy][scen][m]);
        }
      }
    }
  }
  for (const bu of Object.keys(monthlyBu)) {
    for (const rowFy of Object.keys(monthlyBu[bu])) {
      for (const scen of Object.keys(monthlyBu[bu][rowFy])) {
        for (const m of Object.keys(monthlyBu[bu][rowFy][scen])) {
          enrichMonthlyNode(monthlyBu[bu][rowFy][scen][m]);
        }
      }
    }
  }

  const fys = Array.from(fysSet).sort();
  const segments = Array.from(segmentsSet).sort();
  const bizUnits = Array.from(bizUnitsSet).sort();
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'Total'];
  const fyActBud = {};
  for (const [k, v] of Object.entries(fyActBudMap)) {
    fyActBud[k] = Array.from(v).sort();
  }

  let budgetFy = fys.length > 0 ? fys[fys.length - 1] : '';
  for (let i = fys.length - 1; i >= 0; i--) {
    const f = fys[i];
    const scens = fyActBud[f] || [];
    if (scens.includes('BUD') && scens.includes('ACT')) {
      budgetFy = f;
      break;
    }
  }

  function enrichNode(node) {
    const fcSum = (node['Premises'] || 0.0) + (node['Travel'] || 0.0) + (node['Telecom'] || 0.0) + (node['Legal & Professional'] || 0.0) + (node['Administration'] || 0.0);
    if (node['Fixed Cost'] !== undefined && node['Fixed Costs'] === undefined) {
      node['Fixed Costs'] = node['Fixed Cost'];
    } else if (node['Fixed Costs'] !== undefined && node['Fixed Cost'] === undefined) {
      node['Fixed Cost'] = node['Fixed Costs'];
    } else if (fcSum > 0 && (node['Fixed Costs'] === undefined || node['Fixed Costs'] === 0)) {
      node['Fixed Costs'] = Number(fcSum.toFixed(4));
      node['Fixed Cost'] = Number(fcSum.toFixed(4));
    }
    if (node['Total Operating Expenses'] !== undefined && node['Total Opex'] === undefined) {
      node['Total Opex'] = node['Total Operating Expenses'];
    }
    if (node['SG&A Cost'] === undefined) {
      if (node['Total Opex'] !== undefined) node['SG&A Cost'] = node['Total Opex'];
      else if (node['Total Operating Expenses'] !== undefined) node['SG&A Cost'] = node['Total Operating Expenses'];
    }
    if (node['Total Opex'] === undefined && node['SG&A Cost'] !== undefined) {
      node['Total Opex'] = node['SG&A Cost'];
      node['Total Operating Expenses'] = node['SG&A Cost'];
    }

    const peopleSum = (node['People_Dir'] || 0.0) + (node['People_S&M'] || 0.0) + (node['People_Indirect'] || 0.0);
    if (peopleSum || node['People Cost'] === undefined) {
      node['People Cost'] = Number(peopleSum.toFixed(4));
    }

    const mktgSum = (node['Marketing Expenses_Dir'] || 0.0) + (node['Marketing Expenses_S&M'] || 0.0) + (node['Marketing Expenses_Ind'] || 0.0);
    if (mktgSum || node['Marketing Expenses'] === undefined) {
      node['Marketing Expenses'] = Number(mktgSum.toFixed(4));
    }

    const premisesSum = (node['Premises_Dir'] || 0.0) + (node['Premises_S&M'] || 0.0) + (node['Premises_Indirect'] || 0.0);
    if (premisesSum || node['Premises'] === undefined) {
      node['Premises'] = Number(premisesSum.toFixed(4));
    }

    const travelSum = (node['Travel_Dir'] || 0.0) + (node['Travel_S&M'] || 0.0) + (node['Travel_Indirect'] || 0.0);
    if (travelSum || node['Travel'] === undefined) {
      node['Travel'] = Number(travelSum.toFixed(4));
    }

    const telecomSum = (node['Telecom_Dir'] || 0.0) + (node['Telecom_S&M'] || 0.0) + (node['Telecom_Ind'] || 0.0);
    if (telecomSum || node['Telecom'] === undefined) {
      node['Telecom'] = Number(telecomSum.toFixed(4));
    }

    const legalSum = (node['Legal & Professional_Dir'] || 0.0) + (node['Legal & Professional - S&M'] || 0.0) + (node['Legal & Professional - Ind'] || 0.0);
    if (legalSum || node['Legal & Professional'] === undefined) {
      node['Legal & Professional'] = Number(legalSum.toFixed(4));
    }

    const rev = node['Revenue'] || 0.0;
    const vc = node['Variable Cost'] || 0.0;
    const gp = node['Gross Profit'] !== undefined ? node['Gross Profit'] : (rev - (node['Total Direct Cost'] || vc));
    if (node['Gross Profit'] === undefined && (node['Total Direct Cost'] !== undefined || node['Variable Cost'] !== undefined)) {
      node['Gross Profit'] = Number(gp.toFixed(4));
    }

    if (rev && Math.abs(rev) > 0.0001) {
      if (node['Variable Cost'] !== undefined) {
        node['VC%'] = Number(((node['Variable Cost'] / rev) * 100).toFixed(4));
      }
      node['Gross Margin %'] = Number(((gp / rev) * 100).toFixed(4));
      node['GM %'] = node['Gross Margin %'];
      node['GM%'] = node['Gross Margin %'];
      if (node['SG&A Cost'] !== undefined) {
        node['SG&A Cost %'] = Number(((node['SG&A Cost'] / rev) * 100).toFixed(4));
        node['SG&A %'] = node['SG&A Cost %'];
      }
      if (node['EBITDA'] !== undefined) {
        node['EBITDA %'] = Number(((node['EBITDA'] / rev) * 100).toFixed(4));
        node['OM %'] = node['EBITDA %'];
        node['OM%'] = node['EBITDA %'];
      }
      if (node['EBITDA Contribution'] !== undefined) {
        node['EBITDA Contribution %'] = Number(((node['EBITDA Contribution'] / rev) * 100).toFixed(4));
      }
    }
  }

  function buildMetricDict(accumMap, prefixFilter = null) {
    const out = {};
    for (const [kStr, val] of accumMap.entries()) {
      const parts = kStr.split(':::');
      let entity, rowFy, scen, q, metric;
      if (prefixFilter !== null) {
        [entity, rowFy, scen, q, metric] = parts;
        if (entity !== prefixFilter) continue;
      } else {
        [rowFy, scen, q, metric] = parts;
      }

      if (!out[rowFy]) out[rowFy] = {};
      if (!out[rowFy][scen]) out[rowFy][scen] = {};
      if (!out[rowFy][scen][q]) out[rowFy][scen][q] = {};

      out[rowFy][scen][q][metric] = Number(val.toFixed(4));
    }

    for (const fyK of Object.keys(out)) {
      for (const scenK of Object.keys(out[fyK])) {
        const qNodes = out[fyK][scenK];
        const availQs = ['Q1', 'Q2', 'Q3', 'Q4'].filter(q => q in qNodes);
        if (availQs.length > 0) {
          if (!qNodes['Total']) qNodes['Total'] = {};
          const totNode = qNodes['Total'];
          const allMetrics = new Set();
          for (const q of availQs) {
            Object.keys(qNodes[q]).forEach(m => allMetrics.add(m));
          }

          for (const m of allMetrics) {
            if (m === 'Headcount' || m === 'Sales Headcount') {
              for (let qi = availQs.length - 1; qi >= 0; qi--) {
                const lq = availQs[qi];
                if (qNodes[lq][m] !== undefined && qNodes[lq][m] !== null) {
                  totNode[m] = qNodes[lq][m];
                  break;
                }
              }
            } else if (METRIC_TYPES[m] === 'Percentage') {
              continue;
            } else {
              let sumVal = 0.0;
              for (const q of availQs) {
                sumVal += Number(qNodes[q][m]) || 0.0;
              }
              totNode[m] = Number(sumVal.toFixed(4));
            }
          }
        }
      }
    }

    for (const fyK of Object.keys(out)) {
      for (const scenK of Object.keys(out[fyK])) {
        for (const qK of Object.keys(out[fyK][scenK])) {
          enrichNode(out[fyK][scenK][qK]);
        }
      }
    }

    return out;
  }

  const companyData = buildMetricDict(companyAccum);
  const segmentData = {};
  for (const seg of segments) {
    segmentData[seg] = buildMetricDict(segmentAccum, seg);
  }
  const buData = {};
  for (const bu of bizUnits) {
    buData[bu] = buildMetricDict(buAccum, bu);
  }

  const transformTimeMs = Math.round((performance.now() - transformStart) * 100) / 100;
  const totalTimeMs = Math.round((performance.now() - totalStart) * 100) / 100;

  const meta = {
    metric_order: METRIC_ORDER,
    metric_type: METRIC_TYPES,
    fys,
    quarters,
    segments,
    biz_units: bizUnits,
    bu_segment: buSegmentMap,
    business_mapping: businessMappingRecords,
    fy_actbud: fyActBud,
    budget_fy: budgetFy,
    row_count: rawRows.length,
    project,
    dataset,
    view_id: fullViewId,
    agent_id: process.env.BIGQUERY_DATA_AGENT_ID || '',
    location: process.env.BIGQUERY_LOCATION || 'asia-south2',
    generated_note: `Live from BigQuery view ${fullViewId}`,
    execution_metrics: {
      bq_fetch_ms: bqFetchTimeMs,
      transform_ms: transformTimeMs,
      total_ms: totalTimeMs,
      rows_processed: rawRows.length
    }
  };

  return {
    meta,
    company: companyData,
    segment: segmentData,
    bu: buData,
    monthly: {
      company: monthlyCompany,
      segment: monthlySegment,
      bu: monthlyBu
    }
  };
}

router.get('/', verifyUser, async (req, res) => {
  try {
    const startTime = performance.now();
    const { fy = null, quarter = null, segment = null, bu = null } = req.query;

    const data = await fetchAndNormalize({
      fy,
      quarter,
      segment,
      biz1: bu,
      user: req.dbUser,
    });

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    res.setHeader('X-Dashboard-Fetch-Ms', String(elapsedMs));
    return res.json(data);
  } catch (exc) {
    console.error(`[API] Error fetching dashboard data: ${exc.message}`, exc);
    return res.status(500).json({
      detail: 'Unable to query financial data from BigQuery. Please verify connectivity and dataset permissions.'
    });
  }
});

export default router;
