/**
 * Utility functions for dynamic Financial Year (FY), Quarter, and Month nomenclature and normalization across FinSightEdge.
 * 
 * Rules:
 * - Financial Year starts in April (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar).
 * - FY26 ends in March 2026 (Apr 2025 - Mar 2026).
 * - Centralized normalization and matching for all datasets:
 *   - Dataai: maps to 'DIS Period' (Date / YYYY-MM)
 *   - Headcount: maps to 'Period' (Date / YYYY-MM)
 *   - orderintake_view: maps to 'Month' (Apr..Mar) & 'Year' (FYxx)
 *   - capex_view: maps to 'Month' & 'Year'
 *   - collection_view: maps to 'Month' & 'Year'
 *   - enrollment_view: maps to 'Month' & 'Year'
 */

export const MONTH_DEFINITIONS = [
  { index: 1, name: 'April', short: 'Apr', quarter: 'Q1', monthNum: 4, fyOffset: 0 },
  { index: 2, name: 'May', short: 'May', quarter: 'Q1', monthNum: 5, fyOffset: 0 },
  { index: 3, name: 'June', short: 'Jun', quarter: 'Q1', monthNum: 6, fyOffset: 0 },
  { index: 4, name: 'July', short: 'Jul', quarter: 'Q2', monthNum: 7, fyOffset: 0 },
  { index: 5, name: 'August', short: 'Aug', quarter: 'Q2', monthNum: 8, fyOffset: 0 },
  { index: 6, name: 'September', short: 'Sep', quarter: 'Q2', monthNum: 9, fyOffset: 0 },
  { index: 7, name: 'October', short: 'Oct', quarter: 'Q3', monthNum: 10, fyOffset: 0 },
  { index: 8, name: 'November', short: 'Nov', quarter: 'Q3', monthNum: 11, fyOffset: 0 },
  { index: 9, name: 'December', short: 'Dec', quarter: 'Q3', monthNum: 12, fyOffset: 0 },
  { index: 10, name: 'January', short: 'Jan', quarter: 'Q4', monthNum: 1, fyOffset: 1 },
  { index: 11, name: 'February', short: 'Feb', quarter: 'Q4', monthNum: 2, fyOffset: 1 },
  { index: 12, name: 'March', short: 'Mar', quarter: 'Q4', monthNum: 3, fyOffset: 1 },
];

export const QUARTER_MONTHS = {
  Q1: ['April', 'May', 'June'],
  Q2: ['July', 'August', 'September'],
  Q3: ['October', 'November', 'December'],
  Q4: ['January', 'February', 'March'],
};

export function parseFyNumber(fyStr) {
  if (!fyStr) return 26;
  const match = String(fyStr).match(/\d+/);
  if (!match) return 26;
  let num = parseInt(match[0], 10);
  if (num >= 2000) num = num % 100;
  return num;
}

export function formatFyString(num) {
  const n = parseInt(num, 10);
  if (isNaN(n)) return 'FY26';
  return `FY${n < 10 ? '0' + n : n}`;
}

export function getPreviousFy(fyStr) {
  const currentNum = parseFyNumber(fyStr);
  return formatFyString(currentNum - 1);
}

export function getNextFy(fyStr) {
  const currentNum = parseFyNumber(fyStr);
  return formatFyString(currentNum + 1);
}

export function normalizeFY(fyInput) {
  if (!fyInput || fyInput === 'ALL' || fyInput === 'Total') return 'ALL';
  const num = parseFyNumber(fyInput);
  return formatFyString(num);
}

export const normalizeYear = normalizeFY;
export const getFinancialYear = normalizeFY;

/**
 * Normalizes quarter input to a standard string (e.g. 'Q1', 'Q2', 'Q3', 'Q4', 'Total', or multi-quarter)
 */
