import { useState, useEffect } from "react";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";

export default function DevOverlay() {
  const [visible, setVisible] = useState(false);
  const metrics = useProtocolMetrics();

  useEffect(() => {
    const toggle = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") setVisible((v) => !v);
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);

  if (!visible) return null;
  
  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-green-400 text-xs font-mono p-3 rounded-lg shadow-lg w-[320px] z-[9999] border border-green-500/30">
      <div className="mb-2">🧩 <b>SureStack Diagnostics</b></div>
      <div className="space-y-1">
        <div>Connection: {metrics?.connectionState || "—"}</div>
        <div>RPC: {metrics?.source?.providerName || "Unknown"}</div>
        {metrics?.source?.url && <div className="truncate text-[10px] opacity-70">{metrics.source.url}</div>}
        <div>Last Price: ${metrics?.oracle?.price?.toFixed?.(2) || "—"}</div>
        <div>Samples: {metrics?.risk24h?.samples || metrics?.risk7d?.samples || 0}</div>
        <div>Risk Index: {typeof metrics?.risk24h === 'object' ? metrics.risk24h.value.toFixed(1) : (metrics?.risk24h || 0).toFixed(1)}</div>
      </div>
      <div className="text-gray-400 mt-2 text-[10px]">Press Ctrl + Shift + D to hide</div>
    </div>
  );
}

