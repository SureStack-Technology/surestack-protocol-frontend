import React, { useEffect, useState, useRef } from "react";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";

export default function DevTelemetry() {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem("SureStackTelemetryVisible") === "true";
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("SureStackTelemetryTheme") || "green";
  });
  const [latency, setLatency] = useState(null);
  const lastBlockTimeRef = useRef(Date.now());
  const lastSamplesRef = useRef(0);

  // New: compact mode + sparkline state
  const [compact, setCompact] = useState(false);
  const [spark, setSpark] = useState([]);

  const metrics = useProtocolMetrics();
  const connectionState = metrics?.connectionState || "—";
  const source = metrics?.source;
  const price = metrics?.oracle?.price;
  const samples = metrics?.risk24h?.samples || metrics?.risk7d?.samples || 0;
  const riskIndex = typeof metrics?.risk24h === 'object' 
    ? metrics.risk24h.value.toFixed(1) 
    : (metrics?.risk24h || 0).toFixed(1);

  // Track block latency
  useEffect(() => {
    if (samples > lastSamplesRef.current) {
      const now = Date.now();
      const diff = now - lastBlockTimeRef.current;
      if (diff > 0 && diff < 5000) {
        setLatency(diff);
        // Sparkline update (max 20 points)
        setSpark((prev) => {
          const next = [...prev, diff];
          return next.slice(-20);
        });
      }
      lastBlockTimeRef.current = now;
      lastSamplesRef.current = samples;
    }
  }, [samples]);

  // Toggle handler (Ctrl+Shift+D) and compact mode (T)
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
        setVisible(v => {
          const newVal = !v;
          localStorage.setItem("SureStackTelemetryVisible", String(newVal));
          return newVal;
        });
      }
      if (e.code === "KeyT" && !e.ctrlKey && !e.shiftKey) {
        setCompact(c => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === "green" ? "blue" : "green";
    setTheme(next);
    localStorage.setItem("SureStackTelemetryTheme", next);
  };

  if (!visible) return null;

  const themeColors =
    theme === "green"
      ? { text: "text-green-400", border: "border-green-500", bg: "bg-black/90" }
      : { text: "text-blue-400", border: "border-blue-500", bg: "bg-black/80" };

  const latencyColor =
    latency == null
      ? "text-gray-400"
      : latency < 200
      ? "text-green-400"
      : latency < 500
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div
      className={`fixed bottom-20 right-3 ${themeColors.bg} ${themeColors.text} p-3 rounded-lg text-sm font-mono shadow-lg z-50 w-[340px] border ${themeColors.border}`}
    >
      {/* Animated header shimmer */}
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold animate-pulse bg-gradient-to-r from-[var(--primary-blue)] via-[var(--primary-cyan)] to-[var(--primary-magenta)] bg-clip-text text-transparent">
          SureStack Diagnostics v10.8
        </div>
        <button
          onClick={toggleTheme}
          className="text-xs opacity-80 hover:opacity-100 transition"
          title="Toggle Theme"
        >
          🎨
        </button>
      </div>

      {compact ? (
        <div className="text-xs opacity-90">
          {connectionState} | {source?.providerName ?? "Unknown"} | ${price?.toFixed?.(2) ?? "--"} | 
          <span className={latencyColor}> {latency != null ? `${latency} ms` : "--"}</span>
        </div>
      ) : (
        <>
          <div>Connection: {connectionState}</div>
          <div>RPC: {source?.providerName || "Unknown"}</div>
          {source?.url && <div className="truncate">{source.url}</div>}
          <div>Last Price: ${price?.toFixed?.(2) ?? "--"}</div>
          <div>Samples: {samples}</div>
          <div>
            Risk Index: 
            <span
              className={
                parseFloat(riskIndex) < 2 ? "text-green-400" :
                parseFloat(riskIndex) < 5 ? "text-yellow-400" : "text-red-400"
              }
            >
              {" "}{riskIndex}
            </span>
          </div>
          <div className={latencyColor}>
            Latency: {latency != null ? `${latency} ms` : "--"}
          </div>

          {/* Sparkline visual */}
          {spark.length > 0 && (
            <div className="mt-1 h-[20px] flex items-end gap-[1px] opacity-80">
              {spark.map((v, i) => (
                <div
                  key={i}
                  className={`w-[6px] ${latencyColor}`}
                  style={{ 
                    height: `${Math.min(v / 10, 20)}px`, 
                    backgroundColor: "currentColor" 
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-2 opacity-70 text-xs">
            Press Ctrl + Shift + D to hide | T = compact mode
          </div>
        </>
      )}
    </div>
  );
}

