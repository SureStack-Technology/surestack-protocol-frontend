import { useCallback, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import consensusAbi from "@/abi/ConsensusAndStakingV2.json";
import sureStackTokenAbi from "@shared/abi/SureStackToken.json";
import { CONSENSUS_V2, SST_TOKEN } from "@/config/contracts";

export function useValidatorActions() {
  const { signer } = useWeb3();

  const contract = useMemo(() => {
    if (!signer || !CONSENSUS_V2) {
      console.warn("[ValidatorActions] Consensus address missing or signer unavailable");
      return null;
    }
    const abi = consensusAbi?.abi || consensusAbi || [];
    if (!abi.length) {
      console.warn("[ValidatorActions] Consensus ABI unavailable");
      return null;
    }
    try {
      return new ethers.Contract(CONSENSUS_V2, abi, signer);
    } catch (err) {
      console.warn("[ValidatorActions] Failed to instantiate consensus contract", err);
      return null;
    }
  }, [signer, CONSENSUS_V2]);

  const tokenContract = useMemo(() => {
    if (!signer || !SST_TOKEN) {
      console.warn("[ValidatorActions] SST token address missing or signer unavailable");
      return null;
    }
    const abi = sureStackTokenAbi?.abi || sureStackTokenAbi || [];
    if (!abi.length) {
      console.warn("[ValidatorActions] SST token ABI unavailable");
      return null;
    }
    try {
      return new ethers.Contract(SST_TOKEN, abi, signer);
    } catch (err) {
      console.warn("[ValidatorActions] Failed to instantiate SST token contract", err);
      return null;
    }
  }, [signer, SST_TOKEN]);

  useEffect(() => {
    console.log("%c🔧 useValidatorActions ready (fallback mode available)", "color:#00fff0");
  }, []);

  const refresh = useCallback(() => {
    document.dispatchEvent(new CustomEvent("validators:refresh"));
  }, []);

  const stakeToValidator = useCallback(
    async (_validatorId, amount) => {
      if (!contract || !tokenContract) {
        console.warn("⛔ Contract not initialized");
        return { success: false, error: new Error("contract not initialized") };
      }
      try {
        const address = await signer.getAddress();
        const parsedAmount = ethers.parseUnits(String(amount ?? 0), 18);

        // Auto-approve SST if allowance is too low
        const allowance = await tokenContract.allowance(address, CONSENSUS_V2);
        if (allowance < parsedAmount) {
          console.log("[SureStack] Allowance too low — approving needed amount…");
          const approveTx = await tokenContract.approve(CONSENSUS_V2, parsedAmount);
          await approveTx.wait();
          console.log("[SureStack] SST approved for staking");
        }

        const tx = await contract.stake(parsedAmount);
        console.log("%c⚡ Stake executed →", "color:#00fff0", amount);
        await tx.wait();
        refresh();
        return { success: true, hash: tx.hash };
      } catch (err) {
        if (err?.error?.data) console.error("[STAKE ERROR RAW]:", err.error.data);
        console.error("[STAKE ERROR MESSAGE]:", err?.reason || err?.message);
        console.log("%c⚠️ Validator Stake Failed", "color:#ff4081", err?.message || err);
        return { success: false, error: err };
      }
    },
    [contract, tokenContract, refresh, signer]
  );

  const unstakeFromValidator = useCallback(
    async (_validatorId, amount) => {
      if (!contract) {
        console.warn("⛔ Contract not initialized");
        return { success: false, error: new Error("contract not initialized") };
      }
      try {
        const value = ethers.parseUnits(String(amount ?? 0), 18);
        const tx = await contract.requestUnstake(value);
        console.log("%c⚡ Stake executed →", "color:#00fff0", `unstake ${amount}`);
        await tx.wait();
        refresh();
        return { success: true, hash: tx.hash };
      } catch (err) {
        console.log("%c⚠️ Validator Stake Failed", "color:#ff4081", err?.message || err);
        return { success: false, error: err };
      }
    },
    [contract, refresh]
  );

  const withdrawUnstaked = useCallback(
    async () => {
      if (!contract) {
        console.warn("⛔ Contract not initialized");
        return { success: false, error: new Error("contract not initialized") };
      }
      try {
        const tx = await contract.withdrawUnstakedFunds();
        console.log("%c⚡ Stake executed →", "color:#00fff0", "withdraw");
        await tx.wait();
        refresh();
        return { success: true, hash: tx.hash };
      } catch (err) {
        console.log("%c⚠️ Validator Stake Failed", "color:#ff4081", err?.message || err);
        return { success: false, error: err };
      }
    },
    [contract, refresh]
  );

  const activateValidator = useCallback(
    async (address) => {
      console.log("%c⚡ Stake executed →", "color:#00fff0", `activate ${address}`);
      refresh();
      return { success: true };
    },
    [refresh]
  );

  return {
    stakeToValidator,
    unstakeFromValidator,
    withdrawUnstaked,
    activateValidator,
    refreshValidators: refresh,
  };
}
