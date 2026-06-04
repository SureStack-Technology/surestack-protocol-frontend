/**
 * Portfolio Breakdown — explainability for Wallet Exposure metrics.
 */
export default function WalletExposurePortfolioBreakdown({ breakdown, profile }) {
  if (!breakdown) return null

  const pending = !breakdown.hasHoldings

  return (
    <div className="prime-wallet-portfolio">
      <div className="prime-wallet-portfolio__header">
        <h4 className="prime-wallet-portfolio__title">Portfolio Breakdown</h4>
        <p className="prime-wallet-portfolio__subtitle">
          Verify how Exposure Score, Concentration Risk, and Sector Risk were derived from observed
          holdings.
        </p>
      </div>

      {breakdown.valuationWarning ? (
        <div className="prime-wallet-portfolio__warning" role="status">
          {breakdown.valuationWarning}
        </div>
      ) : null}

      <div className="prime-wallet-portfolio__total">
        <p className="prime-wallet-portfolio__total-label">Total portfolio value (priced holdings)</p>
        <p className="prime-wallet-portfolio__total-value">{breakdown.totalPortfolioUsdDisplay}</p>
      </div>

      {pending ? (
        <p className="text-xs text-slate-500 leading-relaxed">
          Connect a wallet and refresh risk intelligence to populate ERC-20 balance breakdown. Approval-only
          data may still drive exposure bands when balances are unavailable.
        </p>
      ) : (
        <>
          <div className="prime-wallet-portfolio__concentration">
            <p className="prime-wallet-portfolio__section-label">Concentration driver</p>
            <p className="text-sm text-slate-200">
              {breakdown.concentrationAsset?.name || breakdown.concentrationAsset?.symbol || '—'}
              {breakdown.concentrationAsset?.symbol ? (
                <span className="text-slate-500 font-mono ml-2">({breakdown.concentrationAsset.symbol})</span>
              ) : null}
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {breakdown.concentrationAsset?.detail}
              {breakdown.concentrationAsset?.portfolioPct != null
                ? ` · ${Number(breakdown.concentrationAsset.portfolioPct).toFixed(2)}% of priced portfolio`
                : ''}
              {breakdown.concentrationAsset?.usdValue != null
                ? ` · ${breakdown.concentrationAsset.usdValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
                : ''}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-violet-300/80 mt-2">
              Concentration band: {breakdown.concentrationAsset?.drivesScore || profile?.assetConcentration || '—'}
            </p>
          </div>

          <div className="prime-wallet-portfolio__table-wrap">
            <p className="prime-wallet-portfolio__section-label">Top 10 holdings by USD value</p>
            <table className="prime-wallet-portfolio__table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Symbol</th>
                  <th>Category</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">USD</th>
                  <th>Price source</th>
                  <th className="text-right">Portfolio %</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.top10Holdings.length ? (
                  breakdown.top10Holdings.map((row) => (
                    <tr key={`${row.contract}-${row.symbol}`}>
                      <td>{row.asset}</td>
                      <td className="font-mono text-slate-300">{row.symbol}</td>
                      <td>{row.category}</td>
                      <td className="text-right font-mono tabular-nums">{row.quantityDisplay}</td>
                      <td className="text-right font-mono tabular-nums">{row.usdValueDisplay}</td>
                      <td className="text-xs text-slate-400">
                        {row.priceSourceDisplay || '—'}
                        {row.unitUsdDisplay ? (
                          <span className="block text-[10px] text-slate-600 font-mono">{row.unitUsdDisplay}</span>
                        ) : null}
                      </td>
                      <td className="text-right font-mono tabular-nums">{row.portfolioPctDisplay}</td>
                      <td>{row.riskCategory}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-slate-500">
                      No priced holdings in this refresh.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="prime-wallet-portfolio__sector">
            <p className="prime-wallet-portfolio__section-label">Sector mix (priced holdings)</p>
            <ul className="prime-wallet-portfolio__formula-list">
              {breakdown.sectorMix.map((row) => (
                <li key={row.key}>
                  <span className="font-mono text-violet-200/90">{row.label}</span>
                  <span className="text-slate-400 ml-2 tabular-nums">{row.pct.toFixed(2)}%</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{row.formula}</p>
                </li>
              ))}
            </ul>
          </div>

          {breakdown.excludedHoldings?.length ? (
            <div className="prime-wallet-portfolio__excluded">
              <p className="prime-wallet-portfolio__section-label">Excluded (no reliable price)</p>
              <ul className="space-y-1.5">
                {breakdown.excludedHoldings.map((row) => (
                  <li key={row.contract} className="text-xs text-slate-400">
                    <span className="text-slate-300">{row.asset}</span>
                    <span className="font-mono ml-2">{row.symbol}</span>
                    {row.coingeckoId ? (
                      <span className="text-slate-600 ml-1">· {row.coingeckoId}</span>
                    ) : null}
                    <span className="ml-2">· qty {row.quantityDisplay}</span>
                    {row.identityStatusDisplay ? (
                      <span className="block text-slate-500 mt-0.5">Identity: {row.identityStatusDisplay}</span>
                    ) : null}
                    {row.priceStatusDisplay ? (
                      <span className="block text-slate-500">Price: {row.priceStatusDisplay}</span>
                    ) : (
                      <span className="block text-slate-500 mt-0.5">{row.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="prime-wallet-portfolio__metrics">
            <p className="prime-wallet-portfolio__section-label">Metric explainability</p>
            <ul className="space-y-2">
              {breakdown.metricExplainers.map((m) => (
                <li key={m.metric} className="prime-wallet-portfolio__metric-row">
                  <p className="text-xs font-semibold text-slate-200">
                    {m.metric}: <span className="font-mono text-violet-200/90">{m.value}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{m.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
