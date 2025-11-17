'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Table from '../../components/Table';
import { SkeletonTable } from '../../components/Skeleton';

export default function CoveragePage() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await fetch('/api/pools');
        const data = await response.json();
        setPools(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pools:', error);
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  const columns = [
    { key: 'name', label: 'Pool Name' },
    { key: 'size', label: 'Coverage Size' },
    { key: 'rate', label: 'Premium Rate' },
    { key: 'policies', label: 'Active Policies' },
    { key: 'status', label: 'Status' },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-80 animate-pulse"></div>
        </div>
        <SkeletonTable />
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
          Active Coverage Pools
        </h1>
        <p className="text-gray-400">
          Browse and purchase coverage from active risk pools
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Table
          title="Coverage Pools"
          columns={columns}
          data={pools}
          actionButton={{
            label: 'Buy Coverage',
          }}
          onRowClick={(pool) => router.push(`/coverage/${encodeURIComponent(pool.name)}`)}
        />
      </motion.div>
    </motion.div>
  );
}
