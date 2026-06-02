import { useEffect, useState } from "react";
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed";
import { useChainlinkOracle } from "@shared/hooks/useChainlinkOracle";
import { usePrimeIntelligenceHero } from "@/contexts/PrimeIntelligenceHeroContext.jsx";

export default function RiskTicker() {
  const { price, updatedAt } = useEthUsdFeed();
  const oracle = useChainlinkOracle();
  const { heroMetrics } = usePrimeIntelligenceHero();

  const [volatility, setVolatility] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [priceDelta, setPriceDelta] = useState(0);
  const [isSpike, setIsSpike] = useState(false);
  const [prevPrice, setPrevPrice] = useState(null);

  useEffect(() => {
    if (heroMetrics?.active) {
      setVolatility(heroMetrics.volatility);
      setRiskScore(heroMetrics.riskScore);
      return;
    }

    let timer;
    const vol = Math.max(0, Number(oracle?.volatility ?? 0));

    if (vol > 0) {
      setVolatility(vol);
      const risk = Math.min(vol * 20, 100);
      setRiskScore(Math.round(risk));

      if (vol > 5) {
        setIsSpike(true);
        timer = setTimeout(() => setIsSpike(false), 2000);
      }
    } else if (price && prevPrice !== null && prevPrice > 0) {
      const priceChange = Math.abs((price - prevPrice) / prevPrice) * 100;
      setVolatility(priceChange);
      const risk = Math.min(priceChange * 20, 100);
      setRiskScore(Math.round(risk));

      if (priceChange > 5) {
        setIsSpike(true);
        timer = setTimeout(() => setIsSpike(false), 2000);
      }
    } else {
      setVolatility(0);
      setRiskScore(0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [heroMetrics, oracle?.volatility, price, prevPrice]);

  useEffect(() => {
    if (price && prevPrice !== null) {
      const delta = ((price - prevPrice) / prevPrice) * 100;
      setPriceDelta(delta);
    }
    if (price != null) setPrevPrice(price);
  }, [price, prevPrice]);

  const displayPrice = price ?? oracle?.price ?? 0;
  const displayUpdatedAt = oracle?.updatedAt ? new Date(oracle.updatedAt * 1000) : updatedAt ? new Date(updatedAt) : null;

  const formatVol = (vol) => vol.toFixed(2);
  const formatPrice = (p) => p?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—";
  const formatDelta = (delta) => {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(2)}%`;
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b-2 backdrop-blur-lg transition-all duration-300 ${
        isSpike ? "bg-red-900/30 border-risk animate-pulse-risk" : "bg-void/90 border-slate-700"
      }`}
    >
      <div className="container mx-auto px-8 py-4">
        <div className="flex items-center justify-between text-sm font-mono">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 uppercase tracking-wider text-xs">VOL:</span>
              <span className={`font-bold text-base ${volatility > 5 ? "text-risk animate-pulse" : "text-safe"}`}>
                {formatVol(volatility)}%
              </span>
              {priceDelta !== 0 && (
                <span className={`text-xs ml-1 ${priceDelta >= 0 ? "text-neon-green" : "text-risk"}`}>
                  {priceDelta >= 0 ? "↑" : "↓"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-400 uppercase tracking-wider text-xs">RISK:</span>
              <span
                className={`font-bold text-base ${
                  riskScore >= 70 ? "text-risk" : riskScore >= 40 ? "text-warning" : "text-safe"
                }`}
              >
                {riskScore}
              </span>
              {heroMetrics?.riskBand ? (
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {heroMetrics.riskBand}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-400 uppercase tracking-wider text-xs">PRICE:</span>
              <span className="font-bold text-base text-neon-cyan">
                ${formatPrice(displayPrice)}
              </span>
              {priceDelta !== 0 && (
                <span className={`text-xs ml-2 ${priceDelta >= 0 ? "text-neon-green" : "text-risk"}`}>
                  {formatDelta(priceDelta)}
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {displayUpdatedAt ? displayUpdatedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

    </div>
  );
}

