import { motion } from 'framer-motion'
import { ArrowRight, Megaphone, MessageCircle, Send } from 'lucide-react'
import {
  PRIME_BETA_APPROVAL_NOTE,
  PRIME_BETA_COMPLIANCE_NOTE,
  PRIME_BETA_EXPLORER_NOTE,
  PRIME_BETA_FLOW_STEPS,
  PRIME_BETA_ONBOARDING_SUMMARY,
  PRIME_BETA_SECTION_ID,
  TELEGRAM_COMMUNITY_URL,
  TELEGRAM_OFFICIAL_URL,
} from '@/constants/primeBetaTelegram.js'
import '@/styles/prime-beta-onboarding.css'

/**
 * Prime Intelligence Beta — Telegram-first onboarding (no billing integration).
 * @param {'full' | 'compact' | 'dashboard'} [variant]
 * @param {string} [className]
 * @param {boolean} [showExplorerNote]
 */
export default function PrimeBetaTelegramOnboarding({
  variant = 'full',
  className = '',
  showExplorerNote = true,
}) {
  const isCompact = variant === 'compact'
  const isDashboard = variant === 'dashboard'

  const shellClass = [
    'prime-beta-onboarding',
    isCompact ? 'prime-beta-onboarding--compact' : '',
    isDashboard ? 'prime-beta-onboarding--dashboard' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.section
      id={PRIME_BETA_SECTION_ID}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={shellClass}
      aria-labelledby="prime-beta-onboarding-title"
    >
      <div className="prime-beta-onboarding__glow" aria-hidden />

      <div className="prime-beta-onboarding__header">
        <p className="prime-beta-onboarding__eyebrow">
          <Send size={12} aria-hidden />
          Prime Intelligence Beta
        </p>
        <h2 id="prime-beta-onboarding-title" className="prime-beta-onboarding__title">
          Apply for Prime Beta
        </h2>
        {!isCompact ? (
          <p className="prime-beta-onboarding__summary">{PRIME_BETA_ONBOARDING_SUMMARY}</p>
        ) : (
          <p className="prime-beta-onboarding__summary prime-beta-onboarding__summary--compact">
            {PRIME_BETA_ONBOARDING_SUMMARY}
          </p>
        )}
      </div>

      {showExplorerNote ? (
        <div className="prime-beta-onboarding__notes">
          <p className="prime-beta-onboarding__note prime-beta-onboarding__note--explorer">{PRIME_BETA_EXPLORER_NOTE}</p>
          <p className="prime-beta-onboarding__note">{PRIME_BETA_APPROVAL_NOTE}</p>
        </div>
      ) : null}

      {!isCompact ? (
        <ol className="prime-beta-onboarding__flow" aria-label="Prime Beta onboarding flow">
          {PRIME_BETA_FLOW_STEPS.map((step, index) => (
            <li key={step.id} className="prime-beta-onboarding__flow-step">
              <span className="prime-beta-onboarding__flow-index">{index + 1}</span>
              <div className="prime-beta-onboarding__flow-copy">
                <p className="prime-beta-onboarding__flow-label">{step.label}</p>
                <p className="prime-beta-onboarding__flow-detail">{step.detail}</p>
              </div>
              {index < PRIME_BETA_FLOW_STEPS.length - 1 ? (
                <ArrowRight className="prime-beta-onboarding__flow-arrow" size={14} aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="prime-beta-onboarding__flow-inline">
          {PRIME_BETA_FLOW_STEPS.map((s) => s.label).join(' → ')}
        </p>
      )}

      <div className="prime-beta-onboarding__actions">
        <a
          href={TELEGRAM_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isDashboard
              ? 'explorer-btn-gradient prime-beta-onboarding__cta-primary'
              : 'public-cta-primary prime-beta-onboarding__cta-primary'
          }
        >
          <MessageCircle size={18} aria-hidden />
          Join Telegram Community
          <ArrowRight size={16} aria-hidden />
        </a>
        <a
          href={TELEGRAM_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isDashboard
              ? 'explorer-btn-outline prime-beta-onboarding__cta-secondary'
              : 'public-cta-secondary prime-beta-onboarding__cta-secondary'
          }
        >
          <Megaphone size={16} aria-hidden />
          View Official Announcements
        </a>
      </div>

      <p className="prime-beta-onboarding__compliance">{PRIME_BETA_COMPLIANCE_NOTE}</p>
    </motion.section>
  )
}
