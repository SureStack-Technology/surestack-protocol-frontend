import TokenIcon from "@components/ui/TokenIcon.jsx";

export default function VAFBreakdown({
  premium = 25,
  rate = 0.5,
  explanation = "VAF is a small stability fee applied only in periods of extreme volatility to keep your protection sustainable.",
}) {
  const adjustment = premium * (rate / 100);
  const total = premium + adjustment;

  return (
    <div className="glass-card p-6 space-y-4">
      <header>
        <h2 className="text-xl font-heading text-[var(--primary-cyan)]">Monthly Billing</h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          The volatility adjustment keeps SureStack ready to honour claims even when markets are shaky.
        </p>
      </header>

      <table className="w-full text-sm text-[color:rgba(200,228,255,0.8)]">
        <tbody>
          <tr className="border-b border-[rgba(6,87,180,0.2)]">
            <td className="py-2">Coverage Premium</td>
            <td className="py-2 text-right">${premium.toFixed(2)}</td>
          </tr>
          <tr className="border-b border-[rgba(6,87,180,0.2)]">
            <td className="py-2">
              VAF Adjustment
              <span className="ml-2 text-xs text-[color:rgba(200,228,255,0.6)]">
                ({rate.toFixed(2)}%)
              </span>
            </td>
            <td className="py-2 text-right">${adjustment.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="py-2 font-semibold text-[var(--primary-cyan)]">Total</td>
            <td className="py-2 text-right font-semibold text-[var(--primary-cyan)]">
              ${total.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="glass-panel p-4 rounded-lg text-xs text-[color:rgba(200,228,255,0.75)]">
        <p>{explanation}</p>
        <p className="mt-2 text-[color:rgba(200,228,255,0.6)]">
          Once volatility cools down the adjustment automatically drops back to 0%.
        </p>
      </div>

      <div className="glass-panel p-4 rounded-lg text-xs text-[color:rgba(200,228,255,0.75)]">
        <h3 className="text-sm font-semibold text-[var(--primary-cyan)] mb-2">
          Behind the scenes
        </h3>
        <ul className="space-y-1">
          <li>• 60% bolsters the SureStack risk pool ready to pay claims.</li>
          <li>• 20% purchases reinsurance against catastrophic losses.</li>
          <li>• 20% funds continuous improvements to your protection.</li>
        </ul>
      </div>
    </div>
  );
}

