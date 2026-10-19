/**
 * Centralized Enterprise Finance Theme System for Finance360.
 * 
 * Defines centralized design tokens, color palette, typography, radii,
 * and deterministic category/metric color mappings.
 * 
 * Rules:
 * - One unified professional finance design language based on the Finance360 palette.
 * - Same metric/category ALWAYS receives the exact same color across all charts & tabs.
 * - Tabular numerals & accessible high contrast.
 * - Purely visual - zero impact on business or data logic.
 */

// Core Design Tokens
export const THEME_TOKENS = {
  colors: {
    // Primary Navy & Secondary Navy
    primary: '#101828',
    primaryDark: '#0C111D',
    primaryLight: '#1D2939',
    primaryNavy: '#101828',
    secondaryNavy: '#1D2939',

    // Secondary Text & Muted
    secondary: '#475467',
    secondaryLight: '#667085',
    textMuted: '#667085',
    textSubtle: '#98A2B3',

    // Primary Action Blue
    accent: '#246BFD',
    accentDark: '#1D4ED8',
    accentLight: '#5389FD',
    accentSubtle: '#EFF4FF',

    // Neutral & Backgrounds
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceSubtle: '#F9FAFB',
    surfaceMuted: '#F2F4F7',

    // Borders & Dividers
    border: '#E4E7EC',
    borderLight: '#F2F4F7',
    borderDark: '#D0D5DD',

    // Typography
    textPrimary: '#101828',
    textSecondary: '#667085',

    // Semantic Status Colors
    success: '#12B981',       // High-contrast positive emerald
    successDark: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',

    danger: '#D92D20',        // High-contrast negative crimson
    dangerDark: '#B42318',
    dangerBg: '#FEF3F2',
    dangerBorder: '#FECDCA',

    warning: '#F59E0B',       // Warning amber
    warningDark: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',

    info: '#0EA5E9',          // Informational cyan
    infoDark: '#0284C7',
    infoBg: '#F0F9FF',
    infoBorder: '#BAE6FD',
  },

  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    subtle: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
    card: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
    dropdown: '0 4px 12px 0 rgba(16, 24, 40, 0.08), 0 2px 4px -1px rgba(16, 24, 40, 0.04)',
    modal: '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
  },
};

/**
 * Centralized Category & Metric Color Mapping.
 * 
 * Ensures strict global consistency across all charts & tabs.
 */
export const METRIC_COLORS = {
  // Business Groups (Distinctive professional group colors)
  'ETLS': '#7C3AED',          // Professional Purple
  '1 ETLS': '#7C3AED',
  'BIPS': '#F59E0B',          // Warm Amber
  '2 BIPS': '#F59E0B',
  'INT': '#246BFD',           // Primary Action Blue
  '4 INT': '#246BFD',
  'NEO': '#12B981',           // Emerald
  '5 NEO': '#12B981',
  'Digital': '#0EA5E9',       // Clean Info Blue
  '3 Digital': '#0EA5E9',

  // Businesses under ETLS
  'RPS': '#8B5CF6',

  // Businesses under BIPS
  'TPaaS': '#FBBF24',
  'EM': '#FCD34D',

  // Businesses under INT
  'China': '#3B82F6',
  'Enterprise': '#60A5FA',

  // Businesses under NEO
  'SSE': '#10B981',
  'Stackroute': '#34D399',

  // Businesses under Digital
  'Tech': '#0284C7',
  'Lateral': '#38BDF8',
  'Skills & Careers': '#7DD3FC',
  'SNC': '#BAE6FD',

  // Core Financial Metrics (Consistent across all tabs)
  'Revenue': '#246BFD',
  'Net Revenue': '#246BFD',
  'Actuals': '#246BFD',
  'Actual': '#246BFD',
  'ACT': '#246BFD',
  'Order Intake': '#0EA5E9',
  'Total Order Intake': '#0EA5E9',
  'Budget': '#98A2B3',
  'BUD': '#98A2B3',
  'Prior Year': '#D0D5DD',
  'PY': '#D0D5DD',
  'LY': '#D0D5DD',
  'Variable Cost': '#F97316',
  'VC%': '#F97316',
  'Total Direct Cost': '#F97316',
  'Gross Profit': '#12B981',
  'Gross Margin': '#12B981',
  'Gross Margin %': '#12B981',
  'GP %': '#12B981',
  'GM%': '#12B981',
  'Throughput': '#06B6D4',
  'People Cost': '#6366F1',
  'Marketing Expenses': '#0D9488',
  'Marketing Cost': '#0D9488',
  'Fixed Costs': '#64748B',
  'Other Cost %': '#64748B',
  'Total Opex': '#8B5CF6',
  'Total OPEX': '#8B5CF6',
  'Total Operating Expenses': '#8B5CF6',
  'EBITDA Contribution': '#EC4899',
  'EBITDA Contribution %': '#EC4899',
  'EBITDA CONTRIBUTION %': '#EC4899',
  'EBITDA': '#12B981',
  'EBITDA %': '#12B981',
  'OM%': '#12B981',
  'Collection': '#10B981',
  'Capex': '#A855F7',
  'Net Cash': '#246BFD',
  'Total': '#101828',
};

/**
 * Generates an array of lighter tints of a base color hex for child businesses
 */
export function getLighterTints(baseHex, count) {
  let hex = String(baseHex || '#246BFD').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 36;
  const g = parseInt(hex.substring(2, 4), 16) || 107;
  const b = parseInt(hex.substring(4, 6), 16) || 253;

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
  '#246BFD', // Primary Action Blue
  '#12B981', // Emerald Success
  '#F59E0B', // Amber
  '#0EA5E9', // Cyan Info
  '#7C3AED', // Royal Purple
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#0D9488', // Teal
  '#EC4899', // Pink
  '#10B981', // Mint
  '#64748B', // Slate
  '#1D2939', // Navy
];

/**
 * Deterministically resolves a color for any category or metric name.
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
  splitLineColor: '#F2F4F7',
  surfaceBg: THEME_TOKENS.colors.surface,
  gridTop: 32,
  gridBottom: 36,
  gridLeft: 10,
  gridRight: 14,
};
