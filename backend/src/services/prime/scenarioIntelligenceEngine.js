/** @typedef {{
 *   topTokenSharePct:number
 *   volatileSharePct:number
 *   transferCount:number
 *   uniqueCounterparties:number
 * }} ScenarioInputs */

function clamp(number, low, high) {
  const n = Number(number)
  if (!Number.isFinite(n)) return low
  return Math.min(high, Math.max(low, n))
}

const SCENARIO_CATALOG = {
  eth_shock_minus_20: {
    title: 'ETH −20% shock (simulated stress)',
    description:
      'Uses volatile token share combined with concentration to approximate directional correlated exposure under a hypothetical ETH softening.',
  },
  stablecoin_depeg: {
    title: 'Stablecoin peg stress heuristic',
    description:
      'Uses balance volatility proxy gaps to approximate stable vs risk-asset layering during a hypothetical peg divergence.',
  },
  protocol_exploit_surface: {
    title: 'Protocol interaction density stress',
    description:
      'Stress-tests dispersion of counterparties in the sampled window as routing complexity heuristic under operational stress.',
  },
  liquidity_fragmentation: {
    title: 'Liquidity fragmentation heuristic',
    description:
      'Pairs breadth of counterparties against activity cadence to approximate execution fragmentation when liquidity narrows.',
  },
  market_wide_drawdown: {
    title: 'Correlated drawdown heuristic (≈15%)',
    description:
      'Models synchronized softness across modeled risk proxies using volatility share and concentration amplification.',
  },
}

export const PRIME_SCENARIO_IDS = Object.freeze(Object.keys(SCENARIO_CATALOG))

/** Explorer tier sandbox — fixed pair for acquisition funnel. */
export const EXPLORER_SCENARIO_IDS = ['eth_shock_minus_20', 'stablecoin_depeg']

/**
 * @param {Partial<ScenarioInputs>} signalsRaw
 * @param {string} scenarioId
 * @returns {{ scenarioId:string, title:string, band:'LOW_RELATIVE_IMPACT'|'MODERATE'|'HIGH', impactPoints:number, rationale:string, disclaimers:string[] }}
 */
export function simulateScenarioAgainstSignals(signalsRaw, scenarioId) {
  const meta = SCENARIO_CATALOG[scenarioId]
  if (!meta) {
    throw new Error('scenario_unknown')
  }

  /** @type {ScenarioInputs} */
  const signals = {
    topTokenSharePct: Number(signalsRaw?.topTokenSharePct) || 0,
    volatileSharePct: Number(signalsRaw?.volatileSharePct) || 0,
    transferCount: Number(signalsRaw?.transferCount) || 0,
    uniqueCounterparties: Number(signalsRaw?.uniqueCounterparties) || 0,
  }

  const concentrationShare = clamp(signals.topTokenSharePct / 100, 0, 1)
  const volatilityShare = clamp(signals.volatileSharePct / 100, 0, 1)
  const breadth =
    signals.transferCount > 0 ? signals.uniqueCounterparties / Math.max(1, signals.transferCount) : 0

  const routingDensity = clamp(signals.uniqueCounterparties / 72, 0, 1)
  const activityHeat = clamp(signals.transferCount / 140, 0, 1)

  /** @type {number} */
  let impactBand = 0

  switch (scenarioId) {
    case 'eth_shock_minus_20': {
      impactBand =
        12 + volatilityShare * 52 + concentrationShare * 32 + breadth * (signals.uniqueCounterparties >= 34 ? 7 : 3)
      break
    }
    case 'stablecoin_depeg': {
      const stableShareGuess = clamp(1 - volatilityShare * 1.06, 0, 1)
      impactBand = 10 + stableShareGuess * 33 + concentrationShare * 26 + breadth * (activityHeat >= 0.42 ? 5 : 0)
      break
    }
    case 'protocol_exploit_surface': {
      impactBand = 11 + breadth * 48 + volatilityShare * 18 + routingDensity * 18
      break
    }
    case 'liquidity_fragmentation': {
      impactBand = 9 + breadth * 43 + activityHeat * 26 + volatilityShare * 12
      break
    }
    case 'market_wide_drawdown': {
      impactBand = 13 + volatilityShare * 44 + concentrationShare * 40 + breadth * (routingDensity >= 0.52 ? 7 : 0)
      break
    }
    default: {
      throw new Error('scenario_unknown')
    }
  }

  const impactPoints = Math.round(clamp(impactBand, 8, 88))

  /** @type {'LOW_RELATIVE_IMPACT'|'MODERATE'|'HIGH'} */
  let band = 'MODERATE'
  if (impactPoints <= 41) band = 'LOW_RELATIVE_IMPACT'
  else if (impactPoints >= 66) band = 'HIGH'

  const rationalePieces = [`${meta.title}.`, `${meta.description}`]
  rationalePieces.push(
    `Interpretation for this illustrative run: directional proxy exposure band is ${band.replaceAll('_', ' ')}.`,
  )

  return {
    scenarioId,
    title: meta.title,
    band,
    impactPoints,
    rationale: rationalePieces.join(' '),
    disclaimers: [
      'Synthetic scenario modeling for workflow intelligence — not valuation, suitability, execution, nor financial advice.',
      'Signals are proxies derived from limited public chain sampling; widen coverage progressively as infrastructure matures.',
    ],
  }
}
