import React, { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ethers } from "ethers";
import { useWeb3 } from "../../contexts/Web3Context";
import { CONTRACT_ADDRESSES } from "../../config/contracts";
import deployments from "@shared/deployments/sepolia.json";
import ConsensusAndStakingV2ABI from "@shared/abi/ConsensusAndStaking.json";

// ✅ Safe ABI validation
const stakingAbi =
  ConsensusAndStakingV2ABI?.abi && Array.isArray(ConsensusAndStakingV2ABI.abi)
    ? ConsensusAndStakingV2ABI.abi
    : [];

const CONSENSUS_STAKING_V2_ADDRESS =
  import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS ||
  CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 ||
  deployments.ConsensusAndStakingV2;

const STORAGE_KEY = "surestack:accuracyHistory";
const MAX_DATA_POINTS = 30; // Keep last 30 data points

/**
 * 📊 Validator Health Chart
 * Displays accuracy trend over time for connected validator
 */
export default function ValidatorHealthChart() {
  const { account, isConnected } = useWeb3();
  const [chartData, setChartData] = useState([]);
  const [currentAccuracy, setCurrentAccuracy] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load cached data from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setChartData(parsed);
      }
    } catch (err) {
      console.warn("[ValidatorHealthChart] Failed to load cache:", err);
    }
  }, []);

  // Fetch validator accuracy
  useEffect(() => {
    if (!isConnected || !account) {
      setLoading(false);
      return;
    }

    const fetchAccuracy = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2,
          stakingAbi,
          provider
        );

        const profile = await contract.getValidatorProfile(account).catch(() => null);
        if (!profile) {
          setLoading(false);
          return;
        }

        const accuracy = Number(profile.accuracyScore || 0) / 100; // Convert from basis points
        setCurrentAccuracy(accuracy);

        // Add new data point
        const now = Date.now();
        const newPoint = {
          time: new Date(now).toLocaleTimeString(),
          timestamp: now,
          accuracy: accuracy,
        };

        setChartData((prev) => {
          const updated = [...prev, newPoint].slice(-MAX_DATA_POINTS);
          // Save to localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch (err) {
            console.warn("[ValidatorHealthChart] Failed to save cache:", err);
          }
          return updated;
        });
      } catch (err) {
        console.error("[ValidatorHealthChart] Error fetching accuracy:", err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAccuracy();

    // Update every 60 seconds
    const interval = setInterval(fetchAccuracy, 60000);

    return () => clearInterval(interval);
  }, [isConnected, account]);

  if (!isConnected || !account) {
    return null;
  }

  if (loading && chartData.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-2 text-blue-400">
          📊 Validator Health
        </h3>
        <div className="text-center py-8 text-neutral-400 text-sm">
          Loading accuracy data...
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-2 text-blue-400">
          📊 Validator Health
        </h3>
        <div className="text-center py-8 text-neutral-400 text-sm">
          No accuracy data yet. Start validating to see your health trend.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-400">
          📊 Validator Health
        </h3>
        <div className="text-xs text-neutral-400">
          Current: <span className="text-green-400 font-semibold">{currentAccuracy.toFixed(2)}%</span>
        </div>
      </div>
      <div style={{ width: "100%", height: 150 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              label={{ value: "Accuracy %", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
            />
            <Tooltip
              contentStyle={{
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              }}
              formatter={(value) => [`Accuracy: ${Number(value).toFixed(2)}%`, ""]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: "#06b6d4", r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-neutral-500 text-center mt-2">
        Accuracy trend over last {chartData.length} samples
      </div>
    </div>
  );
}

