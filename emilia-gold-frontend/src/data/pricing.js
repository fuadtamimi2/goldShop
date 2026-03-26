// Mock gold price data (later replaced by API)

// 1 troy ounce = 31.1034768 grams
export const TROY_OUNCE_TO_GRAM = 31.1034768;

// Current spot price in USD per troy ounce
export const SPOT_USD_PER_OZ = 2186.0;

// Exchange rates (mock)
export const USD_TO_ILS = 3.69;
export const USD_TO_JOD = 0.709;

// Karat purity ratios (24K = 1.0)
export const KARAT_RATIO = {
  "24K": 1.0,
  "22K": 22 / 24,
  "21K": 21 / 24,
  "18K": 18 / 24,
};

// Mock history data
export const PRICE_HISTORY = [
  { date: "2026-03-20", usd: 2158 },
  { date: "2026-03-21", usd: 2172 },
  { date: "2026-03-22", usd: 2164 },
  { date: "2026-03-23", usd: 2180 },
  { date: "2026-03-24", usd: 2191 },
  { date: "2026-03-25", usd: 2186 },
];
