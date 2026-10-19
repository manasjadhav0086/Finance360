/**
 * Market Intelligence Metadata & Financial Impact Rules
 * Authoritative datasets for Industries, Countries, Macro Drivers,
 * and Grounded Corporate Finance Impact Evaluation.
 */

export const INDUSTRIES = [
  'Financial Services',
  'Banking',
  'Insurance',
  'FinTech',
  'Information Technology',
  'IT Services',
  'Artificial Intelligence',
  'Cloud Computing',
  'Healthcare',
  'Pharmaceuticals',
  'Manufacturing',
  'Automotive',
  'Retail and E-commerce',
  'Consumer Goods',
  'Energy and Oil & Gas',
  'Renewable Energy',
  'Telecommunications',
  'Real Estate',
  'Infrastructure and Construction',
  'Logistics and Transportation',
  'Agriculture',
  'Media and Entertainment',
  'Travel and Hospitality',
  'Metals and Mining',
  'Aerospace and Defense',
  'Chemicals and Petrochemicals'
];

export const COUNTRIES = [
  { name: 'India', code: 'IN', gl: 'IN', hl: 'en-IN', ceid: 'IN:en', currency: 'INR', flag: '🇮🇳' },
  { name: 'United States', code: 'US', gl: 'US', hl: 'en-US', ceid: 'US:en', currency: 'USD', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', gl: 'GB', hl: 'en-GB', ceid: 'GB:en', currency: 'GBP', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: 'AE', gl: 'AE', hl: 'en-AE', ceid: 'AE:en', currency: 'AED', flag: '🇦🇪' },
  { name: 'Singapore', code: 'SG', gl: 'SG', hl: 'en-SG', ceid: 'SG:en', currency: 'SGD', flag: '🇸🇬' },
  { name: 'Saudi Arabia', code: 'SA', gl: 'SA', hl: 'en-SA', ceid: 'SA:en', currency: 'SAR', flag: '🇸🇦' },
  { name: 'Germany', code: 'DE', gl: 'DE', hl: 'en-DE', ceid: 'DE:en', currency: 'EUR', flag: '🇩🇪' },
  { name: 'Canada', code: 'CA', gl: 'CA', hl: 'en-CA', ceid: 'CA:en', currency: 'CAD', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', gl: 'AU', hl: 'en-AU', ceid: 'AU:en', currency: 'AUD', flag: '🇦🇺' },
  { name: 'Japan', code: 'JP', gl: 'JP', hl: 'en-JP', ceid: 'JP:en', currency: 'JPY', flag: '🇯🇵' },
  { name: 'France', code: 'FR', gl: 'FR', hl: 'en-FR', ceid: 'FR:en', currency: 'EUR', flag: '🇫🇷' },
  { name: 'Switzerland', code: 'CH', gl: 'CH', hl: 'en-CH', ceid: 'CH:en', currency: 'CHF', flag: '🇨🇭' },
  { name: 'Netherlands', code: 'NL', gl: 'NL', hl: 'en-NL', ceid: 'NL:en', currency: 'EUR', flag: '🇳🇱' },
  { name: 'Hong Kong', code: 'HK', gl: 'HK', hl: 'en-HK', ceid: 'HK:en', currency: 'HKD', flag: '🇭🇰' },
  { name: 'South Korea', code: 'KR', gl: 'KR', hl: 'en-KR', ceid: 'KR:en', currency: 'KRW', flag: '🇰🇷' },
  { name: 'Brazil', code: 'BR', gl: 'BR', hl: 'en-BR', ceid: 'BR:en', currency: 'BRL', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', gl: 'MX', hl: 'en-MX', ceid: 'MX:en', currency: 'MXN', flag: '🇲🇽' },
  { name: 'South Africa', code: 'ZA', gl: 'ZA', hl: 'en-ZA', ceid: 'ZA:en', currency: 'ZAR', flag: '🇿🇦' },
  { name: 'Indonesia', code: 'ID', gl: 'ID', hl: 'en-ID', ceid: 'ID:en', currency: 'IDR', flag: '🇮🇩' },
  { name: 'Malaysia', code: 'MY', gl: 'MY', hl: 'en-MY', ceid: 'MY:en', currency: 'MYR', flag: '🇲🇾' },
  { name: 'Thailand', code: 'TH', gl: 'TH', hl: 'en-TH', ceid: 'TH:en', currency: 'THB', flag: '🇹🇭' },
  { name: 'Vietnam', code: 'VN', gl: 'VN', hl: 'en-VN', ceid: 'VN:en', currency: 'VND', flag: '🇻🇳' },
  { name: 'Philippines', code: 'PH', gl: 'PH', hl: 'en-PH', ceid: 'PH:en', currency: 'PHP', flag: '🇵🇭' },
  { name: 'Qatar', code: 'QA', gl: 'QA', hl: 'en-QA', ceid: 'QA:en', currency: 'QAR', flag: '🇶🇦' },
  { name: 'Ireland', code: 'IE', gl: 'IE', hl: 'en-IE', ceid: 'IE:en', currency: 'EUR', flag: '🇮🇪' },
  { name: 'Spain', code: 'ES', gl: 'ES', hl: 'en-ES', ceid: 'ES:en', currency: 'EUR', flag: '🇪🇸' },
  { name: 'Italy', code: 'IT', gl: 'IT', hl: 'en-IT', ceid: 'IT:en', currency: 'EUR', flag: '🇮🇹' },
  { name: 'Sweden', code: 'SE', gl: 'SE', hl: 'en-SE', ceid: 'SE:en', currency: 'SEK', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', gl: 'NO', hl: 'en-NO', ceid: 'NO:en', currency: 'NOK', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', gl: 'DK', hl: 'en-DK', ceid: 'DK:en', currency: 'DKK', flag: '🇩🇰' },
  { name: 'Poland', code: 'PL', gl: 'PL', hl: 'en-PL', ceid: 'PL:en', currency: 'PLN', flag: '🇵🇱' },
  { name: 'Turkey', code: 'TR', gl: 'TR', hl: 'en-TR', ceid: 'TR:en', currency: 'TRY', flag: '🇹🇷' },
  { name: 'Israel', code: 'IL', gl: 'IL', hl: 'en-IL', ceid: 'IL:en', currency: 'ILS', flag: '🇮🇱' },
  { name: 'New Zealand', code: 'NZ', gl: 'NZ', hl: 'en-NZ', ceid: 'NZ:en', currency: 'NZD', flag: '🇳🇿' },
  { name: 'Egypt', code: 'EG', gl: 'EG', hl: 'en-EG', ceid: 'EG:en', currency: 'EGP', flag: '🇪🇬' },
  { name: 'Nigeria', code: 'NG', gl: 'NG', hl: 'en-NG', ceid: 'NG:en', currency: 'NGN', flag: '🇳🇬' },
  { name: 'Kenya', code: 'KE', gl: 'KE', hl: 'en-KE', ceid: 'KE:en', currency: 'KES', flag: '🇰🇪' },
  { name: 'Chile', code: 'CL', gl: 'CL', hl: 'en-CL', ceid: 'CL:en', currency: 'CLP', flag: '🇨🇱' },
  { name: 'Colombia', code: 'CO', gl: 'CO', hl: 'en-CO', ceid: 'CO:en', currency: 'COP', flag: '🇨🇴' },
  { name: 'Argentina', code: 'AR', gl: 'AR', hl: 'en-AR', ceid: 'AR:en', currency: 'ARS', flag: '🇦🇷' },
  { name: 'Kuwait', code: 'KW', gl: 'KW', hl: 'en-KW', ceid: 'KW:en', currency: 'KWD', flag: '🇰🇼' },
  { name: 'Oman', code: 'OM', gl: 'OM', hl: 'en-OM', ceid: 'OM:en', currency: 'OMR', flag: '🇴🇲' },
  { name: 'Bahrain', code: 'BH', gl: 'BH', hl: 'en-BH', ceid: 'BH:en', currency: 'BHD', flag: '🇧🇭' },
  { name: 'China', code: 'CN', gl: 'CN', hl: 'en-CN', ceid: 'CN:en', currency: 'CNY', flag: '🇨🇳' }
];

export function resolveCountry(input) {
  if (!input) return COUNTRIES[0]; // Default India
  const clean = String(input).trim().toLowerCase();
  const found = COUNTRIES.find(
    (c) => c.name.toLowerCase() === clean || c.code.toLowerCase() === clean
  );
  if (found) return found;

  // Partial match fallback
  const partial = COUNTRIES.find((c) => c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase()));
  if (partial) return partial;

  return COUNTRIES[0]; // Fallback to India
}

export function resolveIndustry(input) {
  if (!input) return 'Financial Services';
  const clean = String(input).trim().toLowerCase();
  const found = INDUSTRIES.find((ind) => ind.toLowerCase() === clean);
  if (found) return found;

  const partial = INDUSTRIES.find((ind) => ind.toLowerCase().includes(clean) || clean.includes(ind.toLowerCase()));
  if (partial) return partial;

  return 'Financial Services';
}
