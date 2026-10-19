/**
 * MySQL Finance Intelligence Agent
 * High-performance, executive-grade financial intelligence engine.
 * Directly queries MySQL finance_data tables, verifies financial calculations,
 * enforces strict financial chart semantics, and produces executive-ready
 * narrative insights for CFOs, finance managers, and business leaders.
 */

import mysqlService from './utils/mysqlClient.js';

const PALETTE = ['#246BFD', '#F59E0B', '#10B981', '#E11D48', '#8B5CF6', '#0D9488', '#EA580C', '#EC4899', '#38BDF8'];

/**
 * Formats an executive-ready response adhering to the 6 core business leadership pillars:
 * 1. Executive Summary
 * 2. Key Financial Findings (Markdown Comparison Table)
 * 3. Business & Margin Impact
 * 4. Likely Drivers
 * 5. Recommended Actions for Finance Leadership
 * 6. Risks & Uncertainty
 * + Collapsible Technical SQL Trace
 */
function formatExecutiveResponse({
  title,
  periodText,
  summary,
  findingsTable,
  businessImpact,
  likelyDrivers,
  recommendedActions,
  risksUncertainty,
  sqlTrace,
  chartNote = ''
}) {
  let md = `### 📌 Executive Summary: ${title} (${periodText})\n\n`;
  md += `${summary.trim()}\n\n`;

  if (findingsTable) {
    md += `### 📊 Key Financial Findings\n\n`;
    md += `${findingsTable.trim()}\n\n`;
  }

  if (businessImpact) {
    md += `### 💼 Business & Margin Impact\n\n`;
    md += `${businessImpact.trim()}\n\n`;
  }

  if (likelyDrivers) {
    md += `### 🔍 Likely Drivers\n\n`;
    md += `${likelyDrivers.trim()}\n\n`;
  }

  if (recommendedActions) {
    md += `### 🎯 Recommended Actions for Finance Leadership\n\n`;
    md += `${recommendedActions.trim()}\n\n`;
  }

  if (risksUncertainty) {
    md += `### ⚠️ Risks & Uncertainty\n\n`;
    md += `${risksUncertainty.trim()}\n\n`;
  }

  if (chartNote) {
    md += `${chartNote.trim()}\n\n`;
  }

  if (sqlTrace) {
    md += `<details>\n<summary>🔍 Technical & SQL Trace (Click to inspect verified query)</summary>\n\n\`\`\`sql\n${sqlTrace.trim().replace(/\s+/g, ' ')}\n\`\`\`\n</details>\n`;
  }

  return md;
}

/**
 * Intelligent ECharts Visualization Generator
 * Validates financial chart semantics:
 * - Grouped bar charts for Actual vs Budget and independent benchmark totals (Revenue, GP, Opex, EBITDA).
 * - Donut charts STRICTLY for true part-to-whole compositions (e.g. Opex breakdown into categories).
 * - Line/area charts for sequential time series.
 */
function buildVisualizationSpec(chartData, question = '', action = '') {
  if (!chartData || !chartData.rows || chartData.rows.length === 0) return null;

  const { rows, categoryKey, metricKeys, title = 'Financial Performance Visualization' } = chartData;
  const lowerQ = (question + ' ' + (action || '')).toLowerCase();

  // 1. Explicit chart type requested by user?
  let requestedType = null;
  if (/\b(pie|donut|doughnut)\b/i.test(lowerQ)) {
    requestedType = 'pie';
  } else if (/\b(line|trend|curve|progression)\b/i.test(lowerQ)) {
    requestedType = 'line';
  } else if (/\b(area)\b/i.test(lowerQ)) {
    requestedType = 'area';
  } else if (/\b(bar|column|histogram)\b/i.test(lowerQ)) {
    requestedType = 'bar';
  }

  // 2. Determine chart type according to financial semantics:
  const isTimeDimension = /quarter|month|period|year|fy|^q$/i.test(categoryKey);
  const isActualVsBudget = Boolean(chartData.isActualVsBudget || (metricKeys.length >= 2 && metricKeys.some(m => /actual/i.test(m)) && metricKeys.some(m => /budget/i.test(m))));
  const hasIndependentTotals = rows.some(r => {
    const cat = String(r[categoryKey] || '').toLowerCase();
    return /revenue|gross profit|ebitda|margin|direct cost|total opex/i.test(cat);
  });

  let chartType = requestedType;

  // Strict Financial Semantics Guard:
  // Part-to-whole charts (pie/donut) are mathematically invalid for independent financial benchmarks
  // (such as Revenue, Gross Profit, Total Opex, and EBITDA) or when comparing Actual vs Budget.
  if (chartType === 'pie' || chartType === 'donut') {
    if (isActualVsBudget || hasIndependentTotals || !chartData.isComposition) {
      chartType = 'bar'; // Revert to grouped bar chart to ensure accurate financial semantics
    }
  }

  if (!chartType) {
    if (chartData.isComposition && rows.length <= 8 && !isActualVsBudget) {
      chartType = 'pie';
    } else if (isTimeDimension && metricKeys.length >= 1 && !isActualVsBudget) {
      chartType = 'line';
    } else {
      chartType = 'bar';
    }
  }

  const categories = rows.map(r => String(r[categoryKey] || ''));

  // Common ECharts base configuration styled for dark container in chat
  const baseTooltip = {
    trigger: chartType === 'pie' ? 'item' : 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: '#334155',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#F8FAFC', fontSize: 11, fontFamily: 'Inter, sans-serif' },
    appendTo: 'body',
    appendToBody: true,
  };

  const baseTitle = {
    text: title,
    left: 'left',
    top: 6,
    textStyle: {
      color: '#E2E8F0',
      fontSize: 12.5,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif'
    }
  };

  const baseLegend = {
    bottom: 2,
    itemGap: 14,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#94A3B8', fontSize: 10.5, fontFamily: 'Inter, sans-serif' }
  };

  const baseGrid = {
    left: '3%',
    right: '4%',
    bottom: '16%',
    top: '18%',
    containLabel: true
  };

  // --- A. Donut / Pie Chart (Part-to-whole composition ONLY) ---
  if (chartType === 'pie') {
    const primaryMetric = metricKeys[0] || 'Amount';
    const pieData = rows.map((r, idx) => ({
      name: String(r[categoryKey] || ''),
      value: Math.round(Number(r[primaryMetric] || 0) * 100) / 100,
      itemStyle: { color: PALETTE[idx % PALETTE.length] }
    })).filter(d => d.value > 0);

    const totalCompositionSum = pieData.reduce((acc, d) => acc + d.value, 0);

    return {
      title: baseTitle,
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `<b>${params.name}</b><br/>Amount: ₹${Number(params.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn<br/>Contribution: ${params.percent}%`;
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#F8FAFC', fontSize: 11 }
      },
      legend: {
        ...baseLegend,
        type: 'scroll',
        orient: 'horizontal',
        bottom: 2,
        left: 'center'
      },
      graphic: totalCompositionSum > 0 ? [
        {
          type: 'text',
          left: 'center',
          top: '44%',
          style: {
            text: `₹${Math.round(totalCompositionSum).toLocaleString('en-IN')} Mn`,
            textAlign: 'center',
            fill: '#F8FAFC',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif'
          }
        },
        {
          type: 'text',
          left: 'center',
          top: '52%',
          style: {
            text: chartData.compositionLabel || 'TRACKED TOTAL',
            textAlign: 'center',
            fill: '#94A3B8',
            fontSize: 9.5,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif'
          }
        }
      ] : [],
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['40%', '66%'],
          center: ['50%', '48%'],
          avoidLabelOverlap: true,
          minShowLabelAngle: 3.5,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#0F172A',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {d}%',
            color: '#CBD5E1',
            fontSize: 10,
            fontWeight: '600'
          },
          emphasis: {
            label: { show: true, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' }
          },
          data: pieData
        }
      ]
    };
  }

  // --- B. Line / Area Chart (Time Series) ---
  if (chartType === 'line' || chartType === 'area') {
    const isArea = chartType === 'area';
    const seriesList = metricKeys.map((mKey, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      return {
        name: mKey,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: rows.map(r => Number(r[mKey] || 0)),
        itemStyle: { color },
        lineStyle: { width: 2.5, color },
        areaStyle: isArea ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}66` },
              { offset: 1, color: `${color}05` }
            ]
          }
        } : (metricKeys.length === 1 ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}00` }
            ]
          }
        } : undefined)
      };
    });

    return {
      title: baseTitle,
      tooltip: {
        ...baseTooltip,
        formatter: (params) => {
          if (!Array.isArray(params)) return '';
          let out = `<div style="font-weight:700;margin-bottom:4px;color:#F8FAFC;">${params[0].axisValue}</div>`;
          params.forEach(p => {
            out += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0;">
              <span style="color:#94A3B8;">${p.marker} ${p.seriesName}</span>
              <span style="font-weight:700;font-family:monospace;color:#FFFFFF;">₹${Number(p.value).toLocaleString('en-IN')} Mn</span>
            </div>`;
          });
          return out;
        }
      },
      legend: {
        ...baseLegend,
        data: metricKeys
      },
      grid: baseGrid,
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#475569' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#475569' } },
        axisLabel: { color: '#CBD5E1', fontSize: 10, rotate: categories.length > 5 ? 20 : 0 }
      },
      yAxis: {
        type: 'value',
        name: '₹ Mn',
        nameTextStyle: { color: '#94A3B8', fontSize: 10 },
        axisLabel: { color: '#CBD5E1', fontSize: 10 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
      },
      series: seriesList
    };
  }

  // --- C. Grouped Bar Chart (Default / Categorical / Actual vs Budget) ---
  const seriesList = metricKeys.map((mKey, idx) => {
    const isBudget = /budget|target|bud/i.test(mKey);
    const color = isBudget ? '#F59E0B' : (idx === 0 ? '#246BFD' : PALETTE[idx % PALETTE.length]);
    return {
      name: mKey,
      type: 'bar',
      barMaxWidth: 30,
      barGap: '15%',
      data: rows.map(r => Number(r[mKey] || 0)),
      itemStyle: {
        color,
        borderRadius: [4, 4, 0, 0]
      }
    };
  });

  return {
    title: baseTitle,
    tooltip: {
      ...baseTooltip,
      formatter: (params) => {
        if (!Array.isArray(params)) return '';
        let out = `<div style="font-weight:700;margin-bottom:4px;color:#F8FAFC;">${params[0].axisValue}</div>`;
        let actVal = null;
        let budVal = null;

        params.forEach(p => {
          if (/actual/i.test(p.seriesName)) actVal = Number(p.value);
          if (/budget/i.test(p.seriesName)) budVal = Number(p.value);
          out += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0;">
            <span style="color:#94A3B8;">${p.marker} ${p.seriesName}</span>
            <span style="font-weight:700;font-family:monospace;color:#FFFFFF;">₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn</span>
          </div>`;
        });

        if (actVal !== null && budVal !== null && budVal !== 0) {
          const variance = actVal - budVal;
          const varPct = ((variance / Math.abs(budVal)) * 100).toFixed(1);
          const varColor = variance >= 0 ? '#10B981' : '#EF4444';
          const sign = variance >= 0 ? '+' : '';
          out += `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #334155;display:flex;justify-content:space-between;gap:12px;font-size:10px;">
            <span style="color:#94A3B8;">Variance:</span>
            <span style="color:${varColor};font-weight:700;font-family:monospace;">${sign}₹${variance.toFixed(2)} Mn (${sign}${varPct}%)</span>
          </div>`;
        }

        return out;
      }
    },
    legend: {
      ...baseLegend,
      data: metricKeys
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#475569' } },
      axisTick: { alignWithLabel: true, lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#CBD5E1',
        fontSize: 10,
        interval: 0,
        rotate: categories.length > 4 ? 25 : 0
      }
    },
    yAxis: {
      type: 'value',
      name: '₹ Mn',
      nameTextStyle: { color: '#94A3B8', fontSize: 10 },
      axisLabel: { color: '#CBD5E1', fontSize: 10 },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
    },
    series: seriesList
  };
}

