import React, { useEffect, useState, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";

/**
 * 📈 Coverage & Premiums Trend Chart
 * Displays the last 15 PolicyCreated events with coverage and premium values.
 * Updates reactively when new events stream in.
 */
export default function CoverageTrendChart() {
  const [chartData, setChartData] = useState([]);
  const [mode, setMode] = useState("both"); // "coverage" | "premium" | "both"

  // Load and transform event data
  const loadChartData = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("surestack_events") || "[]");
      
      // Filter PolicyCreated events only
      const policyEvents = stored.filter((e) => e.name === "PolicyCreated");
      
      if (policyEvents.length === 0) {
        setChartData([]);
        return;
      }

      // Map last 15 events to chart format
      // Sort by blockNumber (newest first), then take last 15 and reverse for chronological order
      const sortedEvents = [...policyEvents]
        .sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0))
        .slice(0, 15)
        .reverse();

      const mappedData = sortedEvents.map((event, index) => {
        // Extract coverage and premium values
        const coverage = Number(event.args?.coverage || 0);
        const premium = Number(event.args?.premium || 0);
        
        // Use timestamp or generate a simple label
        const timestamp = event.time || 
          (event.blockNumber ? `Block ${event.blockNumber}` : `Event ${index + 1}`);
        
        // Extract time portion for display (e.g., "11:54:23 AM" -> "11:54")
        const timeLabel = timestamp.includes(":") 
          ? timestamp.split(":").slice(0, 2).join(":")
          : timestamp;

        return {
          timestamp: timeLabel,
          coverage: coverage,
          premium: premium,
          blockNumber: event.blockNumber,
          txHash: event.txHash,
          policyId: event.args?.policyId || `#${index + 1}`,
        };
      });

      setChartData(mappedData);
      console.log(`[CoverageTrendChart] Loaded ${mappedData.length} events for chart`);
    } catch (error) {
      console.error("[CoverageTrendChart] Error loading data:", error);
      setChartData([]);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadChartData();

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = () => {
      loadChartData();
    };
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events from LiveEventsPanel
    const handleEventUpdate = () => {
      loadChartData();
    };
    window.addEventListener("surestack:eventsUpdated", handleEventUpdate);

    // Poll for updates every 2 seconds (fallback)
    const interval = setInterval(loadChartData, 2000);

    // Listen for chart focus events (from LiveEventsPanel)
    const handleFocus = (e) => {
      const { blockNumber, txHash } = e.detail || {};
      if (!blockNumber && !txHash) return;
      
      // Find matching data point and highlight it
      const foundIndex = chartData.findIndex(
        (d) => d.blockNumber === blockNumber || d.txHash === txHash
      );
      
      if (foundIndex !== -1) {
        // Could add visual highlighting here if needed
        console.log(`[CoverageTrendChart] Focused on event at index ${foundIndex}`);
      }
    };
    window.addEventListener("surestack:focusChartPoint", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("surestack:eventsUpdated", handleEventUpdate);
      window.removeEventListener("surestack:focusChartPoint", handleFocus);
      clearInterval(interval);
    };
  }, [loadChartData]);

  // Fallback: No data available
  if (chartData.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mt-2 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-blue-400">
            📈 Coverage & Premiums Trend (last 15 events)
          </h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-neutral-500 text-sm">
          <div className="text-center">
            <p>No recent data available</p>
            <p className="text-xs mt-1 text-neutral-600">
              Create a policy to see coverage and premium trends
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mt-2 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-blue-400">
          📈 Coverage & Premiums Trend (last 15 events)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("coverage")}
            className={`text-xs px-2 py-1 rounded transition ${
              mode === "coverage"
                ? "bg-green-500 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            💰 Coverage
          </button>
          <button
            onClick={() => setMode("premium")}
            className={`text-xs px-2 py-1 rounded transition ${
              mode === "premium"
                ? "bg-purple-500 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            🪙 Premiums
          </button>
          <button
            onClick={() => setMode("both")}
            className={`text-xs px-2 py-1 rounded transition ${
              mode === "both"
                ? "bg-blue-500 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            📊 Both
          </button>
        </div>
      </div>
      <div className="relative z-0 pointer-events-auto" style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <LineChart 
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="coverage"
              orientation="left"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                return `$${value}`;
              }}
            />
            {mode === "both" && (
              <YAxis
                yAxisId="premium"
                orientation="right"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toFixed(0);
                }}
              />
            )}
            <Tooltip
              contentStyle={{
                background: "#1f2937",
                border: "1px solid #374151",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px",
              }}
              formatter={(value, key) => {
                if (key === "coverage") {
                  return [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Coverage"];
                } else if (key === "premium") {
                  return [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Premium"];
                }
                return [value, key];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length) {
                  const data = payload[0].payload;
                  // Dispatch hover event for LiveEventsPanel sync
                  if (data.blockNumber && data.txHash) {
                    const event = new CustomEvent("surestack:hoverEvent", {
                      detail: { blockNumber: data.blockNumber, txHash: data.txHash },
                    });
                    window.dispatchEvent(event);
                    clearTimeout(window.__hoverTimeout);
                    window.__hoverTimeout = setTimeout(() => {
                      window.dispatchEvent(new Event("surestack:clearHover"));
                    }, 2000);
                  }
                  return `Policy ${data.policyId} • ${label}`;
                }
                return label;
              }}
              labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              iconType="line"
            />
            {mode !== "premium" && (
              <Line
                yAxisId="coverage"
                type="monotone"
                dataKey="coverage"
                stroke="#00ffcc"
                strokeWidth={2}
                dot={{ r: 3, fill: "#00ffcc" }}
                activeDot={{ r: 6, fill: "#00ffcc", stroke: "#00ffcc", strokeWidth: 2 }}
                isAnimationActive={true}
                name="💰 Coverage"
                connectNulls={false}
              />
            )}
            {mode !== "coverage" && (
              <Line
                yAxisId={mode === "both" ? "premium" : "coverage"}
                type="monotone"
                dataKey="premium"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 3, fill: "#a855f7" }}
                activeDot={{ r: 6, fill: "#a855f7", stroke: "#a855f7", strokeWidth: 2 }}
                isAnimationActive={true}
                name="🪙 Premiums"
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
