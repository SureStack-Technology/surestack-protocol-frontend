'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import ChartCard from '../../../components/ChartCard';
import { ArrowLeft, TrendingUp, DollarSign, Users, Shield } from 'lucide-react';

export default function CoveragePoolDetails() {
  const params = useParams();
  const router = useRouter();
  const [poolData, setPoolData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data for pool details
  const mockPoolData = {
    'Stablecoin Depeg': {
      name: 'Stablecoin Depeg',
      size: '$4.5M',
      rate: '2.1%',
      policies: 310,
      claimRatio: '0.8%',
      utilizationData: [
        { day: 'Mon', utilization: 65 },
        { day: 'Tue', utilization: 72 },
        { day: 'Wed', utilization: 68 },
        { day: 'Thu', utilization: 75 },
        { day: 'Fri', utilization: 78 },
      ],
      premiumsData: [
        { day: 'Mon', amount: 12500 },
        { day: 'Tue', amount: 14200 },
        { day: 'Wed', amount: 13800 },
        { day: 'Thu', amount: 15200 },
        { day: 'Fri', amount: 16800 },
      ],
    },
    'Oracle Failure': {
      name: 'Oracle Failure',
      size: '$2.3M',
      rate: '1.7%',
      policies: 180,
      claimRatio: '1.2%',
      utilizationData: [
        { day: 'Mon', utilization: 45 },
        { day: 'Tue', utilization: 52 },
        { day: 'Wed', utilization: 48 },
        { day: 'Thu', utilization: 55 },
        { day: 'Fri', utilization: 58 },
      ],
      premiumsData: [
        { day: 'Mon', amount: 8500 },
        { day: 'Tue', amount: 9200 },
        { day: 'Wed', amount: 8800 },
        { day: 'Thu', amount: 9500 },
        { day: 'Fri', amount: 10200 },
      ],
    },
    'Exchange Downtime': {
      name: 'Exchange Downtime',
      size: '$1.8M',
      rate: '3.2%',
      policies: 95,
      claimRatio: '2.1%',
      utilizationData: [
        { day: 'Mon', utilization: 35 },
        { day: 'Tue', utilization: 42 },
        { day: 'Wed', utilization: 38 },
        { day: 'Thu', utilization: 45 },
        { day: 'Fri', utilization: 48 },
      ],
      premiumsData: [
        { day: 'Mon', amount: 6800 },
        { day: 'Tue', amount: 7200 },
        { day: 'Wed', amount: 6900 },
        { day: 'Thu', amount: 7500 },
        { day: 'Fri', amount: 8200 },
      ],
    },
  };

  useEffect(() => {
    const poolName = decodeURIComponent(params.name);
    const data = mockPoolData[poolName];
    
    if (data) {
      setPoolData(data);
      setLoading(false);
    } else {
      router.push('/coverage');
    }
  }, [params.name, router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="h-64 bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Coverage Size', value: poolData.size, icon: DollarSign },
    { label: 'Premium Rate', value: poolData.rate, icon: TrendingUp },
    { label: 'Active Policies', value: poolData.policies.toString(), icon: Users },
    { label: 'Claim Ratio', value: poolData.claimRatio, icon: Shield },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/coverage')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Pools</span>
        </motion.button>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Pool Details – {poolData.name}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400"
        >
          Comprehensive analytics and performance metrics for this coverage pool
        </motion.p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ChartCard
            title="Pool Utilization Over Time"
            data={poolData.utilizationData}
            type="line"
            dataKey="utilization"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <ChartCard
            title="Premiums Collected"
            data={poolData.premiumsData}
            type="line"
            dataKey="amount"
          />
        </motion.div>
      </div>

      {/* Pool Stats */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            className="glassmorphism rounded-2xl p-6 hover:bg-white/10 hover:scale-105 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-300 transition-colors">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-white mt-1 group-hover:text-accent transition-colors">
                  {stat.value}
                </p>
              </div>
              <div className="p-3 bg-accent/20 rounded-xl group-hover:bg-accent/30 transition-colors">
                <stat.icon className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
