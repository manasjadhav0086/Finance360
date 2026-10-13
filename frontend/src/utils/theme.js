/**
 * Centralized Enterprise Finance Theme System for Finance360.
 * 
 * Defines centralized design tokens, color palette, typography, radii,
 * and deterministic category/metric color mappings.
 * 
 * Rules:
 * - One unified professional finance design language.
 * - Same metric/category ALWAYS receives the exact same color across all charts & tabs.
 * - Dynamic legend ranking/order remains intact (color is bound to category name, not array index).
 * - Purely visual - zero impact on business or data logic.
 */

// Core Design Tokens
export const THEME_TOKENS = {
  colors: {
    // Primary: Deep Navy / Dark Blue
    primary: '#0F172A',
    primaryDark: '#020617',
    primaryLight: '#1E293B',
    primaryNavy: '#1E3A8A',

    // Secondary: Slate / Muted Blue-Gray
    secondary: '#475569',
    secondaryLight: '#64748B',

    // Accent: Professional Blue
    accent: '#2563EB',
    accentDark: '#1D4ED8',
    accentLight: '#3B82F6',
    accentSubtle: '#EFF6FF',

    // Neutral & Backgrounds
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
    surfaceMuted: '#F1F5F9',

    // Borders & Dividers
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',

    // Typography
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',

    // Semantic Status Colors
    success: '#059669',       // Professional Emerald
    successDark: '#047857',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',

    danger: '#E11D48',        // Professional Crimson/Rose
    dangerDark: '#BE123C',
    dangerBg: '#FFF1F2',
    dangerBorder: '#FECDD3',

    warning: '#D97706',       // Professional Amber
    warningDark: '#B45309',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',

    info: '#0284C7',          // Professional Sky/Cyan
    infoDark: '#0369A1',
    infoBg: '#F0F9FF',
    infoBorder: '#BAE6FD',
  },

  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    subtle: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
    card: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
    dropdown: '0 4px 12px 0 rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
    modal: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
  },
};

/**
 * Centralized Category & Metric Color Mapping.
 * 
 * Ensures strict global consistency:
 * E.g., RPS is ALWAYS #1E40AF across all tabs and charts.
 * TPaaS is ALWAYS #2563EB.
 * Revenue is ALWAYS #1E40AF.
 */
export const METRIC_COLORS = {
  // Business Groups (Vibrant and distinctive group colors)
  'ETLS': '#7C3AED',          // Vibrant Royal Purple
  '1 ETLS': '#7C3AED',        // Vibrant Royal Purple
  'BIPS': '#F59E0B',          // Vibrant Amber / Gold
  '2 BIPS': '#F59E0B',        // Vibrant Amber / Gold
  'INT': '#0284C7',           // Vibrant Ocean / Sky Blue
  '4 INT': '#0284C7',         // Vibrant Ocean / Sky Blue
  'NEO': '#16A34A',           // Vibrant Emerald Green
  '5 NEO': '#16A34A',         // Vibrant Emerald Green
  'Digital': '#E11D48',       // Vibrant Crimson / Rose
  '3 Digital': '#E11D48',     // Vibrant Crimson / Rose

  // Businesses under ETLS (Harmonious vibrant tints of #7C3AED)
  'RPS': '#8B5CF6',

  // Businesses under BIPS (Harmonious vibrant tints of #F59E0B)
  'TPaaS': '#FBBF24',
  'EM': '#FCD34D',

  // Businesses under INT (Harmonious vibrant tints of #0284C7)
  'China': '#38BDF8',
  'Enterprise': '#60A5FA',

  // Businesses under NEO (Harmonious vibrant tints of #16A34A)
  'SSE': '#22C55E',
  'Stackroute': '#4ADE80',

  // Businesses under Digital (Harmonious vibrant tints of #E11D48)
  'Tech': '#F43F5E',
  'Lateral': '#FB7185',
  'Skills & Careers': '#FDA4AF',
  'SNC': '#FECDD3',

  // Core Financial Metrics (Vibrant and high-contrast)
  'Revenue': '#0284C7',
  'Net Revenue': '#0284C7',
  'Order Intake': '#0EA5E9',
  'Total Order Intake': '#0EA5E9',
  'Variable Cost': '#EA580C',
  'VC%': '#EA580C',
  'Gross Profit': '#16A34A',
  'Gross Margin': '#16A34A',
  'Gross Margin %': '#16A34A',
  'GP %': '#16A34A',
  'GM%': '#16A34A',
  'Throughput': '#06B6D4',
  'People Cost': '#6366F1',
  'Marketing Expenses': '#0D9488',
  'Marketing Cost': '#0D9488',
  'Fixed Costs': '#64748B',
  'Other Cost %': '#64748B',
  'Total Opex': '#9333EA',
  'Total OPEX': '#9333EA',
  'EBITDA Contribution': '#E11D48',
  'EBITDA Contribution %': '#E11D48',
  'EBITDA CONTRIBUTION %': '#E11D48',
  'EBITDA': '#059669',
  'EBITDA %': '#059669',
  'OM%': '#059669',
  'Collection': '#10B981',
  'Enrollment': '#0284C7',
  'Learners Count': '#0284C7',
  'Headcount': '#8B5CF6',
  'Capex': '#D946EF',
  'Net Cash': '#0284C7',
  'Total': '#0F172A',
};