export function normalizeQuarter(qInput) {
  if (!qInput || qInput === 'ALL' || qInput === 'Total') return 'Total';
  if (Array.isArray(qInput)) {
    if (qInput.length === 0 || qInput.length >= 4 || qInput.includes('Total') || qInput.includes('ALL')) {
      return 'Total';
    }
    if (qInput.length === 1) return normalizeQuarter(qInput[0]);
    const mapped = qInput.map((q) => normalizeQuarter(q)).filter((q) => q && q !== 'Total');
    return mapped.length > 0 ? mapped.join('+') : 'Total';
  }
  const str = String(qInput).trim();
  if (!str || str.toUpperCase() === 'ALL' || str.toUpperCase() === 'TOTAL') return 'Total';

  // Match 'Q1', 'Q1 FY26', 'Q1FY26', 'Quarter 1', etc.
  const match = str.match(/Q(?:uarter)?\s*([1-4])/i);
  if (match) {
    return `Q${match[1]}`;
  }

  // If passed a Month name, map to its quarter
  const monthMatch = MONTH_DEFINITIONS.find(
    (m) => m.name.toLowerCase() === str.toLowerCase() || m.short.toLowerCase() === str.toLowerCase()
  );
  if (monthMatch) {
    return monthMatch.quarter;
  }

  return str;
}

/**
 * Returns previous quarter and its corresponding FY.
 */
export function getPreviousQuarter(quarter, fy) {
  const normQ = normalizeQuarter(quarter);
  if (!normQ || normQ === 'Total') {
    return { quarter: 'Total', fy: getPreviousFy(fy) };
  }

  const qList = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Multi-quarter handling (e.g., 'Q1+Q2', 'Q2+Q3', 'Q3+Q4', 'Q1+Q2+Q3')
  if (typeof normQ === 'string' && normQ.includes('+')) {
    const quarters = normQ.split('+').map((q) => q.trim()).filter(Boolean);
    if (quarters.length > 0) {
      const firstQ = quarters[0];
      const count = quarters.length;
      const firstIdx = qList.indexOf(firstQ);

      if (firstIdx !== -1) {
        const prevStartIdx = firstIdx - count;
        if (prevStartIdx >= 0) {
          const prevQuarters = qList.slice(prevStartIdx, prevStartIdx + count);
          return { quarter: prevQuarters.join('+'), fy: fy || 'FY26' };
        } else if (firstIdx === 0 && count <= 4) {
          const priorStartIdx = 4 - count;
          const prevQuarters = qList.slice(priorStartIdx);
          return { quarter: prevQuarters.join('+'), fy: getPreviousFy(fy) };
        } else {
          return { quarter: normQ, fy: getPreviousFy(fy) };
        }
      }
    }
    return { quarter: normQ, fy: getPreviousFy(fy) };
  }

  const idx = qList.indexOf(normQ);
  if (idx > 0) {
    return { quarter: qList[idx - 1], fy: fy || 'FY26' };
  } else if (idx === 0) {
    return { quarter: 'Q4', fy: getPreviousFy(fy) };
  }
  return { quarter: 'Total', fy: getPreviousFy(fy) };
}

/**
 * Returns the highest (latest) quarter among selected quarters.
 * e.g., 'Q1+Q2' -> 'Q2', ['Q1', 'Q3'] -> 'Q3', 'Q1' -> 'Q1', 'Total' -> 'Total'
 */
export function getHighestQuarter(qInput) {
  if (!qInput || qInput === 'ALL' || qInput === 'Total') return 'Total';
  const qList = ['Q1', 'Q2', 'Q3', 'Q4'];
  let quarters = [];
  if (Array.isArray(qInput)) {
    quarters = qInput.map((q) => normalizeQuarter(q)).filter((q) => q && q !== 'Total');
  } else if (typeof qInput === 'string') {
    quarters = qInput.split(/[+,]/).map((q) => normalizeQuarter(q)).filter((q) => q && q !== 'Total');
  }
  if (quarters.length === 0) return 'Total';
  quarters.sort((a, b) => qList.indexOf(a) - qList.indexOf(b));
  return quarters[quarters.length - 1];
}

export const getFinancialQuarter = getQuarterForMonth;
export const monthToQuarter = getQuarterForMonth;
export const quarterToMonth = getMonthsForQuarter;

/**
 * Normalizes any month representation to full Month name ('April'..'March').
 * Returns 'ALL' or null if not a valid single month.
 */
