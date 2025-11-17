'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { proposals } from '../../data/mockData';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function GovernancePage() {
  const [governanceProposals, setGovernanceProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({});

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const response = await fetch('/api/proposals');
        const data = await response.json();
        setGovernanceProposals(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching proposals:', error);
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  // Initialize mock vote data
  useEffect(() => {
    const mockVotes = {};
    governanceProposals.forEach(proposal => {
      mockVotes[proposal.id] = {
        for: Math.floor(Math.random() * 40) + 30, // 30-70%
        against: Math.floor(Math.random() * 40) + 30, // 30-70%
      };
    });
    setVotes(mockVotes);
  }, [governanceProposals]);

  const handleVote = (proposalId, voteType) => {
    const proposal = governanceProposals.find(p => p.id === proposalId);
    toast.success(`✅ Vote submitted for ${proposalId}`, {
      description: `Your ${voteType} vote for "${proposal?.title}" has been recorded`,
    });
    
    // Update vote counts
    setVotes(prev => ({
      ...prev,
      [proposalId]: {
        ...prev[proposalId],
        [voteType]: prev[proposalId][voteType] + 1,
      }
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Passed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Voting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-80 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glassmorphism rounded-2xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-700 rounded w-12"></div>
                <div className="h-6 bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-700 rounded w-full mb-3"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-700 rounded flex-1"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
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
          Active Governance Proposals
        </h1>
        <p className="text-gray-400">
          Participate in protocol governance and vote on proposals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {governanceProposals.map((proposal, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glassmorphism rounded-2xl p-6 hover:bg-white/10 hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-400">{proposal.id}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                {proposal.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {proposal.title}
            </h3>
            
            {/* Voting Progress Bar */}
            {votes[proposal.id] && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>For: {votes[proposal.id].for}%</span>
                  <span>Against: {votes[proposal.id].against}%</span>
                </div>
                <div className="flex h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${votes[proposal.id].for}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.div 
                    className="bg-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${votes[proposal.id].against}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Voting Buttons */}
            {proposal.status === 'Active' && (
              <div className="flex space-x-2 mb-3">
                <button 
                  onClick={() => handleVote(proposal.id, 'for')}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Vote For</span>
                </button>
                <button 
                  onClick={() => handleVote(proposal.id, 'against')}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Vote Against</span>
                </button>
              </div>
            )}

            <div className="flex space-x-2">
              <button className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors">
                View Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
