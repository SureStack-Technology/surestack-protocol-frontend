import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { Web3Provider } from '@contexts/Web3Context'
import { SolanaWalletProvider } from '@/contexts/SolanaWalletContext.jsx'
import { SimulationProvider } from '@contexts/SimulationContext'
import MainLayout from '@/layouts/MainLayout'
import BusinessLayout from '@components/BusinessLayout'
import Dashboard from '@components/Dashboard'
import BusinessDashboard from '@components/business/BusinessDashboard'
import VAFModulePage from './business-app/pages/vaf/index.jsx'
import Billing from './pages/Billing.jsx'
import BusinessPoliciesPage from './business-app/pages/policies/index.jsx'
import BusinessClaimsPage from './business-app/pages/claims/index.jsx'
import BusinessGovernanceIndexPage from './business-app/pages/governance/BusinessGovernanceIndexPage.jsx'
import BusinessGovernanceProposalsPage from './business-app/pages/governance/BusinessGovernanceProposalsPage.jsx'
import BusinessGovernanceCreateProposalPage from './business-app/pages/governance/BusinessGovernanceCreateProposalPage.jsx'
import BusinessGovernanceProposalDetailPage from './business-app/pages/governance/BusinessGovernanceProposalDetailPage.jsx'
import BusinessStressTestPage from './business-app/pages/stress-test/index.jsx'
import BusinessAuditPage from './business-app/pages/audit/index.jsx'
import BusinessValidatorsPage from './business-app/pages/validators/index.jsx'
import RiskPoolsPage from './business-app/pages/risk-pools/index.jsx'
import UnderwritingPanel from '@components/business/UnderwritingPanel'
import EnterpriseCTA from './business-app/pages/enterprise/index.jsx'
import FoundersPass from './pages/FoundersPass.jsx'
import ProtectedRoute from '@/components/auth/ProtectedRoute.jsx'
import OnboardingGate from '@/components/auth/OnboardingGate.jsx'
import LandingPage from '@/pages/Landing.jsx'
import SignInPage from '@/pages/SignIn.jsx'
import SignUpPage from '@/pages/SignUp.jsx'
import AuthRedirectPage from '@/pages/AuthRedirect.jsx'
import OnboardingPage from '@/pages/Onboarding.jsx'
import PricingPage from '@/pages/Pricing.jsx'
import EnterprisePage from '@/pages/Enterprise.jsx'
import MembershipPage from '@/pages/Membership.jsx'
import AboutPage from '@/pages/About.jsx'
import TermsPage from '@/pages/legal/TermsPage.jsx'
import PrivacyPage from '@/pages/legal/PrivacyPage.jsx'
import MembershipTermsPage from '@/pages/legal/MembershipTermsPage.jsx'
import FoundersPassTermsPage from '@/pages/legal/FoundersPassTermsPage.jsx'

// 🧠 Diagnostic system imports
import { ErrorBoundary } from './diagnostics/ErrorBoundary'
import { installRuntimeProbe } from './diagnostics/runtimeProbe'
import { log } from './diagnostics/logger'
import { withTrace } from './diagnostics/withTrace'
import HealthCheck from './pages/HealthCheck'
import ParticleBackground from '@/components/ui/ParticleBackground.jsx'