export function normalizeMonth(mInput) {
  if (mInput === null || mInput === undefined) return null;
  if (mInput === 'ALL' || mInput === 'Total') return 'ALL';

  if (typeof mInput === 'object') {
    if (mInput instanceof Date) {
      const calM = mInput.getMonth() + 1;
      const defByCal = MONTH_DEFINITIONS.find((m) => m.monthNum === calM);
      return defByCal ? defByCal.name : null;
    }
    if (mInput.value) {
      return normalizeMonth(mInput.value);
    }
  }

  if (Array.isArray(mInput)) {
    if (mInput.length === 0 || mInput.includes('ALL') || mInput.includes('Total')) {
      return 'ALL';
    }
    if (mInput.length === 1) {
      return normalizeMonth(mInput[0]);
    }
    const mapped = mInput.map((m) => normalizeMonth(m)).filter((m) => m && m !== 'ALL');
    return mapped.length === 0 ? 'ALL' : (mapped.length === 1 ? mapped[0] : mapped);
  }

  const str = String(mInput).trim();
  if (!str || str.toUpperCase() === 'ALL' || str.toUpperCase() === 'TOTAL') return 'ALL';

  // Check full name match
  const defByName = MONTH_DEFINITIONS.find(
    (m) => m.name.toLowerCase() === str.toLowerCase()
  );
  if (defByName) return defByName.name;

  // Check short name match
  const defByShort = MONTH_DEFINITIONS.find(
    (m) => m.short.toLowerCase() === str.toLowerCase()
  );
  if (defByShort) return defByShort.name;

  // Check numeric month (1=Jan, 2=Feb... 4=Apr... 12=Dec)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12 && /^\d+$/.test(str)) {
    const defByNum = MONTH_DEFINITIONS.find((m) => m.monthNum === num);
    if (defByNum) return defByNum.name;
  }

  // Check Date string YYYY-MM-DD or YYYY-MM or ISO timestamp
  const dateMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (dateMatch) {
    const calM = parseInt(dateMatch[2], 10);
    const defByCal = MONTH_DEFINITIONS.find((m) => m.monthNum === calM);
    if (defByCal) return defByCal.name;
  }

  return str;
}

/**
 * Returns available month options for a given Quarter selection.
 */
export function getMonthsForQuarter(quarter) {
  const normQ = normalizeQuarter(quarter);
  if (normQ === 'Total' || normQ === 'ALL' || !normQ) {
    return MONTH_DEFINITIONS.map((m) => m.name);
  }

  if (QUARTER_MONTHS[normQ]) {
    return [...QUARTER_MONTHS[normQ]];
  }

  // Multi-quarter support (e.g. 'Q1+Q2')
  if (normQ.includes('+')) {
    const qs = normQ.split('+');
    const set = new Set();
    qs.forEach((q) => {
      (QUARTER_MONTHS[q] || []).forEach((m) => set.add(m));
    });
    return Array.from(set);
  }

  return MONTH_DEFINITIONS.map((m) => m.name);
}

/**
 * Returns the financial quarter for a given month name (or array of month names).
 */
export function getQuarterForMonth(monthName) {
  if (!monthName || monthName === 'ALL' || monthName === 'Total') return 'Total';
  if (Array.isArray(monthName)) {
    if (monthName.length === 0 || monthName.includes('ALL') || monthName.includes('Total')) {
      return 'Total';
    }
    const qSet = new Set();
    monthName.forEach((m) => {
      const q = getQuarterForMonth(m);
      if (q && q !== 'Total') qSet.add(q);
    });
    if (qSet.size === 0) return 'Total';
    if (qSet.size === 1) return Array.from(qSet)[0];
    return ['Q1', 'Q2', 'Q3', 'Q4'].filter((q) => qSet.has(q)).join('+');
  }
  const normM = normalizeMonth(monthName);
  const def = MONTH_DEFINITIONS.find((m) => m.name === normM);
  return def ? def.quarter : 'Total';
}

/**
 * Returns a trailing chronological quarter sequence ending at the specified (quarter, FY).
 * Only includes quarters within available financial years (does not pad non-existent historical years like FY23).
 */
