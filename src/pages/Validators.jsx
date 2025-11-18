import { useEffect, useMemo, useRef, useState } from 'react'
import HolographicCard from '@components/ui/HolographicCard.jsx'
import TokenIcon from '@components/ui/TokenIcon.jsx'
import { useProtocolMetrics } from '@shared/hooks/useProtocolMetrics'
import { useLiveDashboardMetrics } from '@shared/hooks/useLiveDashboardMetrics'
import { useValidators } from '@/hooks/useValidators'
import { useValidatorActions } from '@/hooks/useValidatorActions'
import { formatAddress } from '@/utils/formatters'
import { toast } from 'react-hot-toast'
import { useWeb3 } from '@/contexts/Web3Context'

const tierMeta = [
  {
    label: 'Tier 3',
    title: 'Guardian Nodes',
    description: 'High credibility, deep capital guardians securing the network.',
    minStake: 100_000,
  },
  {
    label: 'Tier 2',
    title: 'Core Validators',
    description: 'Battle-tested operators with mid-range stake and consistent uptime.',
    minStake: 50_000,
  },
  {
    label: 'Tier 1',
    title: 'Entry Validators',
    description: 'New or smaller validators providing diversity and coverage.',
    minStake: 10_000,
  },
]

const tierColor = {
  'Tier 3': 'bg-[color:var(--surface-cyan-soft)] border border-safe text-[var(--primary-cyan)]',
  'Tier 2': 'bg-[color:var(--surface-cyan-soft)] border border-safe text-[var(--primary-cyan)]',
  'Tier 1': 'bg-[color:var(--surface-cyan-soft)] border border-safe text-[var(--primary-cyan)]',
  'Tier 0': 'bg-[color:var(--surface-cyan-soft)] border border-safe text-[var(--primary-cyan)]',
}

const statusColor = {
  active: 'bg-green-500/20 border border-green-400 text-green-200',
  inactive: 'bg-yellow-500/20 border border-yellow-400 text-yellow-200',
  slashed: 'bg-red-500/20 border border-red-400 text-red-200',
  pending: 'bg-slate-600/20 border border-slate-400 text-slate-200',
}

