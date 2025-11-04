"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function OraclePriceWidget() {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Use env var with fallback for safety
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

  useEffect(() => {
    async function fetchPrice() {
      try {
        console.log("📡 Fetching from:", `${backendUrl}/api/oracle`);
        const res = await fetch(`${backendUrl}/api/oracle`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data?.success && data?.data?.price) {
          setPriceData(data.data);
          setError(null);
        } else {
          setError("Invalid oracle response");
        }
      } catch (err) {
        console.error("❌ Oracle fetch failed:", err);
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glassmorphism rounded-2xl p-6 hover:bg-white/10 hover:scale-105 transition-all duration-300 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
              ETH/USD (Chainlink)
            </h3>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <p className="text-3xl font-bold text-white">
              ${priceData?.price ? priceData.price.toFixed(2) : "N/A"}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Source: Chainlink Sepolia Oracle
      </p>
    </motion.div>
  );
}