/**
 * Dashboard Route & P&L Normalization Layer (MySQL Edition)
 * Fetches and normalizes MySQL finance_data into the
 * standard Finance Intelligence Suite hierarchical data contract.
 */

import express from 'express';
import mysqlService from '../utils/mysqlClient.js';
import { isDcoOrNyj } from '../utils/formatters.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';

const router = express.Router();

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

const MONTH_TO_QTR = {
  'Apr': 'Q1', 'April': 'Q1', 'May': 'Q1', 'Jun': 'Q1', 'June': 'Q1',
  'Jul': 'Q2', 'July': 'Q2', 'Aug': 'Q2', 'August': 'Q2', 'Sep': 'Q2', 'September': 'Q2',
  'Oct': 'Q3', 'October': 'Q3', 'Nov': 'Q3', 'November': 'Q3', 'Dec': 'Q3', 'December': 'Q3',
  'Jan': 'Q4', 'January': 'Q4', 'Feb': 'Q4', 'February': 'Q4', 'Mar': 'Q4', 'March': 'Q4'
};

async function fetchBusinessMappingRecords() {
  const bmQuery = `
    SELECT DISTINCT Segment, Biz1, Segment_N, Biz1_N 
    FROM dataai
    WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
      AND (Segment NOT LIKE '%DCO%')
      AND (Biz1 NOT LIKE '%NYJ%')
  `;
  const bmRaw = await mysqlService.executeQuery(bmQuery);
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
  const whereClauses = ["`FYs` IS NOT NULL AND `SG&A` IS NOT NULL"];
  const queryParams = [];

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

    if (userScope.allowedBizs?.length > 0) {
      whereClauses.push('`Biz1` IN (?)');
      queryParams.push(userScope.allowedBizs);
    } else if (userScope.allowedSegments?.length > 0) {
      whereClauses.push('`Segment` IN (?)');
      queryParams.push(userScope.allowedSegments);
    } else {
      whereClauses.push('1 = 0');
    }
  }

  if (fy && fy.toUpperCase() !== 'ALL') {
    const cleanFy = fy.trim();
    whereClauses.push('(`FYs` = ? OR `FY` = ?)');
    queryParams.push(cleanFy, cleanFy);
  }

  if (quarter && !['Total', 'ALL'].includes(quarter)) {
    const cleanQ = quarter.trim();
    whereClauses.push("SUBSTRING_INDEX(`QuarterFY`, ' ', 1) = ?");
    queryParams.push(cleanQ);
  }

  if (segment && segment.toUpperCase() !== 'ALL') {
    const cleanSeg = segment.trim();
    const matchingBus = new Set();
    for (const bmr of bmRecords || []) {
      if (
        (bmr.segment_n || '').toLowerCase() === cleanSeg.toLowerCase() ||
        (bmr.segment || '').toLowerCase() === cleanSeg.toLowerCase()
      ) {
        if (bmr.biz1_n) matchingBus.add(bmr.biz1_n);
        if (bmr.biz1) matchingBus.add(bmr.biz1);
      }
    }

    if (matchingBus.size > 0) {
      whereClauses.push('(`Segment` = ? OR `Segment_N` = ? OR `Biz1` IN (?))');
      queryParams.push(cleanSeg, cleanSeg, Array.from(matchingBus));
    } else {
      whereClauses.push('(`Segment` = ? OR `Segment_N` = ?)');
      queryParams.push(cleanSeg, cleanSeg);
    }
  }

  if (biz1 && biz1.toUpperCase() !== 'ALL') {
    const cleanBu = biz1.trim();
    whereClauses.push('(`Biz1` = ? OR `Biz1_N` = ?)');
    queryParams.push(cleanBu, cleanBu);
  }

  whereClauses.push("(`Segment` IS NULL OR UPPER(`Segment`) NOT LIKE '%DCO%') AND (`Biz1` IS NULL OR UPPER(`Biz1`) NOT LIKE '%NYJ%')");
  const whereSql = whereClauses.join(' AND ');

  const mainPnlQuery = `
    SELECT
      FYs AS fy,
      SUBSTRING_INDEX(QuarterFY, ' ', 1) AS quarter,
      Biz1 AS biz,
      Segment AS segment,
      \`SG&A\` AS metric,
      'Amount' AS metric_type,
      ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 4) AS act_val,
      ROUND(SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END), 4) AS bud_val
    FROM dataai
    WHERE ${whereSql}
    GROUP BY FYs, SUBSTRING_INDEX(QuarterFY, ' ', 1), Biz1, Segment, \`SG&A\`
  `;

  const monthlyPnlQuery = `
    SELECT
      FYs AS fy,
      DATE_FORMAT(\`Posting Date\`, '%b') AS month,
      Biz1 AS biz,
      Segment AS segment,
      \`SG&A\` AS metric,
      ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 4) AS act_val,
      ROUND(SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END), 4) AS bud_val
    FROM dataai
    WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
      AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    GROUP BY FYs, DATE_FORMAT(\`Posting Date\`, '%b'), Biz1, Segment, \`SG&A\`
  `;

  const [rawResult, heatmapRaw, capexRaw, collRaw, oiRaw] = await Promise.all([
    mysqlService.executeQuery(mainPnlQuery, queryParams),
    mysqlService.executeQuery(monthlyPnlQuery),
    mysqlService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, ROUND(Amount, 4) as Amount
      FROM capex
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    mysqlService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, ROUND(Amount, 4) as Amount
      FROM collection
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
    mysqlService.executeQuery(`
      SELECT Year as fy, Month as month, Biz1 as biz, Segment as segment, Nature, ROUND(Amount, 4) as Amount
      FROM order_intake
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `),
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
  const oiRows = (oiRaw || []).filter((r) => isRowAllowed(r.Segment || r.segment, r.Biz1 || r.biz));

  const dbFetchTimeMs = Math.round((performance.now() - totalStart) * 100) / 100;
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

  // Helper to record quarterly metric values across company, segment, and bu
  function recordQuarterlyMetric(rowFy, q, biz, seg, metricName, actVal, budVal) {
    if (!rowFy || !q || !metricName) return;
    fysSet.add(rowFy);
    quartersSet.add(q);
    if (seg && !isDcoOrNyj(seg, null)) segmentsSet.add(seg);
    if (biz && !isDcoOrNyj(null, biz)) {
      bizUnitsSet.add(biz);
      if (seg && !isDcoOrNyj(seg, null) && !buSegmentMap[biz]) {
        buSegmentMap[biz] = seg;
      }
    }

    const scenarios = [];
    if (actVal !== null && actVal !== undefined && !isNaN(Number(actVal))) {
      scenarios.push(['ACT', Number(actVal) || 0.0]);
    }
    if (budVal !== null && budVal !== undefined && !isNaN(Number(budVal))) {
      scenarios.push(['BUD', Number(budVal) || 0.0]);
    }

    for (const [scen, val] of scenarios) {
      if (!fyActBudMap[rowFy]) fyActBudMap[rowFy] = new Set();
      fyActBudMap[rowFy].add(scen);

      // Company level
      const ck = `${rowFy}:::${scen}:::${q}:::${metricName}`;
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
        const sk = `${sTarget}:::${rowFy}:::${scen}:::${q}:::${metricName}`;
        segmentAccum.set(sk, (segmentAccum.get(sk) || 0.0) + val);
      }

      // BU level
      const targetBus = new Set();
      if (biz && !isDcoOrNyj(null, biz)) {
        targetBus.add(biz);
        if (buBiz1NMap[biz]) targetBus.add(buBiz1NMap[biz]);
      }

      for (const bTarget of targetBus) {
        const bk = `${bTarget}:::${rowFy}:::${scen}:::${q}:::${metricName}`;
        buAccum.set(bk, (buAccum.get(bk) || 0.0) + val);
      }
    }
  }

  // 1. Process primary P&L rows
  for (const r of rawRows) {
    const rowFy = r.fy;
    const q = r.quarter;
    const biz = r.biz;
    const seg = r.segment;
    const metric = r.metric;

    recordQuarterlyMetric(rowFy, q, biz, seg, metric, r.act_val, r.bud_val);

    // Provide standard metric aliases for UI consistency
    if (metric === 'Premise Expenses') {
      recordQuarterlyMetric(rowFy, q, biz, seg, 'Premises', r.act_val, r.bud_val);
    } else if (metric === 'Travel Expenses') {
      recordQuarterlyMetric(rowFy, q, biz, seg, 'Travel', r.act_val, r.bud_val);
    } else if (metric === 'Telecom Expenses') {
      recordQuarterlyMetric(rowFy, q, biz, seg, 'Telecom', r.act_val, r.bud_val);
    } else if (metric === 'IPR') {
      recordQuarterlyMetric(rowFy, q, biz, seg, 'IPR Creation', r.act_val, r.bud_val);
    }
  }

  // 2. Aggregate quarterly Order Intake
  for (const r of oiRows || []) {
    const q = MONTH_TO_QTR[r.month] || 'Q1';
    const isBud = (r.Nature || '').toLowerCase().includes('bud');
    recordQuarterlyMetric(r.fy, q, r.biz, r.segment, 'Order Intake', isBud ? null : r.Amount, isBud ? r.Amount : null);
  }

  // 3. Aggregate quarterly Capex
  for (const r of capexRows || []) {
    const q = MONTH_TO_QTR[r.month] || 'Q1';
    const isBud = (r.Nature || '').toLowerCase().includes('bud');
    recordQuarterlyMetric(r.fy, q, r.biz, r.segment, 'Capex', isBud ? null : r.Amount, isBud ? r.Amount : null);
  }

  // 4. Aggregate quarterly Collection
  for (const r of collRows || []) {
    const q = MONTH_TO_QTR[r.month] || 'Q1';
    const isBud = (r.Nature || '').toLowerCase().includes('bud');
    recordQuarterlyMetric(r.fy, q, r.biz, r.segment, 'Collection', isBud ? null : r.Amount, isBud ? r.Amount : null);
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

  // 1. Process Monthly P&L rows
  for (const r of heatmapRows || []) {
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, r.metric, r.act_val, r.bud_val);
    if (r.metric === 'Premise Expenses') {
      addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Premises', r.act_val, r.bud_val);
    } else if (r.metric === 'Travel Expenses') {
      addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Travel', r.act_val, r.bud_val);
    } else if (r.metric === 'Telecom Expenses') {
      addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Telecom', r.act_val, r.bud_val);
    } else if (r.metric === 'IPR') {
      addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'IPR Creation', r.act_val, r.bud_val);
    }
  }

  // 2. Process Monthly Capex
  for (const r of capexRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Capex', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // 3. Process Monthly Collection
  for (const r of collRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Collection', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // 4. Process Monthly Order Intake
  for (const r of oiRows || []) {
    const scen = (r.Nature || '').toLowerCase().includes('bud') ? 'BUD' : 'ACT';
    addMonthlyRecord(r.fy, r.month, r.biz, r.segment, 'Order Intake', scen === 'ACT' ? r.Amount : null, scen === 'BUD' ? r.Amount : null);
  }

  // Enrich all monthly nodes with derived calculations
  function enrichMonthlyNode(node) {
    if (!node) return;
    if (node['Premises'] === undefined && node['Premise Expenses'] !== undefined) node['Premises'] = node['Premise Expenses'];
    if (node['Travel'] === undefined && node['Travel Expenses'] !== undefined) node['Travel'] = node['Travel Expenses'];
    if (node['Telecom'] === undefined && node['Telecom Expenses'] !== undefined) node['Telecom'] = node['Telecom Expenses'];
    if (node['IPR Creation'] === undefined && node['IPR'] !== undefined) node['IPR Creation'] = node['IPR'];

    const fcSum = (node['Premises'] || node['Premise Expenses'] || 0.0)
      + (node['Travel'] || node['Travel Expenses'] || 0.0)
      + (node['Telecom'] || node['Telecom Expenses'] || 0.0)
      + (node['Legal & Professional'] || 0.0)
      + (node['Administration'] || 0.0);

    if (node['Fixed Costs'] === undefined || node['Fixed Costs'] === 0) {
      node['Fixed Costs'] = Number(fcSum.toFixed(4));
      node['Fixed Cost'] = node['Fixed Costs'];
    }

    const people = node['People Cost'] || 0.0;
    const mktg = node['Marketing Expenses'] || 0.0;
    const pica = node['PICA'] || 0.0;
    const corpAlloc = node['Corp Allocation'] || 0.0;
    const fixedCosts = node['Fixed Costs'] || fcSum;

    const totalOpexCalc = people + mktg + fixedCosts + pica + corpAlloc;
    if (node['Total Opex'] === undefined || node['Total Opex'] === 0) {
      node['Total Opex'] = Number(totalOpexCalc.toFixed(4));
      node['SG&A Cost'] = node['Total Opex'];
      node['Total Operating Expenses'] = node['Total Opex'];
    }

    const rev = node['Revenue'] || 0;
    const vc = node['Variable Cost'] || 0;
    let gp = node['Gross Profit'] !== undefined ? node['Gross Profit'] : (rev - vc);
    node['Gross Profit'] = Number(gp.toFixed(4));
    node['Throughput'] = Number((rev - vc).toFixed(4));

    if (node['EBITDA'] === undefined || node['EBITDA'] === 0) {
      node['EBITDA'] = Number((gp - (node['Total Opex'] || totalOpexCalc)).toFixed(4));
    }
    if (node['EBITDA Contribution'] === undefined || node['EBITDA Contribution'] === 0) {
      node['EBITDA Contribution'] = Number((gp - mktg).toFixed(4));
    }

    if (node['Collection'] !== undefined && node['Total Opex'] !== undefined) {
      node['Net Cash'] = Number(((node['Collection'] || 0) - (node['Total Opex'] || 0) - (node['Capex'] || 0)).toFixed(4));
    }

    if (rev > 0) {
      node['VC%'] = Number(((vc / rev) * 100).toFixed(4));
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
    if (!node) return;
    if (node['Premises'] === undefined && node['Premise Expenses'] !== undefined) node['Premises'] = node['Premise Expenses'];
    if (node['Travel'] === undefined && node['Travel Expenses'] !== undefined) node['Travel'] = node['Travel Expenses'];
    if (node['Telecom'] === undefined && node['Telecom Expenses'] !== undefined) node['Telecom'] = node['Telecom Expenses'];
    if (node['IPR Creation'] === undefined && node['IPR'] !== undefined) node['IPR Creation'] = node['IPR'];

    const fcSum = (node['Premises'] || node['Premise Expenses'] || 0.0)
      + (node['Travel'] || node['Travel Expenses'] || 0.0)
      + (node['Telecom'] || node['Telecom Expenses'] || 0.0)
      + (node['Legal & Professional'] || 0.0)
      + (node['Administration'] || 0.0);

    if (node['Fixed Cost'] !== undefined && node['Fixed Costs'] === undefined) {
      node['Fixed Costs'] = node['Fixed Cost'];
    } else if (node['Fixed Costs'] !== undefined && node['Fixed Cost'] === undefined) {
      node['Fixed Cost'] = node['Fixed Costs'];
    } else if (fcSum > 0 && (node['Fixed Costs'] === undefined || node['Fixed Costs'] === 0)) {
      node['Fixed Costs'] = Number(fcSum.toFixed(4));
      node['Fixed Cost'] = Number(fcSum.toFixed(4));
    }

    const people = node['People Cost'] || (node['People_Dir'] || 0.0) + (node['People_S&M'] || 0.0) + (node['People_Indirect'] || 0.0);
    const mktg = node['Marketing Expenses'] || (node['Marketing Expenses_Dir'] || 0.0) + (node['Marketing Expenses_S&M'] || 0.0) + (node['Marketing Expenses_Ind'] || 0.0);
    const pica = node['PICA'] || 0.0;
    const corpAlloc = node['Corp Allocation'] || 0.0;
    const fixedCosts = node['Fixed Costs'] || fcSum;

    const totalOpexCalc = people + mktg + fixedCosts + pica + corpAlloc;
    if (node['Total Opex'] === undefined || node['Total Opex'] === 0) {
      node['Total Opex'] = Number(totalOpexCalc.toFixed(4));
      node['Total Operating Expenses'] = node['Total Opex'];
      node['SG&A Cost'] = node['Total Opex'];
    }

    const rev = node['Revenue'] || 0.0;
    const vc = node['Variable Cost'] || 0.0;
    const gp = node['Gross Profit'] !== undefined ? node['Gross Profit'] : (rev - vc);
    node['Gross Profit'] = Number(gp.toFixed(4));
    node['Throughput'] = Number((rev - vc).toFixed(4));

    if (node['EBITDA'] === undefined || node['EBITDA'] === 0) {
      node['EBITDA'] = Number((gp - (node['Total Opex'] || totalOpexCalc)).toFixed(4));
    }
    if (node['EBITDA Contribution'] === undefined || node['EBITDA Contribution'] === 0) {
      node['EBITDA Contribution'] = Number((gp - mktg).toFixed(4));
    }

    if (node['Collection'] !== undefined && node['Total Opex'] !== undefined) {
      node['Net Cash'] = Number(((node['Collection'] || 0) - (node['Total Opex'] || 0) - (node['Capex'] || 0)).toFixed(4));
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
    database: 'MySQL',
    table: 'dataai',
    location: `${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}`,
    generated_note: 'Live from MySQL authoritative database finance_data',
    execution_metrics: {
      db_fetch_ms: dbFetchTimeMs,
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
    console.error(`[API] Error fetching dashboard data from MySQL: ${exc.message}`, exc);
    return res.status(500).json({
      detail: 'Unable to query financial data from MySQL. Please verify database connectivity.'
    });
  }
});

export default router;
