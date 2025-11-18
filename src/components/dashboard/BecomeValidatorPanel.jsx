import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../../contexts/Web3Context";
import { CONTRACT_ADDRESSES } from "../../config/contracts";
import toast from "react-hot-toast";
import deployments from "@shared/deployments/sepolia.json";
import ConsensusAndStakingV2ABI from "@shared/abi/ConsensusAndStaking.json";
import SureStackTokenABI from "@shared/abi/SureStackToken.json";
import TokenIcon from "../ui/TokenIcon.jsx";

// ✅ Safe ABI validation
const stakingAbi =
  ConsensusAndStakingV2ABI?.abi && Array.isArray(ConsensusAndStakingV2ABI.abi)
    ? ConsensusAndStakingV2ABI.abi
    : [];

const tokenAbi =
  SureStackTokenABI?.abi && Array.isArray(SureStackTokenABI.abi)
    ? SureStackTokenABI.abi
    : [];

const CONSENSUS_STAKING_V2_ADDRESS =
  import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS ||
  CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 ||
  deployments.ConsensusAndStakingV2;

const SST_TOKEN_ADDRESS =
  import.meta.env.VITE_SURE_STACK_TOKEN_ADDRESS ||
  CONTRACT_ADDRESSES.SURE_STACK_TOKEN ||
  deployments.SureStackToken;

/**
 * 🟢 Become Validator Panel
 * Allows users to stake SST tokens and become validators
 */
