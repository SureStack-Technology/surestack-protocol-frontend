const DEFAULT_SIGMA_BASE = 40; // σbase in percentage
const MAX_TIER_RATE = 1.0; // 1%

const TIER_TABLE = [
  { min: 100, rate: 1.0, label: "Extreme Volatility" },
  { min: 50, rate: 0.75, label: "High Volatility" },
  { min: 30, rate: 0.5, label: "Elevated Volatility" },
  { min: 20, rate: 0.25, label: "Moderate Volatility" },
];

function normalisePrice(priceEntry) {
  if (priceEntry == null) return null;
  if (typeof priceEntry === "number") return priceEntry;
  if (typeof priceEntry === "object") {
    if (typeof priceEntry.price === "number") return priceEntry.price;
    if (typeof priceEntry.p === "number") return priceEntry.p;
  }
  return null;
}

export function compute30DayVolatility(prices = []) {
  const closing = prices
    .map(normalisePrice)
    .filter((value) => typeof value === "number" && value > 0);

  if (closing.length < 2) {
    return 0;
  }

  const logReturns = [];
  for (let i = 1; i < closing.length; i += 1) {
    const prev = closing[i - 1];
    const current = closing[i];
    if (prev > 0 && current > 0) {
      logReturns.push(Math.log(current / prev));
    }
  }

  if (logReturns.length === 0) {
    return 0;
  }

  const mean =
    logReturns.reduce((sum, value) => sum + value, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    logReturns.length;
  const dailyVol = Math.sqrt(Math.max(variance, 0));

  // Convert to percentage volatility for a 30-day window (approx sqrt(30) scaling)
  const thirtyDayVol = dailyVol * Math.sqrt(30) * 100;
  return Number(thirtyDayVol.toFixed(2));
}

export function getTier(volatilityRate) {
  const vol = Math.max(volatilityRate, 0);
  const tier =
    TIER_TABLE.find((entry) => vol >= entry.min) ??
    { rate: 0, label: "Baseline" };

  return {
    rate: Math.min(tier.rate, MAX_TIER_RATE),
    label: tier.label,
    threshold: tier.min ?? null,
  };
}

export function computeVAF(portfolioValue = 0, volatilityRate = 0) {
  const rate = Math.max(volatilityRate, 0) / 100;
  return Number((portfolioValue * rate).toFixed(2));
}

export function computeActuarialVAF(
  portfolioValue,
  sigma30,
  sigmaBase = DEFAULT_SIGMA_BASE,
  k = 0.15
) {
  const P = Number(portfolioValue) || 0;
  const σ30 = Math.max(Number(sigma30) || 0, 0);
  const σbase = Math.max(Number(sigmaBase) || 0, 1);
  const kValue = Math.min(Math.max(Number(k) || 0, 0.1), 0.25);

  const diff = σ30 - σbase;
  if (diff <= 0) {
    return 0;
  }

  const ratio = diff / σbase;
  const vaf = P * ratio * kValue;
  return Number(Math.max(vaf, 0).toFixed(2));
}

export function getVAFAllocation(vafAmount = 0) {
  const amount = Number(vafAmount) || 0;
  const pool = Number((amount * 0.6).toFixed(2));
  const reinsurance = Number((amount * 0.2).toFixed(2));
  const revenue = Number((amount * 0.2).toFixed(2));
  return {
    pool,
    reinsurance,
    revenue,
  };
}

export function calculateVAFMetrics({
  portfolioValue,
  prices,
  sigmaBase = DEFAULT_SIGMA_BASE,
  k = 0.15,
  overrideSigma30,
}) {
  const computedSigma30 = compute30DayVolatility(prices);
  const σ30 =
    overrideSigma30 != null && !Number.isNaN(Number(overrideSigma30))
      ? Number(overrideSigma30)
      : computedSigma30;
  const effectiveVolatility = Math.max(σ30 - sigmaBase, 0);
  const tier = getTier(effectiveVolatility);
  const simpleRate = tier.rate;
  const simpleVAF = computeVAF(portfolioValue, simpleRate);
  const actuarialVAF = computeActuarialVAF(portfolioValue, σ30, sigmaBase, k);
  const allocation = getVAFAllocation(actuarialVAF || simpleVAF);

  return {
    sigma30: σ30,
    sigmaBase,
    k,
    effectiveVolatility,
    tier,
    simpleVAF,
    actuarialVAF,
    allocation,
  };
}

export const VAF_TIERS = TIER_TABLE;
export const SIGMA_BASE_DEFAULT = DEFAULT_SIGMA_BASE;

