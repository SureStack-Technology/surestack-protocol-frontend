import { Link } from 'react-router-dom'
import {
  SITE_LEGAL_COPYRIGHT_LINE,
  SITE_LEGAL_DISCLAIMER_LINE,
  SITE_LEGAL_OPERATOR_PARAGRAPH,
} from '@/constants/siteLegalCopy.js'

/**
 * Global legal / operator footer. Variants tune background for marketing vs in-app shells.
 * @param {{ variant?: 'marketing' | 'console' | 'legacy' | 'enterprise', showLegalLinks?: boolean }} props
 */
export default function SiteLegalFooter({ variant = 'marketing', showLegalLinks = true }) {
  const shell =
    variant === 'marketing'
      ? 'border-t border-white/[0.08] bg-[rgba(4,10,22,0.55)] backdrop-blur-md'
      : variant === 'console'
        ? 'border-t border-indigo-500/15 bg-[rgba(3,8,18,0.92)]'
        : variant === 'enterprise'
          ? 'border-t border-safe/20 bg-void/90'
          : 'border-t border-white/10 bg-void/80'

  const text = variant === 'legacy' ? 'text-[10px] text-white/45' : 'text-[10px] sm:text-[11px] text-slate-500'

  return (
    <footer className={`${shell} mt-auto`} role="contentinfo">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
        <div className={`space-y-2.5 max-w-3xl ${text} leading-relaxed`}>
          <p className="text-slate-400 font-mono tracking-wide">{SITE_LEGAL_COPYRIGHT_LINE}</p>
          <p>{SITE_LEGAL_OPERATOR_PARAGRAPH}</p>
          <p className="text-slate-400">{SITE_LEGAL_DISCLAIMER_LINE}</p>
        </div>
        {showLegalLinks ? (
          <nav
            className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-[11px] text-slate-500"
            aria-label="Legal"
          >
            <Link to="/about" className="hover:text-slate-300 transition-colors">
              About
            </Link>
            <Link to="/legal/terms" className="hover:text-slate-300 transition-colors">
              Terms
            </Link>
            <Link to="/legal/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/legal/membership" className="hover:text-slate-300 transition-colors">
              Membership terms
            </Link>
            <Link to="/legal/founders-pass" className="hover:text-slate-300 transition-colors">
              Founders Pass terms
            </Link>
          </nav>
        ) : null}
      </div>
    </footer>
  )
}
