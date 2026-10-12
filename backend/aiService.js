import { getGoogleAuthToken } from './utils/bigqueryClient.js';

const project = process.env.GOOGLE_CLOUD_PROJECT;
const dataset = process.env.BIGQUERY_DATASET;
const view = process.env.BIGQUERY_VIEW;
const agentLocation = process.env.DATA_AGENT_LOCATION;
const fullViewId = `${project}.${dataset}.${view}`;

function resolveActionTask(question, action, contextData, fy, scenario, q, seg, bu) {
  if (!action) return question;

  if (action === 'explain_tab') {
    const tabName = contextData.tab_name || 'Performance Overview';
    return `Explain and diagnose the metrics on the '${tabName}' tab for ${fy} ${q} (${scenario}). Provide a comprehensive financial synthesis of key metrics (Revenue, Margins, Opex, and Operations), highlighting primary achievements vs budget, notable YoY shifts, and the main driving Business Units or Segments.`;
  }
  if (action === 'explain_kpi') {
    const kpiName = contextData.kpi_name || question;
    return `Explain and diagnose the KPI '${kpiName}' for ${fy} ${q} (${scenario}). Break down current performance, budget variance, YoY movement, and the primary business units or segments driving it.`;
  }
  if (action === 'explain_chart') {
    const chartTitle = contextData.chart_title || 'Chart';
    const metric = contextData.metric || '';
    return `Explain the '${chartTitle}' chart (${metric}) for ${fy} (${q}). Explain key trends, peaks, troughs, margin inflection points, and what caused the trajectory across periods.`;
  }
  if (action === 'investigate_variance') {
    const targetMetric = contextData.metric || 'Revenue';
    return `Investigate the budget variance for ${targetMetric} in ${fy} (${q}). Identify which Business Units and Segments have the largest favorable and unfavorable gaps against budget, and why.`;
  }
  if (action === 'compare_periods') {
    const pB = contextData.period_b || fy;
    const nums = pB.match(/\d+/);
    const defaultPrior = nums ? (parseInt(nums[0], 10) - 1 < 10 ? `FY0${parseInt(nums[0], 10) - 1}` : `FY${parseInt(nums[0], 10) - 1}`) : 'Prior Period';
    const pA = contextData.period_a || defaultPrior;
    return `Perform a comprehensive comparison between ${pA} and ${pB} across Revenue, Gross Margin %, EBITDA, and Total Opex. Highlight the largest YoY movers, percentage growth, and underlying mix shifts.`;
  }
  if (action === 'drill_down') {
    const dim = contextData.dimension || 'Biz1';
    const metric = contextData.metric || 'Revenue';
    return `Drill down into ${metric} by ${dim} for ${fy} (${q}). Rank the top contributors, identify concentrations, and highlight any outliers or unexpected variances.`;
  }
  if (action === 'executive_brief') {
    return `Generate a comprehensive Finance Executive Brief for ${fy} ${q} (${scenario}) covering: 1) Revenue performance vs budget and YoY growth, 2) EBITDA and margin trajectory, 3) Top cost movers and Opex drivers, 4) Segment/BU contribution changes. Ground every point in actual figures.`;
  }
  return question;
}

