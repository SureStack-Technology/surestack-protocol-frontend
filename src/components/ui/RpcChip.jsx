import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";

export default function RpcChip() {
  // Show explicit connectionState passed from useProtocolMetrics
  const { connectionState, source } = useProtocolMetrics();
  
  const label =
    connectionState === "connected" ? "🟢 🔌 Live Stream" :
    connectionState === "reconnecting" ? "🟡 ⟳ Reconnecting…" :
    "⚪ 🌐 Polling Mode";
  
  const cls =
    connectionState === "connected" ? "shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse" :
    connectionState === "reconnecting" ? "opacity-90" : "opacity-75";

  const providerLabel = source?.providerName || "Unknown";
  const providerUrl = source?.url || "";

  return (
    <div className={`fixed bottom-4 right-4 z-50 text-xs rounded-full px-3 py-2 bg-zinc-900/70 border border-zinc-700 ${cls}`}>
      <div className="font-medium">{label}</div>
      <div className="opacity-70">RPC: {providerLabel}</div>
      {!!providerUrl && <div className="opacity-50 max-w-[240px] truncate text-[10px]">{providerUrl}</div>}
    </div>
  );
}