export default function Validators() {
  const protocol = useProtocolMetrics() || {}
  const live = useLiveDashboardMetrics() || {}
  const { loading: validatorsLoading, error, validators, totals, refreshValidators } = useValidators()
  const { stakeToValidator, unstakeFromValidator, withdrawUnstaked, activateValidator, refreshValidators: triggerRefresh } = useValidatorActions()
  const { account } = useWeb3()

  const stakingCardRef = useRef(null)
  const registryRef = useRef(null)

  const [selectedValidatorId, setSelectedValidatorId] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [stakeStatus, setStakeStatus] = useState('Waiting for input…')
  const [unstakeStatus, setUnstakeStatus] = useState('')
  const [withdrawStatus, setWithdrawStatus] = useState('')

  useEffect(() => {
    if (account && !selectedValidatorId) {
      setSelectedValidatorId(account)
    }
  }, [account, selectedValidatorId])

  const totalStaked = totals.totalStakeSST || protocol?.totalStaked || 0
  const totalValidators = totals.totalCount || protocol?.validators?.total || 0
  const activeValidators = totals.activeCount || protocol?.validators?.active || 0
  const inactiveValidators = totals.inactiveCount || Math.max(totalValidators - activeValidators, 0)
  const networkUptime = useMemo(() => {
    if (validators.length) {
      const sum = validators.reduce((acc, v) => acc + (v.uptime || 0), 0)
      return Math.min(100, Math.max(0, sum / validators.length))
    }
    return live?.uptime ?? 99.9
  }, [validators, live?.uptime])

  const networkHealth = useMemo(() => {
    const activeRatio = totalValidators > 0 ? (activeValidators / totalValidators) * 70 : 30
    const uptimeScore = (networkUptime || 0) * 0.3
    return Math.round(Math.min(100, activeRatio + uptimeScore))
  }, [activeValidators, totalValidators, networkUptime])

  const renderSST = (amount, options = {}) => {
    const {
      maximumFractionDigits = 0,
      iconClass = 'h-5 w-5',
      wrapperClass = '',
    } = options

    const formatted =
      typeof amount === 'number'
        ? amount.toLocaleString(undefined, { maximumFractionDigits })
        : amount

    return (
      <span className={`inline-flex items-center gap-2 ${wrapperClass}`.trim()}>
        <TokenIcon className={iconClass} />
        <span>{formatted} SST</span>
      </span>
    )
  }

  const tierGroups = useMemo(() => {
    return tierMeta.map((tier) => {
      const members = validators.filter((v) => v.tier === tier.label)
      const stake = members.reduce((acc, v) => acc + (v.stakeSST || 0), 0)
      return {
        ...tier,
        count: members.length,
        stake,
      }
    })
  }, [validators])

  useEffect(() => {
    console.log(
      "%c⚡ Validators Page (Option A) – stake-based tiers live",
      "color:#00fff0;font-weight:bold;"
    )
  }, [])

  const focusRow = (address) => {
    if (!address) return
    const normalized = address.toLowerCase()
    const row = document.getElementById(`validator-${normalized}`)
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const doRefresh = async (targetAddress) => {
    await triggerRefresh?.()
    const list = await refreshValidators?.(true)
    const focusAddress = targetAddress || account || list?.[0]?.address
    focusRow(focusAddress)
  }

  const handleStake = async () => {
    if (!stakeAmount) {
      setStakeStatus('Stake failed: enter amount')
      toast.error('Enter an amount before staking')
      return
    }

    setStakeStatus('Submitting transaction…')
    const target = selectedValidatorId || account || ''
    if (!selectedValidatorId && target) setSelectedValidatorId(target)
    const result = await stakeToValidator(target, Number(stakeAmount))
    if (result?.success) {
      setStakeStatus('Stake completed')
      toast.success('Stake updated')
      setStakeAmount('')
      await doRefresh(selectedValidatorId || account || '')
    } else {
      const reason = result?.error?.message || 'Unknown error'
      setStakeStatus(`Stake failed: ${reason}`)
      toast.error(`Stake failed: ${reason}`)
    }
  }

  const handleUnstake = async () => {
    if (!stakeAmount) {
      setUnstakeStatus('Unstake failed: enter amount')
      toast.error('Enter an amount to unstake')
      return
    }

    setUnstakeStatus('Submitting transaction…')
    const target = selectedValidatorId || account || ''
    if (!selectedValidatorId && target) setSelectedValidatorId(target)
    const result = await unstakeFromValidator(target, Number(stakeAmount))
    if (result?.success) {
      setUnstakeStatus('Unstake requested')
      toast.success('Stake updated')
      await doRefresh(selectedValidatorId || account || '')
    } else {
      const reason = result?.error?.message || 'Unknown error'
      setUnstakeStatus(`Unstake failed: ${reason}`)
      toast.error(`Unstake failed: ${reason}`)
    }
  }

  const scrollToStakeCard = () => {
    stakingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const preselectValidator = (validatorId) => {
    setSelectedValidatorId(validatorId)
    scrollToStakeCard()
  }

  const handleActivate = async (validatorId) => {
    const result = await activateValidator(validatorId)
    if (result?.success) {
      toast.success('Validator activated')
      await doRefresh(validatorId)
    } else {
      toast.error(result?.error?.message || 'Failed to activate validator')
    }
  }

  const handleWithdraw = async () => {
    setWithdrawStatus('Submitting withdrawal…')
    const result = await withdrawUnstaked()
    if (result?.success) {
      setWithdrawStatus('Withdrawal completed')
      toast.success('Stake updated')
      await doRefresh(account)
    } else {
      const reason = result?.error?.message || 'Unknown error'
      setWithdrawStatus(`Withdrawal failed: ${reason}`)
      toast.error(`Withdrawal failed: ${reason}`)
    }
  }

  return (
    <div className="p-6 glass-panel holo-card space-y-8 text-slate-100">
      <header className="space-y-3">
        <h1 className="text-3xl font-heading text-neon-cyan uppercase tracking-[0.35em]">
          Validators Overview
        </h1>
        <p className="text-slate-400 max-w-3xl font-mono text-sm">
          Monitor validator participation, stake depth, and uptime across the SureStack consensus layer. Tiers are computed directly from staked SST balances.
        </p>
        {error && (
          <p className="text-xs text-rose-400 font-mono">
            Validator data is temporarily unavailable; displaying cached or synthetic metrics.
          </p>
        )}
      </header>

      <section ref={stakingCardRef} className="glass-card p-6 border border-[rgba(0,255,240,0.35)] space-y-4">
        <h2 className="text-2xl font-heading text-neon-cyan uppercase tracking-[0.3em]">
          Stake into Validator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.25em] text-[color:rgba(200,228,255,0.7)]">Validator</label>
            <select
              value={selectedValidatorId}
              onChange={(e) => setSelectedValidatorId(e.target.value)}
              className="input-brand rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg-text)] bg-transparent"
            >
              <option value="">Select validator…</option>
              {validators.map((validator) => (
                <option key={validator.id} value={validator.id}>
                  {validator.name} ({validator.tier})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.25em] text-[color:rgba(200,228,255,0.7)]">SST Amount</label>
            <input
              type="number"
              min="0"
              step="100"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="input-brand rounded-lg px-3 py-2 text-sm font-mono text-[var(--fg-text)] bg-transparent"
              placeholder="10,000"
            />
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStake}
              className="btn-brand px-4 py-2 neon-button text-sm font-semibold"
            >
              Stake Now
            </button>
            <button
              onClick={handleUnstake}
              className="btn-magenta px-4 py-2 neon-button text-sm font-semibold transition"
            >
              Request Unstake
            </button>
            <button
              onClick={handleWithdraw}
              className="px-4 py-2 neon-button bg-green-500/20 hover:bg-green-500/30 border border-green-300/50 rounded-lg text-sm font-semibold text-green-200 transition"
            >
              Withdraw Unlocked SST
            </button>
            <p className="text-xs font-mono text-slate-400">{stakeStatus}</p>
            {unstakeStatus && (
              <p className="text-xs font-mono text-slate-500">{unstakeStatus}</p>
            )}
            {withdrawStatus && (
              <p className="text-xs font-mono text-slate-500">{withdrawStatus}</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HolographicCard
          title="Active Validators"
          value={validatorsLoading ? '…' : `${activeValidators.toLocaleString()} Validators`}
          subtitle="Currently attesting nodes"
          riskScore={activeValidators > 0 ? 25 : 70}
        />
        <HolographicCard
          title="Total Validators"
          value={validatorsLoading ? '…' : totalValidators.toLocaleString()}
          subtitle="Registered operators"
          riskScore={totalValidators > 0 ? 25 : 70}
        />
        <HolographicCard
          title="Stake Pool"
          value={
            validatorsLoading
              ? '…'
              : renderSST(Math.round(totalStaked), {
                  maximumFractionDigits: 0,
                  iconClass: 'h-7 w-7',
                  wrapperClass: 'items-center gap-3',
                })
          }
          subtitle="Total bonded capital"
          riskScore={Math.min(totalStaked / 1_000, 80)}
        />
        <HolographicCard
          title="Network Health"
          value={validatorsLoading ? '…' : `${networkHealth.toFixed(0)} / 100`}
          subtitle={`Avg uptime ${networkUptime.toFixed(1)}%`}
          riskScore={Math.max(10, 100 - networkHealth)}
        />
      </section>

      <section className="glass-card p-6 border border-[rgba(0,255,240,0.35)] space-y-6">
        <h2 className="text-2xl font-heading text-neon-pink uppercase tracking-[0.3em]">
          Stake Tiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tierGroups.map((tier) => (
            <div key={tier.label} className="glass-card p-5 border border-slate-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{tier.label}</p>
                  <h3 className="text-lg font-heading text-neon-soft">{tier.title}</h3>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-mono border ${tierColor[tier.label]} inline-flex items-center gap-2`}>
                  <span>≥</span>
                  {renderSST(tier.minStake, { maximumFractionDigits: 0, iconClass: 'h-4 w-4' })}
                </span>
              </div>
              <p className="text-slate-400 text-sm">{tier.description}</p>
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-slate-400">Validators</span>
                <span className="text-neon-cyan">{tier.count}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-slate-400">Total Stake</span>
                <span className="text-neon-yellow">
                  {renderSST(Math.round(tier.stake), { maximumFractionDigits: 0, iconClass: 'h-4 w-4', wrapperClass: 'text-neon-yellow' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section ref={registryRef} className="glass-card p-6 border border-[rgba(0,255,240,0.3)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading text-neon-cyan uppercase tracking-[0.3em]">
            Validator Registry
          </h2>
          {validatorsLoading && (
            <div className="flex items-center gap-2 text-neon-soft text-sm">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#00fff0] border-t-transparent"></span>
              Loading validator set…
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {validatorsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-neon-soft font-mono text-sm">
              <p>Streaming live validator data…</p>
            </div>
          ) : validators.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 font-mono">
              No validators registered yet. Once nodes stake at least 10,000 SST, they will appear here with their live tier and uptime.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-void/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Validator</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Stake (SST)</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Uptime</th>
                  <th className="px-4 py-3 text-left text-xs font-subheading uppercase tracking-[0.3em] text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {validators.map((validator) => (
                  <tr id={`validator-${validator.address.toLowerCase()}`} key={validator.id} className="hover:bg-void/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-heading text-white">{validator.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-400">{formatAddress(validator.address)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 text-xs rounded-full font-mono ${tierColor[validator.tier] || tierColor['Tier 0']}`}>
                        {validator.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-neon-yellow">
                      {renderSST(Math.round(validator.stakeSST), { maximumFractionDigits: 0, iconClass: 'h-4 w-4', wrapperClass: 'text-neon-yellow' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 text-xs rounded-full font-mono ${statusColor[validator.status] || statusColor.pending}`}>
                        {validator.status?.toUpperCase?.() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-neon-soft">
                      {validator.uptime != null ? `${validator.uptime.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono flex items-center gap-2">
                      <button
                        onClick={() => preselectValidator(validator.id)}
                      className="px-3 py-1 text-xs rounded-md bg-[rgba(0,102,255,0.18)] border border-[var(--glass-border)] text-[var(--primary-cyan)] hover:bg-[rgba(0,102,255,0.28)] transition"
                      >
                        Stake
                      </button>
                      <button
                        onClick={() => preselectValidator(validator.id)}
                        className="btn-magenta px-3 py-1 text-xs rounded-md transition"
                      >
                        Unstake
                      </button>
                      {validator.status !== 'active' && (
                        <button
                          onClick={() => handleActivate(validator.id)}
                          className="px-3 py-1 text-xs rounded-md bg-green-500/20 border border-green-400/40 text-green-200 hover:bg-green-500/30 transition"
                        >
                          Activate
                        </button>
                      )}
                      {validator.pendingUnstake > 0 && (
                        <button
                          onClick={() => {
                            setSelectedValidatorId(validator.id)
                            handleWithdraw()
                          }}
                          className="px-3 py-1 text-xs rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 transition"
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
