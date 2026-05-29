import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initProvider } from './config/blockchain.js';
import { validateContractAddresses } from './config/contracts.js';
import { prisma } from './lib/prisma.js';

import validatorsRouter from './routes/validators.js';
import coverageRouter from './routes/coverage.js';
import governanceRouter from './routes/governance.js';
import oracleRouter from './routes/oracle.js';
import marketMacroRouter from './routes/marketMacro.js';
import accountRouter from './routes/account.js';
import walletAuthRouter from './routes/walletAuth.js';
import clerkWebhookRouter from './routes/clerkWebhook.js';
import billingRouter from './routes/billing.js';
import membershipRouter from './routes/membership.js';
import walletRiskRouter from './routes/walletRisk.js';
import primeIntelRouter from './routes/primeIntel.js';
import contractIntelRouter from './routes/contractIntel.js';
import solanaScannerRouter from './routes/solanaScanner.js';
import foundersPassRouter from './routes/foundersPass.js';
import intelligenceRouter from './routes/intelligence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Monorepo: backend/.env first, then repo root .env / .env.local fill missing keys (e.g. ALCHEMY_API_KEY). */
const backendEnv = join(__dirname, '..', '.env');
const rootEnv = join(__dirname, '..', '..', '.env');
const rootLocalEnv = join(__dirname, '..', '..', '.env.local');
dotenv.config({ path: backendEnv });
dotenv.config({ path: rootEnv });
dotenv.config({ path: rootLocalEnv, override: true });

const app = express();
const PORT = process.env.PORT || 5001;

const alchemyRaw = process.env.ALCHEMY_API_KEY;
console.log('[env] wallet risk:', {
  hasAlchemyKey: Boolean(alchemyRaw && String(alchemyRaw).trim()),
  alchemyKeyPreview: alchemyRaw && String(alchemyRaw).trim()
    ? `${String(alchemyRaw).trim().slice(0, 6)}...`
    : null,
});

console.log('[env] loaded', {
  PORT,
  hasClerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  allowedOrigins: process.env.ALLOWED_ORIGINS || '(unset)',
  nodeEnv: process.env.NODE_ENV || '(unset)',
  devForceMembershipTier:
    process.env.NODE_ENV === 'development' && process.env.DEV_FORCE_MEMBERSHIP_TIER
      ? process.env.DEV_FORCE_MEMBERSHIP_TIER
      : null,
});

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function resolveCorsOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && String(raw).trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[cors] ALLOWED_ORIGINS unset — allowing default local dev origins:', DEFAULT_DEV_ORIGINS.join(', '));
    return DEFAULT_DEV_ORIGINS;
  }
  console.warn('[cors] ALLOWED_ORIGINS unset in production — reflecting request Origin (set ALLOWED_ORIGINS for stricter CORS)');
  return true;
}

const corsOriginOption = resolveCorsOrigins();

app.use(
  cors({
    origin: corsOriginOption,
    credentials: true,
  })
);

// Clerk webhooks require raw body for Svix verification — mount BEFORE express.json()
app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }), clerkWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'SureStack Protocol API Live',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    auth: Boolean(process.env.CLERK_SECRET_KEY),
    database: Boolean(process.env.DATABASE_URL),
  });
});

app.use('/api/auth', accountRouter);
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/billing', billingRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/wallet', walletRiskRouter);
app.use('/api/prime', primeIntelRouter);
app.use('/api/prime/contracts', contractIntelRouter);
app.use('/api/prime/solana', solanaScannerRouter);
app.use('/api/founders-pass', foundersPassRouter);
app.use('/api/intelligence', intelligenceRouter);

app.use('/api/validators', validatorsRouter);
app.use('/api/coverage', coverageRouter);
app.use('/api/governance', governanceRouter);
app.use('/api/oracle', oracleRouter);
app.use('/api/market', marketMacroRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'SureStack Protocol Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/me',
      walletNonce: '/api/auth/wallet/nonce',
      webhook: '/api/webhooks/clerk',
      validators: '/api/validators',
      coverage: '/api/coverage',
      governance: '/api/governance',
      oracle: '/api/oracle',
      billingFoundersStub: 'POST /api/billing/founders/checkout-stub (deprecated — returns 410)',
      membershipWaitlistPro: 'POST /api/membership/waitlist/pro',
      membershipRequestStrategic: 'POST /api/membership/request/strategic',
      membershipFoundingClaim: 'POST /api/membership/founding-member/claim',
      foundersPassStatus: 'GET /api/founders-pass/status',
      foundersPassSubmitX: 'POST /api/founders-pass/submit-x',
      foundersPassSubmitEngagement: 'POST /api/founders-pass/submit-engagement',
      foundersPassSubmitTelegram: 'POST /api/founders-pass/submit-telegram',
    },
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

async function startServer() {
  try {
    console.log('🔧 Initializing blockchain connection...');
    initProvider();

    console.log('✅ Validating contract addresses...');
    const addressesValid = validateContractAddresses();

    if (!addressesValid) {
      console.warn('⚠️  Some contract addresses are missing. Check your .env file.');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 SureStack Protocol Backend API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   - Health check: http://localhost:${PORT}/health`);
      console.log(`   - Auth profile: http://localhost:${PORT}/api/auth/me`);
      console.log(`   - Clerk webhook: http://localhost:${PORT}/api/webhooks/clerk`);
      console.log(`   - Validators: http://localhost:${PORT}/api/validators`);
      console.log(`   - Coverage: http://localhost:${PORT}/api/coverage`);
      console.log(`   - Governance: http://localhost:${PORT}/api/governance`);
      console.log(`   - Oracle: http://localhost:${PORT}/api/oracle\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});

startServer();
