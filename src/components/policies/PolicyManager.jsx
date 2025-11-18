import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { AlertCircle } from "lucide-react";
import deployments from "@shared/deployments/sepolia.json";
import PolicyManagerABI from "@shared/abi/PolicyManager.json";
import { CONTRACT_ADDRESSES } from "../../config/contracts";

// ✅ Helper: request MetaMask connection
async function getWalletSigner() {
  if (!window.ethereum) {
    toast.error("Please install MetaMask or another Web3 wallet.");
    throw new Error("No Web3 provider found");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  console.info("[Wallet] Connected:", signer.address, "Network:", network.name);
  return { provider, signer };
}

export default function PolicyManager() {
  const [coverage, setCoverage] = useState("");
  const [percentage, setPercentage] = useState("");

  const handleCreatePolicy = async () => {
    try {
      if (!coverage || !percentage) {
        toast.warning("Please enter both coverage and percentage values.");
        return;
      }

      const { signer } = await getWalletSigner();

      const policyManagerAddress = import.meta.env.VITE_POLICY_MANAGER_ADDRESS || deployments.PolicyManager;
      if (!policyManagerAddress) {
        toast.error("Policy Manager address not configured");
        return;
      }

      const policyManager = new ethers.Contract(
        policyManagerAddress,
        PolicyManagerABI?.abi || [],
        signer
      );

      const toastId = toast.loading("Submitting transaction to create policy…");
      const tx = await policyManager.createPolicy(
        ethers.parseUnits(coverage.toString(), 18),
        parseInt(percentage)
      );

      console.log("⛓️ TX sent:", tx.hash);
      toast.loading(`Transaction sent: ${tx.hash.slice(0,10)}…`, { id: toastId });

      const receipt = await tx.wait();
      console.log("✅ Policy created, block:", receipt.blockNumber);
      toast.success("Policy created successfully!", { id: toastId });

      // ✅ Broadcast to global event stream (for LiveEventsPanel)
      const eventPayload = {
        id: Date.now(),
        name: "PolicyCreated (frontend)",
        args: [coverage, percentage],
        time: new Date().toLocaleTimeString(),
      };
      window.dispatchEvent(new CustomEvent("surestack:event", { detail: eventPayload }));

      // Reset form
      setCoverage("");
      setPercentage("");
    } catch (err) {
      console.error("❌ Policy creation failed:", err);
      toast.error("Transaction failed. Check console for details.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white">Create Policy</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Coverage Amount
          </label>
          <input
            type="number"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
            placeholder="Enter coverage amount"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Percentage
          </label>
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="Enter percentage"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          />
        </div>
        <button
          onClick={handleCreatePolicy}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition"
        >
          Create Policy
        </button>
      </div>
    </div>
  );
}

