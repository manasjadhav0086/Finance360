/**
 * Live News & Macro Environment Route
 * Provides real-time market intelligence, macroeconomic indicators,
 * and industry developments with genuine live search grounding.
 */

import express from 'express';
import { verifyUser } from '../middleware/auth.js';
import newsService from '../services/newsService.js';
import { COUNTRIES, INDUSTRIES } from '../utils/marketIntelligenceData.js';

const router = express.Router();

/**
 * GET /news/meta
 * Returns supported industries and countries for dropdown menus
 */
router.get('/meta', verifyUser, (req, res) => {
  return res.json({
    industries: INDUSTRIES,
    countries: COUNTRIES.map((c) => ({
      name: c.name,
      code: c.code,
      currency: c.currency,
      flag: c.flag,
    })),
    defaultCountry: 'India',
    defaultIndustry: 'Financial Services',
  });
});

/**
 * POST /news
 * Fetches real-time market news and grounded financial intelligence
 */
router.post('/', verifyUser, async (req, res) => {
  try {
    const body = req.body || {};

    // Support new industry/country parameters, with legacy fallback support
    const industry = (body.industry || body.topic || 'Financial Services').trim();
    const country = (body.country || body.location || 'India').trim();
    const forceRefresh = Boolean(body.forceRefresh);

    const result = await newsService.fetchLiveNews({
      industry,
      country,
      forceRefresh,
    });

    return res.json(result);
  } catch (exc) {
    console.error(`[API /news] Error fetching live news: ${exc.message}`);
    return res.status(500).json({
      error: exc.message || 'Failed to retrieve live market intelligence',
      detail: exc.message,
    });
  }
});

export default router;
