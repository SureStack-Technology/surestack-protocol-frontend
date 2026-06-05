import { Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { ArrowRight } from 'lucide-react'
import Logo from '@/components/ui/Logo.jsx'
import { SURESTACK_INTELLIGENCE_NAV } from '@/constants/intelligenceTiers.js'

const userBtnAppearance = {
  elements: { avatarBox: 'h-9 w-9 border border-violet-500/35 ring-1 ring-white/5' },
}

export default function PublicMarketingHeader({ current = 'landing' }) {
  const { pathname } = useLocation()
  const consoleActive =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/incident-support')

  const navClass = (active) =>
    `public-nav-link ${active ? 'public-nav-link-active' : ''}`.trim()

  return (
    <header className="relative z-30 border-b border-white/[0.08] bg-[rgba(4,10,22,0.65)] backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 px-6 sm:px-8 py-5 sm:py-6">
        <Link to="/" className="flex items-center gap-4 sm:gap-5 group">
          <Logo className="h-12 w-auto sm:h-14" />
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(124,58,237,0.18)] group-hover:from-emerald-50 group-hover:via-white group-hover:to-slate-200 transition-all duration-300">
              SureStack
            </span>
            <span className="public-nav-muted hidden sm:block leading-tight mt-1.5">
              Digital Asset Risk Intelligence
            </span>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm justify-end">
          <Link to="/pricing" className={navClass(current === 'pricing' || current === 'intelligence')}>
            {SURESTACK_INTELLIGENCE_NAV}
          </Link>
          <Link to="/founders-pass" className={navClass(current === 'founders')}>
            Founders Pass
          </Link>
          <Link to="/about" className={navClass(current === 'about')}>
            About
          </Link>
          <span className="hidden sm:inline w-px h-5 bg-white/15 mx-1.5 shrink-0" aria-hidden />
          <SignedOut>
            <Link to="/sign-in" className={navClass(false)}>
              Sign in
            </Link>
            <Link to="/sign-up" className="public-nav-cta-signup ml-1.5">
              Start Explorer Access
              <ArrowRight size={14} className="opacity-90" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className={navClass(consoleActive)}>
              Console
            </Link>
            <span className="ml-2 inline-flex">
              <UserButton afterSignOutUrl="/" appearance={userBtnAppearance} />
            </span>
          </SignedIn>
        </nav>
      </div>
    </header>
  )
}
