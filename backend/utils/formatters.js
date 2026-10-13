export function serializeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === 'object' && value.value !== undefined) {
      const num = Number(value.value);
      out[key] = isNaN(num) ? String(value.value) : num;
    } else if (typeof value === 'number') {
      out[key] = isNaN(value) ? null : Number(value.toFixed(6));
    } else {
      out[key] = value;
    }
  }
  return out;
}
