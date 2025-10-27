'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Table from '../../components/Table';
import ChartCard from '../../components/ChartCard';
import { SkeletonTable, SkeletonChart } from '../../components/Skeleton';
import { Trophy, Zap, Clock } from 'lucide-react';

export default function ValidatorsPage() {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        const response = await fetch('/api/validators');
        const data = await response.json();
        setValidators(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching validators:', error);
        setLoading(false);
      }
    };

    fetchValidators();
  }, []);

  const columns = [
    { key: 'id', label: 'Validator ID' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'staked', label: 'Total Staked' },
    { key: 'rewards', label: 'Rewards Earned' },
  ];

  // Transform validator data for the chart
  const chartData = validators.length > 0 ? validators.map(validator => ({
    id: validator.id.split('-')[1], // Extract just the number
    accuracy: parseFloat(validator.accuracy.replace('%', '')),
  })) : [];

  // Calculate rankings (with fallback for empty arrays)
  const topValidator = validators.length > 0 ? validators.reduce((prev, current) => 
    parseFloat(prev.accuracy) > parseFloat(current.accuracy) ? prev : current
  ) : null;
  
  const fastestValidator = validators.length > 0 ? validators.reduce((prev, current) => 
    parseFloat(prev.accuracy) > parseFloat(current.accuracy) ? prev : current
  ) : null;
  
  const longestUptimeValidator = validators.length > 0 ? validators.reduce((prev, current) => 
    parseFloat(prev.accuracy) > parseFloat(current.accuracy) ? prev : current
  ) : null;

  const rankings = [
    {
      title: '🥇 Top Validator',
      subtitle: 'Highest Accuracy',
      validator: topValidator,
      metric: topValidator?.accuracy || 'N/A',
      icon: Trophy,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      title: '⚡ Fastest Validator',
      subtitle: 'Lowest Latency',
      validator: fastestValidator,
      metric: '12ms',
      icon: Zap,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: '💎 Longest Uptime',
      subtitle: 'Reliability Champion',
      validator: longestUptimeValidator,
      metric: '99.98%',
      icon: Clock,
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-80 animate-pulse"></div>
        </div>
        <div className="mb-8">
          <SkeletonTable />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Validator Performance
        </h1>
        <p className="text-gray-400">
          Monitor validator accuracy and performance metrics
        </p>
      </div>

      {/* Validator Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {rankings.map((ranking, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.1 }}
            className={`glassmorphism rounded-2xl p-6 hover:scale-105 transition-all duration-300 border-2 border-transparent bg-gradient-to-r ${ranking.gradient} bg-clip-border`}
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
              borderImage: `linear-gradient(135deg, ${ranking.gradient.replace('from-', '').replace('to-', '')}) 1`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <ranking.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">{ranking.subtitle}</p>
                <p className="text-lg font-bold text-white">{ranking.metric}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{ranking.title}</h3>
              <p className="text-gray-300">{ranking.validator?.id}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Table
          title="Validator Performance"
          columns={columns}
          data={validators}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ChartCard
          title="Validator Accuracy Distribution"
          data={chartData}
          type="bar"
          dataKey="accuracy"
        />
      </motion.div>
    </motion.div>
  );
}
