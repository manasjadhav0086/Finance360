export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
};

export function toTitleCase(value) {
  if (value === null || value === undefined) return "";

  // Convert anything (number, boolean, object) safely to string
  const str = String(value);

  if (!str) return "";

  return str
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function formatNumber(num, useShorthand = true) {
  if (num === null || num === undefined) return "0";

  const number = Number(num);

  if (Number.isNaN(number)) return num;

  // Full format with nice comma placement
  if (!useShorthand) {
    return number.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }

  const absNum = Math.abs(number);
  const sign = number < 0 ? "-" : "";

  const truncate = (value) => {
    return Math.floor(value * 10) / 10;
  };

  if (absNum >= 1e9) {
    const value = truncate(absNum / 1e9);
    return sign + value.toString().replace(/\.0$/, "") + "B";
  } else if (absNum >= 1e6) {
    const value = truncate(absNum / 1e6);
    return sign + value.toString().replace(/\.0$/, "") + "M";
  } else if (absNum >= 1e3) {
    const value = truncate(absNum / 1e3);
    return sign + value.toString().replace(/\.0$/, "") + "K";
  } else {
    // Fallback for smaller numbers
    return number.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }
}

export function formatLocalDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}
export function getFYTDSuffix() {
  const now = new Date();
  let startYear = now.getFullYear();

  // Fiscal year starts in April
  if (now.getMonth() < 3) {
    startYear -= 1;
  }

  const endYear = startYear + 1;

  const fyStart = String(startYear).slice(-2);
  const fyEnd = String(endYear).slice(-2);

  return `FY${fyStart}-${fyEnd} YTD`;
}