export function getTrailingQuarters(endFy = 'FY26', endQuarter = 'Q4', count = 12, availableFys = null) {
  const normFyNum = parseFyNumber(endFy);
  const normQ = normalizeQuarter(endQuarter);

  let qNum = 4;
  if (normQ === 'Q1') qNum = 1;
  else if (normQ === 'Q2') qNum = 2;
  else if (normQ === 'Q3') qNum = 3;
  else if (normQ === 'Q4') qNum = 4;
  else if (normQ.includes('+')) {
    const lastQ = normQ.split('+').slice(-1)[0];
    if (lastQ === 'Q1') qNum = 1;
    else if (lastQ === 'Q2') qNum = 2;
    else if (lastQ === 'Q3') qNum = 3;
    else if (lastQ === 'Q4') qNum = 4;
  }

  let curFy = normFyNum;
  let curQ = qNum;
  const list = [];

  for (let i = 0; i < count; i++) {
    const fyStr = formatFyString(curFy);

    // If availableFys is provided, only include quarters belonging to available FYs
    if (availableFys && Array.isArray(availableFys) && availableFys.length > 0) {
      if (!availableFys.includes(fyStr)) {
        break; // Stop going back to non-existent historical years!
      }
    }

    const qCode = `Q${curQ}`;
    const label = `${qCode} ${fyStr}`;
    const altLabel = `${qCode}${fyStr}`;
    list.push({
      quarter: qCode,
      fy: fyStr,
      label,
      altLabel,
      key: label,
      index: count - 1 - i,
    });

    if (curQ === 1) {
      curQ = 4;
      curFy -= 1;
    } else {
      curQ -= 1;
    }
  }

  return list.reverse();
}

/**
 * Universal Normalized Filter Context Resolver
 */
export function getEffectiveFilterContext(filters = {}, dashboardData = {}) {
  const availableFys = dashboardData?.meta?.fys || ['FY24', 'FY25', 'FY26'];
  const selectedFY = formatFyString(
    parseFyNumber(filters.fy || dashboardData?.meta?.budget_fy || availableFys.slice(-1)[0] || 'FY26')
  );

  const rawQuarter = filters.quarter;
  const normQ = normalizeQuarter(rawQuarter);
  const rawMonth = filters.month;
  const normM = normalizeMonth(rawMonth);

  const isMonthly = normM !== null && normM !== undefined && normM !== 'ALL' && (!Array.isArray(normM) || normM.length > 0);
  const isQuarterly = !isMonthly && normQ !== 'Total';
  const isFullYear = !isMonthly && !isQuarterly;

  let effectiveQuarter = 'Total';
  if (isMonthly) {
    effectiveQuarter = getQuarterForMonth(normM);
  } else if (isQuarterly) {
    effectiveQuarter = normQ;
  }

  const effectiveMonth = isMonthly ? normM : 'ALL';

  let calYear = 2025;
  let monthNumber = null;
  let monthContext = null;

  if (isMonthly && typeof normM === 'string' && normM !== 'ALL') {
    monthContext = getMonthContext(normM, selectedFY);
    if (monthContext) {
      calYear = monthContext.calYear;
      monthNumber = monthContext.monthNum;
    }
  }

  // Trailing quarters endpoint calculation
  let endpointQuarter = 'Q4';
  if (effectiveQuarter && effectiveQuarter !== 'Total') {
    if (effectiveQuarter.includes('+')) {
      endpointQuarter = effectiveQuarter.split('+').slice(-1)[0];
    } else {
      endpointQuarter = effectiveQuarter;
    }
  }

  const trailingQuarters = getTrailingQuarters(selectedFY, endpointQuarter, 12, availableFys);

  return {
    selectedFY,
    selectedQuarter: normQ,
    selectedMonth: normM,
    effectiveQuarter,
    effectiveMonth,
    financialYear: selectedFY,
    calendarYear: calYear,
    monthNumber,
    monthContext,
    isMonthly,
    isQuarterly,
    isFullYear,
    trailingQuartersEndpoint: {
      fy: selectedFY,
      quarter: endpointQuarter,
    },
    trailingQuarters,
    segment: filters.segment || 'ALL',
    bu: filters.bu || 'ALL',
  };
}

/**
 * Calculates calendar year, calendar month, and previous/LY representations
 * for a given financial year and month name.
 */
