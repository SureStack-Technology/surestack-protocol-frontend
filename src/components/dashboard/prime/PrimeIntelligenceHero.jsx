import { motion } from 'framer-motion'
import { Shield, TrendingUp } from 'lucide-react'
import { isLiveLunarCrushStatus } from '@/data/lunarCrushScenarioShowcase.js'
import { buildPrimeWalletSnapshot } from '@/components/dashboard/prime/primeWalletRiskSnapshot.js'

function cardToneClass(tone) {
  if (tone === 'fuchsia') return 'prime-hero-card prime-hero-card--fuchsia'
  if (tone === 'cyan') return 'prime-hero-card prime-hero-card--cyan'
  if (tone === 'violet') return 'prime-hero-card prime-hero-card--violet'
  return 'prime-hero-card prime-hero-card--indigo'
}

function buildLayerCards(walletSnapshot, primeTrends, watchlist, contractsUnderReview, hasWallet) {
  const lunarLive = isLiveLunarCrushStatus(primeTrends?.status)
  const birdeyeLive = watchlist?.status === 'live'

  return [
    {
      id: 'wallet',
      label: 'Wallet Risk',
      value: walletSnapshot.compact,
      status: walletSnapshot.hasWallet ? 'Live' : 'Pending',
      tone: 'indigo',
    },
    {
      id: 'contract',
      label: 'Contract Trust',
      value: !hasWallet
        ? 'Scanner ready'
        : contractsUnderReview > 0
          ? `${contractsUnderReview} under review`
          : 'Scanner clear',
      status: 'Live',
      tone: 'violet',
    },
    {
      id: 'narrative',
      label: 'Narrative Intelligence',
      value: lunarLive ? 'Live feed active' : 'Narrative Intelligence Active',
      status: lunarLive ? 'Live' : 'Model',
      tone: 'fuchsia',
    },
    {
      id: 'behavior',
      label: 'Behavior Intelligence',
      value: birdeyeLive ? 'Live feed active' : 'Behavior coverage pending',
      status: birdeyeLive ? 'Live' : 'Pending',
      tone: 'cyan',
    },
  ]
}

/**
 * Prime hero cockpit — four intelligence layers, institutional styling.
 */
export default function PrimeIntelligenceHero({
  walletSnapshot: walletSnapshotProp,
  primeTrends,
  watchlist,
  contractsUnderReview = 0,
  hasWallet = false,
}) {
  const walletSnapshot = walletSnapshotProp?.compact
    ? walletSnapshotProp
    : buildPrimeWalletSnapshot(walletSnapshotProp ?? {})

  const cards = buildLayerCards(walletSnapshot, primeTrends, watchlist, contractsUnderReview, hasWallet)

  return (
    <div className="prime-hero-minimal space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-300/90 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/25">
            <TrendingUp size={12} aria-hidden />
            Prime tier active
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">
            Pre-Interaction Digital Asset Risk Intelligence
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-[2.5rem] font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-violet-200 tracking-tight leading-[1.08]">
            Prime Intelligence Command Center
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-300/95 max-w-3xl leading-relaxed flex items-start gap-2">
            <Shield size={16} className="text-violet-300/80 shrink-0 mt-0.5" aria-hidden />
            Search-first risk intelligence before you sign, swap, or approve — wallet, contract, narrative, and
            behavior layers fused into one verdict.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="prime-hero-card-grid"
        aria-label="Intelligence cockpit layers"
      >
        {cards.map((card) => (
          <div key={card.id} className={cardToneClass(card.tone)}>
            <p className="prime-hero-card__label">{card.label}</p>
            <p className="prime-hero-card__value">{card.value}</p>
            <span className="prime-hero-card__status">{card.status}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
