import Header from '../components/Header';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'SureStack Protocol — Secure. Stack. Protect.',
  description: 'Built for digital asset protection using decentralized risk modeling.',
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
              © 2025 SureStack Technology – SureStack Protocol.
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
