import LegalStubPage from '@/pages/legal/LegalStubPage.jsx'

export default function MembershipTermsPage() {
  return (
    <LegalStubPage title="Membership terms">
      <p>
        SureStack Intelligence membership and waitlist programs describe access to analytics, monitoring, and awareness
        features. Tiers and entitlements are product access descriptions, not insurance policies, investment contracts, or
        guarantees of financial return.
      </p>
      <p>
        Fees, renewals, and changes to tiers will be communicated in-product or by email where applicable. Continued use
        after notice may constitute acceptance of updated membership terms.
      </p>
      <p className="text-xs text-slate-500">
        Supplemental terms may be presented at checkout or in order flows when billing is enabled. This page establishes the
        Delaware operating entity for membership-related agreements.
      </p>
    </LegalStubPage>
  )
}
