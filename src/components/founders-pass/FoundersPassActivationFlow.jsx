import { motion } from 'framer-motion'
import { Check, Circle, ExternalLink, Loader2, Lock, ShieldCheck } from 'lucide-react'
import {
  FOUNDERS_TELEGRAM_INVITE_URL,
  SURESTACK_LAUNCH_POST_URL,
  SURESTACK_X_URL,
} from '@/constants/foundersPassActivation'

function StepShell({ step, title, children, complete, locked, accent = 'violet' }) {
  const border = complete
    ? 'border-emerald-500/35 bg-emerald-950/20 ring-1 ring-emerald-500/15'
    : locked
      ? 'border-white/8 bg-slate-950/30 opacity-75'
      : accent === 'amber'
        ? 'border-amber-500/25 bg-slate-950/45'
        : 'border-violet-500/20 bg-slate-950/50'

  return (
    <article className={`rounded-xl border p-5 sm:p-6 space-y-4 transition-colors ${border}`}>
      <motion.div className="flex items-start justify-between gap-3" layout>
        <motion.div className="space-y-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">{step}</p>
          <h3 className="text-sm sm:text-base font-heading text-white tracking-wide">{title}</h3>
        </motion.div>
        {complete ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-200">
            <Check size={12} aria-hidden />
            Complete
          </span>
        ) : locked ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/60 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
            <Lock size={11} aria-hidden />
            Locked
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-violet-200/90">
            In progress
          </span>
        )}
      </motion.div>
      {children}
    </article>
  )
}

function ExternalCta({ href, children }) {
  if (!href || href === '#') {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
        title="Launch post URL pending"
      >
        {children}
        <ExternalLink size={14} className="opacity-40" aria-hidden />
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-500/20 hover:border-violet-400/50 transition-colors"
    >
      {children}
      <ExternalLink size={14} aria-hidden />
    </a>
  )
}

function FieldInput({ value, onChange, disabled, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-lg border border-white/15 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 disabled:opacity-50"
      placeholder={placeholder}
    />
  )
}

function ActionButton({ busy, disabled, onClick, children, variant = 'outline' }) {
  const base =
    variant === 'brand'
      ? 'btn-brand w-full sm:w-auto px-5 py-2.5 text-sm disabled:opacity-50'
      : 'w-full sm:w-auto rounded-lg border border-white/20 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800/70 hover:border-violet-400/35 transition-colors disabled:opacity-50'
  return (
    <button type="button" disabled={disabled || busy} onClick={onClick} className={base}>
      {busy ? <Loader2 className="animate-spin mx-auto" size={16} /> : children}
    </button>
  )
}

