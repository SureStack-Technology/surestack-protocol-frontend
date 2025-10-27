'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Copy, ExternalLink } from 'lucide-react';

export default function WalletModal({ isOpen, onClose, onDisconnect }) {
  const [copied, setCopied] = useState(false);
  const mockAddress = '0xA3B2C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3B42F';
  const mockBalance = '15,340 RISK';

  const copyAddress = () => {
    navigator.clipboard.writeText(mockAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glassmorphism rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Wallet className="h-6 w-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-white">Wallet Connected</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Address</span>
                  <button
                    onClick={copyAddress}
                    className="flex items-center space-x-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">
                  {mockAddress.slice(0, 6)}...{mockAddress.slice(-4)}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-400">Balance</span>
                <p className="text-white text-lg font-semibold">{mockBalance}</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/5 transition-colors">
                  View on Explorer
                </button>
                <button
                  onClick={() => {
                    onDisconnect();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
