/**
 * Premium SVG momentum wave for Market Pulse signal row (CSS-only motion).
 * Presentational only — map `state` (headline) to wave shape; `color` matches orb tone.
 */

const HEADLINE_TO_PRESET = {
  'Defensive Regime': 'riskOff',
  'Momentum Expansion': 'momentum',
  'Volatility Compression': 'compression',
  'Elevated Risk Regime': 'pressure',
  'Risk-On Expansion': 'riskOn',
  'Liquidity Stress': 'riskOff',
  'MOMENTUM BUILDING': 'momentum',
  'RISK-ON': 'riskOn',
  'SIGNAL STABLE': 'stable',
  'COMPRESSION PHASE': 'compression',
  'RISK-OFF': 'riskOff',
  'PRESSURE BUILDING': 'pressure',
  'PRICE DISCOVERY': 'discovery',
  'BREAKOUT WATCH': 'breakout',
}

/** @type {Record<string, string>} */
const WAVE_PATH = {
  momentum: 'M0,27 Q40,25 68,14 T132,6 L160,4',
  riskOn: 'M0,30 Q36,24 72,12 T132,3 L160,2',
  stable: 'M0,21 Q28,18 56,21 T112,19 T160,21',
  compression: 'M0,21.5 Q26,20.5 52,22 T104,20.5 T156,21.5 L160,21',
  riskOff: 'M0,11 Q48,16 96,24 T160,29',
  pressure: 'M0,7 L44,15 L88,24 L132,29 L160,31',
  discovery:
    'M0,19 L14,26 L26,11 L40,24 L54,13 L68,24 L82,10 L96,25 L110,14 L124,24 L138,12 L152,22 L160,17',
  breakout: 'M0,25 Q38,23 76,14 T140,5 L160,3',
}

const ORB_TO_COLOR_CLASS = {
  green: 'signal-wave-green',
  amber: 'signal-wave-amber',
  red: 'signal-wave-red',
  purple: 'signal-wave-purple',
  blue: 'signal-wave-blue',
}

/**
 * @param {{
 *   state: string
 *   color?: string
 *   intensity?: 'low' | 'medium' | 'high'
 *   className?: string
 * }} props
 */
export default function SignalWave({ state, color, intensity = 'medium', className = '' }) {
  const preset = HEADLINE_TO_PRESET[state] ?? 'stable'
  const d = WAVE_PATH[preset] ?? WAVE_PATH.stable
  const colorClass = ORB_TO_COLOR_CLASS[color] ?? 'signal-wave-amber'
  const intClass =
    intensity === 'high' ? 'signal-wave--int-high' : intensity === 'low' ? 'signal-wave--int-low' : ''

  const root = ['signal-wave', colorClass, `signal-wave--${preset}`, intClass, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={root} aria-hidden>
      <svg className="signal-wave__svg" viewBox="0 0 160 32" preserveAspectRatio="xMidYMid meet">
        <g className="signal-wave__motion">
          <path
            className="signal-wave__glow"
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="signal-wave__stroke"
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}
