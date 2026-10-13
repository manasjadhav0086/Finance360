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
    SELECT DISTINCT Segment, Biz1, Segment_N, Biz1_N 
    FROM dataai
    WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
  `;
  const rows = await mysqlService.executeQuery(sql);
  bmRawRecords = rows || [];

  for (const r of rows || []) {
    const sOld = String(r.Segment || '').trim();
    const sNew = String(r.Segment_N || '').trim();
    const bOld = String(r.Biz1 || '').trim();
    const bNew = String(r.Biz1_N || '').trim();

    if (bOld && bNew) {
      if (!bizAliases.has(bOld)) bizAliases.set(bOld, new Set());
      if (!bizAliases.has(bNew)) bizAliases.set(bNew, new Set());
      bizAliases.get(bOld).add(bNew);
      bizAliases.get(bNew).add(bOld);
    }

    [sNew, sOld].filter(Boolean).forEach((s) => {
      if (!segToBizs.has(s)) segToBizs.set(s, new Set());
      if (!segToBizs.has(s.toUpperCase())) segToBizs.set(s.toUpperCase(), new Set());
      if (bNew) {
        segToBizs.get(s).add(bNew);
        segToBizs.get(s.toUpperCase()).add(bNew);
      }
      if (bOld) {
        segToBizs.get(s).add(bOld);
        segToBizs.get(s.toUpperCase()).add(bOld);
      }
    });
  }

  mappingLoaded = true;
}

async function fetchView(viewKey, segment, biz1, userScope = { isUnrestricted: true }) {
  let sql = '';
  const params = [];
  const hasSegmentCol = ['dataai', 'dataai_view', 'orderintake_view', 'capex_view', 'collection_view', 'enrollment_view'].includes(viewKey);

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
      filterClauses.push('(Segment = ? OR Segment_N = ?)');
      params.push(segment.trim(), segment.trim());
    }
    if (biz1 && biz1.toUpperCase() !== 'ALL') {
      filterClauses.push('(Biz1 = ? OR Biz1_N = ?)');
      params.push(biz1.trim(), biz1.trim());
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

  let tableName = 'dataai';
  if (viewKey === 'orderintake_view') tableName = 'order_intake';
  else if (viewKey === 'capex_view') tableName = 'capex';
  else if (viewKey === 'collection_view') tableName = 'collection';

  sql = `
    SELECT * FROM ${tableName} 
    WHERE 1=1 
  `;

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

  const rawRows = await mysqlService.executeQuery(sql, params);
  return (rawRows || []).map(serializeRow);
}

router.get('/', verifyUser, async (req, res) => {
  try {
    await ensureAliases();
    const { segment = null, biz1 = null } = req.query;
    const userScope = resolveUserScope(req.dbUser, bmRawRecords);

    const views = {
      dataai: 'dataai_view',
      RevBizWise: 'RevBizWise',
      OrderBizWise: 'OrderBizWise',
      orderintake_view: 'orderintake_view',
      capex_view: 'capex_view',
      collection_view: 'collection_view',
      enrollment_view: 'enrollment_view',
    };

    const entries = await Promise.all(
      Object.entries(views).map(async ([key, bqView]) => {
        const rows = await fetchView(key, segment, biz1, userScope);
        return [key, { rows, viewName: bqView }];
      })
    );

    return res.json(Object.fromEntries(entries));
  } catch (exc) {
    console.error(`[PerformanceRouter] MySQL Query error: ${exc.message}`);
    return res.status(500).json({ detail: exc.message });
  }
});

export default router;
