import { motion } from 'framer-motion'
import { Wallet, Activity, FileText, BarChart3, Menu, X } from 'lucide-react'
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
import { useState } from 'react'
import '../styles/theme.css'
import '../styles/neurogrid.css'

export default function MainLayout() {
  const { pathname } = useLocation()
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting, isSyncing } = useWeb3()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useRiskPulse()

  const navItems = [
    { label: 'Dashboard', icon: Activity, to: '/' },
    { label: 'Policies', icon: FileText, to: '/policies' },
    { label: 'Claims', icon: Wallet, to: '/claims' },
    { label: 'Billing', icon: BarChart3, to: '/billing' },
  ]

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
          <div className="absolute top-6 right-6 z-40">
            <RpcChip />
          </div>
          <DevOverlay />
          <DevTelemetry />

          <div className="relative z-30 flex min-h-screen">
            <motion.aside
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`w-64 bg-gradient-to-b from-void via-slate-900/50 to-void p-5 flex flex-col justify-between shadow-2xl sticky top-[64px] h-[calc(100vh-64px)] border-r border-safe/20 pointer-events-auto ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              } fixed lg:relative transition-transform duration-300`}
            >
              <div className="pt-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <Logo className="h-12 md:h-14" />
                    <h1 className="text-2xl font-heading text-neon tracking-tight">
                      SureStack
                    </h1>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden text-slate-400 hover:text-safe"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map(({ label, icon: Icon, to }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={`sidebar-link flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 font-subheading ${pathname === to ? 'active' : ''} ${
                        pathname === to
                          ? 'bg-safe/20 text-safe border border-safe/50 shadow-neon-safe'
                          : 'text-slate-300 hover:bg-safe/10 hover:text-safe border border-transparent'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                © {new Date().getFullYear()} SureStack Protocol
              </div>
            </motion.aside>

            <div className="flex-1 flex flex-col overflow-hidden relative pt-[64px]">
              <header className="flex items-center justify-between px-4 py-3 bg-void/70 border-b border-safe/30 backdrop-blur-lg sticky top-0 z-20 shadow-lg pointer-events-auto h-16">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-slate-400 hover:text-safe"
                  >
                    <Menu size={24} />
                  </button>
                  <Logo className="h-10" />
                  <h2 className="text-lg font-heading text-neon uppercase tracking-wider">
                    SureStack Protocol
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  {isSyncing && (
                    <span className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-md animate-pulse">
                      Syncing protocol data…
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
        </div>
      </div>
    </div>
  )
}

console.log("%c🌌 SureStack Neon UI Fully Restored", "color:#00fff0;font-size:16px");

