import React, { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import { getResilientProvider } from "@shared/utils/resilientProvider";
import { useWeb3 } from "../../contexts/Web3Context";
import deployments from "@shared/deployments/sepolia.json";
import ConsensusAndStakingV2ABI from "@shared/abi/ConsensusAndStaking.json";
import { CONTRACT_ADDRESSES } from "../../config/contracts";
import TokenIcon from "../ui/TokenIcon.jsx";

// ✅ Safe ABI validation
const stakingAbi =
  ConsensusAndStakingV2ABI?.abi && Array.isArray(ConsensusAndStakingV2ABI.abi)
    ? ConsensusAndStakingV2ABI.abi
    : (() => {
        console.error(
          "[ValidatorRegistryTable] Invalid ABI detected. Check shared/abi/ConsensusAndStaking.json"
        );
        return [];
      })();

const CONSENSUS_STAKING_V2_ADDRESS =
  import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS || deployments.ConsensusAndStakingV2;

/**
 * 📋 Validator Registry Table
 * Displays live validator data from ConsensusAndStakingV2 contract
 */
export default function ValidatorRegistryTable() {
  const { account } = useWeb3();
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_DURATION = 10000; // 10 seconds cache

  useEffect(() => {
    if (!CONSENSUS_STAKING_V2_ADDRESS || !stakingAbi.length) {
      setError("Missing contract address or ABI");
      setLoading(false);
      return;
    }

    // 🧩 Load validators from on-chain events + self profile
    const fetchValidators = async () => {
      // Check cache first
      const now = Date.now();
      if (
        cacheRef.current.data &&
        now - cacheRef.current.timestamp < CACHE_DURATION
      ) {
        setValidators(cacheRef.current.data);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const provider = getResilientProvider();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
          ConsensusAndStakingV2ABI?.abi || [],
          provider
        );

        // ✅ Query Staked or ValidatorRegistered events (fallback safe)
        let logs = [];
        try {
          const latestBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(latestBlock - 50000, 0);
          
          // Try Staked filter first, fallback to ValidatorRegistered
          if (contract.filters.Staked) {
            logs = await contract.queryFilter(
              contract.filters.Staked(),
              fromBlock,
              latestBlock
            );
          } else if (contract.filters.ValidatorRegistered) {
            logs = await contract.queryFilter(
              contract.filters.ValidatorRegistered(),
              fromBlock,
              latestBlock
            );
          } else {
            // Fallback: try direct event name
            logs = await contract.queryFilter("Staked", fromBlock, latestBlock);
          }
        } catch (err) {
          console.warn("[ValidatorRegistry] Event query failed, trying fallback:", err);
          try {
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(latestBlock - 50000, 0);
            logs = await contract.queryFilter("Staked", fromBlock, latestBlock);
          } catch (fallbackErr) {
            console.warn("[ValidatorRegistry] Fallback query also failed:", fallbackErr);
            logs = [];
          }
        }

        // ✅ Extract unique addresses from events
        const addresses = new Set();
        for (const log of logs) {
          const addr = log.args?.validator || log.args?.[0];
          if (addr) {
            addresses.add(addr);
          }
        }

        // ✅ Include the connected wallet if not in event logs
        if (account && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts && accounts.length > 0) {
              const signerAddr = accounts[0];
              const isIncluded = Array.from(addresses).some(
                (a) => a.toLowerCase() === signerAddr.toLowerCase()
              );
              if (!isIncluded) {
                addresses.add(signerAddr);
                console.log("[ValidatorRegistry] Added connected wallet to validator list:", signerAddr);
              }
            }
          } catch (err) {
            console.warn("[ValidatorRegistry] Could not get connected account:", err);
          }
        }

        // ✅ Fetch validator profiles in parallel
        const profiles = await Promise.all(
          Array.from(addresses).map(async (addr) => {
            try {
              const profile = await contract.getValidatorProfile(addr);
              return { address: addr, profile };
            } catch (err) {
              console.warn(`[ValidatorRegistry] Error fetching profile for ${addr}:`, err);
              return null;
            }
          })
        );

        // Filter out null profiles and format data
        const validProfiles = profiles.filter((p) => p !== null && p.profile);
        
        const formatted = validProfiles.map((p, i) => {
          const profile = p.profile;
          const now = Math.floor(Date.now() / 1000);
          
          // Determine status
          let status = "🔴 Unstaked";
          if (profile.isActive) {
            status = "🟢 Active";
          } else if (
            profile.unstakeLockoutEnd &&
            Number(profile.unstakeLockoutEnd) > now
          ) {
            status = "🕒 Cooling";
          }

          return {
            id: i + 1,
            address: p.address,
            staked: Number(ethers.formatUnits(profile.stakedAmount || 0n, 18)),
            rewards: Number(ethers.formatUnits(profile.totalRewards || 0n, 18)),
            accuracy: Number(profile.accuracyScore || 0) / 100, // Convert from basis points
            isActive: profile.isActive,
            unstakeLockoutEnd: Number(profile.unstakeLockoutEnd || 0),
            pendingUnstake: Number(ethers.formatUnits(profile.pendingUnstake || 0n, 18)),
            status,
          };
        });

        // Sort by staked amount (descending)
        const sorted = formatted.sort((a, b) => b.staked - a.staked);
        const activeCount_final = sorted.filter((v) => v.isActive).length;

        setValidators(sorted);
        setError(null);
        setLoading(false);

        // Update cache
        cacheRef.current = { data: sorted, timestamp: now };

        console.log(
          `[ValidatorRegistry] Loaded ${sorted.length} validators (${activeCount_final} active)`
        );
      } catch (err) {
        console.error("[ValidatorRegistry] Fetch failed:", err);
        setError(err.message || "Failed to fetch validators");
        setValidators([]);
        setLoading(false);
      }
    };

    // Listen for validator update events
    const handleValidatorUpdate = () => {
      console.log("[ValidatorRegistry] Received validator update event, refreshing...");
      // Clear cache to force refresh
      cacheRef.current = { data: null, timestamp: 0 };
      fetchValidators();
    };

    window.addEventListener("surestack:validatorUpdate", handleValidatorUpdate);

    // Initial fetch
    fetchValidators();

    // Refresh every 15 seconds
    const interval = setInterval(fetchValidators, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("surestack:validatorUpdate", handleValidatorUpdate);
    };
  }, [account]); // Re-fetch when account changes

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-300 text-sm">
          ⚠️ Error loading validators: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-blue-400">
        📋 Validator Registry
      </h3>

      {loading ? (
        <div className="text-center py-8 text-neutral-400">
          Loading validators...
        </div>
      ) : validators.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          No validators registered yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-neutral-300">
            <thead className="text-xs uppercase text-neutral-500 border-b border-neutral-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Staked (SST)</th>
                <th className="px-4 py-3">Rewards (SST)</th>
                <th className="px-4 py-3">Accuracy (%)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((v) => (
                <tr
                  key={v.address}
                  className="border-b border-neutral-800 hover:bg-neutral-800/50 transition"
                >
                  <td className="px-4 py-3 font-medium">{v.id}</td>
                  <td className="px-4 py-3 font-mono text-[var(--primary-cyan)]">
                    {v.address.slice(0, 8)}...{v.address.slice(-6)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <TokenIcon className="h-4 w-4" />
                      {v.staked.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })} SST
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <TokenIcon className="h-4 w-4" />
                      {v.rewards.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })} SST
                    </span>
                  </td>
                  <td className="px-4 py-3">{v.accuracy.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