function buildVisualizationSpec(kpis, question, action, taskText) {
  if (!kpis || kpis.length < 2) return {};
  const colors = ['#14424B', '#1E6B73', '#B9862E', '#1E7B4D', '#B3261E', '#7C5CB0', '#2A8B99', '#E8A838'];
  const first = kpis[0];
  const keys = Object.keys(first);

  const timeDims = keys.filter(k => /quarter|month|period|year|fy|^q$/i.test(k));
  const metricKeys = keys.filter(k => typeof first[k] === 'number' && !/year|fy/i.test(k));
  const catDims = keys.filter(k => !metricKeys.includes(k) && !timeDims.includes(k) && String(first[k] || '').trim());

  if (metricKeys.length === 0) return {};

  const primaryMetric = metricKeys[0];
  const actCol = metricKeys.find(k => /act|actual/i.test(k));
  const budCol = metricKeys.find(k => /bud|budget/i.test(k));
  const timeDim = timeDims[0] || null;
  const catDim = catDims[0] || null;

  if (actCol && budCol && (timeDim || catDim)) {
    const groupDim = timeDim || catDim;
    return {
      type: 'bar',
      title: `Actual vs Budget Comparison by ${groupDim}`,
      labels: kpis.map(r => String(r[groupDim] || '')).filter(Boolean),
      datasets: [
        { label: `${actCol} (₹ Mn)`, data: kpis.map(r => r[actCol] || 0), backgroundColor: '#14424B' },
        { label: `${budCol} (₹ Mn)`, data: kpis.map(r => r[budCol] || 0), backgroundColor: '#B9862E' }
      ]
    };
  }

  if (timeDim) {
    const labels = kpis.map(r => String(r[timeDim] || '')).filter(Boolean);
    if (metricKeys.length >= 2) {
      return {
        type: 'line',
        title: `Quarterly Performance Trend across ${metricKeys.slice(0, 3).join(', ')}`,
        labels,
        datasets: metricKeys.slice(0, 3).map((m, i) => ({
          label: `${m} (₹ Mn)`,
          data: kpis.map(r => r[m] || 0),
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length],
          fill: false,
          tension: 0.2
        }))
      };
    }
    return {
      type: 'bar',
      title: `${primaryMetric} Trend by ${timeDim}`,
      labels,
      datasets: [{ label: `${primaryMetric} (₹ Mn)`, data: kpis.map(r => r[primaryMetric] || 0), backgroundColor: '#1E6B73' }]
    };
  }

  if (catDim) {
    const sortedRows = [...kpis].sort((a, b) => (b[primaryMetric] || 0) - (a[primaryMetric] || 0)).slice(0, 10);
    const labels = sortedRows.map(r => String(r[catDim] || '')).filter(Boolean);
    const values = sortedRows.map(r => r[primaryMetric] || 0);
    const isCost = /cost|nature|composition|share/i.test(catDim) || /cost|nature|composition|share/i.test(taskText);

    if (isCost && labels.length <= 6) {
      return {
        type: 'doughnut',
        title: `${primaryMetric} Contribution by ${catDim}`,
        labels,
        datasets: [{ label: '₹ Mn', data: values, backgroundColor: colors.slice(0, labels.length) }]
      };
    }

    return {
      type: 'bar',
      title: `${primaryMetric} Ranking by ${catDim}`,
      labels,
      datasets: [{ label: `${primaryMetric} (₹ Mn)`, data: values, backgroundColor: '#14424B' }]
    };
  }

  return {};
}

