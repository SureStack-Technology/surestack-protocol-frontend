import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { getAlchemyWsProvider } from "@shared/utils/resilientProvider";
import deployments from "@shared/deployments/sepolia.json";
import { CONTRACT_ADDRESSES } from "../../config/contracts";
import TokenIcon from "../ui/TokenIcon.jsx";

const POLICY_MANAGER_ADDRESS = CONTRACT_ADDRESSES.POLICY_MANAGER || deployments.PolicyManager;

if (!POLICY_MANAGER_ADDRESS) {
  console.error(
    "[LiveEvents][Error] Missing POLICY_MANAGER_ADDRESS — check deployments or .env.local"
  );
}

// ABI will be defined inside init() function for better encapsulation

export default function LiveEventsPanel() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    let isMounted = true;
    let contract;
    let localHandler = null;

    async function init() {
      try {
        setStatus("connecting");
        const policyManagerAddr = POLICY_MANAGER_ADDRESS;
        const provider = getAlchemyWsProvider();

        if (!policyManagerAddr) {
          throw new Error("Missing VITE_POLICY_MANAGER_ADDRESS");
        }

        // ✅ Verified ABI matching PolicyManager.sol
        const abi = [
          "event PolicyCreated(address indexed owner, uint256 indexed policyId, uint256 coverageLimit, uint8 coveragePercent, uint256 premiumUSD, uint256 premiumPaidInSST)",
          "event ClaimProcessed(uint256 indexed policyId, uint256 payoutAmount, uint80 oracleRoundId, uint256 lossEventValueUSD)"
        ];

        console.log("[LiveEvents][ABI] Using verified ABI (PolicyCreated + ClaimProcessed)");
        contract = new ethers.Contract(policyManagerAddr, abi, provider);
        console.log("[LiveEvents] Connected to PolicyManager:", policyManagerAddr);

        // 🧠 Load cached events from localStorage
        const cached = JSON.parse(localStorage.getItem("surestack_events") || "[]");
        const cachedIds = new Set(cached.map(e => e.id));

        // --- Load recent events (backfill) ---
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(latestBlock - 5000, 0);
        const pastPolicies = await contract.queryFilter(contract.filters.PolicyCreated(null, null), fromBlock, latestBlock);
        console.log("[LiveEvents][Backfill]", pastPolicies.length, "PolicyCreated events found");

        // Inject them directly into feed (deduplicate by id)
        const backfillData = pastPolicies
          .map((e) => {
            const id = e.blockNumber + ":" + e.transactionHash;
            return {
              id,
              name: "PolicyCreated",
              args: {
                owner: e.args.owner,
                policyId: e.args.policyId.toString(),
                coverage: ethers.formatUnits(e.args.coverageLimit, 8),
                coveragePercent: e.args.coveragePercent?.toString() || "0",
                premium: ethers.formatUnits(e.args.premiumUSD, 8),
                sst: ethers.formatUnits(e.args.premiumPaidInSST, 18),
              },
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              time: new Date().toLocaleTimeString(),
            };
          })
          .filter(e => !cachedIds.has(e.id)); // Remove duplicates

        // Merge backfill with cached, deduplicate, and sort by block number (newest first)
        const allEvents = [...backfillData, ...cached]
          .reduce((acc, e) => {
            if (!acc.find(existing => existing.id === e.id)) {
              acc.push(e);
            }
            return acc;
          }, [])
          .sort((a, b) => b.blockNumber - a.blockNumber)
          .slice(0, 25);

        if (allEvents.length > 0) {
          setEvents(allEvents);
          localStorage.setItem("surestack_events", JSON.stringify(allEvents));
          setStatus("streaming");
          console.log(`[LiveEvents] Loaded ${allEvents.length} events (${backfillData.length} new, ${cached.length} cached)`);
          // Notify AnalyticsPanel of update
          window.dispatchEvent(new CustomEvent("surestack:eventsUpdated"));
        } else {
          setStatus("subscribed");
          console.warn("[LiveEvents][Warn] No events found. Try creating a new policy on-chain to trigger live feed.");
        }

        // --- Live listener for new events ---
        contract.on("PolicyCreated", (owner, policyId, coverageLimit, coveragePercent, premiumUSD, premiumPaidInSST, event) => {
          console.log("[LiveEvents][Realtime] 🟢 PolicyCreated", policyId.toString());
          const data = {
            id: event.blockNumber + ":" + event.transactionHash,
            name: "PolicyCreated",
            args: {
              owner,
              policyId: policyId.toString(),
              coverage: ethers.formatUnits(coverageLimit, 8),
              coveragePercent: coveragePercent?.toString() || "0",
              premium: ethers.formatUnits(premiumUSD, 8),
              sst: ethers.formatUnits(premiumPaidInSST, 18),
            },
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
            time: new Date().toLocaleTimeString(),
          };
          setEvents((prev) => {
            const updated = [data, ...prev].slice(0, 25);
            localStorage.setItem("surestack_events", JSON.stringify(updated));
            // Notify AnalyticsPanel of update
            window.dispatchEvent(new CustomEvent("surestack:eventsUpdated"));
            return updated;
          });
          setStatus("streaming");
        });

        // 🔁 Auto-reconnect on close
        if (provider._websocket) {
          provider._websocket.addEventListener("close", () => {
            console.warn("[LiveEvents] WebSocket closed — reconnecting…");
            setStatus("reconnecting");
            setTimeout(() => window.location.reload(), 3000);
          });
        }

        // ✅ Also listen for frontend-triggered custom events
        localHandler = (e) => {
          if (!isMounted) return;
          const ev = e.detail;
          setEvents((prev) => {
            const updated = [ev, ...prev.filter(existing => existing.id !== ev.id)].slice(0, 25);
            localStorage.setItem("surestack_events", JSON.stringify(updated));
            return updated;
          });
        };
        window.addEventListener("surestack:event", localHandler);

        console.info("[LiveEvents] Connected to PolicyManager:", policyManagerAddr);
      } catch (err) {
        console.error("[LiveEvents][Error]", err);
        setStatus("error");
      }
    }

    init();

    return () => {
      isMounted = false;
      if (contract) {
        contract.removeAllListeners();
      }
      if (localHandler) {
        window.removeEventListener("surestack:event", localHandler);
      }
    };
  }, []);

  // 🧩 Hover Highlight Listener
  useEffect(() => {
    const handleHover = (e) => {
      const { blockNumber, txHash } = e.detail || {};
      if (!blockNumber || !txHash) return;
      
      const row = document.querySelector(
        `[data-block='${blockNumber}'][data-tx='${txHash}']`
      );
      
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.add("ring-2", "ring-green-400", "ring-opacity-75");
        setTimeout(() => {
          row.classList.remove("ring-2", "ring-green-400", "ring-opacity-75");
        }, 2000);
      }
    };

    const clearHover = () => {
      document
        .querySelectorAll("[data-block]")
        .forEach((el) => el.classList.remove("ring-2", "ring-green-400", "ring-opacity-75"));
    };

    window.addEventListener("surestack:hoverEvent", handleHover);
    window.addEventListener("surestack:clearHover", clearHover);

    return () => {
      window.removeEventListener("surestack:hoverEvent", handleHover);
      window.removeEventListener("surestack:clearHover", clearHover);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-panel holo-glow relative z-10 pointer-events-auto p-6 text-slate-100 section-fade"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="font-heading text-lg text-neon-cyan drop-shadow flex items-center gap-2">
          Live Events Feed
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              status === "streaming"
                ? "border-green-400/60 text-green-300 bg-green-500/15 shadow-[0_0_16px_rgba(34,197,94,0.3)]"
                : status === "reconnecting"
                ? "border-yellow-400/50 text-yellow-300 bg-yellow-500/10"
                : "border-slate-600/60 text-slate-300 bg-slate-700/30"
            }`}
          >
            {status === "streaming"
              ? "🟢 Streaming"
              : status === "reconnecting"
              ? "🔴 Reconnecting…"
              : "🟡 " + status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </h3>

        <div className="flex items-center gap-2 text-sm font-mono text-slate-300">
          <span className="hidden sm:block">
            Source: {POLICY_MANAGER_ADDRESS.slice(0, 6)}…{POLICY_MANAGER_ADDRESS.slice(-4)}
          </span>
          <span className="hidden sm:block">•</span>
          <span>Events {events.length} / 25</span>
          <button
            onClick={() => {
              localStorage.removeItem("surestack_events");
              setEvents([]);
              console.log("[LiveEvents] Cleared history");
            }}
            className="text-xs px-3 py-1 rounded-md bg-risk/20 border border-risk/40 text-risk hover:bg-risk/30 transition"
          >
            🧹 Clear
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-slate-400 text-sm">No events yet</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scroll neon-scrollbar">
          {events.map((e, idx) => (
            <div
              key={e.id || e.txHash || idx}
              data-block={e.blockNumber}
              data-tx={e.txHash}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("surestack:focusChartPoint", {
                    detail: { blockNumber: e.blockNumber, txHash: e.txHash },
                  })
                );
                const el = document.querySelector(
                  `[data-block='${e.blockNumber}'][data-tx='${e.txHash}']`
                );
                if (el) {
                  el.classList.add("ring-2", "ring-[var(--primary-cyan)]");
                  setTimeout(() => el.classList.remove("ring-2", "ring-[var(--primary-cyan)]"), 2000);
                }
              }}
              className="glass-card p-3 border border-[rgba(0,255,240,0.25)] text-sm transition-all duration-300 cursor-pointer hover:border-safe hover:shadow-neon-safe hover:bg-[rgba(0,255,240,0.08)]"
            >
              <div className="font-semibold flex items-center gap-2 text-safe uppercase tracking-[0.2em] text-xs mb-1">
                🟢 {e.name} #{e.args?.policyId || "—"}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                <div>
                  👤 Owner:{" "}
                  <span className="text-safe">
                    {e.args?.owner?.slice(0, 8)}...{e.args?.owner?.slice(-6)}
                  </span>
                </div>
                <div>
                  💰 Coverage:{" "}
                  <span className="text-green-300">
                    ${parseFloat(e.args?.coverage || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  💵 Premium:{" "}
                  <span className="text-yellow-300">
                    ${parseFloat(e.args?.premium || 0).toFixed(2)}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  🏦 Paid:
                  <span className="text-purple-300 inline-flex items-center gap-1">
                    <TokenIcon className="h-4 w-4" />
                    {parseFloat(e.args?.sst || 0).toFixed(4)} SST
                  </span>
                </div>
              </div>
              <div className="text-slate-500 text-[11px] mt-2 font-mono">
                {e.time} • Block {e.blockNumber}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