export default function BecomeValidatorPanel() {
  const { account, signer, isConnected, connectWallet } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [sstBalance, setSstBalance] = useState(0);
  const [minStake, setMinStake] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stakeAmount, setStakeAmount] = useState("");

  const renderToken = (label, extraClasses = "") => (
    <span className={`inline-flex items-center gap-2 ${extraClasses}`.trim()}>
      <TokenIcon className="h-4 w-4" />
      <span>{label}</span>
    </span>
  );

  // Fetch contract state
  useEffect(() => {
    if (!isConnected || !account) {
      setChecking(false);
      return;
    }

    const fetchContractState = async () => {
      try {
        setChecking(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const consensusContract = new ethers.Contract(
          CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
          stakingAbi,
          provider
        );
        const tokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.SURE_STACK_TOKEN || deployments.SureStackToken,
          tokenAbi,
          provider
        );

        // Fetch min stake and paused status
        const [minStakeRaw, paused, balanceRaw] = await Promise.all([
          consensusContract.minStakeAmount().catch(() => 0n),
          consensusContract.paused().catch(() => false),
          tokenContract.balanceOf(account).catch(() => 0n),
        ]);

        const minStakeFormatted = Number(ethers.formatUnits(minStakeRaw || 0n, 18));
        const balanceFormatted = Number(ethers.formatUnits(balanceRaw || 0n, 18));

        setMinStake(minStakeFormatted);
        setIsPaused(Boolean(paused));
        setSstBalance(balanceFormatted);

        console.log(
          `[BecomeValidator] SST balance: ${balanceFormatted.toFixed(2)} SST, min required: ${minStakeFormatted.toFixed(2)} SST`
        );
      } catch (err) {
        console.error("[BecomeValidator] Error fetching contract state:", err);
        toast.error("Failed to load validator requirements");
      } finally {
        setChecking(false);
      }
    };

    fetchContractState();
    // Refresh every 30 seconds
    const interval = setInterval(fetchContractState, 30000);
    return () => clearInterval(interval);
  }, [isConnected, account]);

  const handleStake = async (amount) => {
    if (!isConnected || !signer) {
      await connectWallet();
      return;
    }

    const stakeAmountNum = Number(amount);
    if (isNaN(stakeAmountNum) || stakeAmountNum < minStake) {
      toast.error(`Stake amount must be at least ${minStake.toFixed(2)} SST`);
      return;
    }

    if (stakeAmountNum > sstBalance) {
      toast.error(`Insufficient SST balance. Available: ${sstBalance.toFixed(2)} SST`);
      return;
    }

    if (isPaused) {
      toast.error("Staking is currently paused");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Preparing transaction...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SURE_STACK_TOKEN || deployments.SureStackToken,
        tokenAbi,
        signer
      );
      const consensusContract = new ethers.Contract(
        CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
        stakingAbi,
        signer
      );

      const amountWei = ethers.parseUnits(amount.toString(), 18);
      console.log("[BecomeValidator] Staking", amountWei.toString(), "wei");

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        account,
        CONSENSUS_STAKING_V2_ADDRESS
      );

      // Approve if needed
      if (currentAllowance < amountWei) {
        toast.loading("Approving SST tokens...", { id: toastId });
        const approveTx = await tokenContract.approve(
          CONSENSUS_STAKING_V2_ADDRESS,
          amountWei
        );
        await approveTx.wait();
        toast.success("SST tokens approved!", { id: toastId });
      }

      // Stake tokens
      toast.loading("Staking SST...", { id: toastId });
      const stakeTx = await consensusContract.stake(amountWei);
      console.log(
        `[BecomeValidator] Staking transaction submitted: ${stakeTx.hash}`
      );

      toast.loading("Waiting for confirmation...", { id: toastId });
      const receipt = await stakeTx.wait();

      if (receipt.status === 1) {
        toast.success("Successfully staked! 🎉", {
          id: toastId,
          duration: 5000,
        });
        console.log("[BecomeValidator] Successfully registered as validator.");

        // Emit custom event to refresh registry
        window.dispatchEvent(new CustomEvent("surestack:validatorUpdate"));

        // Clear input and refresh balance
        setStakeAmount("");
        setTimeout(() => {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const tokenContract = new ethers.Contract(
            CONTRACT_ADDRESSES.SURE_STACK_TOKEN || deployments.SureStackToken,
            tokenAbi,
            provider
          );
          tokenContract
            .balanceOf(account)
            .then((bal) =>
              setSstBalance(Number(ethers.formatUnits(bal, 18)))
            )
            .catch(console.error);
        }, 2000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("[BecomeValidator] Error:", err);
      const errorMsg =
        err.reason || err.message || "Failed to stake SST tokens.";
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-1">
              🟢 Become a Validator
            </h3>
            <p className="text-sm text-neutral-400">
              Connect your wallet to stake SST tokens and become a validator
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <div className="text-center py-2 text-neutral-400">
          Checking validator requirements...
        </div>
      </div>
    );
  }

  const minStakeSST = minStake;
  const stakeAmountNum = Number(stakeAmount) || 0;
  const canStake = !isPaused && stakeAmountNum >= minStakeSST && stakeAmountNum <= sstBalance;

  return (
    <div
      className="rounded-2xl p-4 mb-4 border border-safe"
      style={{
        background: 'rgba(6, 17, 34, 0.78)',
        boxShadow: '0 0 18px var(--glow-blue)',
      }}
    >
      <h3 className="text-lg font-semibold text-[var(--fg-text)] mb-4">🟢 Become a Validator</h3>
      
      <div className="space-y-3">
        <div className="text-sm text-[color:rgba(200,228,255,0.75)] space-y-1">
          <p>
            Your SST Balance: {renderToken(`${sstBalance.toFixed(2)} SST`, "text-green-400 font-mono")}
          </p>
          <p>
            Minimum Stake Required: {renderToken(`${minStakeSST.toFixed(2)} SST`, "text-yellow-400 font-mono")}
          </p>
        </div>

        <div
          className="mt-4 p-3 rounded-md border border-safe"
          style={{ background: 'rgba(6, 17, 34, 0.6)' }}
        >
          <h4 className="text-[var(--fg-text)] font-medium mb-2">🏛 Validator Tiers</h4>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>
              <span className="font-semibold text-[var(--primary-cyan)]">🟢 Tier 1:</span> 1,000 – 9,999 SST — Entry Validator
            </li>
            <li>
              <span className="text-yellow-400 font-semibold">🟡 Tier 2:</span> 10,000 – 49,999 SST — Pro Validator (+10% rewards)
            </li>
            <li>
              <span className="text-blue-400 font-semibold">🔵 Tier 3:</span> 50,000+ SST — Elite Validator (+20% rewards, DAO voting boost)
            </li>
          </ul>
        </div>

        <div>
          <label className="block text-sm text-[color:rgba(200,228,255,0.75)] mb-2">
            Enter amount to stake (≥ {renderToken(`${minStakeSST.toFixed(0)} SST`)})
          </label>
          <input
            type="number"
            step="0.0001"
            min={minStakeSST}
            max={sstBalance}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder={`Min: ${minStakeSST.toFixed(2)} SST`}
            className="input-brand rounded px-3 py-2 w-full max-w-xs text-[var(--fg-text)] bg-transparent"
          />
        </div>

        {stakeAmountNum > 0 && stakeAmountNum < minStakeSST && (
          <div className="text-orange-400 text-xs">
            ⚠️ Amount must be at least {minStakeSST.toFixed(2)} SST
          </div>
        )}

        {stakeAmountNum > sstBalance && (
          <div className="text-red-400 text-xs">
            ⚠️ Insufficient balance. Available: {sstBalance.toFixed(2)} SST
          </div>
        )}

        {stakeAmount && stakeAmountNum >= minStakeSST && stakeAmountNum <= sstBalance && (
          <p className="text-sm mt-2">
            You are staking{" "}
            <span
              className={`font-semibold ${
                stakeAmountNum >= 50000
                  ? "text-[var(--primary-blue)]"
                  : stakeAmountNum >= 10000
                  ? "text-yellow-400"
                  : "text-[var(--primary-cyan)]"
              }`}
            >
              {stakeAmountNum >= 50000
                ? "🔵 Elite Validator Tier"
                : stakeAmountNum >= 10000
                ? "🟡 Pro Validator Tier"
                : "🟢 Entry Validator Tier"}
            </span>
          </p>
        )}

        <button
          disabled={!canStake || loading}
          onClick={() => handleStake(stakeAmount)}
          className={`btn-brand px-4 py-2 rounded-md text-sm font-medium transition ${
            isPaused || !canStake || loading ? "btn-brand-disabled" : ""
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Processing...
            </span>
          ) : isPaused ? (
            "Staking Paused"
          ) : (
            "Stake SST & Become Validator"
          )}
        </button>
      </div>
    </div>
  );
}

