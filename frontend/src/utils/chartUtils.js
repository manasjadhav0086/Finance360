/**
 * Utility functions for dynamically ranking chart legends and series based on contribution.
 * 
 * Rules:
 * - Legends and series order must never be hardcoded, alphabetical, or arbitrary.
 * - Always rank from highest contribution to lowest contribution for the active period/filters.
 * - Safely handle positive, negative, zero, and missing values.
 */

/**
 * Ranks category dimensions (e.g., Businesses or Business Groups) by total metric value across active categories.
 */
export function sortDimensionsByContribution(dimensions = [], categories = [], matrix = {}) {
  if (!Array.isArray(dimensions) || dimensions.length <= 1) return dimensions;

  const totals = {};
  dimensions.forEach((dim) => {
    let sum = 0;
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach((cat) => {
        const val = Number(matrix[`${cat}||${dim}`] || 0);
        if (!isNaN(val)) sum += val;
      });
    } else {
      // If no categories, search all matrix keys ending with ||dim
      Object.keys(matrix).forEach((key) => {
        if (key.endsWith(`||${dim}`)) {
          const val = Number(matrix[key] || 0);
          if (!isNaN(val)) sum += val;
        }
      });
    }
    totals[dim] = sum;
  });

  return dimensions.slice().sort((a, b) => {
    const sumA = totals[a] !== undefined ? totals[a] : -Infinity;
    const sumB = totals[b] !== undefined ? totals[b] : -Infinity;
    if (sumB !== sumA) {
      return sumB - sumA; // Descending: highest to lowest contribution
    }
    return String(a).localeCompare(String(b));
  });
}

/**
 * Ranks an array of line/bar series objects by their total or latest contribution.
 */
export function sortSeriesByContribution(seriesList = []) {
  if (!Array.isArray(seriesList) || seriesList.length <= 1) return seriesList;

  const getContribution = (s) => {
    if (!s || !Array.isArray(s.data) || s.data.length === 0) return -Infinity;
    let sum = 0;
    let hasVal = false;
    s.data.forEach((pt) => {
      const num = typeof pt === 'object' && pt !== null ? Number(pt.value) : Number(pt);
      if (!isNaN(num) && num !== null) {
        sum += num;
        hasVal = true;
      }
    });
    return hasVal ? sum : -Infinity;
  };

  return seriesList.slice().sort((a, b) => {
    // Preserve special series like 'Total' at the end
    if (a.name === 'Total') return 1;
    if (b.name === 'Total') return -1;

    const valA = getContribution(a);
    const valB = getContribution(b);
    if (valB !== valA) {
      return valB - valA; // Descending
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

/**
 * Ranks pie / donut chart data slices and generates ranked legend data.
 */
export function sortPieDataByContribution(data = []) {
  if (!Array.isArray(data)) return [];
  return data.slice().sort((a, b) => {
    const valA = Number(a?.value || 0);
    const valB = Number(b?.value || 0);
    return valB - valA;
  });
}

/**
 * Enhances an ECharts option object so that its legend and series are strictly ranked by contribution.
 */
export function enhanceChartLegendOrdering(option) {
  if (!option || typeof option !== 'object') return option;

  const opt = { ...option };

  // Handle pie / donut charts
  if (Array.isArray(opt.series) && opt.series.length > 0 && opt.series[0]?.type === 'pie') {
    const pieSeries = { ...opt.series[0] };
    if (Array.isArray(pieSeries.data)) {
      const sortedData = sortPieDataByContribution(pieSeries.data);
      pieSeries.data = sortedData;
      opt.series = [pieSeries, ...opt.series.slice(1)];

      if (opt.legend) {
        opt.legend = {
          ...opt.legend,
          data: sortedData.map((d) => d.name),
        };
      }
    }
    return opt;
  }

  // Handle multi-series bar or line charts
  if (Array.isArray(opt.series) && opt.series.length > 1 && !opt.preserveSeriesOrder) {
    const hasUnnamedOrHelper = opt.series.some((s) => !s.name || s.isHelper || s.silent);
    if (!hasUnnamedOrHelper) {
      const sortedSeries = sortSeriesByContribution(opt.series);
      opt.series = sortedSeries;

      if (opt.legend && Array.isArray(opt.legend.data)) {
        const nonTotalNames = sortedSeries.filter((s) => s.name && s.name !== 'Total').map((s) => s.name);
        opt.legend = {
          ...opt.legend,
          data: nonTotalNames,
        };
      }
    }
  }

  return opt;
}
