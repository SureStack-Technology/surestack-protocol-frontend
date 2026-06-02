import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, BarChart3, Menu, X, Package as PackageIcon, UserCircle, LifeBuoy, LineChart, Shield, Sparkles } from 'lucide-react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context.jsx'
import { formatAddress } from '../utils/formatters.js'
import NeonParticles from '@/components/backgrounds/NeonParticles'
import NeuroGridOverlay from '@/components/backgrounds/NeuroGridOverlay'
import RiskTicker from '../components/ui/RiskTicker.jsx'
import DataFlowOverlay from '../components/visuals/DataFlowOverlay.jsx'
import RpcChip from '../components/ui/RpcChip.jsx'
import DevOverlay from '../components/ui/DevOverlay.jsx'
import DevTelemetry from '../components/ui/DevTelemetry.jsx'
import Logo from '@/components/ui/Logo.jsx'
import { useRiskPulse } from '../hooks/useRiskPulse.js'
import { DashboardProfileProvider, useDashboardProfile } from '@/hooks/useDashboardProfile'
import { PrimeIntelligenceHeroProvider } from '@/contexts/PrimeIntelligenceHeroContext.jsx'
import {
  shouldShowInfraDiagnostics,
  getConsoleExperienceLabels,
  getIntelligenceConsoleVariant,
  usesModernIntelligenceConsole,
} from '@/utils/dashboardPersonalization'
import { UserButton } from '@clerk/clerk-react'
import '../styles/theme.css'
import '../styles/neurogrid.css'
import '@/styles/public-premium.css'
import '@/styles/explorer-console.css'
import SiteLegalFooter from '@/components/layout/SiteLegalFooter.jsx'

export default function MainLayout() {
  return (
    <DashboardProfileProvider>
      <PrimeIntelligenceHeroProvider>
        <MainLayoutBody />
      </PrimeIntelligenceHeroProvider>
    </DashboardProfileProvider>
  )
}

