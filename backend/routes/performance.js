import express from 'express';
import bqService from '../utils/bigqueryClient.js';
import { serializeRow } from '../utils/formatters.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';

const router = express.Router();

const project = process.env.GOOGLE_CLOUD_PROJECT;
const dataset = process.env.BIGQUERY_DATASET;

let mappingLoaded = false;
let bmRawRecords = [];
const bizAliases = new Map();
const segToBizs = new Map();

async function ensureAliases() {
  if (mappingLoaded) return;
  const sql = `
    SELECT Segment, Biz1, Segment_N, Biz1_N 
    FROM \`${project}.finance_data.business_mapping\`
    WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
      AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
  `;
  const rows = await bqService.executeQuery(sql);
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

async function fetchView(bqView, segment, biz1, userScope = { isUnrestricted: true }) {
  const hasSegmentCol = ['dataai_view', 'orderintake_view', 'capex_view', 'collection_view', 'enrollment_view'].includes(bqView);
  let sql = `
    SELECT * FROM \`${project}.${dataset}.${bqView}\` 
    WHERE 1=1 
      ${hasSegmentCol ? "AND (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')" : ''}
      AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
  `;
  const params = {};

  if (!userScope.isUnrestricted) {
    if (userScope.allowedBizs?.length) {
      sql += ' AND Biz1 IN UNNEST(@userAllowedBizs)';
      params.userAllowedBizs = userScope.allowedBizs;
    } else if (hasSegmentCol && userScope.allowedSegments?.length) {
      sql += ' AND Segment IN UNNEST(@userAllowedSegments)';
      params.userAllowedSegments = userScope.allowedSegments;
    } else {
      sql += ' AND 1=0';
    }
  }

  if (segment && segment.toUpperCase() !== 'ALL') {
    const matchingBizs = Array.from(segToBizs.get(segment.trim()) || []);
    if (hasSegmentCol) {
      if (matchingBizs.length > 0) {
        sql += ' AND (Segment = @segment OR Biz1 IN UNNEST(@matchingBizs))';
        params.matchingBizs = matchingBizs;
      } else {
        sql += ' AND Segment = @segment';
      }
      params.segment = segment.trim();
    } else if (matchingBizs.length > 0) {
      sql += ' AND Biz1 IN UNNEST(@matchingBizs)';
      params.matchingBizs = matchingBizs;
    }
  }

  if (biz1 && biz1.toUpperCase() !== 'ALL') {
    const bizVal = biz1.trim();
    const matchingAliases = Array.from(new Set([bizVal, ...(bizAliases.get(bizVal) || [])]));
    sql += ' AND Biz1 IN UNNEST(@matchingAliases)';
    params.matchingAliases = matchingAliases;
  }

  const rawRows = await bqService.executeQuery(sql, params);
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
        const rows = await fetchView(bqView, segment, biz1, userScope);
        return [key, { rows, viewName: bqView }];
      })
    );

    return res.json(Object.fromEntries(entries));
  } catch (exc) {
    console.error(`[PerformanceRouter] Query error: ${exc.message}`);
    return res.status(500).json({ detail: exc.message });
  }
});

export default router;
