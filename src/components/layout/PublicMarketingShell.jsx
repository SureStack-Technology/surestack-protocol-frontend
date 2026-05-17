import NeuroGridBackground from '@components/visuals/NeuroGridBackground'
import CanvasBackground from '@components/visuals/CanvasBackground'
import DataFlowOverlay from '@components/visuals/DataFlowOverlay'
import RiskTicker from '@/components/ui/RiskTicker.jsx'
import SiteLegalFooter from '@/components/layout/SiteLegalFooter.jsx'
import '@/styles/public-premium.css'

export default function PublicMarketingShell({ children, showTicker = true }) {
  return (
    <div className="public-premium-shell text-foreground">
      <NeuroGridBackground />
      <CanvasBackground />
      <DataFlowOverlay />
      <div className="public-premium-vignette" aria-hidden />
      {showTicker && (
        <div className="fixed inset-x-0 top-0 h-16 z-40">
          <RiskTicker />
        </div>
      )}
      <div className={`public-premium-content min-h-screen flex flex-col ${showTicker ? 'pt-16' : ''}`}>
        <div className="flex-1 flex flex-col w-full">{children}</div>
        <SiteLegalFooter variant="marketing" />
      </div>
    </div>
  )
}
