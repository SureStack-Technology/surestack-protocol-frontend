/**
 * Market Intelligence regime classification — BTC / ETH / XRP / total cap 24h (orientation only).
 * @typedef {'green'|'amber'|'red'|'purple'|'blue'} MacroOrbTone
 */

/**
 * @param {number|null|undefined} btc24
 * @param {number|null|undefined} eth24
 * @param {number|null|undefined} xrp24
 * @param {number|null|undefined} total24
 * @returns {{ headline: string, subtext: string, orb: MacroOrbTone, abbrev: string }}
 */
export function classifyMacroMarketPulse(btc24, eth24, xrp24, total24) {
  const b = Number(btc24)
  const e = Number(eth24)
  const x = Number(xrp24)
  const t = Number(total24)
  const series = [b, e, x, t].filter((n) => Number.isFinite(n))

  if (series.length < 3) {
    return {
      headline: 'Volatility Compression',
      subtext: 'Cross-asset tape still forming conviction',
      orb: 'amber',
      abbrev: 'VC',
    }
  }

  const maxAbs = Math.max(...series.map((n) => Math.abs(n)))
  const minChg = Math.min(...series)
  const maxChg = Math.max(...series)
  const spread = maxChg - minChg
  const avg = series.reduce((a, n) => a + n, 0) / series.length

  // Liquidity stress — broad drawdown with dispersion
  if (minChg <= -6 || (b <= -4.5 && e <= -4.5 && t <= -3)) {
    return {
      headline: 'Liquidity Stress',
      subtext: 'Forced de-risking across digital asset beta',
      orb: 'red',
      abbrev: 'LS',
    }
  }

  // Elevated risk — defensive but not full liquidation
  if (minChg <= -3.5 || (b < -2 && e < -2 && x < -2)) {
    return {
      headline: 'Elevated Risk Regime',
      subtext: 'Defensive positioning with uneven beta dispersion',
      orb: 'red',
      abbrev: 'ER',
    }
  }

  if (minChg <= -2 && avg < -0.5) {
    return {
      headline: 'Defensive Regime',
      subtext: 'Capital preserving stance across majors',
      orb: 'red',
      abbrev: 'DR',
    }
  }

  // Rapid repricing / dispersion
  if (spread >= 7.5 || maxAbs >= 8.5) {
    return {
      headline: 'Momentum Expansion',
      subtext: 'Rapid cross-asset repricing underway',
      orb: 'purple',
      abbrev: 'ME',
    }
  }

  // Risk-on broad rally
  if (b > 2.2 && e > 2.2 && t > 1.8 && minChg > -0.5) {
    return {
      headline: 'Risk-On Expansion',
      subtext: 'Beta participation broadening across majors',
      orb: 'green',
      abbrev: 'RO',
    }
  }

  if (avg > 1.2 && maxChg > 1.5 && minChg > -1.5) {
    return {
      headline: 'Momentum Expansion',
      subtext: 'Directional bid strengthening on majors',
      orb: 'green',
      abbrev: 'ME',
    }
  }

  if (Math.abs(b) < 0.7 && Math.abs(e) < 0.7 && Math.abs(x) < 0.9 && Math.abs(t) < 0.9 && spread < 1.4) {
    return {
      headline: 'Volatility Compression',
      subtext: 'Range-bound tape coiling for expansion',
      orb: 'amber',
      abbrev: 'VC',
    }
  }

  if (b > 1 && e > 1 && t > 0.25) {
    return {
      headline: 'Risk-On Expansion',
      subtext: 'Constructive drift across market beta',
      orb: 'blue',
      abbrev: 'RO',
    }
  }

  return {
    headline: 'Volatility Compression',
    subtext: 'Mixed signals — conviction still developing',
    orb: 'amber',
    abbrev: 'VC',
  }
}

export function macroOrbClass(orb) {
  switch (orb) {
    case 'green':
      return 'explorer-signal-orb explorer-signal-orb--green'
    case 'amber':
      return 'explorer-signal-orb explorer-signal-orb--amber'
    case 'red':
      return 'explorer-signal-orb explorer-signal-orb--red'
    case 'purple':
      return 'explorer-signal-orb explorer-signal-orb--purple'
    case 'blue':
      return 'explorer-signal-orb explorer-signal-orb--blue'
    default:
      return 'explorer-signal-orb explorer-signal-orb--amber'
  }
}

export function macroSignalChipClass(orb) {
  switch (orb) {
    case 'green':
      return 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100/95 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
    case 'amber':
      return 'border-amber-400/35 bg-amber-500/10 text-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.1)]'
    case 'red':
      return 'border-rose-500/40 bg-rose-950/35 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
    case 'purple':
      return 'border-violet-400/40 bg-violet-500/12 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.18)]'
    case 'blue':
      return 'border-sky-400/45 bg-sky-500/12 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.16)]'
    default:
      return 'border-slate-500/35 bg-slate-800/45 text-slate-200'
  }
}

export function formatMacroPct(p) {
  if (p == null || !Number.isFinite(Number(p))) return '—'
  const n = Number(p)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatMacroAssetUsd(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const x = Number(n)
  if (x >= 1e12) return `$${(x / 1e12).toFixed(2)}T`
  if (x >= 1e9) return `$${(x / 1e9).toFixed(2)}B`
  if (x >= 1e6) return `$${(x / 1e6).toFixed(2)}M`
  if (x >= 1000) return `$${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  if (x >= 1) return `$${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
  return `$${x.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
}

export function deltaToneClass(p) {
  if (p == null || !Number.isFinite(Number(p))) return 'text-slate-500'
  if (Number(p) > 0.05) return 'text-emerald-300/95'
  if (Number(p) < -0.05) return 'text-rose-300/95'
  return 'text-slate-300'
}

/**
 * Micro spark trend from 24h change (orientation only — no extra backend).
 * @param {number|null|undefined} change24h
 * @param {string} [symbol]
 */
export function macroMicroSparkTrend(change24h, symbol = '') {
  const pct = Number(change24h)
  const presets = {
    strongUp: '▄▅▇▇▆',
    up: '▅▆▅▇▆',
    flat: '█▆▇▅▆',
    down: '▇▆▅▄▅',
    strongDown: '▇▅▄▃▂',
  }
  let key = 'flat'
  if (Number.isFinite(pct)) {
    if (pct >= 3) key = 'strongUp'
    else if (pct >= 0.35) key = 'up'
    else if (pct <= -3) key = 'strongDown'
    else if (pct <= -0.35) key = 'down'
  }
  let out = presets[key]
  if (symbol) {
    const seed = [...String(symbol)].reduce((a, c) => a + c.charCodeAt(0), 0) % 3
    const variants = {
      BTC: ['█▆▇▅▆', '▅▇▆▅▇', '▆▇▅▆▅'],
      ETH: ['▄▅▇▆▅', '▅▇▆▄▅', '▇▅▆▅▄'],
      XRP: ['▅▆▅▇▆', '▆▅▇▅▆', '▅▇▆▅▄'],
    }
    const alt = variants[String(symbol).toUpperCase()]
    if (alt && key === 'flat') out = alt[seed] || out
  }
  return out
}