// Wrap critical components with tracing
const TDashboard = withTrace(Dashboard, 'Dashboard')
const TBusinessDashboard = withTrace(BusinessDashboard, 'BusinessDashboard')
const TUnderwritingPanel = withTrace(UnderwritingPanel, 'UnderwritingPanel')
const TBusinessValidatorsPage = withTrace(BusinessValidatorsPage, 'BusinessValidatorsPage')
const TAdjustmentsPage = withTrace(VAFModulePage, 'BusinessAdjustments')
const TBilling = withTrace(Billing, 'Billing')
const TFoundersPass = withTrace(FoundersPass, 'FoundersPass')
const TBusinessPolicies = withTrace(BusinessPoliciesPage, 'BusinessPolicies')
const TBusinessClaims = withTrace(BusinessClaimsPage, 'BusinessClaims')
const TBusinessRiskPoolsPage = withTrace(RiskPoolsPage, 'BusinessRiskPoolsPage')
const TBusinessGovernanceIndexPage = withTrace(BusinessGovernanceIndexPage, 'BusinessGovernanceIndexPage')
const TBusinessGovernanceProposalsPage = withTrace(BusinessGovernanceProposalsPage, 'BusinessGovernanceProposalsPage')
const TBusinessGovernanceCreateProposalPage = withTrace(BusinessGovernanceCreateProposalPage, 'BusinessGovernanceCreateProposalPage')
const TBusinessGovernanceProposalDetailPage = withTrace(BusinessGovernanceProposalDetailPage, 'BusinessGovernanceProposalDetailPage')
const TBusinessStressTestPage = withTrace(BusinessStressTestPage, 'BusinessStressTestPage')
const TBusinessAuditPage = withTrace(BusinessAuditPage, 'BusinessAuditPage')
const TBusinessEnterprisePage = withTrace(EnterpriseCTA, 'BusinessEnterprisePage')
const TEnterprisePublic = withTrace(EnterprisePage, 'EnterprisePublic')
const TMembership = withTrace(MembershipPage, 'Membership')
function AppContent() {
  console.log('[BOOT] AppContent render START')

  // 🧠 Install runtime probe and log app mount
  /*
  useEffect(() => {
    installRuntimeProbe()
    log('App.Mounted', { route: window?.location?.pathname })
  }, [])
  */

  useEffect(() => {
    console.log('[BOOT] AppContent render END')
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('[BOOT TIMEOUT] UI took too long. Forcing minimal render.')
      document.body.classList.add('boot-timeout')
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  // Prefetch data in background for faster navigation
  /*
  useEffect(() => {
    // Delay prefetch slightly to not block initial render
    const timer = setTimeout(() => {
      prefetchAll().catch(err => {
        console.warn('[App] Prefetch failed:', err)
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [])
  */

  // Overlay tester utility - detects stray elements blocking navigation
  /*
  useEffect(() => {
    const detectOverlayIssues = () => {
      const allElements = document.querySelectorAll('*');
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportArea = viewportWidth * viewportHeight;
      const threshold = viewportArea * 0.9; // 90% of viewport

      const problematicElements = [];

      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const pointerEvents = style.pointerEvents;
        const position = style.position;
        const zIndex = parseInt(style.zIndex) || 0;

        // Check if element covers > 90% of viewport
        if (position === 'fixed' || position === 'absolute') {
          const rect = el.getBoundingClientRect();
          const elementArea = rect.width * rect.height;

          if (elementArea > threshold && pointerEvents === 'auto' && zIndex > 100) {
            // Check if it's not navigation or known safe elements
            const isNav = el.closest('nav, header, aside, [role="navigation"]');
            const isKnownSafe = el.classList.contains('chart-overlay') || 
                               el.classList.contains('recharts-wrapper') ||
                               el.closest('.recharts-wrapper');

            if (!isNav && !isKnownSafe) {
              problematicElements.push({
                element: el,
                area: elementArea,
                zIndex: zIndex,
                pointerEvents: pointerEvents,
              });
            }
          }
        }
      });

      if (problematicElements.length > 0) {
        console.warn('[Layout] Detected potentially problematic overlay elements:', problematicElements);
        problematicElements.forEach(({ element }) => {
          element.style.outline = '2px solid red';
          element.style.outlineOffset = '2px';
          setTimeout(() => {
            element.style.outline = '';
          }, 5000);
        });
      } else {
        console.log('[Layout] Navigation click test passed');
      }
    };

    // Run detection after initial render
    setTimeout(detectOverlayIssues, 1000);
    
    // Re-run on resize
    window.addEventListener('resize', detectOverlayIssues);
    
    return () => {
      window.removeEventListener('resize', detectOverlayIssues);
    };
  }, []);
  */

  // Check for missing environment variables at app level
  const missingVars = []
  const requiredVars = [
    'VITE_ORACLE_READER_ADDRESS',
    'VITE_POLICY_MANAGER_ADDRESS',
    'VITE_REWARD_POOL_ADDRESS',
    'VITE_CONSENSUS_STAKING_V2_ADDRESS',
    'VITE_DAO_GOVERNANCE_ADDRESS',
    'VITE_SURE_STACK_TOKEN_ADDRESS',
  ]
  
  requiredVars.forEach((varName) => {
    // Special handling for OracleReader - check both V1 and V2 env vars
    if (varName === 'VITE_ORACLE_READER_ADDRESS') {
      const hasOracle = import.meta.env.VITE_ORACLE_READER_ADDRESS || import.meta.env.VITE_ORACLE_READER_V2_ADDRESS
      if (!hasOracle || hasOracle === '0x0000000000000000000000000000000000000000') {
        missingVars.push(varName)
      }
    } else {
      if (!import.meta.env[varName] || import.meta.env[varName] === '0x0000000000000000000000000000000000000000') {
        missingVars.push(varName)
      }
    }
  })

  console.log('[BOOT] AppContent render RETURN')

  return (
    <>
      {missingVars.length > 0 && (
        <div className="glassmorphism border border-risk/40 text-risk px-6 py-4 mb-4 fixed top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-[520px] z-50 shadow-neon-safe">
          <p className="font-heading text-lg mb-2">Missing Environment Variables</p>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
            {missingVars.map((varName) => (
              <li key={varName}>{varName}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Update `.env.local` or `src/config/contracts.js` to load all SureStack addresses.
          </p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/enterprise" element={<TEnterprisePublic />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/legal/terms" element={<TermsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route path="/legal/membership" element={<MembershipTermsPage />} />
        <Route path="/legal/founders-pass" element={<FoundersPassTermsPage />} />
        <Route path="/founders-pass" element={<TFoundersPass />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/auth/redirect" element={<AuthRedirectPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<OnboardingGate />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<TDashboard />} />
              {/* Legacy protocol / insurance console paths — redirect to intelligence dashboard (internal demo: mount LegacyProtocolConsole manually if needed) */}
              <Route path="/legacy-protocol-console" element={<Navigate to="/dashboard" replace />} />
              <Route path="/programs" element={<Navigate to="/dashboard" replace />} />
              <Route path="/incident-support" element={<Navigate to="/dashboard" replace />} />
              <Route path="/policies" element={<Navigate to="/dashboard" replace />} />
              <Route path="/claims" element={<Navigate to="/dashboard" replace />} />
              <Route path="/membership" element={<TMembership />} />
              <Route path="/billing" element={<TBilling />} />
            </Route>
          </Route>
        </Route>

        <Route path="/business" element={<BusinessLayout />}>
          <Route index element={<TBusinessDashboard />} />
          <Route path="enterprise" element={<TBusinessEnterprisePage />} />
          <Route path="policies" element={<TBusinessPolicies />} />
          <Route path="claims" element={<TBusinessClaims />} />
          <Route path="validators" element={<TBusinessValidatorsPage />} />
          <Route path="risk-pools" element={<TBusinessRiskPoolsPage />} />
          <Route path="governance" element={<TBusinessGovernanceIndexPage />} />
          <Route path="governance/proposals" element={<TBusinessGovernanceProposalsPage />} />
          <Route path="governance/proposals/create" element={<TBusinessGovernanceCreateProposalPage />} />
          <Route path="governance/proposals/:proposalId" element={<TBusinessGovernanceProposalDetailPage />} />
          <Route path="adjustments" element={<TAdjustmentsPage />} />
          <Route path="stress-test" element={<TBusinessStressTestPage />} />
          <Route path="audit" element={<TBusinessAuditPage />} />
          <Route path="underwriting" element={<TUnderwritingPanel />} />
        </Route>

        <Route path="/health" element={<HealthCheck />} />
      </Routes>
    </>
  )
}

function App() {
  console.log('[SureStack] [Boot] Starting SureStack Protocol frontend...')

  useEffect(() => {
    const t = setTimeout(() => {
      console.warn('[BOOT] Timeout → forcing render')
      document.body.classList.add('boot-forced')
    }, 1000)

    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    console.log('%c🌌 SureStack Theme Restored', 'color:#00fff0;font-size:18px')
  }, [])

  return (
    <ErrorBoundary>
      <Web3Provider>
        <SolanaWalletProvider>
          <SimulationProvider>
            <Router>
              <ParticleBackground />
              <AppContent />
              <Toaster position="bottom-right" />
            </Router>
          </SimulationProvider>
        </SolanaWalletProvider>
      </Web3Provider>
    </ErrorBoundary>
  )
}

export default App