export function getMonthContext(monthName, fyStr = 'FY26') {
  let targetMonth = monthName;
  let targetFy = fyStr;
  if (typeof monthName === 'string' && (monthName.toUpperCase().startsWith('FY') || /^\d{4}$/.test(monthName)) && typeof fyStr === 'string' && !fyStr.toUpperCase().startsWith('FY')) {
    targetMonth = fyStr;
    targetFy = monthName;
  }

  const normM = normalizeMonth(targetMonth);
  if (!normM || normM === 'ALL' || Array.isArray(normM)) return null;

  const def = MONTH_DEFINITIONS.find((m) => m.name === normM);
  if (!def) return null;

  const fyNum = parseFyNumber(targetFy); // e.g. 26 -> ends in 2026
  const fyEndCalYear = 2000 + fyNum;
  const fyStartCalYear = fyEndCalYear - 1;

  const calYear = def.fyOffset === 0 ? fyStartCalYear : fyEndCalYear;
  const calMonthStr = def.monthNum < 10 ? `0${def.monthNum}` : `${def.monthNum}`;
  const yearMonth = `${calYear}-${calMonthStr}`;

  // Prior financial year
  const priorFyStr = getPreviousFy(targetFy);
  const priorCalYear = calYear - 1;
  const priorYearMonth = `${priorCalYear}-${calMonthStr}`;

  // Previous financial month
  let prevMonthDef;
  let prevMonthCalYear = calYear;
  let prevMonthFy = targetFy;

  if (def.index === 1) {
    // April -> Prev is March of prior FY
    prevMonthDef = MONTH_DEFINITIONS[11]; // March
    prevMonthCalYear = fyStartCalYear; // March of previous FY (e.g. 2025 for FY26 Apr)
    prevMonthFy = priorFyStr;
  } else {
    prevMonthDef = MONTH_DEFINITIONS[def.index - 2];
    if (def.index === 10) {
      // January (calYear 2026) -> Prev is December (calYear 2025)
      prevMonthCalYear = fyStartCalYear;
    }
  }

  const prevMonthNumStr = prevMonthDef.monthNum < 10 ? `0${prevMonthDef.monthNum}` : `${prevMonthDef.monthNum}`;
  const prevMonthYearMonth = `${prevMonthCalYear}-${prevMonthNumStr}`;

  return {
    month: def.name,
    shortMonth: def.short,
    quarter: def.quarter,
    monthNum: def.monthNum,
    fy: formatFyString(fyNum),
    priorFy: priorFyStr,
    calYear,
    calMonthStr,
    yearMonth,
    priorCalYear,
    priorYearMonth,
    prevMonth: prevMonthDef.name,
    prevShortMonth: prevMonthDef.short,
    prevMonthFy,
    prevMonthCalYear,
    prevMonthYearMonth,
  };
}

/**
 * Extracts a normalized 'YYYY-MM' string from any date representation
 * (Date object, string date 'YYYY-MM-DD', BigQuery date object, ISO timestamp).
 */
export function extractYearMonth(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'object' && dateVal.value) {
    dateVal = dateVal.value;
  }
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = dateVal.getMonth() + 1;
    return `${y}-${m < 10 ? '0' + m : m}`;
  }
  const str = String(dateVal).trim();
  const match = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (match) {
    const y = match[1];
    const m = parseInt(match[2], 10);
    return `${y}-${m < 10 ? '0' + m : m}`;
  }
  return null;
}

/**
 * Universal Month Filter Matcher for any data source (supports single or multi-selected months).
 * 
 * Mappings:
 * - Dataai: matches 'DIS Period' (or 'Posting Date' / 'period') against YYYY-MM
 * - Headcount: matches 'Period' (or 'period') against YYYY-MM
 * - orderintake_view: matches 'Month' ('Apr'..'Mar' or full) and 'Year' ('FYxx')
 * - capex_view: matches 'Month' and 'Year'
 * - collection_view: matches 'Month' and 'Year'
 * - enrollment_view: matches 'Month' and 'Year'
 */