export const aiService = {
  async ask(options = {}) {
    const { question = '', filters = {}, action = null, context_data = {}, userScope = null } = options;

    const fy = filters.fy || 'All';
    const scenario = filters.scenario || 'ACT';
    const q = filters.q || 'Total';
    const seg = filters.seg || 'ALL';
    const bu = filters.bu || 'ALL';

    const taskText = resolveActionTask(question, action, context_data, fy, scenario, q, seg, bu);

    let rbacConstraintText = '';
    if (userScope && !userScope.isUnrestricted) {
      const allowedSegs = (userScope.allowedSegmentLabels?.length ? userScope.allowedSegmentLabels : userScope.allowedSegments)?.join(', ') || 'None';
      const allowedBizs = (userScope.allowedBizLabels?.length ? userScope.allowedBizLabels : userScope.allowedBizs)?.join(', ') || 'None';
      rbacConstraintText = `
DATA SCOPE:
- Allowed Business Groups / Segments: ${allowedSegs}
- Allowed Business Units: ${allowedBizs}

DATA ACCESS RULES:
1. Restrict all data retrieval, calculations, and analysis strictly to the allowed Business Groups and Business Units listed above.
2. Do NOT mention access levels, permissions, RBAC, or security policies in your normal responses or introductions.
3. ONLY if the user explicitly asks for financial data or metrics for a Business Unit or Segment outside their allowed list, state specifically that data for that unit/segment is not accessible (e.g. "Data for [Unit Name] is not accessible.").
`;
    }

    const contextPrompt = `You are the Senior AI Finance Analyst for executive corporate performance.
Active Dashboard Context:
- Financial Year: ${fy}
- Scenario: ${scenario}
- Period/Quarter: ${q}
- Segment: ${seg}
- Business Unit: ${bu}

Analyst Task: ${taskText}

Source of Truth: BigQuery view \`${fullViewId}\`.
Table Schema Notes for \`${view}\`:
- Financial Year column: \`YEAR\`
- Quarter column: \`Qtr\`
- Dimension columns: \`Biz1\`, \`Segment\`
- Metric name column: \`INR MN\`
- Actual quarterly values: \`ACT - Current Qtr FY\`
- Budget quarterly values: \`BUD - Current Qtr FY\`
- Margin Numerators & Denominators: Actuals in \`ACT - Current FY Num\` / \`ACT - Current FY Den\`; Budget in \`BUD - Current FY Num\` / \`BUD - Current FY Den\`

CRITICAL FINANCIAL ANALYST GUIDELINES:
1. Provide a direct, concise, and accurate answer focused specifically on what was asked.
2. Base all numbers, calculations, and facts strictly on verified BigQuery data. Do not make assumptions or extrapolate unverified figures.
3. Keep the response natural and directly relevant to the question. Do NOT force rigid or unnecessary sections (e.g. Executive Answer, Primary Drivers, Financial Interpretation, Suggested Next Questions) unless the user's question explicitly calls for a multi-part breakdown or executive brief.
4. Use clean formatting (bold numbers, brief bullet points, or clear comparisons) only as needed to make the answer clear and easily readable.
${rbacConstraintText}
`;

    const startTime = performance.now();
    const token = await getGoogleAuthToken();
    const parent = `projects/${project}/locations/${agentLocation}`;
    const reqPayload = {
      messages: [{ userMessage: { text: contextPrompt } }],
      inlineContext: {
        datasourceReferences: {
          bq: { tableReferences: [{ projectId: project, datasetId: dataset, tableId: view }] }
        }
      }
    };

    const chatUrl = `https://geminidataanalytics.googleapis.com/v1alpha/${parent}:chat`;
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqPayload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Data Agent error (HTTP ${response.status}): ${errBody}`);
    }

    const resData = await response.json();
    const answerParts = [];
    const insights = [];
    const followUpQuestions = [];
    const kpis = [];
    let generatedSql = '';

    // Handle both Array response and Object response from Data Agent API
    let systemMessages = [];
    if (Array.isArray(resData)) {
      for (const item of resData) {
        if (item?.systemMessage) {
          systemMessages.push(item.systemMessage);
        } else if (item?.text || item?.data) {
          systemMessages.push(item);
        }
      }
    } else if (resData?.systemMessages) {
      systemMessages = resData.systemMessages;
    } else if (resData?.systemMessage) {
      systemMessages = [resData.systemMessage];
    }

    for (const sm of systemMessages) {
      if (sm?.text) {
        const parts = sm.text.parts || [];
        const textType = sm.text.textType || 'FINAL_RESPONSE';
        if (textType === 'FINAL_RESPONSE') {
          answerParts.push(...parts);
        } else if (textType === 'THOUGHT') {
          for (const p of parts) {
            if (p?.trim() && !p.startsWith('Analyzing context') && !p.startsWith('Context retrieved') && !p.startsWith('Retrieving context')) {
              insights.push(p.trim());
            }
          }
        } else if (textType === 'FOLLOWUP_QUESTIONS') {
          followUpQuestions.push(...parts);
        } else {
          answerParts.push(...parts);
        }
      }
      if (sm?.data) {
        if (sm.data.generatedSql) {
          generatedSql = sm.data.generatedSql.trim();
          insights.push(`Generated SQL: ${generatedSql}`);
        }
        if (sm.data.result?.data) {
          for (const row of sm.data.result.data) {
            const rowDict = {};
            for (const [k, v] of Object.entries(row)) {
              if (v && typeof v === 'object' && v.numberValue !== undefined) rowDict[k] = Math.round(Number(v.numberValue) * 100) / 100;
              else if (v && typeof v === 'object' && v.stringValue !== undefined) rowDict[k] = v.stringValue;
              else if (v && typeof v === 'object' && v.boolValue !== undefined) rowDict[k] = v.boolValue;
              else rowDict[k] = v !== undefined && v !== null ? String(v) : null;
            }
            kpis.push(rowDict);
          }
        }
      }
    }

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    let rawText = answerParts.join('\n\n').trim();
    if (!rawText && insights.length > 0) rawText = insights[insights.length - 1];

    const visualization = buildVisualizationSpec(kpis, question, action, taskText);

    return {
      answer: rawText || 'Analysis completed.',
      follow_up_questions: followUpQuestions.slice(0, 4),
      evidence: kpis.slice(0, 15),
      visualization: visualization || {},
      sql_trace: generatedSql,
      insights: insights.slice(0, 5),
      kpis: kpis.slice(0, 10),
      latency_ms: elapsedMs,
      model: 'BigQuery Data Agent'
    };
  }
};

export default aiService;
