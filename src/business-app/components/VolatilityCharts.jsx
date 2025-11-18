import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  Legend,
} from "recharts";
import { compute30DayVolatility, SIGMA_BASE_DEFAULT } from "@shared/risk-engine/volatility/VAFEngine.js";

function buildVolatilitySeries(history = []) {
  if (!Array.isArray(history)) return [];

  const windowSize = 30;
  const dataset = [];
  for (let i = 0; i < history.length; i += 1) {
    const slice = history.slice(Math.max(i - windowSize, 0), i + 1);
    const sigma30 = slice.length >= 5 ? compute30DayVolatility(slice.map((entry) => entry.p ?? entry.price)) : 0;
    const point = history[i];
    const timestamp = point?.t ? new Date(point.t).toLocaleDateString() : `Index ${i}`;
    dataset.push({
      t: timestamp,
      price: point?.p ?? point?.price ?? 0,
      sigma30,
    });
  }
  return dataset.slice(-120);
}

export default function VolatilityCharts({ history = [], sigmaBase = SIGMA_BASE_DEFAULT }) {
  const [stressMode, setStressMode] = useState(false);

  const chartData = useMemo(() => {
    const base = buildVolatilitySeries(history);
    if (!stressMode) return base;

    // Stress mode: boost last few points to visualise extreme volatility
    return base.map((entry, index) => {
      if (index < base.length - 15) return entry;
      return {
        ...entry,
        sigma30: entry.sigma30 * 1.35,
      };
    });
  }, [history, stressMode]);

  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-4 space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-heading text-[var(--primary-cyan)]">
            Volatility Trends & Stress Tests
          </h3>
          <div className="w-16 h-1 bg-primary-cyan/30 rounded-full animate-pulse mt-1" />
          <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
            Monitoring σ30 against the actuarial baseline highlights periods that activate the VAF.
          </p>
        </div>
        <button
          type="button"
          className={`btn-magenta px-4 py-2 text-sm ${stressMode ? "" : "opacity-80"}`}
          onClick={() => setStressMode((prev) => !prev)}
        >
          {stressMode ? "Disable Stress Mode" : "Stress Test Volatility"}
        </button>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(6,87,180,0.18)" />
            <XAxis dataKey="t" tick={{ fill: "rgba(221,233,255,0.65)", fontSize: 10 }} />
            <YAxis
              yAxisId="price"
              tick={{ fill: "rgba(221,233,255,0.65)", fontSize: 10 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <YAxis
              yAxisId="vol"
              orientation="right"
              tick={{ fill: "rgba(221,233,255,0.65)", fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#101826",
                border: "1px solid rgba(6, 87, 180, 0.35)",
                borderRadius: "10px",
                color: "#E6F3FF",
              }}
              formatter={(value, name) =>
                name === "σ30"
                  ? [`${Number(value).toFixed(2)}%`, "σ30 (30d)"]
                  : [`$${Number(value).toFixed(2)}`, "ETH/USD"]
              }
            />
            <Legend />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="rgba(6, 87, 180, 0.9)"
              dot={false}
              name="ETH/USD Price"
              strokeWidth={2}
            />
            <Line
              yAxisId="vol"
              type="monotone"
              dataKey="sigma30"
              stroke="var(--primary-magenta)"
              dot={false}
              strokeWidth={2.2}
              name="σ30 Volatility"
            />
            {typeof sigmaBase === "number" && (
              <Line
                yAxisId="vol"
                type="monotone"
                dataKey={() => sigmaBase}
                stroke="rgba(0,255,240,0.45)"
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                name="σbase"
              />
            )}
            <Brush travellerWidth={10} height={18} y={240} fill="rgba(6,17,34,0.8)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm text-[color:rgba(200,228,255,0.75)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="glass-panel p-4"
        >
          <h4 className="text-sm font-semibold text-[var(--primary-cyan)] mb-1">
            Historical Spike Detection
          </h4>
          <p className="text-xs text-[color:rgba(200,228,255,0.6)]">
            Stress mode emulates cascading volatility spikes to test reserve ratios, ensuring the VAF
            keeps coverage sustainable during extreme market dislocations.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
          className="glass-panel p-4"
        >
          <h4 className="text-sm font-semibold text-[var(--primary-cyan)] mb-1">
            σ30 Monitoring
          </h4>
          <p className="text-xs text-[color:rgba(200,228,255,0.6)]">
            σ30 above σbase automatically escalates tiers, increasing the VAF until volatility cools.
            This chart lets underwriters review recent excursions and calibrate k accordingly.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

