import { useEffect, useState } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed";
import { useChainlinkOracle } from "@shared/hooks/useChainlinkOracle";
import { motion } from "framer-motion";

export default function RiskRadar({ simulatedRiskScore, simulatedPrice }) {
  const { price } = useEthUsdFeed();
  const oracle = useChainlinkOracle();
  const [riskScore, setRiskScore] = useState(0);
  const [volatility, setVolatility] = useState(0);
  const [heatData, setHeatData] = useState([]);
  
  const displayRiskScore = simulatedRiskScore !== undefined ? simulatedRiskScore : riskScore;
  const displayPrice = simulatedPrice !== undefined ? simulatedPrice : price ?? oracle?.price ?? 0;

  useEffect(() => {
    const vol = Math.max(0, Number(oracle?.volatility ?? 0));

    if (vol > 0) {
      setVolatility(vol);
      const risk = Math.min(vol * 20, 100);
      setRiskScore(Math.round(risk));
    } else {
      console.log('[RiskRadar] Contract volatility unavailable, using simulated data');
      const simulatedVol = 2.5 + Math.random() * 2;
      setVolatility(simulatedVol);
      const risk = Math.min(simulatedVol * 20, 100);
      setRiskScore(Math.round(risk));
    }

    const heat = Array.from({ length: 24 }, (_, i) => ({
      value: 30 + Math.sin(i / 2) * 20 + Math.random() * 10,
      fill: i < 8 ? '#00f5ff' : i < 16 ? '#ffb800' : '#ff2d55',
    }));
    setHeatData(heat);
  }, [oracle?.volatility, price]);

  const getRiskColor = (score) => {
    if (score >= 70) return '#ff2d55';
    if (score >= 40) return '#ffb800';
    return '#00f5ff';
  };

  const radarData = [
    { name: 'Risk', value: displayRiskScore, fill: getRiskColor(displayRiskScore) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="holo-card card-hoverable relative overflow-hidden p-6"
      style={{
        boxShadow: `0 0 30px ${getRiskColor(displayRiskScore)}30`,
        background: 'radial-gradient(circle at top, rgba(0,255,240,0.12), rgba(11,12,16,0.95))',
      }}
    >
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(0,255,240,0.22),transparent_65%)] blur-3xl opacity-70" />

      <div className="relative z-10">
        <h3 className="text-lg font-heading uppercase tracking-wider text-neon-cyan mb-4 drop-shadow">
          Risk Radar
        </h3>

        <div className="h-[300px] md:h-[400px] relative w-full">
          <div className="absolute inset-0 rounded-full border border-[rgba(0,255,240,0.25)] opacity-40 blur-[1px]" />
          <div className="absolute inset-6 rounded-full border border-[rgba(0,255,240,0.15)] opacity-30 blur-[1px]" />
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="60%"
              outerRadius="90%"
              data={radarData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                fill={getRiskColor(displayRiskScore)}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center risk score */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                key={displayRiskScore}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-4xl font-heading font-bold ${displayRiskScore >= 70 ? 'text-risk' : displayRiskScore >= 40 ? 'text-warning' : 'text-safe'}`}
                style={{
                  textShadow: `0 0 20px ${getRiskColor(displayRiskScore)}`,
                }}
              >
                {displayRiskScore}
              </motion.div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                RISK SCORE
              </div>
            </div>
          </div>
        </div>

        {/* Volatility heat indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>24h Volatility Heat</span>
            <span className="font-mono">{volatility.toFixed(2)}%</span>
          </div>
          <div className="h-2 bg-slate-900/70 rounded-full overflow-hidden flex gap-1">
            {heatData.slice(0, 12).map((item, i) => (
              <div
                key={i}
                className="flex-1 rounded"
                style={{
                  background: item.fill,
                  opacity: item.value / 100,
                  boxShadow: `0 0 4px ${item.fill}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Particle cracks on high risk */}
        {displayRiskScore >= 70 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-risk rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  boxShadow: `0 0 10px ${getRiskColor(displayRiskScore)}`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

