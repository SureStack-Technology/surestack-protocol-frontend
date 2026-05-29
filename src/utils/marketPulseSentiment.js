/**
 * Client-side orientation only — uses Chainlink trail already loaded in the app (not a 24h exchange ticker).
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** % change vs oldest price in 24h window, else vs full available trail */
export function computeReferenceDeltaPct(history, quoteForUi) {
  if (!Array.isArray(history) || history.length < 2 || quoteForUi == null || !Number.isFinite(quoteForUi)) {
    return { pct: null, used24hWindow: false }
  }
  const now = Date.now()
  const inDay = history.filter((h) => h?.t >= now - DAY_MS && Number.isFinite(h?.p))
  const used24hWindow = inDay.length >= 2
  const series = used24hWindow ? inDay : history
  const first = series[0]?.p
  if (!Number.isFinite(first) || first <= 0) return { pct: null, used24hWindow: false }
  const pct = ((quoteForUi - first) / first) * 100
  return { pct: Number.isFinite(pct) ? pct : null, used24hWindow }
}

/** Intraday band % from recent tick rows (same feed) — volatility hint */
export function computeTrailVolBandPct(rows) {
  if (!rows?.length || rows.length < 2) return null
  const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n))
  if (prices.length < 2) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const mid = (min + max) / 2 || 1
  const band = ((max - min) / mid) * 100
  return Number.isFinite(band) && band > 0 ? band : null
}

const ELEVATED_VOL = 1.05

/**
 * @returns {{ headline: string, subtext: string, abbrev: string, badge: 'green'|'yellow'|'amber'|'red'|'purple'|'slate' }}
 */
export function classifyMarketPulse(pctChange, volBand) {
  const elevated = volBand != null && volBand >= ELEVATED_VOL

  if (pctChange == null) {
    if (elevated) {
      return {
        headline: 'Volatility Elevated',
        abbrev: 'VOL',
        subtext: 'Reference path is swinging in a wider band — orientation only.',
        badge: 'purple',
      }
    }
    return {
      headline: 'Neutral Consolidation',
      abbrev: 'BASE',
      subtext: 'Directional conviction still forming',
      badge: 'slate',
    }
  }

  if (pctChange > 4) {
    return {
      headline: 'Bullish Momentum',
      abbrev: 'BULL',
      subtext: 'ETH demand accelerating',
      badge: 'green',
    }
  }
  if (pctChange > 1) {
    return {
      headline: 'Positive Bias',
      abbrev: 'BIAS',
      subtext: 'Directional conviction still forming',
      badge: 'yellow',
    }
  }
  if (pctChange >= -1) {
    if (elevated) {
      return {
        headline: 'Volatility Elevated',
        abbrev: 'VOL',
        subtext: 'Range expanding while spot consolidates — watch execution risk.',
        badge: 'purple',
      }
    }
    return {
      headline: 'Neutral Consolidation',
      abbrev: 'BASE',
      subtext: 'Directional conviction still forming',
      badge: 'yellow',
    }
  }
  if (pctChange >= -4) {
    return {
      headline: 'Risk-Off',
      abbrev: 'RISK',
      subtext: 'Reference window leaning defensive — not a signal to trade.',
      badge: 'amber',
    }
  }
  return {
    headline: 'Bearish Pressure',
    abbrev: 'BEAR',
    subtext: 'Clearing softer on the reference window — stay size-aware.',
    badge: 'red',
  }
}

export function badgeClassForPulse(badge) {
  switch (badge) {
    case 'green':
      return 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
    case 'yellow':
      return 'border-amber-400/40 bg-amber-500/12 text-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.08)]'
    case 'amber':
      return 'border-orange-400/45 bg-orange-950/35 text-orange-100'
    case 'red':
      return 'border-rose-500/45 bg-rose-950/35 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.1)]'
    case 'purple':
      return 'border-violet-400/45 bg-violet-500/15 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.14)]'
    case 'slate':
      return 'border-slate-500/35 bg-slate-800/50 text-slate-200'
    default:
      return 'border-slate-500/35 bg-slate-800/50 text-slate-200'
  }
}

export function deltaTextClass(pct) {
  if (pct == null) return 'text-slate-500'
  if (pct > 1) return 'text-emerald-300/95'
  if (pct < -1) return 'text-rose-300/95'
  return 'text-slate-300'
}
