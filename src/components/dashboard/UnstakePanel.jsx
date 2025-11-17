import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../../contexts/Web3Context";
import { CONTRACT_ADDRESSES } from "../../config/contracts";
import toast from "react-hot-toast";
import deployments from "@shared/deployments/sepolia.json";
import ConsensusAndStakingV2ABI from "@shared/abi/ConsensusAndStaking.json";
import RewardPoolABI from "@shared/abi/RewardPool.json";
import CooldownProgress from "./CooldownProgress";
import TokenIcon from "../ui/TokenIcon.jsx";

// ✅ Safe ABI validation
const stakingAbi =
  ConsensusAndStakingV2ABI?.abi && Array.isArray(ConsensusAndStakingV2ABI.abi)
    ? ConsensusAndStakingV2ABI.abi
    : [];

const CONSENSUS_STAKING_V2_ADDRESS =
  import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS ||
  CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2;

/**
 * 🕒 Unstake Panel
 * Allows validators to request unstake and track cooldown period
 */
export default function UnstakePanel() {
  const { account, signer, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("checking"); // "checking" | "active" | "cooling" | "ready" | "none"
  const [profile, setProfile] = useState(null);
  const [coolingPeriod, setCoolingPeriod] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [checking, setChecking] = useState(true);

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Ready";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Fetch validator profile and status
  useEffect(() => {
    if (!isConnected || !account) {
      setChecking(false);
      setStatus("none");
      return;
    }

    const fetchProfile = async () => {
      try {
        setChecking(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
          stakingAbi,
          provider
        );

        const [profileData, coolingPeriodRaw] = await Promise.all([
          contract.getValidatorProfile(account).catch(() => null),
          contract.coolingOffPeriod().catch(() => 0n),
        ]);

        if (!profileData) {
          setStatus("none");
          setChecking(false);
          return;
        }

        const coolingPeriodSeconds = Number(coolingPeriodRaw || 0n);
        setCoolingPeriod(coolingPeriodSeconds);

        const unstakeLockoutEnd = Number(profileData.unstakeLockoutEnd || 0);
        const pendingUnstake = Number(
          ethers.formatUnits(profileData.pendingUnstake || 0n, 18)
        );
        const isActive = profileData.isActive;

        setProfile({
          isActive,
          pendingUnstake,
          unstakeLockoutEnd,
        });

        // Determine status
        const now = Math.floor(Date.now() / 1000);
        let currentStatus = "none";
        if (pendingUnstake > 0 && unstakeLockoutEnd > now) {
          currentStatus = "cooling";
          setStatus("cooling");
          setTimeRemaining(unstakeLockoutEnd - now);
        } else if (pendingUnstake > 0 && unstakeLockoutEnd <= now) {
          currentStatus = "ready";
          setStatus("ready");
          setTimeRemaining(0);
        } else if (isActive) {
          currentStatus = "active";
          setStatus("active");
          setTimeRemaining(0);
        } else {
          currentStatus = "none";
          setStatus("none");
          setTimeRemaining(0);
        }

        console.log(
          `[UnstakePanel] Validator status: ${currentStatus === "cooling" ? "Cooling" : currentStatus === "ready" ? "Ready" : currentStatus === "active" ? "Active" : "None"}`
        );
      } catch (err) {
        console.error("[UnstakePanel] Error fetching profile:", err);
        setStatus("none");
      } finally {
        setChecking(false);
      }
    };

    fetchProfile();
    const interval = setInterval(fetchProfile, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [isConnected, account]);

  // Update countdown timer
  useEffect(() => {
    if (status !== "cooling" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setStatus("ready");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeRemaining]);

  const handleRequestUnstake = async () => {
    if (!isConnected || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Requesting unstake...");

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
        stakingAbi,
        signer
      );

      const tx = await contract.requestUnstake();
      console.log(`[UnstakePanel] Unstake requested: ${tx.hash}`);

      toast.loading("Waiting for confirmation...", { id: toastId });
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success("Unstake requested successfully! 🕒", {
          id: toastId,
          duration: 5000,
        });

        // Emit event to refresh registry
        window.dispatchEvent(new CustomEvent("surestack:validatorUpdate"));

        // Refresh profile
        setTimeout(() => {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(
            CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
            stakingAbi,
            provider
          );
          contract
            .getValidatorProfile(account)
            .then((profileData) => {
              const unstakeLockoutEnd = Number(
                profileData.unstakeLockoutEnd || 0
              );
              const pendingUnstake = Number(
                ethers.formatUnits(profileData.pendingUnstake || 0n, 18)
              );
              const now = Math.floor(Date.now() / 1000);
              if (pendingUnstake > 0 && unstakeLockoutEnd > now) {
                setStatus("cooling");
                setTimeRemaining(unstakeLockoutEnd - now);
              }
            })
            .catch(console.error);
        }, 2000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("[UnstakePanel] Error requesting unstake:", err);
      const errorMsg =
        err.reason || err.message || "Failed to request unstake. Please try again.";
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Withdrawing funds...");

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.REWARD_POOL || deployments.RewardPool,
        RewardPoolABI?.abi || [],
        signer
      );

      const tx = await contract.withdrawUnstakedFunds();
      console.log(`[UnstakePanel] Withdrawal completed: ${tx.hash}`);

      toast.loading("Waiting for confirmation...", { id: toastId });
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success("Funds withdrawn successfully! ✅", {
          id: toastId,
          duration: 5000,
        });

        // Emit event to refresh registry
        window.dispatchEvent(new CustomEvent("surestack:validatorUpdate"));

        // Reset status
        setStatus("none");
        setProfile(null);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("[UnstakePanel] Error withdrawing:", err);
      const errorMsg =
        err.reason || err.message || "Failed to withdraw funds. Please try again.";
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null; // Don't show if wallet not connected
  }

  if (checking) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <div className="text-center py-2 text-neutral-400">
          Checking validator status...
        </div>
      </div>
    );
  }

  if (status === "none") {
    return null; // Don't show if not a validator
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">
            🕒 Unstake & Cooldown
          </h3>
          <div className="space-y-2 text-sm text-neutral-300">
            {status === "active" && (
              <div>
                <div className="text-green-400 mb-1">🟢 Status: Active</div>
                <div className="text-neutral-400 text-xs">
                  You can request unstake to begin the cooldown period
                </div>
              </div>
            )}
            {status === "cooling" && (
              <div>
                <div className="text-yellow-400 mb-1">🕒 Status: Cooling</div>
                {profile?.pendingUnstake > 0 && (
                  <div className="text-neutral-400 text-xs mt-1 inline-flex items-center gap-2">
                    Pending withdrawal:
                    <span className="inline-flex items-center gap-1 text-yellow-300">
                      <TokenIcon className="h-4 w-4" />
                      {profile.pendingUnstake.toFixed(2)} SST
                    </span>
                  </div>
                )}
              </div>
            )}
            {status === "ready" && (
              <div>
                <div className="text-green-400 mb-1">✅ Status: Ready</div>
                <div className="text-neutral-400 text-xs">
                  Cooldown period complete. You can withdraw your funds.
                </div>
                {profile?.pendingUnstake > 0 && (
                  <div className="text-neutral-400 text-xs mt-1 inline-flex items-center gap-2">
                    Available:
                    <span className="inline-flex items-center gap-1 text-green-300">
                      <TokenIcon className="h-4 w-4" />
                      {profile.pendingUnstake.toFixed(2)} SST
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Cooldown Progress Ring */}
        {(status === "cooling" || status === "ready") && (
          <CooldownProgress
            remaining={timeRemaining}
            total={coolingPeriod}
            status={status}
            unlockTime={profile?.unstakeLockoutEnd}
          />
        )}
        <div className="flex gap-2">
          {status === "active" && (
            <button
              onClick={handleRequestUnstake}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                loading
                  ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Processing...
                </span>
              ) : (
                "Request Unstake"
              )}
            </button>
          )}
          {status === "ready" && (
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                loading
                  ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Processing...
                </span>
              ) : (
                "✅ Withdraw Funds"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

