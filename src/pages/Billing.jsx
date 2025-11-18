import VAFBreakdown from "../user-app/billing/VAFBreakdown.jsx";
import RevenueExplainer from "../user-app/components/RevenueExplainer.jsx";

const vafBands = [
  { range: "20-30% volatility", rate: "0.25%" },
  { range: "30-50% volatility", rate: "0.50%" },
  { range: "50-100% volatility", rate: "0.75%" },
  { range: "100%+ volatility", rate: "1.00% cap" },
];

export default function Billing() {
  return (
    <div className="space-y-6 text-[color:rgba(200,228,255,0.85)]">
      <header className="glass-card p-6 space-y-3">
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-[0.24em]">
          Billing Overview
        </h1>
        <p className="text-sm text-[color:rgba(200,228,255,0.72)] max-w-3xl">
          Track how your subscription premium and the Volatility Adjustment Fee (VAF) combine to provide continuous protection. The VAF only appears when markets spike, ensuring the SureStack pool remains solvent.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <VAFBreakdown premium={25} rate={0.5} />
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-2xl font-heading text-white">Volatility Adjustment Fee Summary</h2>
          <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
            Premium + VAF = Total monthly. When volatility normalises, the adjustment resets to 0% without any action required from you.
          </p>
          <ul className="list-disc list-inside text-sm space-y-2 text-[color:rgba(200,228,255,0.75)]">
            <li>Applied only when the SureStack volatility index breaches stability thresholds.</li>
            <li>Scaled between 0.25% and 1.00% depending on 30-day realised volatility.</li>
            <li>Protects the shared pool against sudden liquidity drains so claims can be honoured instantly.</li>
          </ul>
          <div className="glass-panel p-4 rounded-lg text-xs text-[color:rgba(200,228,255,0.75)]">
            <p className="font-semibold text-[color:rgba(0,255,240,0.85)] uppercase tracking-[0.26em] mb-2">
              Actuarial Formula
            </p>
            <p className="font-mono text-[color:rgba(200,228,255,0.85)]">
              VAF = P x ((sigma30 - sigmaBase) / sigmaBase)<span className="text-[color:rgba(200,228,255,0.5)]">+</span> x k
            </p>
            <p className="mt-2 text-[color:rgba(200,228,255,0.65)]">
              P is your base premium, sigma values track rolling 30-day volatility versus the stability baseline, and k is the capital buffer coefficient.
            </p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-2xl font-heading text-white">VAF Tier Table</h2>
          <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
            SureStack publishes the current VAF tier inside your dashboard. The ranges demonstrate how the adjustment scales with market turbulence.
          </p>
          <table className="w-full text-sm text-[color:rgba(200,228,255,0.8)]">
            <thead>
              <tr className="border-b border-[rgba(6,87,180,0.2)] text-left">
                <th className="py-2">30-day Volatility Window</th>
                <th className="py-2 text-right">VAF Rate</th>
              </tr>
            </thead>
            <tbody>
              {vafBands.map((band) => (
                <tr key={band.range} className="border-b border-[rgba(6,87,180,0.12)] last:border-0">
                  <td className="py-2">{band.range}</td>
                  <td className="py-2 text-right">{band.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[color:rgba(200,228,255,0.6)] mt-4">
            Example: A $25 premium with a 0.75% VAF adds $0.19, taking the total monthly billing to $25.19.
          </p>
        </div>
        <RevenueExplainer />
      </section>
    </div>
  );
}

