import express from 'express';
import aiService from '../aiService.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';
import mysqlService from '../utils/mysqlClient.js';

export const router = express.Router();

let mappingLoaded = false;
let bmRawRecords = [];

async function getBmRecords() {
  if (mappingLoaded && bmRawRecords.length) return bmRawRecords;
  try {
    const sql = `
      SELECT DISTINCT Segment, Biz1, Segment_N, Biz1_N 
      FROM dataai
      WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
        AND (Segment NOT LIKE '%DCO%')
        AND (Biz1 NOT LIKE '%NYJ%')
    `;
    const rows = await mysqlService.executeQuery(sql);
    bmRawRecords = rows || [];
    mappingLoaded = true;
  } catch (err) {
    console.warn('[AI Route] Failed to fetch business mapping for scoping from MySQL:', err.message);
  }
  return bmRawRecords;
}

/**
 * Interacts with MySQL Finance Intelligence Assistant.
 */
router.post('/', verifyUser, async (req, res) => {
  try {
    const payload = req.body || {};
    const msg = (payload.message || '').trim();

    if (!msg && !payload.action) {
      return res.status(400).json({ detail: 'Message or action must be provided.' });
    }

    const mapping = await getBmRecords();
    const userScope = resolveUserScope(req.dbUser, mapping);

    const result = await aiService.ask({
      question: msg || (payload.action || 'Finance query'),
      filters: payload.filters || {},
      action: payload.action || null,
      context_data: payload.context_data || {},
      userScope,
    });

    return res.json(result);
  } catch (exc) {
    console.error(`[API] Error processing AI finance query: ${exc.message}`, exc);
    return res.status(500).json({
      detail: 'AI Finance Assistant query failed. Please verify MySQL connectivity.'
    });
  }
});

export default router;
