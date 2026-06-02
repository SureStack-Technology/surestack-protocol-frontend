import { motion } from 'framer-motion'
import { Wallet, Activity, FileText, BarChart3, Landmark, TrendingDown, FileCheck } from 'lucide-react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'
import { formatAddress } from '../utils/formatters'
import NeuroGridBackground from './visuals/NeuroGridBackground'
import RiskTicker from './ui/RiskTicker'
import { PrimeIntelligenceHeroProvider } from '@/contexts/PrimeIntelligenceHeroContext.jsx'

const LOGO_SRC = '/assets/logo/surestack-logo.png'

export default function Layout() {
  const { pathname } = useLocation()
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3()

  const navItems = [
    { label: 'Dashboard', icon: Activity, to: '/' },
    { label: 'Policies', icon: FileText, to: '/policies' },
    { label: 'Claims', icon: Wallet, to: '/claims' },
    { label: 'Validators', icon: BarChart3, to: '/validators' },
    { label: 'Stress Test', icon: TrendingDown, to: '/stress-test' },
    { label: 'Governance', icon: Landmark, to: '/governance' },
    { label: 'Audit Trail', icon: FileCheck, to: '/audit' },
  ]

  return (
    <div className="flex min-h-screen bg-void text-foreground">
      <NeuroGridBackground />
      <PrimeIntelligenceHeroProvider>
        <RiskTicker />
      </PrimeIntelligenceHeroProvider>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 bg-gradient-to-b from-[#0a0d1a] via-[#111a2e] to-[#080a12] p-5 flex flex-col justify-between shadow-2xl sticky top-[56px] h-[calc(100vh-56px)] z-40 border-r border-safe/20 backdrop-blur"
      >
        <div className="pt-12">
          <div className="flex items-center gap-3 mb-10">
            <img src={LOGO_SRC} alt="SureStack" className="h-12 md:h-14 w-auto drop-shadow-[0_0_12px_rgba(0,255,240,0.45)]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              SureStack
            </h1>
          </div>
          <nav className="space-y-2">
            {navItems.map(({ label, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 font-subheading uppercase tracking-[0.25em] ${
                  pathname === to
                    ? 'bg-safe/20 text-safe border border-safe/40 shadow-neon-safe'
                    : 'text-white/70 hover:bg-safe/10 hover:text-safe border border-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="text-xs text-white/60">
          © {new Date().getFullYear()} SureStack Protocol
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-[56px]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-6 bg-void/70 border-b border-safe/25 backdrop-blur-lg sticky top-[56px] z-20 shadow-neon-safe/30">
          <h2 className="text-lg font-heading text-neon-cyan uppercase tracking-[0.3em]">
            SureStack Control Center
          </h2>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <span className="text-sm font-mono text-slate-200 bg-void/60 px-3 py-1.5 rounded-md border border-safe/20">
                  {formatAddress(account)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="btn-cyber text-sm px-4 py-2 rounded-md font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-cyber text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Main page content */}
        <main className="flex-1 px-6 pt-8 pb-6 overflow-y-auto animate-fade-in bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