export default function FoundersPassActivationFlow({
  progress,
  submitted,
  completedSteps,
  totalSteps,
  xInput,
  setXInput,
  engInput,
  setEngInput,
  tgInput,
  setTgInput,
  xBusy,
  engBusy,
  tgBusy,
  onSubmitX,
  onSubmitEngagement,
  onSubmitTelegram,
}) {
  const walletDone = Boolean(progress?.walletVerified)
  const xDone = Boolean(progress?.xFollowVerified)
  const engDone = Boolean(progress?.engagementVerified)
  const tgDone = Boolean(progress?.telegramVerified)
  const tgSubmitted = Boolean(submitted?.telegram)

  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-950/80 via-violet-950/30 to-slate-950/80 p-5 sm:p-6 space-y-4">
        <motion.div
          key={completedSteps}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-500">
            Founders Pass activation progress
          </p>
          <p className="text-lg font-heading text-white">
            <span className="text-emerald-300">{completedSteps}</span>
            <span className="text-slate-500 font-normal"> of </span>
            <span className="text-white">{totalSteps}</span>
            <span className="text-slate-400 font-normal text-base"> milestones completed</span>
          </p>
        </motion.div>
        <motion.div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </motion.div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
          {[
            ['Verified wallet identity', walletDone],
            ['Follow SureStack on X', xDone],
            ['Community engagement', engDone],
            ['Private founders access', tgDone],
          ].map(([label, done]) => (
            <li key={label} className="flex items-center gap-2">
              {done ? (
                <Check className="text-emerald-400 shrink-0" size={14} aria-hidden />
              ) : (
                <Circle className="text-slate-600 shrink-0" size={14} aria-hidden />
              )}
              <span className={done ? 'text-slate-300' : ''}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <StepShell step="Step 1" title="Verified wallet identity" complete={walletDone} locked={false}>
        <p className="text-sm text-slate-400 leading-relaxed">
          Your wallet is cryptographically linked to your SureStack account — the foundation for Founders Pass
          activation.
        </p>
        {walletDone ? (
          <p className="text-xs text-emerald-200/90 flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0" aria-hidden />
            Wallet identity verified
          </p>
        ) : (
          <p className="text-xs text-amber-200/90">Complete wallet verification in onboarding to unlock the next steps.</p>
        )}
      </StepShell>

      <StepShell step="Step 2" title="Follow SureStack on X" complete={xDone} locked={!walletDone} accent="amber">
        <p className="text-sm text-slate-400 leading-relaxed">
          Follow the official SureStack account to continue Founders Pass activation.
        </p>
        <ExternalCta href={walletDone ? SURESTACK_X_URL : undefined}>Open SureStack X</ExternalCta>
        {!xDone && walletDone ? (
          <motion.div layout className="space-y-3 pt-1 border-t border-white/10">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Your X handle
            </label>
            <FieldInput
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              disabled={xDone}
              placeholder="@yourhandle"
            />
            {submitted?.xFollow && !xDone ? (
              <p className="text-[11px] text-amber-200/85 font-mono">Submitted · pending verification</p>
            ) : null}
            <ActionButton busy={xBusy} disabled={xDone || !walletDone} onClick={onSubmitX}>
              Verify X Presence
            </ActionButton>
          </motion.div>
        ) : null}
      </StepShell>

      <StepShell step="Step 3" title="Community engagement" complete={engDone} locked={!walletDone} accent="amber">
        <p className="text-sm text-slate-400 leading-relaxed">
          Complete a qualifying X interaction (comment, repost, or launch engagement).
        </p>
        <ExternalCta href={walletDone ? SURESTACK_LAUNCH_POST_URL : undefined}>Open Launch Post</ExternalCta>
        {SURESTACK_LAUNCH_POST_URL === '#' ? (
          <p className="text-[10px] text-slate-600 font-mono">Launch post URL pending — team will publish shortly.</p>
        ) : null}
        {!engDone && walletDone ? (
          <motion.div layout className="space-y-3 pt-1 border-t border-white/10">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Proof URL
            </label>
            <FieldInput
              value={engInput}
              onChange={(e) => setEngInput(e.target.value)}
              disabled={engDone}
              placeholder="https://x.com/…"
              type="url"
            />
            {submitted?.engagement && !engDone ? (
              <p className="text-[11px] text-amber-200/85 font-mono">Submitted · pending verification</p>
            ) : null}
            <ActionButton busy={engBusy} disabled={engDone || !walletDone} onClick={onSubmitEngagement}>
              Submit Engagement Proof
            </ActionButton>
          </motion.div>
        ) : null}
      </StepShell>

      <StepShell step="Step 4" title="Private founders access" complete={tgDone} locked={!walletDone} accent="amber">
        <p className="text-sm text-slate-400 leading-relaxed">
          Enter your Telegram username for private founders community access verification.
        </p>

        {tgDone ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-4 py-3.5 space-y-3">
            <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
              <Check size={16} className="shrink-0" aria-hidden />
              Telegram access approved
            </p>
            {FOUNDERS_TELEGRAM_INVITE_URL ? (
              <a
                href={FOUNDERS_TELEGRAM_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:from-emerald-500 hover:to-violet-600 no-underline w-full sm:w-auto"
              >
                Join Private Founders Telegram
                <ExternalLink size={14} aria-hidden />
              </a>
            ) : (
              <p className="text-xs text-slate-400">
                Your private invite will be issued directly by the SureStack team.
              </p>
            )}
          </div>
        ) : tgSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3.5 space-y-2"
          >
            <p className="text-sm font-medium text-amber-100/95">Telegram access request received.</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your Founders Pass activation is under review. Private access will be issued upon approval.
            </p>
            {tgInput ? (
              <p className="text-xs font-mono text-slate-500 pt-1 border-t border-white/10">{tgInput}</p>
            ) : null}
          </motion.div>
        ) : walletDone ? (
          <motion.div layout className="space-y-3 pt-1 border-t border-white/10">
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Telegram username
            </label>
            <FieldInput
              value={tgInput}
              onChange={(e) => setTgInput(e.target.value)}
              disabled={tgDone}
              placeholder="@telegramhandle"
            />
            <ActionButton busy={tgBusy} disabled={tgDone || !walletDone} onClick={onSubmitTelegram} variant="brand">
              Request Telegram Access
            </ActionButton>
          </motion.div>
        ) : null}
      </StepShell>
    </div>
  )
}
