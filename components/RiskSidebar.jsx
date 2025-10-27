'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Brain, ChevronDown, ChevronUp } from 'lucide-react';

export default function RiskSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const riskData = {
    currentIndex: 72.4,
    change24h: 1.3,
    change7d: 4.1,
    volatility: 'Moderate',
    trend: 'up'
  };

  if (isCollapsed) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-4 top-24 z-30"
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="glassmorphism rounded-2xl p-4 hover:bg-white/10 transition-colors"
        >
          <ChevronUp className="h-6 w-6 text-accent" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-4 top-24 z-30 w-80 hidden lg:block"
    >
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Risk Index Breakdown</h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current Index</span>
              <div className="flex items-center space-x-1">
                {riskData.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{riskData.currentIndex}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg">
              <span className="text-xs text-gray-400">24h Change</span>
              <p className="text-lg font-semibold text-green-400">+{riskData.change24h}%</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <span className="text-xs text-gray-400">7d Change</span>
              <p className="text-lg font-semibold text-green-400">+{riskData.change7d}%</p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-lg border border-accent/30">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-white">AI Prediction</span>
            </div>
            <p className="text-sm text-gray-300">
              Predicted Volatility: <span className="text-accent font-semibold">{riskData.volatility}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Based on market sentiment and historical data
            </p>
          </div>

          <div className="pt-2">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-accent to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${riskData.currentIndex}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