function MainLayoutBody() {
  const location = useLocation()
  const { pathname, hash } = location
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting, isSyncing } = useWeb3()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, loading: profileLoading, error: profileError } = useDashboardProfile()
  const showInfra = shouldShowInfraDiagnostics(profile, profileLoading, profileError)
  const isLegacyProtocolRoute = pathname === '/legacy-protocol-console'
  const modernIntelligenceNav = usesModernIntelligenceConsole(profile, profileLoading, profileError) && !isLegacyProtocolRoute
  const intelligenceVariant = getIntelligenceConsoleVariant(profile ?? undefined)
  const consoleLabels = getConsoleExperienceLabels(profile ?? undefined)

  useRiskPulse()

  const legacyNavItems = [
    { label: 'Overview', icon: Activity, to: '/dashboard' },
    { label: 'Membership', icon: UserCircle, to: '/membership' },
    { label: 'Protection programs', icon: PackageIcon, to: '/programs' },
    { label: 'Incident support', icon: LifeBuoy, to: '/incident-support' },
    { label: 'Membership Fees', icon: BarChart3, to: '/billing' },
    { label: 'Protocol demo', icon: BarChart3, to: '/legacy-protocol-console' },
  ]

  const intelligenceNavItems = [
    { label: 'Overview', icon: Activity, to: '/dashboard', section: 'overview' },
    { label: 'Signal Flow', icon: LineChart, to: '/dashboard#explorer-market', section: 'market' },
    { label: 'Risk Engine', icon: Shield, to: '/dashboard#explorer-security', section: 'security' },
    { label: 'Membership', icon: UserCircle, to: '/membership', section: null },
    { label: 'Founders Pass', icon: Sparkles, to: '/founders-pass', section: null },
  ]

  const navItems = isLegacyProtocolRoute
    ? legacyNavItems
    : modernIntelligenceNav
      ? intelligenceNavItems
      : legacyNavItems.filter((i) => i.to !== '/legacy-protocol-console')

  const intelligenceNavIsActive = (item) => {
    if (!modernIntelligenceNav) return false
    if (item.section === 'overview') {
      return pathname === '/dashboard' && (!hash || hash === '' || hash === '#explorer-overview')
    }
    if (item.section === 'market') return pathname === '/dashboard' && hash === '#explorer-market'
    if (item.section === 'security') return pathname === '/dashboard' && hash === '#explorer-security'
    if (item.to.startsWith('/dashboard')) return false
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }

  const linkIsActive = (to) => pathname === to || pathname.startsWith(`${to}/`)

  const isNavItemActive = (item) => {
    if (modernIntelligenceNav && 'section' in item) {
      return intelligenceNavIsActive(item)
    }
    return linkIsActive(item.to)
  }

  const workspaceBadgeLabel =
    intelligenceVariant === 'prime'
      ? 'Prime Intelligence'
      : intelligenceVariant === 'atlas'
        ? 'Atlas Intelligence'
        : 'Explorer Intelligence'
  return (
    <div className="theme-shell">
      <div className="theme-canvas-layer pointer-events-none z-0">
        <NeonParticles />
      </div>
      <div className="theme-neuro-layer pointer-events-none z-10">
        <NeuroGridOverlay />
      </div>
      <div className="theme-overlay-layer pointer-events-none z-20">
        <DataFlowOverlay />
      </div>
      <div className="theme-content-layer">
        <div className="content-shell relative min-h-screen overflow-hidden z-50">
          <div className="fixed inset-x-0 top-0 z-40">
            <RiskTicker />
          </div>
          {showInfra ? (
            <div className="absolute top-6 right-6 z-40">
              <RpcChip />
            </div>
          ) : modernIntelligenceNav ? (
            <div className="absolute top-6 right-6 z-40 pointer-events-none">
              <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-200/90 backdrop-blur-sm">
                {workspaceBadgeLabel}
              </span>
            </div>
          ) : null}
          {showInfra ? <DevOverlay /> : null}
          {showInfra ? <DevTelemetry /> : null}

          <div className="relative z-30 flex flex-col min-h-screen">
            <div className="flex flex-1 min-h-0">
            <motion.aside
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`w-64 bg-gradient-to-b from-[#050a14] via-[#0a1224] to-[#04060c] p-5 flex flex-col justify-between shadow-2xl sticky top-[64px] h-[calc(100vh-64px)] border-r border-indigo-500/15 pointer-events-auto ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              } fixed lg:relative transition-transform duration-300`}
            >
              <div className="pt-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3.5">
                    <Logo className="h-[3.5rem] w-auto md:h-[3.75rem]" />
                    <div>
                      <h1 className="text-[1.35rem] md:text-2xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-white to-indigo-200 tracking-tight drop-shadow-[0_0_24px_rgba(59,130,246,0.2)]">
                        SureStack
                      </h1>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mt-0.5 leading-snug max-w-[14rem]">
                        {consoleLabels.sidebarSubtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden text-slate-400 hover:text-safe"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isNavItemActive(item)
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-subheading text-[13px] ${
                          active ? 'active' : ''
                        } ${
                          active
                            ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 text-sky-100 border border-sky-500/40 shadow-[0_0_28px_rgba(56,189,248,0.14)]'
                            : 'text-slate-300 hover:bg-white/[0.06] hover:text-white border border-transparent hover:border-white/[0.06]'
                        }`}
                      >
                        <Icon size={18} className={active ? 'text-sky-300' : 'text-slate-400'} />
                        <span className="leading-snug">{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </motion.aside>

            <div className="flex-1 flex flex-col overflow-hidden relative pt-[64px]">
              <header className="flex items-center justify-between px-5 sm:px-8 py-4 lg:py-4 bg-[rgba(4,10,22,0.82)] border-b border-indigo-500/20 backdrop-blur-xl sticky top-0 z-20 shadow-[0_12px_40px_rgba(0,0,0,0.45)] pointer-events-auto min-h-[4rem]">
                <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-slate-400 hover:text-sky-300 shrink-0 transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                  <Logo className="h-12 w-auto sm:h-14 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-base sm:text-lg font-heading text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 uppercase tracking-wider leading-tight truncate ${
                        modernIntelligenceNav ? 'lg:sr-only' : ''
                      }`}
                    >
                      SureStack
                    </span>
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
                      {consoleLabels.headerSubtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'h-9 w-9 border border-violet-500/40 ring-1 ring-white/10',
                      },
                    }}
                  />
                  {isSyncing && (
                    <span className="px-3 py-1 text-xs bg-amber-500/15 text-amber-100 border border-amber-500/35 rounded-md animate-pulse">
                      {modernIntelligenceNav ? 'Syncing console…' : 'Syncing protocol data…'}
                    </span>
                  )}
                  {isConnected ? (
                    <>
                      <span className="text-sm text-slate-300 font-mono">
                        {formatAddress(account)}
                      </span>
                      <button
                        onClick={disconnectWallet}
                        className="btn-cyber text-sm"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="btn-cyber text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? 'Connecting…' : isSyncing ? 'Syncing data…' : 'Connect Wallet'}
                    </button>
                  )}
                </div>
              </header>

              <main className="relative z-10 flex-1 px-6 pt-6 pb-6 overflow-y-auto animate-fade-in">
                <div className="max-w-7xl mx-auto w-full">
                  <Outlet />
                </div>
              </main>
            </div>

            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-void/80 backdrop-blur-sm z-10 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            </div>
            <SiteLegalFooter variant="console" />
          </div>
        </div>
      </div>
    </div>
  )
}

console.log("%c🌌 SureStack Neon UI Fully Restored", "color:#00fff0;font-size:16px");

