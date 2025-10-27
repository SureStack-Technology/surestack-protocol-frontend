import Header from '../components/Header';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'RISK Protocol - Decentralized Risk Assessment',
  description: 'Decentralized risk assessment and coverage network for Web3',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="glassmorphism border-t border-white/10 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-gray-400">
              © 2025 RISK Protocol – Zug Foundation.
            </p>
          </div>
        </footer>
        <Toaster 
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1F2937',
              border: '1px solid #374151',
              color: '#E5E7EB',
            },
          }}
        />
      </body>
    </html>
  );
}
