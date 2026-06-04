import NeuroGridBackground from '@components/visuals/NeuroGridBackground'
import DataFlowOverlay from '@components/visuals/DataFlowOverlay'
import RiskTicker from '@/components/ui/RiskTicker.jsx'
import { PrimeIntelligenceHeroProvider } from '@/contexts/PrimeIntelligenceHeroContext.jsx'
import SiteLegalFooter from '@/components/layout/SiteLegalFooter.jsx'
import '@/styles/public-premium.css'

export default function PublicMarketingShell({ children, showTicker = true }) {
  return (
    <div className="public-premium-shell text-foreground">
      <NeuroGridBackground />
      <DataFlowOverlay />
      <div className="public-premium-vignette" aria-hidden />
      {showTicker && (
        <PrimeIntelligenceHeroProvider>
          <div className="fixed inset-x-0 top-0 h-16 z-40">
            <RiskTicker />
          </div>
        </PrimeIntelligenceHeroProvider>
      )}
      <div className={`public-premium-content min-h-screen flex flex-col ${showTicker ? 'pt-16' : ''}`}>
        <div className="flex-1 flex flex-col w-full">{children}</div>
        <SiteLegalFooter variant="marketing" />
      </div>
    </div>
  )
}
