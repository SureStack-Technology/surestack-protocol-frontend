'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Wallet } from 'lucide-react';
import WalletModal from './WalletModal';
import { toast } from 'sonner';

export default function Header() {
  const pathname = usePathname();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/coverage', label: 'Coverage Pools' },
    { href: '/validators', label: 'Validators' },
    { href: '/governance', label: 'Governance' },
  ];

  const handleWalletClick = () => {
    if (isConnected) {
      setIsWalletOpen(true);
    } else {
      setIsConnected(true);
      setIsWalletOpen(true);
      toast.success('Wallet connected!', {
        description: 'Your wallet has been successfully connected to SureStack Protocol',
      });
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsWalletOpen(false);
    toast.info('Wallet disconnected', {
      description: 'Your wallet has been disconnected from SureStack Protocol',
    });
  };

  return (
    <>
      <header className="glassmorphism border-b border-white/10 sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-background/80 via-background/90 to-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-accent" />
              <span className="text-xl font-bold text-white">SureStack Protocol</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-accent bg-accent/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <button 
              onClick={handleWalletClick}
              className="flex items-center space-x-2 bg-gradient-to-r from-accent to-emerald-500 hover:from-accent/90 hover:to-emerald-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-accent/25 hover:scale-105"
            >
              <Wallet className="h-4 w-4" />
              <span>{isConnected ? '0xA3...B42F' : 'Connect Wallet'}</span>
            </button>
          </div>
        </div>
      </header>

      <WalletModal 
        isOpen={isWalletOpen} 
        onClose={() => setIsWalletOpen(false)}
        onDisconnect={handleDisconnect}
      />
    </>
  );
}
