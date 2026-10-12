/**
 * Live News & Macro Environment Agent Route
 * Retrieves grounded, real-time web news and macroeconomic environmental factors
 * using Google Cloud Vertex AI Search Grounding.
 */

import express from 'express';
import { getGoogleAuthToken } from '../utils/bigqueryClient.js';
import { verifyUser } from '../middleware/auth.js';

const router = express.Router();

function validateNewsRequest(body = {}) {
  return {
    industry: (body.industry).trim(),
    topic: (body.topic).trim(),
    location: (body.location).trim(),
    recency: (body.recency).trim()
  };
}

class LiveNewsAgent {
  async fetchLiveNews(req) {
    const token = await getGoogleAuthToken();
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'niit-finance-data';
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const model = process.env.NEWS_AGENT_MODEL || 'gemini-2.5-flash';

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const searchDirective = `Search for live and recent news developments regarding ${req.industry} specifically related to '${req.topic}' in ${req.location} (${req.recency}). Identify actual news articles published recently with verified sources, headlines, dates, and URLs.`;

    const formatInstruction = `
You are a Market Intelligence & Macro Environmental Analyst.
You MUST search the live web using Google Search to find current, real news articles.

Provide your output in strict JSON format matching this exact schema:
{
  "query_summary": "Brief 1-2 sentence overview of the current market and news landscape found.",
  "articles": [
    {
      "title": "Exact or factual title of the news story",
      "source": "Publisher or outlet name (e.g., The Economic Times, Mint, Business Standard, Reuters)",
      "published_date": "Publication date or estimated recency (e.g., September 2026, August 2026, or recent date)",
      "url": "Direct link or publication URL from the search results",
      "summary": "2-3 sentence factual summary of the news story",
      "relevance": "How this development directly impacts technology spending, digital investments, or IT demand in the sector"
    }
  ],
  "environment_factors": [
    "Macroeconomic or regulatory driver 1 affecting the industry",
    "Technology trend or spending catalyst 2",
    "Market challenge or headwind 3"
  ]
}

CRITICAL RULES:
1. Ground all articles in real, recent web search results. Do NOT invent URLs or articles.
2. Return ONLY the JSON object, without extra text or conversational filler.
`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${searchDirective}\n\n${formatInstruction}`
            }
          ]
        }
      ],
      tools: [
        {
          google_search: {}
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 3000
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errDetail = await response.text();
      try {
        const parsedErr = JSON.parse(errDetail);
        errDetail = parsedErr.error?.message || errDetail;
      } catch {
        // keep text
      }
      console.error(`[NewsAgent] Vertex AI returned error HTTP ${response.status}: ${errDetail}`);
      throw new Error(`Vertex AI Grounding failed (HTTP ${response.status}): ${errDetail}`);
    }

    const respData = await response.json();
    return this._parseGroundedResponse(respData, req);
  }

  _parseGroundedResponse(data, req) {
    const candidates = data.candidates || [];
    if (candidates.length === 0) {
      console.warn('[NewsAgent] No candidates returned by Vertex AI.');
      return {
        query_summary: `No results found for ${req.industry} / ${req.topic} in ${req.location}.`,
        articles: [],
        environment_factors: []
      };
    }

    const firstCand = candidates[0];
    const groundingMeta = firstCand.groundingMetadata || {};
    const groundingChunks = groundingMeta.groundingChunks || [];

    const webChunks = [];
    for (const chunk of groundingChunks) {
      const web = chunk.web;
      if (web && typeof web === 'object') {
        webChunks.push({
          title: web.title || '',
          url: web.uri || ''
        });
      }
    }

    const parts = firstCand.content?.parts || [];
    const textContent = parts.map(p => p.text || '').join('').trim();
    const parsedJson = this._extractJson(textContent);

    const articles = [];
    const rawArticles = parsedJson?.articles || [];

    for (const item of rawArticles) {
      try {
        let url = (item.url || '').trim();
        if (!url || url.startsWith('http://example') || url === '...') {
          const itemTitle = (item.title || '').toLowerCase();
          const matchedChunk = webChunks.find(
            c => c.url && (c.title.toLowerCase().includes(itemTitle) || itemTitle.includes(c.title.toLowerCase()))
          );
          if (matchedChunk) {
            url = matchedChunk.url;
          } else if (webChunks.length > 0) {
            url = webChunks[0].url;
          }
        }

        articles.push({
          title: item.title || 'Market Update',
          source: item.source || 'Industry News',
          published_date: item.published_date || req.recency,
          url,
          summary: item.summary || '',
          relevance: item.relevance || ''
        });
      } catch (e) {
        console.warn(`[NewsAgent] Error parsing article item: ${e.message}`);
      }
    }

    if (articles.length === 0 && webChunks.length > 0) {
      for (const chunk of webChunks.slice(0, 5)) {
        articles.push({
          title: chunk.title || 'Recent Industry Development',
          source: 'Google Search Source',
          published_date: req.recency,
          url: chunk.url || '',
          summary: `Recent report covering ${req.topic} in the ${req.industry} sector (${req.location}).`,
          relevance: `Relevant to technology spending and enterprise IT developments in ${req.location}.`
        });
      }
    }

    let envFactors = parsedJson?.environment_factors || [];
    if (!envFactors || envFactors.length === 0) {
      envFactors = [
        `Accelerated digital transformation and technology adoption in ${req.location} ${req.industry}`,
        'Regulatory and security compliance driving IT infrastructure spending',
        'Focus on operational efficiency, cloud migration, and AI integration'
      ];
    }

    let summary = parsedJson?.query_summary;
    if (!summary) {
      summary = `Live news intelligence for ${req.industry} regarding ${req.topic} in ${req.location}.`;
    }

    return {
      query_summary: summary,
      articles,
      environment_factors: envFactors
    };
  }

  _extractJson(text) {
    if (!text) return null;
    let cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/(\{[\s\S]*\})/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          // ignore
        }
      }
    }
    console.warn('[NewsAgent] Failed to parse JSON from Gemini text response.');
    return null;
  }
}

const newsAgent = new LiveNewsAgent();

router.post('/', verifyUser, async (req, res) => {
  try {
    const payload = validateNewsRequest(req.body || {});

    const result = await newsAgent.fetchLiveNews(payload);
    return res.json(result);
  } catch (exc) {
    console.error(`[API] Error fetching live news: ${exc.message}`, exc);
    return res.status(500).json({
      detail: `Live News Agent query failed: ${exc.message}`
    });
  }
});

export default router;
