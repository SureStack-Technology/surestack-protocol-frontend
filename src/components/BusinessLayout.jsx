import { motion } from 'framer-motion'
import {
  BarChart3,
  FileText,
  Shield,
  Building2,
  Layers,
  Landmark,
  ListChecks,
  TrendingDown,
  FileCheck,
  FlaskConical,
  Package as PackageIcon,
} from 'lucide-react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useWeb3 } from '@contexts/Web3Context'
import { formatAddress } from '../utils/formatters.js'
import NeuroGridBackground from '@components/visuals/NeuroGridBackground'
import CanvasBackground from '@components/visuals/CanvasBackground'
import DataFlowOverlay from '@components/visuals/DataFlowOverlay'
import RiskTicker from '@components/ui/RiskTicker'
import { PrimeIntelligenceHeroProvider } from '@/contexts/PrimeIntelligenceHeroContext.jsx'
import { prefetchBusinessAll } from '@shared/prefetchBusiness'
import { useBusinessRole } from '@shared/hooks/useBusinessRole'
import { withTrace } from '../diagnostics/withTrace'
import Logo from '@/components/ui/Logo.jsx'

// Wrap NeuroGridBackground with tracing
const TNeuroGridBackground = withTrace(NeuroGridBackground, 'NeuroGridBackground')

export default function BusinessLayout() {
  const { pathname } = useLocation()
  const isBusinessDashboard = pathname === '/business'
  const {
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isSyncing,
  } = useWeb3()
  const { role, loading: roleLoading } = useBusinessRole()
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    if (!isConnected || isSyncing || hasPrefetchedRef.current) return
    hasPrefetchedRef.current = true

    const runPrefetch = async () => {
      try {
        await prefetchBusinessAll?.()
      } catch (err) {
        if (err?.code === -32005) {
          console.warn("Infura rate-limited: falling back to cached data")
        } else {
          console.warn("[BusinessLayout] Prefetch failed:", err)
        }
      }
    }

    runPrefetch()
  }, [isConnected, isSyncing])

  useEffect(() => {
    if (!isConnected) {
      hasPrefetchedRef.current = false
    }
  }, [isConnected])

  // Define all nav items with role requirements
  const allNavItems = [
    { label: 'Dashboard', icon: BarChart3, to: '/business', roles: ['Admin', 'Underwriter', 'Reinsurer', 'Auditor', 'DAO Member', 'Guest'] },
    { label: 'Policies', icon: FileText, to: '/business/policies', roles: ['Admin', 'Underwriter'] },
    { label: 'Claims', icon: Shield, to: '/business/claims', roles: ['Admin', 'Reinsurer'] },
    { label: 'Validators', icon: Building2, to: '/business/validators', roles: ['Admin', 'Underwriter'] },
    { label: 'Risk Pools', icon: Layers, to: '/business/risk-pools', roles: ['Admin', 'Reinsurer'] },
    { label: 'Underwriting', icon: TrendingDown, to: '/business/underwriting', roles: ['Admin', 'Underwriter'] },
    { label: 'Governance', icon: Landmark, to: '/business/governance', roles: ['Admin', 'Reinsurer', 'Auditor', 'DAO Member'] },
    { label: 'Proposals', icon: ListChecks, to: '/business/governance/proposals', roles: ['Admin', 'Reinsurer', 'Auditor', 'DAO Member'], indent: 1 },
  { label: 'Adjustments', icon: FlaskConical, to: '/business/adjustments', roles: ['Admin', 'Underwriter', 'Reinsurer', 'Auditor'] },
    { label: 'Stress Tests', icon: TrendingDown, to: '/business/stress-test', roles: ['Admin', 'Underwriter', 'Reinsurer'] },
    { label: 'Audit Trail', icon: FileCheck, to: '/business/audit', roles: ['Admin', 'Auditor'] },
  { label: 'Enterprise Solutions', icon: PackageIcon, to: '/business/enterprise', roles: ['Admin', 'Underwriter', 'Reinsurer', 'Auditor', 'DAO Member', 'Guest'] },
  ]

  // Filter nav items based on role
  const isBusinessMode = role === 'business'
  const filteredNav = allNavItems.filter(item =>
    isBusinessMode ? true : !item.roles || item.roles.includes(role)
  )

  // Log role-based menu rendering
  useEffect(() => {
    if (!roleLoading && role) {
      console.log(`[BusinessLayout] Rendering menu for role: ${role} (${filteredNav.length} items)`);
    }
  }, [role, roleLoading, filteredNav.length])

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background text-foreground">
      <TNeuroGridBackground />
      <CanvasBackground />
      <DataFlowOverlay />
      <div className="fixed inset-x-0 top-0 h-16 z-40">
        <PrimeIntelligenceHeroProvider>
          <RiskTicker />
        </PrimeIntelligenceHeroProvider>
      </div>
      <div className="relative z-20 flex min-h-screen">
        <motion.aside
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-64 bg-gradient-to-b from-[#0a0d1a] via-[#111a2e] to-[#080a12] p-4 flex flex-col justify-between shadow-2xl sticky top-[64px] h-[calc(100vh-64px)] border-r border-safe/20 backdrop-blur z-20"
        >
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Logo className="h-10" />
              <div>
                <h1 className="text-xl font-heading text-white tracking-tight">SureStack Business</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Enterprise Console
                </p>
              </div>
            </div>
            <nav className="space-y-2">
              {filteredNav.map(({ label, icon: Icon, to, indent = 0 }) => (
                <Link
                  key={label}
                  to={to}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-subheading uppercase tracking-[0.2em] ${
                    pathname === to
                      ? 'bg-safe/20 text-safe border border-safe/40 shadow-neon-safe'
                      : 'text-white/70 hover:bg-white/5 hover:text-safe border border-transparent'
                  }`}
                  style={indent ? { paddingLeft: 16 + indent * 14 } : undefined}
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
        <main className="flex-1 p-4 pt-[88px]">
          <header
            className="
        flex items-center justify-between
        px-4 py-4
        bg-void/70 backdrop-blur-lg
        border-b border-safe/20
        sticky top-[64px]
        h-20
        z-30 shadow-lg
      "
          >
            <div className="flex items-center gap-3">
              <Logo className="h-10" />
              <span className="text-xs text-[color:rgba(200,228,255,0.75)] uppercase tracking-[0.35em]">
                SureStack Institutional Suite
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[color:rgba(200,228,255,0.6)]">
                {roleLoading ? 'Resolving role…' : (role || 'Guest')}
              </span>
              {isSyncing && (
                <span className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-md animate-pulse">
                  Syncing protocol data…
                </span>
              )}
              {isConnected ? (
                <>
                  <span className="text-sm text-slate-200 font-mono">
                    {formatAddress(account)}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="btn-brand text-xs px-3 py-2"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="btn-brand text-xs px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </header>
          <div
            className={`flex-1 overflow-y-auto ${
              isBusinessDashboard ? 'px-0 pt-6 pb-10' : 'px-4 pt-6 pb-10'
            }`}
          >
            {isBusinessDashboard ? (
              <div className="w-full mt-6 space-y-6">
                <Outlet />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