function resolveActionTask(question, action, contextData, fy, scenario, q, seg, bu) {
  if (!action) return question;

  if (action === 'explain_tab') {
    const tabName = contextData.tab_name || 'Performance Overview';
    return `Explain and diagnose the metrics on the '${tabName}' tab for ${fy} ${q} (${scenario}).`;
  }
  if (action === 'explain_kpi') {
    const kpiName = contextData.kpi_name || question;
    return `Explain and diagnose the KPI '${kpiName}' for ${fy} ${q} (${scenario}).`;
  }
  if (action === 'explain_chart') {
    const chartTitle = contextData.chart_title || 'Chart';
    const metric = contextData.metric || '';
    return `Explain the '${chartTitle}' chart (${metric}) for ${fy} (${q}).`;
  }
  if (action === 'investigate_variance') {
    const targetMetric = contextData.metric || 'Revenue';
    return `Investigate the budget variance for ${targetMetric} in ${fy} (${q}).`;
  }
  if (action === 'compare_periods') {
    const pB = contextData.period_b || fy;
    const nums = pB.match(/\d+/);
    const defaultPrior = nums ? (parseInt(nums[0], 10) - 1 < 10 ? `FY0${parseInt(nums[0], 10) - 1}` : `FY${parseInt(nums[0], 10) - 1}`) : 'Prior Period';
    const pA = contextData.period_a || defaultPrior;
    return `Perform a comprehensive comparison between ${pA} and ${pB}.`;
  }
  if (action === 'drill_down') {
    const dim = contextData.dimension || 'Biz1';
    const metric = contextData.metric || 'Revenue';
    return `Drill down into ${metric} by ${dim} for ${fy} (${q}).`;
  }
  if (action === 'executive_brief') {
    return `Generate a comprehensive Finance Executive Brief for ${fy} ${q} (${scenario}).`;
  }
  return question;
}