export function matchesMonthFilter(row, activeFilters = {}, sourceHint = '') {
  if (!row) return false;

  const targetMonth = normalizeMonth(activeFilters.month);
  const targetFy = activeFilters.fy ? formatFyString(parseFyNumber(activeFilters.fy)) : 'FY26';

  // If no specific month is selected (i.e. 'ALL' or empty), match all
  if (!targetMonth || targetMonth === 'ALL') {
    return true;
  }

  const monthArray = Array.isArray(targetMonth) ? targetMonth : [targetMonth];
  const monthCtxs = monthArray.map((m) => getMonthContext(m, targetFy)).filter(Boolean);
  if (monthCtxs.length === 0) return true;

  const yearMonths = new Set(monthCtxs.map((c) => c.yearMonth));
  const fullNames = new Set(monthCtxs.map((c) => c.month.toLowerCase()));
  const shortNames = new Set(monthCtxs.map((c) => c.shortMonth.toLowerCase()));

  const hint = String(sourceHint || '').toLowerCase();

  // 1. Dataai Source (DIS Period)
  const isDataai = hint.includes('dataai') || 'DIS Period' in row || 'DIS_Period' in row || 'dis_period' in row;
  if (isDataai) {
    const disPeriodVal = row['DIS Period'] || row.DIS_Period || row.dis_period || row['Posting Date'] || row.posting_date || row.Period || row.period;
    const rowYm = extractYearMonth(disPeriodVal);
    if (rowYm) {
      return yearMonths.has(rowYm);
    }
    // Fallback: check FY and Quarter
    if (row.FYs && formatFyString(parseFyNumber(row.FYs)) !== targetFy) return false;
    return true;
  }

  // 2. Headcount Source (Period)
  const isHeadcount = hint.includes('headcount') || ('Period' in row && !('Month' in row));
  if (isHeadcount) {
    const periodVal = row.Period || row.period || row['Period'];
    const rowYm = extractYearMonth(periodVal);
    if (rowYm) {
      return yearMonths.has(rowYm);
    }
    return true;
  }

  // 3. Tabular Views with Month & Year (orderintake_view, capex_view, collection_view, enrollment_view)
  const rowMonth = row.Month || row.month;
  const rowYear = row.Year || row.year || row.FYs || row.Filter_FY || row.YEAR;

  if (rowMonth !== undefined && rowMonth !== null) {
    const rowNormMonth = normalizeMonth(rowMonth);
    const mStr = String(rowMonth).toLowerCase();
    const matchesM = (typeof rowNormMonth === 'string' && fullNames.has(rowNormMonth.toLowerCase())) || fullNames.has(mStr) || shortNames.has(mStr);

    if (!matchesM) return false;

    if (rowYear) {
      const rowFy = formatFyString(parseFyNumber(rowYear));
      return rowFy === targetFy;
    }
    return true;
  }

  // 4. Date-based generic fallback
  const dateVal = row['Posting Date'] || row.posting_date || row.Date || row.date || row.Period || row.period;
  if (dateVal) {
    const rowYm = extractYearMonth(dateVal);
    if (rowYm) {
      return yearMonths.has(rowYm);
    }
  }

  return true;
}

/**
 * Calculates dynamic period headers and labels for any table, card, or chart,
 * fully aware of Financial Year, Quarter, and Month.
 */
