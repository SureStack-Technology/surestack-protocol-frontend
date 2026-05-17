import { useDashboardProfile } from '@/hooks/useDashboardProfile'
import ModernIntelligenceDashboard from '@/components/dashboard/ModernIntelligenceDashboard.jsx'
import {
  getIntelligenceConsoleVariant,
  usesModernIntelligenceConsole,
} from '@/utils/dashboardPersonalization'

export default function Dashboard() {
  const { profile, loading: profileLoading, error: profileError, refetchProfile } = useDashboardProfile()

  if (profileLoading) {
    return (
      <section className="relative z-0 pointer-events-auto space-y-10 pt-8 min-h-screen text-white">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400 font-mono">
          Loading console…
        </div>
      </section>
    )
  }

  if (usesModernIntelligenceConsole(profile, profileLoading, profileError)) {
    const variant = getIntelligenceConsoleVariant(profile)
    return (
      <ModernIntelligenceDashboard
        variant={variant}
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        refetchProfile={refetchProfile}
      />
    )
  }

  return (
    <section className="relative z-0 pointer-events-auto space-y-10 pt-8 min-h-screen text-white">
      <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400 max-w-xl leading-relaxed">
        Your account tier is not mapped to the intelligence console. Open{' '}
        <a href="/membership" className="text-sky-300 underline">
          Membership
        </a>{' '}
        to review available intelligence tiers.
      </div>
    </section>
  )
}
