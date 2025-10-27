'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import SkeletonCard, { SkeletonChart } from '../components/Skeleton';
import RiskSidebar from '../components/RiskSidebar';
import HeroSection from '../components/HeroSection';
import { Shield, TrendingUp, Users } from 'lucide-react';
import { riskIndexData } from '../data/mockData';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animatedRiskData, setAnimatedRiskData] = useState(riskIndexData);

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/risk');
        const data = await response.json();
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Simulate live updates
  useEffect(() => {
    const messages = [
      "New validator joined the network (Validator-318)",
      "Risk Index increased by +0.3% due to volatility",
      "New coverage policy purchased for Stablecoin Depeg Pool",
      "Oracle Failure pool reached capacity",
      "Validator Node #102 updated risk feed",
      "Governance proposal #15 opened for voting",
      "Risk Index decreased by -0.2% due to market stability",
      "New coverage pool created: Smart Contract Bug",
    ];

    const interval = setInterval(() => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setFeed(prev => [randomMessage, ...prev.slice(0, 4)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Animate risk index data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedRiskData(prevData => 
        prevData.map(item => ({
          ...item,
          index: Math.max(0, Math.min(100, item.index + (Math.random() - 0.5) * 4))
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-96 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-80 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mb-8">
          <SkeletonChart />
        </div>
        <div className="glassmorphism rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Dashboard Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Decentralized Risk Intelligence for Web3
          </h1>
          <p className="text-gray-400">
            Real-time risk assessment and coverage network powered by decentralized validators
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard
              title="Total Coverage Active"
              value={stats.totalCoverage}
              icon={Shield}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <StatCard
              title="Avg Risk Index"
              value={`${stats.avgRiskIndex} / 100`}
              icon={TrendingUp}
              change24h="+1.3%"
              change7d="+4.1%"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StatCard
              title="Validators Online"
              value={stats.validatorsOnline}
              icon={Users}
            />
          </motion.div>
        </div>

        {/* Risk Index Chart */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ChartCard
            title="Protocol Risk Index Over Time"
            data={animatedRiskData}
            type="line"
            dataKey="index"
          />
        </motion.div>

        {/* Live Protocol Feed */}
        <motion.div 
          className="glassmorphism rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Live Protocol Feed</h3>
          <div className="space-y-3">
            {feed.map((message, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-gray-300">{message}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <RiskSidebar />
      </motion.div>
    </div>
  );
}
