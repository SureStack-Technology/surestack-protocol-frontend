import LegalStubPage from '@/pages/legal/LegalStubPage.jsx'

export default function PrivacyPage() {
  return (
    <LegalStubPage title="Privacy Policy">
      <p>
        We collect and process information needed to operate accounts, authenticate sessions, and deliver digital asset risk
        intelligence — for example account identifiers, wallet addresses used for verification, telemetry needed for security,
        and communications you send us.
      </p>
      <p>
        Wallet connectivity and signature-based verification are used to authenticate and correlate intelligence with your
        account where you opt in; SureStack does not take custody of your assets through this flow.
      </p>
      <p className="text-xs text-slate-500">
        A detailed privacy policy with categories, retention, and rights may be linked or expanded here. This stub records
        the operating entity for downstream legal alignment.
      </p>
    </LegalStubPage>
  )
}
