import express from 'express';
import mysqlService from '../utils/mysqlClient.js';
import { serializeRow } from '../utils/formatters.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';

const router = express.Router();

let mappingLoaded = false;
let bmRawRecords = [];
const bizAliases = new Map();
const segToBizs = new Map();

async function ensureAliases() {
  if (mappingLoaded) return;
  const sql = `
    SELECT DISTINCT Segment, Biz1 
    FROM dataai
    WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
  `;
  const rows = await mysqlService.executeQuery(sql);
  bmRawRecords = (rows || []).map((r) => ({
    segment: String(r.Segment || '').trim(),
    biz1: String(r.Biz1 || '').trim(),
    segment_n: String(r.Segment || '').trim(),
    biz1_n: String(r.Biz1 || '').trim(),
  }));

  for (const r of rows || []) {
    const s = String(r.Segment || '').trim();
    const b = String(r.Biz1 || '').trim();

    if (s && b) {
      if (!segToBizs.has(s)) segToBizs.set(s, new Set());
      if (!segToBizs.has(s.toUpperCase())) segToBizs.set(s.toUpperCase(), new Set());
      segToBizs.get(s).add(b);
      segToBizs.get(s.toUpperCase()).add(b);
    }
  }

  mappingLoaded = true;
}

async function fetchView(viewKey, segment, biz1, userScope = { isUnrestricted: true }) {
  let sql = '';
  const params = [];
  const hasSegmentCol = ['dataai', 'dataai_view', 'orderintake_view', 'capex_view', 'collection_view'].includes(viewKey);

  if (viewKey === 'RevBizWise') {
    sql = `
      SELECT 
        FYs AS Filter_FY,
        QuarterFY,
        Biz1,
        Segment,
        ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 4) AS Revenue
      FROM dataai
      WHERE 1=1
    `;
    const filterClauses = [];
    if (!userScope.isUnrestricted) {
      if (userScope.allowedBizs?.length) {
        filterClauses.push('Biz1 IN (?)');
        params.push(userScope.allowedBizs);
      } else if (userScope.allowedSegments?.length) {
        filterClauses.push('Segment IN (?)');
        params.push(userScope.allowedSegments);
      } else {
        filterClauses.push('1 = 0');
      }
    }
    if (segment && segment.toUpperCase() !== 'ALL') {
      filterClauses.push('Segment = ?');
      params.push(segment.trim());
    }
    if (biz1 && biz1.toUpperCase() !== 'ALL') {
      filterClauses.push('Biz1 = ?');
      params.push(biz1.trim());
    }
    if (filterClauses.length > 0) {
      sql += ' AND ' + filterClauses.join(' AND ');
    }
    sql += ' GROUP BY FYs, QuarterFY, Biz1, Segment';
    const rows = await mysqlService.executeQuery(sql, params);
    return (rows || []).map(serializeRow);
  }

  if (viewKey === 'OrderBizWise') {
    sql = `
      SELECT 
        Year AS Filter_FY,
        CONCAT(
          CASE 
            WHEN Month IN ('Apr', 'May', 'Jun') THEN 'Q1 '
            WHEN Month IN ('Jul', 'Aug', 'Sep') THEN 'Q2 '
            WHEN Month IN ('Oct', 'Nov', 'Dec') THEN 'Q3 '
            ELSE 'Q4 '
          END,
          Year
        ) AS QuarterFY,
        Biz1,
        Segment,
        ROUND(SUM(CASE WHEN Nature IN ('Actual', 'Actuals') THEN Amount ELSE 0 END), 4) AS OrderIntake
      FROM order_intake
      WHERE 1=1
    `;
    const filterClauses = [];
    if (!userScope.isUnrestricted) {
      if (userScope.allowedBizs?.length) {
        filterClauses.push('Biz1 IN (?)');
        params.push(userScope.allowedBizs);
      } else if (userScope.allowedSegments?.length) {
        filterClauses.push('Segment IN (?)');
        params.push(userScope.allowedSegments);
      } else {
        filterClauses.push('1 = 0');
      }
    }
    if (segment && segment.toUpperCase() !== 'ALL') {
      filterClauses.push('Segment = ?');
      params.push(segment.trim());
    }
    if (biz1 && biz1.toUpperCase() !== 'ALL') {
      filterClauses.push('Biz1 = ?');
      params.push(biz1.trim());
    }
    if (filterClauses.length > 0) {
      sql += ' AND ' + filterClauses.join(' AND ');
    }
    sql += ' GROUP BY Year, QuarterFY, Biz1, Segment';
    const rows = await mysqlService.executeQuery(sql, params);
    return (rows || []).map(serializeRow);
  }

  if (viewKey === 'dataai') {
    sql = `
      SELECT 
        FYs,
        QuarterFY,
        Biz1,
        Segment,
        \`SG&A\`,
        \`SG&A Base\`,
        Nature,
        ROUND(SUM(Mn), 4) AS Mn
      FROM dataai 
      WHERE 1=1 
    `;
  } else {
    let tableName = 'order_intake';
    if (viewKey === 'capex_view') tableName = 'capex';
    else if (viewKey === 'collection_view') tableName = 'collection';

    sql = `
      SELECT * FROM ${tableName} 
      WHERE 1=1 
    `;
  }

  if (!userScope.isUnrestricted) {
    if (userScope.allowedBizs?.length) {
      sql += ' AND Biz1 IN (?)';
      params.push(userScope.allowedBizs);
    } else if (hasSegmentCol && userScope.allowedSegments?.length) {
      sql += ' AND Segment IN (?)';
      params.push(userScope.allowedSegments);
    } else {
      sql += ' AND 1=0';
    }
  }

  if (segment && segment.toUpperCase() !== 'ALL') {
    const matchingBizs = Array.from(segToBizs.get(segment.trim()) || []);
    if (hasSegmentCol) {
      if (matchingBizs.length > 0) {
        sql += ' AND (Segment = ? OR Biz1 IN (?))';
        params.push(segment.trim(), matchingBizs);
      } else {
        sql += ' AND Segment = ?';
        params.push(segment.trim());
      }
    } else if (matchingBizs.length > 0) {
      sql += ' AND Biz1 IN (?)';
      params.push(matchingBizs);
    }
  }

  if (biz1 && biz1.toUpperCase() !== 'ALL') {
    const bizVal = biz1.trim();
    const matchingAliases = Array.from(new Set([bizVal, ...(bizAliases.get(bizVal) || [])]));
    sql += ' AND Biz1 IN (?)';
    params.push(matchingAliases);
  }

  if (viewKey === 'dataai') {
    sql += ' GROUP BY FYs, QuarterFY, Biz1, Segment, `SG&A`, `SG&A Base`, Nature';
  }

  const rawRows = await mysqlService.executeQuery(sql, params);
  return (rawRows || []).map(serializeRow);
}

