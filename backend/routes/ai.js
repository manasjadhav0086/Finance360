import express from 'express';
import aiService from '../aiService.js';
import { verifyUser } from '../middleware/auth.js';
import { resolveUserScope } from '../utils/authScope.js';
import bqService from '../utils/bigqueryClient.js';

export const router = express.Router();

let mappingLoaded = false;
let bmRawRecords = [];

async function getBmRecords() {
  if (mappingLoaded && bmRawRecords.length) return bmRawRecords;
  try {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const sql = `
      SELECT Segment, Biz1, Segment_N, Biz1_N 
      FROM \`${project}.finance_data.business_mapping\`
      WHERE (Segment IS NULL OR UPPER(Segment) NOT LIKE '%DCO%')
        AND (Biz1 IS NULL OR UPPER(Biz1) NOT LIKE '%NYJ%')
    `;
    const rows = await bqService.executeQuery(sql);
    bmRawRecords = rows || [];
    mappingLoaded = true;
  } catch (err) {
    console.warn('[AI Route] Failed to fetch business mapping for scoping:', err.message);
  }
  return bmRawRecords;
}

/**
 * Interacts with Google Cloud BigQuery Data Agent.
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
    console.error(`[API] Error processing AI chat: ${exc.message}`, exc);
    return res.status(500).json({
      detail: 'AI Agent query failed. Please verify Application Default Credentials and agent connectivity.'
    });
  }
});

export default router;
