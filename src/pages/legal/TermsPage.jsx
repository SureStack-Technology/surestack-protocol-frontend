import LegalStubPage from '@/pages/legal/LegalStubPage.jsx'

export default function TermsPage() {
  return (
    <LegalStubPage title="Terms of Service">
      <p>
        These Terms of Service govern access to and use of SureStack Protocol surfaces, including marketing pages and the
        intelligence console where available. Additional product-specific terms may apply to membership, waitlists, or
        institutional programs.
      </p>
      <p>
        SureStack provides digital asset intelligence, analytics, and risk awareness tooling. Nothing in these terms grants
        insurance coverage, investment advice, or custody of your digital assets.
      </p>
      <p className="text-xs text-slate-500">
        A fuller legal document may be published here as the product matures. For questions, contact your SureStack
        relationship contact or the address published on the Enterprise page.
      </p>
    </LegalStubPage>
  )
}