// In-memory response cache for high-speed dashboard loading
const perfCache = new Map();
const PERF_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

function getPerfCacheKey(userScope, segment, biz1) {
  const scopeId = userScope.isUnrestricted
    ? 'ALL'
    : `${(userScope.allowedBizs || []).slice().sort().join(',')}|${(userScope.allowedSegments || []).slice().sort().join(',')}`;
  return `${scopeId}:${segment || 'ALL'}:${biz1 || 'ALL'}`;
}

export function clearPerformanceCache() {
  perfCache.clear();
}

export async function warmPerformanceCache() {
  try {
    await ensureAliases();
    const adminScope = { isUnrestricted: true, allowedBizs: [], allowedSegments: [] };
    const views = {
      dataai: 'dataai_view',
      RevBizWise: 'RevBizWise',
      OrderBizWise: 'OrderBizWise',
      orderintake_view: 'orderintake_view',
      capex_view: 'capex_view',
      collection_view: 'collection_view',
    };

    console.log('[PerformanceRouter] Pre-warming performance cache in background...');
    const t0 = Date.now();
    const entries = await Promise.all(
      Object.entries(views).map(async ([key, bqView]) => {
        const rows = await fetchView(key, null, null, adminScope);
        return [key, { rows, viewName: bqView }];
      })
    );
    const result = Object.fromEntries(entries);
    const cacheKey = getPerfCacheKey(adminScope, null, null);
    perfCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`[PerformanceRouter] Performance cache pre-warmed in ${Date.now() - t0}ms.`);
  } catch (err) {
    console.warn('[PerformanceRouter] Pre-warm notice:', err.message);
  }
}

router.get('/', verifyUser, async (req, res) => {
  try {
    await ensureAliases();
    const { segment = null, biz1 = null, force_refresh = null } = req.query;
    const userScope = resolveUserScope(req.dbUser, bmRawRecords);

    const isForceRefresh = force_refresh === 'true' || force_refresh === true;
    const cacheKey = getPerfCacheKey(userScope, segment, biz1);
    const cached = perfCache.get(cacheKey);

    if (!isForceRefresh && cached && (Date.now() - cached.timestamp < PERF_CACHE_TTL_MS)) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const views = {
      dataai: 'dataai_view',
      RevBizWise: 'RevBizWise',
      OrderBizWise: 'OrderBizWise',
      orderintake_view: 'orderintake_view',
      capex_view: 'capex_view',
      collection_view: 'collection_view',
    };

    const entries = await Promise.all(
      Object.entries(views).map(async ([key, bqView]) => {
        const rows = await fetchView(key, segment, biz1, userScope);
        return [key, { rows, viewName: bqView }];
      })
    );

    const payload = Object.fromEntries(entries);
    perfCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    res.setHeader('X-Cache', 'MISS');
    return res.json(payload);
  } catch (exc) {
    console.error(`[PerformanceRouter] MySQL Query error: ${exc.message}`);
    return res.status(500).json({ detail: exc.message });
  }
});

export default router;