export function getPeriodLabels(filters = {}, dashboardData = {}, customQuarter = null, customMonth = null) {
  const currentFy = filters.fy || dashboardData?.meta?.budget_fy || dashboardData?.meta?.fys?.slice(-1)[0] || 'FY26';
  const allFys = dashboardData?.meta?.fys || [];
  const fyIdx = allFys.indexOf(currentFy);
  const priorFy = fyIdx > 0 ? allFys[fyIdx - 1] : getPreviousFy(currentFy);

  const selectedMonth = customMonth !== null ? customMonth : filters.month;
  const normMonth = normalizeMonth(selectedMonth);
  const isMonthly = normMonth && normMonth !== 'ALL';

  if (isMonthly) {
    if (Array.isArray(normMonth)) {
      const shortStr = normMonth.map((m) => m.slice(0, 3)).join('+');
      const curPeriod = `${shortStr} ${currentFy}`;
      const lyPeriod = `${shortStr} ${priorFy}`;
      return {
        isMonthly: true,
        isMultiMonth: true,
        isQuarterly: false,
        currentFy,
        priorFy,
        month: normMonth,
        shortMonth: shortStr,
        quarter: filters.quarter || 'Total',
        currentPeriod: curPeriod,
        lyPeriod,
        prevPeriod: lyPeriod,
        prevQPeriod: lyPeriod,
        actualLabel: `${curPeriod} Actual`,
        budgetLabel: `${curPeriod} Budget`,
        lyActualLabel: `${lyPeriod} Actual`,
        lastQtrActualLabel: `${lyPeriod} Actual`,
        budAchLabel: 'Bud Ach %',
        qoqLabel: 'MoM %',
        yoyLabel: 'YoY %',
        actualShort: `${shortStr} Act`,
        budgetShort: `${shortStr} Bud`,
        lyActualShort: `${shortStr} LY Act`,
        lastQtrActualShort: `${shortStr} LY Act`,
        scopeDescription: curPeriod,
        timeframeLabel: curPeriod,
      };
    }

    // Single Month View (e.g., August FY26)
    const mCtx = getMonthContext(normMonth, currentFy);
    const monthName = mCtx.month;
    const shortMonth = mCtx.shortMonth;
    const quarter = mCtx.quarter;

    const curPeriod = `${monthName} ${currentFy}`;
    const lyPeriod = `${monthName} ${mCtx.priorFy}`;
    const prevMonthPeriod = `${mCtx.prevMonth} ${mCtx.prevMonthFy}`;

    return {
      isMonthly: true,
      isQuarterly: false,
      currentFy,
      priorFy: mCtx.priorFy,
      month: monthName,
      shortMonth,
      quarter,
      prevMonth: mCtx.prevMonth,
      prevShortMonth: mCtx.prevShortMonth,
      prevMonthFy: mCtx.prevMonthFy,
      currentPeriod: curPeriod,
      lyPeriod,
      prevPeriod: prevMonthPeriod,
      prevQPeriod: prevMonthPeriod,

      // Table & Metric Headings
      actualLabel: `${curPeriod} Actual`,
      budgetLabel: `${curPeriod} Budget`,
      lyActualLabel: `${lyPeriod} Actual`,
      lastQtrActualLabel: `${prevMonthPeriod} Actual`,
      budAchLabel: 'Bud Ach %',
      qoqLabel: 'MoM %',
      yoyLabel: 'YoY %',

      // Short labels
      actualShort: `${shortMonth} Act`,
      budgetShort: `${shortMonth} Bud`,
      lyActualShort: `${shortMonth} LY Act`,
      lastQtrActualShort: `${mCtx.prevShortMonth} Act`,

      // Scope description
      scopeDescription: `${curPeriod}`,
      timeframeLabel: `${curPeriod}`,
    };
  }

  const selectedQ = customQuarter !== null ? customQuarter : filters.quarter;
  const normQ = normalizeQuarter(selectedQ);
  const isQuarterly = normQ !== 'Total';

  const prevQObj = getPreviousQuarter(normQ, currentFy);

  if (isQuarterly) {
    // Single Quarter or Multi-Quarter View (e.g., Q4 FY26 or Q2 FY26)
    const curPeriod = `${normQ} ${currentFy}`;
    const lyPeriod = `${normQ} ${priorFy}`;
    const prevQPeriod = `${prevQObj.quarter} ${prevQObj.fy}`;

    return {
      isMonthly: false,
      isQuarterly: true,
      currentFy,
      priorFy,
      month: 'ALL',
      quarter: normQ,
      prevQuarter: prevQObj.quarter,
      prevQuarterFy: prevQObj.fy,
      currentPeriod: curPeriod,
      lyPeriod,
      prevPeriod: prevQPeriod,
      prevQPeriod,

      // Table & Metric Headings
      actualLabel: `${curPeriod} Actual`,
      budgetLabel: `${curPeriod} Budget`,
      lyActualLabel: `${lyPeriod} Actual`,
      lastQtrActualLabel: `${prevQPeriod} Actual`,
      budAchLabel: 'Bud Ach %',
      qoqLabel: 'QoQ %',
      yoyLabel: 'YoY %',

      // Short labels
      actualShort: `${normQ} Act`,
      budgetShort: `${normQ} Bud`,
      lyActualShort: `${normQ} LY Act`,
      lastQtrActualShort: `${prevQObj.quarter} Act`,

      // Scope description
      scopeDescription: `${curPeriod}`,
      timeframeLabel: `${normQ} ${currentFy}`,
    };
  } else {
    // Full Year / Total View (e.g., FY26)
    return {
      isMonthly: false,
      isQuarterly: false,
      currentFy,
      priorFy,
      month: 'ALL',
      quarter: 'Total',
      prevQuarter: 'Total',
      prevQuarterFy: priorFy,
      currentPeriod: currentFy,
      lyPeriod: priorFy,
      prevPeriod: priorFy,
      prevQPeriod: priorFy,

      // Table & Metric Headings
      actualLabel: `${currentFy} Actual`,
      budgetLabel: `${currentFy} Budget`,
      lyActualLabel: `${priorFy} Actual`,
      lastQtrActualLabel: `${priorFy} Actual`,
      budAchLabel: 'Bud Ach %',
      qoqLabel: 'QoQ %',
      yoyLabel: 'YoY %',

      // Short labels
      actualShort: `${currentFy} Act`,
      budgetShort: `${currentFy} Bud`,
      lyActualShort: `${priorFy} Act`,
      lastQtrActualShort: `${priorFy} Act`,

      // Scope description
      scopeDescription: `Full Year ${currentFy}`,
      timeframeLabel: `Full Year ${currentFy}`,
    };
  }
}