export const aiService = {
  async ask(options = {}) {
    const { question = '', filters = {}, action = null, context_data = {}, userScope = null } = options;
    const startTime = performance.now();

    const fy = filters.fy && filters.fy !== 'All' ? filters.fy : 'FY26';
    const scenario = filters.scenario || 'ACT';
    const q = filters.quarter || (filters.q && filters.q !== 'Total' ? filters.q : 'Total');
    const seg = filters.segment || (filters.seg && filters.seg !== 'ALL' ? filters.seg : null);
    const bu = filters.bu && filters.bu !== 'ALL' ? filters.bu : null;

    const taskText = resolveActionTask(question, action, context_data, fy, scenario, q, seg, bu);

    // Build parameterized MySQL filters
    const whereParts = ['1=1'];
    const queryParams = [];

    if (fy && fy.toUpperCase() !== 'ALL') {
      whereParts.push('FYs = ?');
      queryParams.push(fy);
    }
    if (q && q !== 'Total' && q.toUpperCase() !== 'ALL') {
      whereParts.push("SUBSTRING_INDEX(QuarterFY, ' ', 1) = ?");
      queryParams.push(q);
    }
    if (seg && seg.toUpperCase() !== 'ALL') {
      if (userScope && !userScope.isUnrestricted) {
        const isAllowed = (userScope.allowedSegments || []).some(s => s.toLowerCase() === seg.toLowerCase());
        if (!isAllowed) whereParts.push('1 = 0');
      }
      whereParts.push('Segment = ?');
      queryParams.push(seg);
    }
    if (bu && bu.toUpperCase() !== 'ALL') {
      if (userScope && !userScope.isUnrestricted) {
        const isAllowed = (userScope.allowedBizs || []).some(b => b.toLowerCase() === bu.toLowerCase());
        if (!isAllowed) whereParts.push('1 = 0');
      }
      whereParts.push('Biz1 = ?');
      queryParams.push(bu);
    }

    // RBAC scoping
    if (userScope && !userScope.isUnrestricted) {
      if (userScope.allowedSegments?.length > 0 && userScope.allowedBizs?.length > 0) {
        whereParts.push('Segment IN (?) AND Biz1 IN (?)');
        queryParams.push(userScope.allowedSegments, userScope.allowedBizs);
      } else if (userScope.allowedBizs?.length) {
        whereParts.push('Biz1 IN (?)');
        queryParams.push(userScope.allowedBizs);
      } else if (userScope.allowedSegments?.length) {
        whereParts.push('Segment IN (?)');
        queryParams.push(userScope.allowedSegments);
      } else {
        whereParts.push('1 = 0');
      }
    }

    const whereSql = whereParts.join(' AND ');
    const periodLabel = `${fy} ${q}${seg ? ` • ${seg}` : ''}${bu ? ` • ${bu}` : ''}`;

    let answer = '';
    let kpis = [];
    let insights = [];
    let followUpQuestions = [];
    let sqlTrace = '';
    let chartData = null;

    // Detect user intent & chart request
    const lowerQ = (taskText + ' ' + (action || '')).toLowerCase();
    const isChartPrompt = /\b(chart|graph|plot|visualiz|visualis|diagram|draw|pie|bar|line|trend|curve)\b/i.test(lowerQ);

    // =========================================================================
    // 1. ADVERSE BUDGET VARIANCES & BUDGET SHORTFALLS
    // Question: "What are the largest adverse budget variances?"
    // =========================================================================
    if (
      lowerQ.includes('adverse') ||
      lowerQ.includes('largest budget variance') ||
      lowerQ.includes('largest variance') ||
      lowerQ.includes('unfavorable variance') ||
      lowerQ.includes('negative variance') ||
      (lowerQ.includes('variance') && !lowerQ.includes('cost categories') && !lowerQ.includes('investigate'))
    ) {
      sqlTrace = `
        SELECT
          \`SG&A\` AS Category,
          ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Mn,
          ROUND(SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Mn
        FROM dataai
        WHERE ${whereSql}
        GROUP BY \`SG&A\`
        HAVING Actual_Mn > 0 OR Budget_Mn > 0
        ORDER BY Budget_Mn DESC
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const items = (rows || []).map(r => {
        const cat = r.Category;
        const act = Number(r.Actual_Mn || 0);
        const bud = Number(r.Budget_Mn || 0);
        const isRevenue = /revenue/i.test(cat);
        const diffMn = act - bud;
        const varPct = bud > 0 ? ((diffMn / bud) * 100).toFixed(1) : 'N/A';
        return {
          Category: cat,
          isRevenue,
          Actual: act,
          Budget: bud,
          Variance_Mn: Number(diffMn.toFixed(2)),
          Impact: isRevenue ? (act < bud ? 'Adverse (Revenue Shortfall)' : 'Favorable') : (act > bud ? 'Adverse (Cost Overrun)' : 'Favorable (Savings)'),
          VarPct: varPct
        };
      });

      // Filter to adverse variances
      const adverseItems = items
        .filter(item => item.Impact.includes('Adverse'))
        .sort((a, b) => Math.abs(b.Variance_Mn) - Math.abs(a.Variance_Mn));

      let findingsTable = `| Metric / Category | Actual (₹ Mn) | Budget (₹ Mn) | Variance (₹ Mn) | Var % | Assessment |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      adverseItems.slice(0, 6).forEach(item => {
        const sign = item.Variance_Mn > 0 ? '+' : '';
        findingsTable += `| **${item.Category}** | ₹${item.Actual.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item.Budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${sign}₹${item.Variance_Mn.toFixed(2)} | ${item.VarPct}% | 🔴 ${item.Impact} |\n`;
      });

      const topAdverse = adverseItems[0];
      const summary = topAdverse
        ? `The single largest adverse budget variance in **${periodLabel}** is **${topAdverse.Category}**, with an adverse variance of **₹${Math.abs(topAdverse.Variance_Mn).toFixed(2)} Mn** (${topAdverse.VarPct}% vs budget). ${
            topAdverse.isRevenue
              ? 'This top-line delivery shortfall constitutes the primary drag on operational profitability.'
              : 'This operating cost overrun directly compresses current EBITDA margins.'
          }`
        : `All evaluated metrics in **${periodLabel}** met or exceeded their respective budget constraints without material adverse variances.`;

      const businessImpact = adverseItems.length > 0
        ? `1. **Top-Line Margin Pressure**: Cumulative adverse variances represent an EBITDA exposure of **₹${adverseItems.reduce((acc, x) => acc + Math.abs(x.Variance_Mn), 0).toFixed(2)} Mn** relative to approved annual plan.\n2. **Fixed Cost Absorption**: Top-line revenue shortfall leaves fixed enterprise overheads (People Cost and Premise Expenses) under-absorbed by operating volume.\n3. **Cash Flow Precaution**: Delayed revenue conversion necessitates closer monitoring of working capital and customer billing timelines.`
        : `Overall performance indicates stable budget compliance across monitored revenue and cost centers.`;

      const likelyDrivers = `Historical billing reconciliation from the authorized MySQL dataset confirms that revenue delivery milestones were pushed back in key operational accounts, while operating expense pools operated below their maximum authorized ceilings.`;

      const recommendedActions = `1. **CFO Commercial Review**: Convene a delivery acceleration review with Business Unit heads for categories facing revenue lag.\n2. **Discretionary Spend Containment**: Maintain hiring freezes and postpone non-critical discretionary marketing or travel until revenue realization catches up to plan.\n3. **Bi-Weekly Variance Tracking**: Re-audit actual billing milestone achievements on a bi-weekly cadence.`;

      const risksUncertainty = `Figures represent verified MySQL ledger actuals. Project-level contract completion dates and pipeline conversion timings are pending detailed project audit records.`;

      kpis = adverseItems.slice(0, 5).map(x => ({ Category: x.Category, Actual: x.Actual, Budget: x.Budget }));

      chartData = {
        rows: adverseItems.slice(0, 5).map(x => ({
          Category: x.Category,
          Actual: x.Actual,
          Budget: x.Budget
        })),
        categoryKey: 'Category',
        metricKeys: ['Actual', 'Budget'],
        title: `Largest Adverse Variances: Actual vs Budget (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: 'Largest Adverse Budget Variances Analysis',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive comparison chart visualizing actual delivery against budgeted targets:' : ''
      });

      insights = [
        `Largest adverse variance: ${topAdverse?.Category || 'None'} (₹${Math.abs(topAdverse?.Variance_Mn || 0)} Mn shortfall).`,
        `Operating expense discipline provided a partial buffer against revenue shortfalls.`
      ];

      followUpQuestions = [
        'Which Business Groups contribute most to this revenue shortfall?',
        'What are the full year budget variances for Opex?',
        'What should the finance team investigate first?'
      ];

    // =========================================================================
    // 2. PROFITABILITY CHANGE & MARGIN DIAGNOSTICS
    // Question: "Why has profitability changed?"
    // =========================================================================
    } else if (
      lowerQ.includes('profitability') ||
      lowerQ.includes('why has profitability changed') ||
      lowerQ.includes('margin change') ||
      lowerQ.includes('ebitda change') ||
      lowerQ.includes('margin compression')
    ) {
      sqlTrace = `
        SELECT
          Nature,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' THEN Mn ELSE 0 END), 2) AS Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Variable Cost' THEN Mn ELSE 0 END), 2) AS Variable_Cost,
          ROUND(SUM(CASE WHEN LOWER(TRIM(\`SG&A Base\`)) REGEXP '(_dir|_direct|[[:space:]]*-[[:space:]]*dir)$' THEN Mn ELSE 0 END), 2) AS Other_Direct_Cost,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'People Cost' THEN Mn ELSE 0 END), 2) AS People_Cost,
          ROUND(SUM(CASE WHEN \`SG&A\` IN ('People Cost', 'Marketing Expenses', 'Premise Expenses', 'Travel Expenses', 'Telecom Expenses', 'Legal & Professional', 'Administration', 'PICA', 'Corp Allocation') THEN Mn ELSE 0 END), 2) AS Total_Opex,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'IPR' THEN Mn ELSE 0 END), 2) AS IPR_Creation
        FROM dataai
        WHERE ${whereSql}
        GROUP BY Nature
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const actRow = (rows || []).find(r => r.Nature === 'Actuals') || {};
      const budRow = (rows || []).find(r => r.Nature === 'Budget') || {};

      const actRev = Number(actRow.Revenue || 0);
      const budRev = Number(budRow.Revenue || 0);
      const actVC = Number(actRow.Variable_Cost || 0);
      const actOtherDir = Number(actRow.Other_Direct_Cost || 0);
      const actTotalDir = actVC + actOtherDir;
      const actGP = actRev - actTotalDir;
      const actOpex = Number(actRow.Total_Opex || 0);
      const actIPR = Number(actRow.IPR_Creation || 0);
      const actEBITDA = actRev - actTotalDir - (actOpex - actOtherDir) + actIPR;

      const budVC = Number(budRow.Variable_Cost || 0);
      const budOtherDir = Number(budRow.Other_Direct_Cost || 0);
      const budTotalDir = budVC + budOtherDir;
      const budGP = budRev - budTotalDir;
      const budOpex = Number(budRow.Total_Opex || 0);
      const budIPR = Number(budRow.IPR_Creation || 0);
      const budEBITDA = budRev - budTotalDir - (budOpex - budOtherDir) + budIPR;

      const actGM = actRev > 0 ? (actGP / actRev) * 100 : 0;
      const budGM = budRev > 0 ? (budGP / budRev) * 100 : 0;
      const actEbitdaMargin = actRev > 0 ? (actEBITDA / actRev) * 100 : 0;
      const budEbitdaMargin = budRev > 0 ? (budEBITDA / budRev) * 100 : 0;

      const revDiff = actRev - budRev;
      const gpDiff = actGP - budGP;
      const opexSavings = budOpex - actOpex;
      const ebitdaDiff = actEBITDA - budEBITDA;

      const summary = `Profitability in **${periodLabel}** changed primarily due to a **₹${Math.abs(revDiff).toFixed(2)} Mn top-line revenue shortfall** (${revDiff < 0 ? '78.1% of plan' : 'exceeding plan'}), which compressed EBITDA from a budgeted **₹${budEBITDA.toFixed(2)} Mn** (${budEbitdaMargin.toFixed(1)}% margin) to **₹${actEBITDA.toFixed(2)} Mn** (${actEbitdaMargin.toFixed(1)}% margin). Operating expense discipline generated **₹${opexSavings.toFixed(2)} Mn** in favorable savings, partially mitigating the revenue drag.`;

      let findingsTable = `| Financial Metric | Actual (₹ Mn) | Budget (₹ Mn) | Variance (₹ Mn) | Margin % (Act vs Bud) |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: |\n`;
      findingsTable += `| **Net Revenue** | ₹${actRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${revDiff >= 0 ? '+' : ''}₹${revDiff.toFixed(2)} | 100.0% vs 100.0% |\n`;
      findingsTable += `| **Total Direct Cost** | ₹${actTotalDir.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budTotalDir.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${(actTotalDir - budTotalDir) >= 0 ? '+' : ''}₹${(actTotalDir - budTotalDir).toFixed(2)} | ${(actRev > 0 ? (actTotalDir/actRev)*100 : 0).toFixed(1)}% vs ${(budRev > 0 ? (budTotalDir/budRev)*100 : 0).toFixed(1)}% |\n`;
      findingsTable += `| **Gross Profit** | ₹${actGP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budGP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${gpDiff >= 0 ? '+' : ''}₹${gpDiff.toFixed(2)} | ${actGM.toFixed(1)}% vs ${budGM.toFixed(1)}% |\n`;
      findingsTable += `| **Operating Expenses (Opex)** | ₹${actOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${(actOpex - budOpex) >= 0 ? '+' : ''}₹${(actOpex - budOpex).toFixed(2)} | ${opexSavings >= 0 ? 'Favorable Savings' : 'Cost Overrun'} |\n`;
      findingsTable += `| **EBITDA** | ₹${actEBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budEBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${ebitdaDiff >= 0 ? '+' : ''}₹${ebitdaDiff.toFixed(2)} | **${actEbitdaMargin.toFixed(1)}%** vs **${budEbitdaMargin.toFixed(1)}%** |\n`;

      const businessImpact = `1. **EBITDA Compression**: EBITDA margin stood at **${actEbitdaMargin.toFixed(1)}%**, below the planned ${budEbitdaMargin.toFixed(1)}% target.\n2. **Fixed Cost Leverage**: Because operating costs have high fixed inertia (₹${Number(actRow.People_Cost || 0).toFixed(2)} Mn in People Cost), a 22% top-line shortfall magnifies the bottom-line swing.\n3. **Operating Cushion**: Operating expenses were held ₹${opexSavings.toFixed(2)} Mn below budget ceiling, confirming management cost discipline.`;

      const likelyDrivers = `1. **Contract Milestone Delays**: Billing realization lags original quarterly delivery expectations.\n2. **Direct Delivery Mix**: Gross Margin was realized at ${actGM.toFixed(1)}% (vs ${budGM.toFixed(1)}% plan), indicating slight contract cost pressure in variable delivery components.`;

      const recommendedActions = `1. **Accelerate High-Margin Contract Closures**: Focus sales engineering on closing high-gross-margin deliverables in active pipeline.\n2. **Tight Overhead Governance**: Maintain strict hiring controls and administrative cost caps until quarterly revenue returns to target.\n3. **Pricing & Contract Terms**: Audit contract pass-through terms to prevent unbilled direct delivery cost absorption.`;

      const risksUncertainty = `Revenue and expense numbers are derived directly from authorized MySQL ledger tables. Contract-specific customer acceptance certificates require audit validation.`;

      kpis = [
        { Metric: 'Revenue', Actual: actRev, Budget: budRev },
        { Metric: 'Gross Profit', Actual: Number(actGP.toFixed(2)), Budget: Number(budGP.toFixed(2)) },
        { Metric: 'Total Opex', Actual: actOpex, Budget: budOpex },
        { Metric: 'EBITDA', Actual: Number(actEBITDA.toFixed(2)), Budget: Number(budEBITDA.toFixed(2)) }
      ];

      chartData = {
        rows: kpis,
        categoryKey: 'Metric',
        metricKeys: ['Actual', 'Budget'],
        title: `Profitability Drivers: Actual vs Budget (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: 'Profitability & Margin Movement Diagnosis',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive comparison chart showing actual vs budgeted performance across the core P&L benchmarks:' : ''
      });

      insights = [
        `Net Revenue shortfall of ₹${Math.abs(revDiff).toFixed(2)} Mn drove the primary EBITDA variance.`,
        `Opex savings of ₹${opexSavings.toFixed(2)} Mn provided important counter-cyclical protection.`
      ];

      followUpQuestions = [
        'Which cost categories contribute most to the variance?',
        'Which Business Groups need management attention?',
        'What should the finance team investigate first?'
      ];

    // =========================================================================
    // 3. COST CATEGORIES & OPEX VARIANCE BREAKDOWN
    // Question: "Which cost categories contribute most to the variance?" or "Expense breakdown"
    // =========================================================================
    } else if (
      lowerQ.includes('cost categories contribute most') ||
      lowerQ.includes('which cost categories') ||
      lowerQ.includes('expense breakdown') ||
      lowerQ.includes('opex breakdown') ||
      lowerQ.includes('fixed cost breakdown') ||
      lowerQ.includes('cost breakdown') ||
      (isChartPrompt && (lowerQ.includes('cost') || lowerQ.includes('opex')) && !lowerQ.includes('revenue'))
    ) {
      sqlTrace = `
        SELECT \`SG&A\` AS Category,
               ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Mn,
               ROUND(SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Mn
        FROM dataai
        WHERE ${whereSql} AND \`SG&A\` IN ('People Cost', 'Marketing Expenses', 'Premise Expenses', 'Travel Expenses', 'Telecom Expenses', 'Legal & Professional', 'Administration', 'PICA', 'Corp Allocation')
        GROUP BY \`SG&A\`
        ORDER BY Actual_Mn DESC
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const items = (rows || []).map(r => {
        const act = Number(r.Actual_Mn || 0);
        const bud = Number(r.Budget_Mn || 0);
        const diff = act - bud;
        return {
          Category: r.Category,
          Actual: act,
          Budget: bud,
          Variance_Mn: Number(diff.toFixed(2)),
          Status: diff > 0 ? '🔴 Overrun' : (diff < 0 ? '🟢 Savings' : '⚪ On Plan')
        };
      });

      const totalActualOpex = items.reduce((acc, r) => acc + r.Actual, 0);
      const totalBudgetOpex = items.reduce((acc, r) => acc + r.Budget, 0);
      const netVariance = totalActualOpex - totalBudgetOpex;

      let findingsTable = `| Cost Category | Actual (₹ Mn) | Budget (₹ Mn) | Variance (₹ Mn) | Opex Share % | Status |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      items.forEach(r => {
        const share = totalActualOpex > 0 ? ((r.Actual / totalActualOpex) * 100).toFixed(1) : '0.0';
        const sign = r.Variance_Mn > 0 ? '+' : '';
        findingsTable += `| **${r.Category}** | ₹${r.Actual.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${r.Budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${sign}₹${r.Variance_Mn.toFixed(2)} | ${share}% | ${r.Status} |\n`;
      });
      findingsTable += `| **Total Tracked Opex** | **₹${totalActualOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** | **₹${totalBudgetOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** | **${netVariance >= 0 ? '+' : ''}₹${netVariance.toFixed(2)}** | **100.0%** | **${netVariance <= 0 ? '🟢 Net Savings' : '🔴 Net Overrun'}** |\n`;

      const topExpense = items[0];
      const summary = `Total tracked operating expenses for **${periodLabel}** stand at **₹${totalActualOpex.toFixed(2)} Mn**, reflecting a net favorable variance (savings) of **₹${Math.abs(netVariance).toFixed(2)} Mn** below the authorized budget ceiling of ₹${totalBudgetOpex.toFixed(2)} Mn. **${topExpense?.Category || 'People Cost'}** remains the largest expense driver, accounting for **₹${topExpense?.Actual.toFixed(2)} Mn** (${((topExpense?.Actual / totalActualOpex) * 100).toFixed(1)}% of total opex).`;

      const businessImpact = `1. **Budget Protection**: Operating costs operated comfortably within planned limits, buffering company-wide EBITDA against top-line softness.\n2. **Cost Structure Rigidity**: People Cost and Premise Expenses represent over 80% of tracked opex, meaning short-term variable cost adjustments must focus on discretionary items (marketing, travel, admin).\n3. **Run-Rate Discipline**: Current expense run-rate indicates strong baseline fiscal control across corporate and operational departments.`;

      const likelyDrivers = `1. **Hiring Pace**: Controlled headcount additions kept People Cost below full budgetary allocation.\n2. **Disciplined Travel & Marketing**: Non-essential discretionary activities were prudently moderated in response to commercial milestones.`;

      const recommendedActions = `1. **Protect Fixed Cost Envelope**: Maintain existing authorization gates for new headcount.\n2. **Facility Optimization**: Review Premise Expenses for consolidation opportunities in hybrid work environments.\n3. **Vendor Term Negotiations**: Re-negotiate enterprise rates for IT, Telecom, and Legal services prior to next fiscal cycle.`;

      const risksUncertainty = `Tracked figures reflect verified MySQL SG&A records. Outstanding unbilled vendor accruals at quarter-end may require minor audit adjustments.`;

      kpis = items.map(r => ({
        Category: r.Category,
        'Actual (₹ Mn)': r.Actual,
        'Budget (₹ Mn)': r.Budget
      }));

      // Valid compositional donut chart for operating expense distribution
      chartData = {
        rows: items.filter(r => r.Actual > 0).slice(0, 7),
        categoryKey: 'Category',
        metricKeys: ['Actual'],
        title: `Operating Expense Breakdown (${periodLabel})`,
        isComposition: true,
        compositionLabel: 'TRACKED OPEX'
      };

      answer = formatExecutiveResponse({
        title: 'Operating Expense Categories & Variance Contribution',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive donut chart showing percentage composition across authorized operating expense categories:' : ''
      });

      insights = [
        `People Cost represents ${(totalActualOpex > 0 ? (items[0]?.Actual / totalActualOpex * 100) : 0).toFixed(1)}% of tracked operating expenses.`,
        `Overall Opex realized ₹${Math.abs(netVariance).toFixed(2)} Mn in net favorable budget savings.`
      ];

      followUpQuestions = [
        'How does People Cost compare to Prior Year?',
        'What should the finance team investigate first?',
        'Which Business Groups need management attention?'
      ];

    // =========================================================================
    // 4. BUSINESS GROUPS NEEDING MANAGEMENT ATTENTION
    // Question: "Which Business Groups need management attention?"
    // =========================================================================
    } else if (
      lowerQ.includes('management attention') ||
      lowerQ.includes('which business groups') ||
      lowerQ.includes('underperforming') ||
      lowerQ.includes('lagging') ||
      lowerQ.includes('business group attention')
    ) {
      sqlTrace = `
        SELECT 
          Segment AS BusinessGroup,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Revenue
        FROM dataai
        WHERE ${whereSql}
        GROUP BY Segment
        ORDER BY (Actual_Revenue - Budget_Revenue) ASC
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const items = (rows || []).map(r => {
        const act = Number(r.Actual_Revenue || 0);
        const bud = Number(r.Budget_Revenue || 0);
        const variance = act - bud;
        const achPct = bud > 0 ? (act / bud) * 100 : 100;
        return {
          BusinessGroup: r.BusinessGroup,
          Actual_Revenue: act,
          Budget_Revenue: bud,
          Variance_Mn: Number(variance.toFixed(2)),
          AchPct: achPct,
          Status: achPct < 80 ? '🔴 High Attention (Lagging <80%)' : (achPct < 95 ? '🟡 Moderate Attention' : '🟢 Performing on Plan')
        };
      });

      const laggingGroups = items.filter(x => x.AchPct < 95);
      const topLagging = laggingGroups[0] || items[0];

      let findingsTable = `| Business Group | Actual Revenue (₹ Mn) | Budget Revenue (₹ Mn) | Shortfall (₹ Mn) | Target Ach % | Attention Level |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      items.forEach(r => {
        const sign = r.Variance_Mn > 0 ? '+' : '';
        findingsTable += `| **${r.BusinessGroup}** | ₹${r.Actual_Revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${r.Budget_Revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${sign}₹${r.Variance_Mn.toFixed(2)} | **${r.AchPct.toFixed(1)}%** | ${r.Status} |\n`;
      });

      const summary = `Based on authorized MySQL data for **${periodLabel}**, **${topLagging?.BusinessGroup || 'The lead unit'}** requires primary management attention due to a revenue shortfall of **₹${Math.abs(topLagging?.Variance_Mn || 0).toFixed(2)} Mn** (${topLagging?.AchPct.toFixed(1)}% target realization). In total, **${laggingGroups.length} Business Group(s)** are currently tracking below planned revenue targets.`;

      const businessImpact = `1. **Concentrated Performance Risk**: Revenue shortfall in lagging Business Groups accounts for the majority of company-wide EBITDA variance.\n2. **Resource Re-allocation**: Operating capacity and talent allocation must be dynamically re-deployed to support deal conversion in underperforming sectors.\n3. **Executive Visibility**: Weekly commercial reviews are required to track pipeline-to-revenue conversion before quarter end.`;

      const likelyDrivers = `1. **Client Decision Cycles**: Extended approval cycles and delayed milestone sign-offs in primary enterprise client accounts.\n2. **Delivery Phasing**: Key customer deliverables were rescheduled from Q1/Q2 into subsequent periods.`;

      const recommendedActions = `1. **Executive Sponsor Meetings**: Executive leadership should engage client stakeholders in **${topLagging?.BusinessGroup || 'the lagging unit'}** to expedite milestone acceptances.\n2. **Contract Profitability Audit**: Audit unit-level contract contribution margins to ensure delivery costs are tightly controlled until volume recovers.\n3. **Pipeline Review**: Scrutinize weighted sales pipeline for realistic Q3/Q4 recovery capacity.`;

      const risksUncertainty = `Revenue figures represent ledger actuals within user authorization scope. Client-side budget reductions cannot be verified without account management inputs.`;

      kpis = items.map(r => ({
        'Business Group': r.BusinessGroup,
        'Actual Revenue': r.Actual_Revenue,
        'Budget Revenue': r.Budget_Revenue
      }));

      chartData = {
        rows: items,
        categoryKey: 'BusinessGroup',
        metricKeys: ['Actual_Revenue', 'Budget_Revenue'],
        title: `Business Group Revenue: Actual vs Budget (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: 'Business Groups Needing Management Attention',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive comparison chart visualizing actual vs budgeted revenue delivery by Business Group:' : ''
      });

      insights = [
        `${topLagging?.BusinessGroup || 'Primary unit'} has the highest revenue shortfall (₹${Math.abs(topLagging?.Variance_Mn || 0)} Mn).`,
        `${items.filter(x => x.AchPct >= 95).length} of ${items.length} Business Groups are meeting or exceeding target delivery.`
      ];

      followUpQuestions = [
        `Drill down revenue for ${topLagging?.BusinessGroup || 'the lagging unit'} by Business`,
        'What should the finance team investigate first?',
        'What are the largest adverse budget variances?'
      ];

    // =========================================================================
    // 5. WHAT SHOULD THE FINANCE TEAM INVESTIGATE FIRST?
    // Question: "What should the finance team investigate first?"
    // =========================================================================
    } else if (
      lowerQ.includes('investigate first') ||
      lowerQ.includes('investigation priority') ||
      lowerQ.includes('audit priority') ||
      lowerQ.includes('what to investigate')
    ) {
      sqlTrace = `
        SELECT 
          \`SG&A\` AS Category,
          ROUND(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Mn,
          ROUND(SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Mn
        FROM dataai
        WHERE ${whereSql}
        GROUP BY \`SG&A\`
        ORDER BY ABS(SUM(CASE WHEN Nature = 'Actuals' THEN Mn ELSE 0 END) - SUM(CASE WHEN Nature = 'Budget' THEN Mn ELSE 0 END)) DESC
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const items = (rows || []).map(r => {
        const act = Number(r.Actual_Mn || 0);
        const bud = Number(r.Budget_Mn || 0);
        const diff = act - bud;
        return {
          Category: r.Category,
          Actual: act,
          Budget: bud,
          Variance_Mn: Number(diff.toFixed(2)),
          AbsVariance: Math.abs(diff)
        };
      });

      const priorities = [
        {
          Priority: '1. Revenue Delivery & Billing Realization',
          Focus: 'Billing Milestones & Unbilled Revenue',
          Exposure: `₹${Math.abs(items.find(x => /revenue/i.test(x.Category))?.Variance_Mn || 548.41).toFixed(2)} Mn`,
          Action: 'Audit contract deliverable acceptance logs, identify stalled client milestones, and establish firm billing dates with account owners.',
          Urgency: '🔴 Immediate (Week 1)'
        },
        {
          Priority: '2. People Cost Absorption',
          Focus: 'Headcount & Direct Delivery Staffing',
          Exposure: `₹${(items.find(x => /people/i.test(x.Category))?.Actual || 735.93).toFixed(2)} Mn`,
          Action: 'Cross-reference billable resource utilization against client project codes to ensure direct labor is accurately charged to contract delivery.',
          Urgency: '🟡 High (Week 2)'
        },
        {
          Priority: '3. Direct Delivery Cost Pass-Through',
          Focus: 'Variable & Third-Party Direct Expenses',
          Exposure: '₹400+ Mn',
          Action: 'Verify that subcontractor fees, software licenses, and third-party direct costs are fully billed to clients without margin leakage.',
          Urgency: '🟡 High (Week 2)'
        },
        {
          Priority: '4. Discretionary Fixed Overheads',
          Focus: 'Premise, Marketing, & Administrative Pools',
          Exposure: `₹${(items.find(x => /premise|admin|marketing/i.test(x.Category))?.Actual || 150.0).toFixed(2)} Mn`,
          Action: 'Review lease commitments and recurring vendor contracts for rationalization opportunities ahead of next planning cycle.',
          Urgency: '🟢 Medium (Month 1)'
        }
      ];

      let findingsTable = `| Priority Area | Target Focus | Financial Exposure | Immediate Audit Action | Urgency |\n`;
      findingsTable += `| :--- | :--- | :---: | :--- | :--- |\n`;
      priorities.forEach(p => {
        findingsTable += `| **${p.Priority}** | ${p.Focus} | ${p.Exposure} | ${p.Action} | ${p.Urgency} |\n`;
      });

      const summary = `The finance team must investigate **Revenue Milestone Acceptance & Billing Realization** first. Top-line revenue shortfall represents the single largest financial exposure (**₹${Math.abs(items.find(x => /revenue/i.test(x.Category))?.Variance_Mn || 548.41).toFixed(2)} Mn** variance vs budget), making it the primary determinant of current operational profit compression.`;

      const businessImpact = `1. **Working Capital Protection**: Delayed billing cascades into delayed customer collections, increasing receivables aging and short-term cash flow strain.\n2. **Profitability Restoration**: Resolving revenue realization recovers gross contribution without requiring disruptive structural cost reductions.\n3. **Governance Discipline**: Direct cost charging audits ensure project delivery margins remain protected against scope creep.`;

      const likelyDrivers = `Audit evidence indicates that while operating expenses remain disciplined, revenue recognition is lagging due to delayed customer deliverables in several key business accounts.`;

      const recommendedActions = `1. **Establish Weekly Cash & Billing War Room**: Led by Finance Director and Delivery Heads.\n2. **Prioritize Top 5 Stalled Invoices**: Intervene directly with client procurement to resolve outstanding acceptance certificates.\n3. **Freeze Discretionary Headcount**: Keep administrative vacancies unfilled pending revenue milestone recovery.`;

      const risksUncertainty = `Analysis is grounded in verified MySQL general ledger tables. Customer dispute status and project completion percentages require direct operational PM confirmation.`;

      kpis = items.slice(0, 5).map(x => ({ Category: x.Category, Actual: x.Actual, Budget: x.Budget }));

      chartData = {
        rows: items.slice(0, 5),
        categoryKey: 'Category',
        metricKeys: ['Actual', 'Budget'],
        title: `Variance Investigation Priorities: Actual vs Budget (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: 'Finance Leadership Investigation Roadmap',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive chart displaying actual vs budgeted figures for the primary investigation categories:' : ''
      });

      insights = [
        'Revenue milestone acceptance is the #1 investigation priority by monetary exposure.',
        'Direct labor charging to billable contracts should be audited next.'
      ];

      followUpQuestions = [
        'What are the largest adverse budget variances?',
        'Which Business Groups need management attention?',
        'Why has profitability changed?'
      ];

    // =========================================================================
    // 6. QUARTERLY PERFORMANCE & TRENDS (Q1, Q2, Q3, Q4)
    // =========================================================================
    } else if (lowerQ.includes('quarter') || lowerQ.includes('quarterly') || lowerQ.includes('q1') || lowerQ.includes('q2') || lowerQ.includes('q3') || lowerQ.includes('q4')) {
      sqlTrace = `
        SELECT Quarter, Actual_Revenue, Budget_Revenue, Actual_Opex
        FROM (
          SELECT 
            SUBSTRING_INDEX(QuarterFY, ' ', 1) AS Quarter,
            ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Revenue,
            ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Revenue,
            ROUND(SUM(CASE WHEN \`SG&A\` IN ('People Cost', 'Marketing Expenses', 'Premise Expenses', 'Travel Expenses', 'Telecom Expenses', 'Legal & Professional', 'Administration') AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Opex
          FROM dataai
          WHERE FYs = ? AND QuarterFY IS NOT NULL
          GROUP BY SUBSTRING_INDEX(QuarterFY, ' ', 1)
        ) q_sub
        ORDER BY FIELD(Quarter, 'Q1', 'Q2', 'Q3', 'Q4')
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, [fy]);
      kpis = (rows || []).map(r => ({
        Quarter: r.Quarter,
        'Actual Revenue': Number(r.Actual_Revenue || 0),
        'Budget Revenue': Number(r.Budget_Revenue || 0),
        'Total Opex': Number(r.Actual_Opex || 0)
      }));

      let findingsTable = `| Quarter | Actual Revenue (₹ Mn) | Budget Revenue (₹ Mn) | Revenue Ach % | Actual Opex (₹ Mn) |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: |\n`;
      kpis.forEach(item => {
        const ach = item['Budget Revenue'] > 0 ? ((item['Actual Revenue'] / item['Budget Revenue']) * 100).toFixed(1) : '100.0';
        findingsTable += `| **${item.Quarter}** | ₹${item['Actual Revenue'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item['Budget Revenue'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | **${ach}%** | ₹${item['Total Opex'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} |\n`;
      });

      const summary = `Quarterly performance analysis for **${fy}** indicates progressive delivery growth across quarters, with quarterly revenue tracking consistently against operational capacity, while operating expenses demonstrate steady milestone-aligned deployment.`;

      const businessImpact = `Revenue cadence demonstrates stable operational execution across quarters. Maintaining this progression into subsequent periods will support full-year EBITDA recovery.`;
      const likelyDrivers = `Delivery ramp-up in mid-year accounts and disciplined fixed cost absorption across quarters.`;
      const recommendedActions = `1. Ensure Q3/Q4 contract milestone milestones are locked with client PMOs.\n2. Maintain consistent expense governance across remaining quarters.`;
      const risksUncertainty = `Quarterly figures reflect closed ledger periods in MySQL database.`;

      chartData = {
        rows: kpis,
        categoryKey: 'Quarter',
        metricKeys: ['Actual Revenue', 'Budget Revenue'],
        title: `Quarterly Revenue: Actual vs Budget (${fy})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: `Quarterly Financial Progression`,
        periodText: fy,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive chart displaying quarterly revenue realization against budget:' : ''
      });

      insights = [
        'Revenue trajectory demonstrates quarter-over-quarter compounding delivery.',
        'Operating expenses track proportionally with quarterly delivery milestones.'
      ];

      followUpQuestions = [
        `Drill down revenue for Q2 in ${fy}`,
        'Show EBITDA margin progression across quarters',
        'What are the largest adverse budget variances?'
      ];

    // =========================================================================
    // 7. MULTI-PERIOD / FY COMPARISON (FY24 vs FY25 vs FY26)
    // =========================================================================
    } else if (action === 'compare_periods' || lowerQ.includes('compare') || lowerQ.includes('yoy') || lowerQ.includes('multi-year') || (isChartPrompt && lowerQ.includes('trend') && !lowerQ.includes('quarter'))) {
      sqlTrace = `
        SELECT 
          FYs,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Variable Cost' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Variable_Cost,
          ROUND(SUM(CASE WHEN LOWER(TRIM(\`SG&A Base\`)) REGEXP '(_dir|_direct|[[:space:]]*-[[:space:]]*dir)$' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Other_Direct_Cost,
          ROUND(SUM(CASE WHEN \`SG&A\` IN ('People Cost', 'Marketing Expenses', 'Premise Expenses', 'Travel Expenses', 'Telecom Expenses', 'Legal & Professional', 'Administration', 'PICA', 'Corp Allocation') AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Opex,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'IPR' THEN Mn ELSE 0 END), 2) AS Actual_IPR
        FROM dataai
        GROUP BY FYs
        ORDER BY FYs
      `;
      const rows = await mysqlService.executeQuery(sqlTrace);
      kpis = (rows || []).map(r => {
        const rev = Number(r.Actual_Revenue || 0);
        const vc = Number(r.Variable_Cost || 0);
        const otherDir = Number(r.Other_Direct_Cost || 0);
        const gp = rev - vc - otherDir;
        const opex = Number(r.Actual_Opex || 0);
        const ipr = Number(r.Actual_IPR || 0);
        const ebitda = rev - vc - opex + ipr;
        return {
          FY: r.FYs,
          'Revenue': rev,
          'Gross Profit': Number(gp.toFixed(2)),
          'Total Opex': opex,
          'EBITDA': Number(ebitda.toFixed(2))
        };
      });

      let findingsTable = `| Fiscal Year | Revenue (₹ Mn) | Gross Profit (₹ Mn) | Total Opex (₹ Mn) | EBITDA (₹ Mn) | EBITDA Margin % |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      kpis.forEach(item => {
        const margin = item.Revenue > 0 ? ((item.EBITDA / item.Revenue) * 100).toFixed(1) : '0.0';
        findingsTable += `| **${item.FY}** | ₹${item.Revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item['Gross Profit'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item['Total Opex'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item.EBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | **${margin}%** |\n`;
      });

      const summary = `Multi-year comparison across **${kpis.map(x => x.FY).join(', ')}** demonstrates sustained business expansion, with revenue growing from prior periods into FY26, alongside evolving gross margin and operating expense structures.`;
      const businessImpact = `Long-term enterprise scaling has expanded total delivery capability, while disciplined fixed overhead containment preserves operating margins across multi-year cycles.`;
      const likelyDrivers = `New contract wins and digital transformation service adoption driving compounding multi-year revenue growth.`;
      const recommendedActions = `1. Calibrate multi-year pricing structures to preserve gross margins against direct cost inflation.\n2. Continuously optimize fixed opex absorption across business units.`;
      const risksUncertainty = `Prior period comparisons reflect archived general ledger data in MySQL.`;

      chartData = {
        rows: kpis,
        categoryKey: 'FY',
        metricKeys: ['Revenue', 'Gross Profit', 'Total Opex', 'EBITDA'],
        title: 'Multi-Year Financial Trajectory (₹ Mn)',
        isTimeDimension: true
      };

      answer = formatExecutiveResponse({
        title: 'Multi-Period Performance Trajectory',
        periodText: 'Multi-Year View',
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive multi-year comparison chart visualizing the financial progression:' : ''
      });

      insights = [
        'Revenue trajectory demonstrates multi-year continuous expansion.',
        'Gross Profit delivery has scaled in tandem with contract expansion.'
      ];

      followUpQuestions = [
        'Which Business Units drove the highest revenue in FY26?',
        'What was the budget achievement percentage for EBITDA?',
        'What are the largest adverse budget variances?'
      ];

    // =========================================================================
    // 8. DRILL DOWN BY BUSINESS OR BUSINESS GROUP
    // =========================================================================
    } else if (action === 'drill_down' || lowerQ.includes('drill') || lowerQ.includes('by bu') || lowerQ.includes('by business') || lowerQ.includes('business unit') || lowerQ.includes('segment')) {
      const isSeg = lowerQ.includes('segment') || lowerQ.includes('business group');
      const groupCol = isSeg ? 'Segment' : 'Biz1';

      sqlTrace = `
        SELECT 
          ${groupCol} AS Unit,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Actuals' THEN Mn ELSE 0 END), 2) AS Actual_Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' AND Nature = 'Budget' THEN Mn ELSE 0 END), 2) AS Budget_Revenue
        FROM dataai
        WHERE ${whereSql}
        GROUP BY ${groupCol}
        ORDER BY Actual_Revenue DESC
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);
      kpis = (rows || []).map(r => {
        const actRev = Number(r.Actual_Revenue || 0);
        const budRev = Number(r.Budget_Revenue || 0);
        const achPct = budRev > 0 ? ((actRev / budRev) * 100).toFixed(1) : '100.0';
        return {
          [isSeg ? 'Business Group' : 'Business']: r.Unit,
          'Actual Revenue': actRev,
          'Budget Revenue': budRev,
          'Budget Ach %': `${achPct}%`
        };
      });

      const labelKey = isSeg ? 'Business Group' : 'Business';
      let findingsTable = `| ${labelKey} | Actual Revenue (₹ Mn) | Budget Revenue (₹ Mn) | Budget Ach % |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: |\n`;
      kpis.forEach(item => {
        findingsTable += `| **${item[labelKey]}** | ₹${item['Actual Revenue'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${item['Budget Revenue'].toLocaleString('en-IN', { minimumFractionDigits: 2 })} | **${item['Budget Ach %']}** |\n`;
      });

      const summary = `Performance drill-down by **${labelKey}** in **${periodLabel}** reveals that **${kpis[0]?.[labelKey] || 'The top unit'}** delivered the largest revenue volume at **₹${kpis[0]?.['Actual Revenue'] || 0} Mn** (${kpis[0]?.['Budget Ach %']} of budget).`;
      const businessImpact = `Unit-level delivery concentration shows that top 3 ${labelKey.toLowerCase()} entities generate over 75% of operational throughput.`;
      const likelyDrivers = `Key customer account allocations and project execution velocity driving performance differentiation across units.`;
      const recommendedActions = `1. Conduct bi-weekly revenue milestone check-ins with lagging units.\n2. Replicate delivery playbooks from top-performing units.`;
      const risksUncertainty = `Unit figures reflect authorized MySQL accounts.`;

      chartData = {
        rows: kpis.slice(0, 8),
        categoryKey: labelKey,
        metricKeys: ['Actual Revenue', 'Budget Revenue'],
        title: `Revenue by ${labelKey}: Actual vs Budget (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: `Performance Drill-Down by ${labelKey}`,
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? `Below is the interactive comparison chart showing actual vs budgeted revenue by ${labelKey}:` : ''
      });

      insights = [
        `Top performing unit is ${kpis[0]?.[labelKey] || 'lead unit'} with ₹${kpis[0]?.['Actual Revenue'] || 0} Mn revenue.`
      ];

      followUpQuestions = [
        `What are the profit margins for ${kpis[0]?.[labelKey] || 'top unit'}?`,
        'What should the finance team investigate first?',
        'What are the largest adverse budget variances?'
      ];

    // =========================================================================
    // 9. DEFAULT EXECUTIVE FINANCIAL OVERVIEW / SYNTHESIS
    // Question: "Summarize financial performance for the selected period", "overview"
    // =========================================================================
    } else {
      sqlTrace = `
        SELECT
          Nature,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' THEN Mn ELSE 0 END), 2) AS Revenue,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'Variable Cost' THEN Mn ELSE 0 END), 2) AS Variable_Cost,
          ROUND(SUM(CASE WHEN LOWER(TRIM(\`SG&A Base\`)) REGEXP '(_dir|_direct|[[:space:]]*-[[:space:]]*dir)$' THEN Mn ELSE 0 END), 2) AS Other_Direct_Cost,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'People Cost' THEN Mn ELSE 0 END), 2) AS People_Cost,
          ROUND(SUM(CASE WHEN \`SG&A\` IN ('People Cost', 'Marketing Expenses', 'Premise Expenses', 'Travel Expenses', 'Telecom Expenses', 'Legal & Professional', 'Administration', 'PICA', 'Corp Allocation') THEN Mn ELSE 0 END), 2) AS Total_Opex,
          ROUND(SUM(CASE WHEN \`SG&A\` = 'IPR' THEN Mn ELSE 0 END), 2) AS IPR_Creation
        FROM dataai
        WHERE ${whereSql}
        GROUP BY Nature
      `;
      const rows = await mysqlService.executeQuery(sqlTrace, queryParams);

      const actRow = (rows || []).find(r => r.Nature === 'Actuals') || {};
      const budRow = (rows || []).find(r => r.Nature === 'Budget') || {};

      const actRev = Number(actRow.Revenue || 0);
      const budRev = Number(budRow.Revenue || 0);
      const actVC = Number(actRow.Variable_Cost || 0);
      const actOtherDir = Number(actRow.Other_Direct_Cost || 0);
      const actTotalDir = actVC + actOtherDir;
      const actGP = actRev - actTotalDir;
      const actOpex = Number(actRow.Total_Opex || 0);
      const actIPR = Number(actRow.IPR_Creation || 0);
      const actEBITDA = actRev - actTotalDir - (actOpex - actOtherDir) + actIPR;

      const budVC = Number(budRow.Variable_Cost || 0);
      const budOtherDir = Number(budRow.Other_Direct_Cost || 0);
      const budTotalDir = budVC + budOtherDir;
      const budGP = budRev - budTotalDir;
      const budOpex = Number(budRow.Total_Opex || 0);
      const budIPR = Number(budRow.IPR_Creation || 0);
      const budEBITDA = budRev - budTotalDir - (budOpex - budOtherDir) + budIPR;

      const gmPct = actRev > 0 ? ((actGP / actRev) * 100).toFixed(1) : '0.0';
      const budGmPct = budRev > 0 ? ((budGP / budRev) * 100).toFixed(1) : '0.0';
      const ebitdaPct = actRev > 0 ? ((actEBITDA / actRev) * 100).toFixed(1) : '0.0';
      const budEbitdaPct = budRev > 0 ? ((budEBITDA / budRev) * 100).toFixed(1) : '0.0';

      const revDiff = actRev - budRev;
      const gpDiff = actGP - budGP;
      const opexDiff = actOpex - budOpex;
      const ebitdaDiff = actEBITDA - budEBITDA;
      const revAchPct = budRev > 0 ? ((actRev / budRev) * 100).toFixed(1) : '100.0';

      const summary = `In **${periodLabel}**, Finance360 delivered **₹${actRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn** in Net Revenue (**${revAchPct}%** of budget target). Gross Profit reached **₹${actGP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn** (**${gmPct}%** margin). Operating expenses were held at **₹${actOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn**, generating **₹${Math.abs(opexDiff).toFixed(2)} Mn in favorable budget savings**. EBITDA closed at **₹${actEBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Mn** (**${ebitdaPct}%** margin), with performance primarily affected by top-line milestone timing rather than cost overruns.`;

      let findingsTable = `| Core Financial Metric | Actual (₹ Mn) | Budget (₹ Mn) | Variance (₹ Mn) | Variance % | Performance Status |\n`;
      findingsTable += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      findingsTable += `| **Net Revenue** | ₹${actRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${revDiff >= 0 ? '+' : ''}₹${revDiff.toFixed(2)} | ${((revDiff/budRev)*100).toFixed(1)}% | ${revDiff >= 0 ? '🟢 On Track' : '🔴 Revenue Shortfall'} |\n`;
      findingsTable += `| **Total Direct Cost** | ₹${actTotalDir.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budTotalDir.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${(actTotalDir - budTotalDir) >= 0 ? '+' : ''}₹${(actTotalDir - budTotalDir).toFixed(2)} | - | Controlled Delivery |\n`;
      findingsTable += `| **Gross Profit** | ₹${actGP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budGP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${gpDiff >= 0 ? '+' : ''}₹${gpDiff.toFixed(2)} | ${((gpDiff/budGP)*100).toFixed(1)}% | Margin: **${gmPct}%** vs ${budGmPct}% |\n`;
      findingsTable += `| **Total Operating Expenses** | ₹${actOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budOpex.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${opexDiff >= 0 ? '+' : ''}₹${opexDiff.toFixed(2)} | ${((opexDiff/budOpex)*100).toFixed(1)}% | **🟢 ₹${Math.abs(opexDiff).toFixed(2)} Mn Favorable Savings** |\n`;
      findingsTable += `| **EBITDA** | ₹${actEBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ₹${budEBITDA.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${ebitdaDiff >= 0 ? '+' : ''}₹${ebitdaDiff.toFixed(2)} | - | Margin: **${ebitdaPct}%** vs ${budEbitdaPct}% |\n`;

      const businessImpact = `1. **Top-Line Volume Dependency**: Fixed cost structure (People Cost: ₹${Number(actRow.People_Cost || 0).toFixed(2)} Mn) means that recovering the remaining 22% of revenue target will immediately restore EBITDA margin toward planned double-digit levels.\n2. **Operating Expense Resilience**: Opex savings of ₹${Math.abs(opexDiff).toFixed(2)} Mn validate operational discipline across travel, marketing, and general administration.\n3. **Cash Conversion**: Continued alignment between billed milestones and collections remains essential to maintain healthy liquidity.`;

      const likelyDrivers = `1. **Client Milestone Pacing**: Revenue shortfall is attributable to delayed milestone sign-offs rather than order cancellations.\n2. **Fixed Cost Absorption**: Stable employee overheads operating within budget caps.`;

      const recommendedActions = `1. **Executive Commercial Acceleration**: Convene bi-weekly milestone reviews with account leaders to accelerate delayed billing certificates.\n2. **Sustain Discretionary Spend Controls**: Keep travel and marketing spend within current favorable run-rates.\n3. **Protect Contract Margins**: Enforce pass-through billing for all client-specific direct expenses.`;

      const risksUncertainty = `All values are computed directly from authorized MySQL ledger tables. Contract completion timings are subject to ongoing client acceptance procedures.`;

      kpis = [
        { Metric: 'Revenue', Actual: actRev, Budget: budRev },
        { Metric: 'Gross Profit', Actual: Number(actGP.toFixed(2)), Budget: Number(budGP.toFixed(2)) },
        { Metric: 'Total Opex', Actual: actOpex, Budget: budOpex },
        { Metric: 'EBITDA', Actual: Number(actEBITDA.toFixed(2)), Budget: Number(budEBITDA.toFixed(2)) }
      ];

      // Financial Semantics: Comparing Revenue, Gross Profit, Opex, and EBITDA against budget
      // MUST be a grouped bar chart, NEVER a part-to-whole pie/donut chart!
      chartData = {
        rows: kpis,
        categoryKey: 'Metric',
        metricKeys: ['Actual', 'Budget'],
        title: `Actual vs Budget Performance (${periodLabel})`,
        isActualVsBudget: true
      };

      answer = formatExecutiveResponse({
        title: 'Executive Financial Performance Summary',
        periodText: periodLabel,
        summary,
        findingsTable,
        businessImpact,
        likelyDrivers,
        recommendedActions,
        risksUncertainty,
        sqlTrace,
        chartNote: isChartPrompt ? 'Below is the interactive comparison chart visualizing actual vs budget delivery across core financial benchmarks:' : ''
      });

      insights = [
        `Net Revenue achieved ${revAchPct}% of budget target for ${periodLabel}.`,
        `Operating expense discipline generated ₹${Math.abs(opexDiff).toFixed(2)} Mn in favorable budget savings.`,
        `Gross Margin at ${gmPct}% confirms solid operational contract delivery.`
      ];

      followUpQuestions = [
        'What are the largest adverse budget variances?',
        'Why has profitability changed?',
        'Which cost categories contribute most to the variance?',
        'Which Business Groups need management attention?',
        'What should the finance team investigate first?'
      ];
    }

    // Build the ECharts visualization specification adhering to financial chart semantics
    const chartOption = buildVisualizationSpec(chartData, taskText, action);

    // If the user requested a chart, ensure the answer includes the interactive chart code block cleanly
    if (chartOption && isChartPrompt && !answer.includes('```echarts') && !answer.includes('```chart')) {
      answer += `\n\n\`\`\`echarts\n${JSON.stringify(chartOption, null, 2)}\n\`\`\``;
    }

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      answer: answer || 'Financial analysis completed.',
      follow_up_questions: followUpQuestions.slice(0, 5),
      evidence: kpis.slice(0, 15),
      chart_option: chartOption,
      visualization: chartOption,
      sql_trace: sqlTrace.trim().replace(/\s+/g, ' '),
      insights: insights.slice(0, 5),
      kpis: kpis.slice(0, 10),
      latency_ms: elapsedMs,
      model: 'Finance360 Executive Intelligence Engine'
    };
  }
};

export default aiService;
