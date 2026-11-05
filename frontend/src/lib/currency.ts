export const DEFAULT_CURRENCY = 'ZAR'

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
}

// ZAR leads; the rest are the currencies clients are most likely to be billed in
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'ZAR', name: 'South African Rand',  symbol: 'R' },
  { code: 'USD', name: 'US Dollar',           symbol: '$' },
  { code: 'EUR', name: 'Euro',                symbol: '€' },
  { code: 'GBP', name: 'British Pound',       symbol: '£' },
  { code: 'BWP', name: 'Botswana Pula',       symbol: 'P' },
  { code: 'NAD', name: 'Namibian Dollar',     symbol: 'N$' },
  { code: 'LSL', name: 'Lesotho Loti',        symbol: 'L' },
  { code: 'SZL', name: 'Eswatini Lilangeni',  symbol: 'E' },
  { code: 'MZN', name: 'Mozambican Metical',  symbol: 'MT' },
  { code: 'ZMW', name: 'Zambian Kwacha',      symbol: 'ZK' },
  { code: 'KES', name: 'Kenyan Shilling',     symbol: 'KSh' },
  { code: 'NGN', name: 'Nigerian Naira',      symbol: '₦' },
  { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar',     symbol: 'C$' },
  { code: 'NZD', name: 'New Zealand Dollar',  symbol: 'NZ$' },
  { code: 'CHF', name: 'Swiss Franc',         symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen',        symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan',        symbol: 'CN¥' },
  { code: 'INR', name: 'Indian Rupee',        symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham',          symbol: 'AED' },
]

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]))

export function currencySymbol(code: string = DEFAULT_CURRENCY) {
  return byCode.get(code)?.symbol ?? code
}

/**
 * Formats an amount with the currency's own symbol, e.g. "R12,345.67".
 * en-ZA grouping on its own gives "R 12 345,67", which reads oddly next to the
 * dot-decimal number inputs, so the number is formatted separately.
 */
export function formatMoney(amount: number, code: string = DEFAULT_CURRENCY) {
  const digits = code === 'JPY' ? 0 : 2
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(amount))
  return `${amount < 0 ? '−' : ''}${currencySymbol(code)}${number}`
}
