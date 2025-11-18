import { useEffect } from "react"
import { motion } from "framer-motion"
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { SiChainlink } from "react-icons/si"

export default function OracleFeedPanel() {
  const { price, updatedAt, rows, error, isStreaming, connectionState } = useEthUsdFeed()

  useEffect(() => {
    const el = document.getElementById('oracle-panel')
    const fn = () => {
      if (el) {
        el.classList.add('pulse')
        setTimeout(() => el.classList.remove('pulse'), 500)
      }
    }
    document.addEventListener('oracle-pulse', fn)
    return () => document.removeEventListener('oracle-pulse', fn)
  }, [])

  return (
    <motion.div
      id="oracle-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="col-span-2 lg:col-span-4 relative overflow-hidden rounded-2xl p-6 glass-panel holo-glow text-slate-100 section-fade"
    >
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(circle_at_top,rgba(0,255,240,0.18),transparent_60%)]" />
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="flex items-center gap-2 text-xl font-heading text-neon-cyan drop-shadow">
          <SiChainlink className="text-neon-cyan" size={22} />
          ETH ↔ USD Realtime Feed
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-300">
            {error ? (
              <span className="text-red-400">Error</span>
            ) : (
              <>
                <span className="font-semibold text-neon-cyan">
                  ${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                </span>
                <span className="mx-2 text-slate-600">•</span>
                <span>{updatedAt ? new Date(updatedAt).toLocaleTimeString() : "—"}</span>
              </>
            )}
          </div>
          <div
            className={`text-xs px-2 py-0.5 rounded-full border transition ${
              connectionState === "connected" && isStreaming
                ? "bg-green-500/15 text-green-300 border-green-400/60 shadow-[0_0_14px_rgba(34,197,94,0.35)]"
                : "bg-slate-800/60 text-slate-300 border-slate-600/60"
            }`}
          >
            {connectionState === "connected" && isStreaming ? "🟢 Live" : "⚪ Polling"}
          </div>
        </div>
      </div>
      <div className="relative z-10 h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeOpacity={0.08} stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#a3aed0", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#a3aed0", fontSize: 11 }}
              domain={["auto", "auto"]}
              allowDecimals
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 10, 16, 0.95)",
                border: "1px solid rgba(0, 255, 240, 0.25)",
                borderRadius: "12px",
              }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(v) => [`$${v.toFixed(2)}`, "Price"]}
            />
            <Line type="monotone" dataKey="price" stroke="url(#grad)" strokeWidth={2} dot={false} />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00fff0" />
                <stop offset="100%" stopColor="#ff00ff" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <style>{`
        #oracle-panel.pulse {
          box-shadow: 0 0 25px rgba(0, 255, 240, 0.35);
        }
      `}</style>
    </motion.div>
  )
}