/**
 * Generates an array of lighter tints of a base color hex for child businesses
 * belonging to a parent business group.
 */
export function getLighterTints(baseHex, count) {
  let hex = String(baseHex || '#2563EB').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 120;
  const g = parseInt(hex.substring(2, 4), 16) || 120;
  const b = parseInt(hex.substring(4, 6), 16) || 120;

  if (count <= 1) {
    const tr = Math.round(r + (255 - r) * 0.22);
    const tg = Math.round(g + (255 - g) * 0.22);
    const tb = Math.round(b + (255 - b) * 0.22);
    return [`#${tr.toString(16).padStart(2, '0')}${tg.toString(16).padStart(2, '0')}${tb.toString(16).padStart(2, '0')}`];
  }

  return Array.from({ length: count }, (_, i) => {
    const mix = 0.15 + (i / Math.max(count - 1, 1)) * 0.38;
    const tr = Math.round(r + (255 - r) * mix);
    const tg = Math.round(g + (255 - g) * mix);
    const tb = Math.round(b + (255 - b) * mix);
    return `#${tr.toString(16).padStart(2, '0')}${tg.toString(16).padStart(2, '0')}${tb.toString(16).padStart(2, '0')}`;
  });
}

/**
 * Harmonious 12-Color Enterprise Series Palette for deterministic fallbacks.
 */
export const ENTERPRISE_SERIES_PALETTE = [
  '#0284C7', // Vibrant Sky Blue
  '#EA580C', // Vibrant Tangerine
  '#16A34A', // Vibrant Emerald Green
  '#9333EA', // Vibrant Purple
  '#E11D48', // Vibrant Crimson
  '#F59E0B', // Vibrant Amber
  '#06B6D4', // Vibrant Cyan
  '#7C3AED', // Vibrant Violet
  '#0D9488', // Vibrant Teal
  '#EC4899', // Vibrant Pink
  '#10B981', // Vibrant Mint
  '#64748B', // Crisp Slate
];

/**
 * Deterministically resolves a color for any category or metric name.
 * 
 * 1. Checks exact match in METRIC_COLORS
 * 2. Checks normalized/trimmed/aliased match
 * 3. Falls back deterministically via hash of the name into ENTERPRISE_SERIES_PALETTE
 */
export function getCategoryColor(name, fallbackIdx = 0) {
  if (!name || typeof name !== 'string') {
    return ENTERPRISE_SERIES_PALETTE[fallbackIdx % ENTERPRISE_SERIES_PALETTE.length];
  }

  const trimmed = name.trim();
  if (METRIC_COLORS[trimmed]) {
    return METRIC_COLORS[trimmed];
  }

  // Check case-insensitive key
  const lower = trimmed.toLowerCase();
  for (const [key, color] of Object.entries(METRIC_COLORS)) {
    if (key.toLowerCase() === lower) {
      return color;
    }
  }

  // Deterministic fallback based on string hash
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % ENTERPRISE_SERIES_PALETTE.length;
  return ENTERPRISE_SERIES_PALETTE[idx];
}

/**
 * Subtle 3D Linear Gradient helper for ECharts bar series.
 */
export function get3DBarGradient(color) {
  if (!color) return color;
  if (typeof color !== 'string') return color;
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color },
      { offset: 1, color: color },
    ],
  };
}

/**
 * Base chart configuration presets for consistent ECharts theme styling.
 */
export const CHART_THEME = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  textColor: THEME_TOKENS.colors.textPrimary,
  textMuted: THEME_TOKENS.colors.textMuted,
  textSubtle: THEME_TOKENS.colors.textSubtle,
  borderColor: THEME_TOKENS.colors.border,
  splitLineColor: '#F1F5F9',
  surfaceBg: THEME_TOKENS.colors.surface,
  gridTop: 32,
  gridBottom: 36,
  gridLeft: 10,
  gridRight: 14,
};
