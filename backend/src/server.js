import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initProvider } from './config/blockchain.js';
import { validateContractAddresses } from './config/contracts.js';

// Import routes
import validatorsRouter from './routes/validators.js';
import coverageRouter from './routes/coverage.js';
import governanceRouter from './routes/governance.js';
import oracleRouter from './routes/oracle.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'SureStack Protocol API Live',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/validators', validatorsRouter);
app.use('/api/coverage', coverageRouter);
app.use('/api/governance', governanceRouter);
app.use('/api/oracle', oracleRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SureStack Protocol Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      validators: '/api/validators',
      coverage: '/api/coverage',
      governance: '/api/governance',
      oracle: '/api/oracle',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    // Initialize blockchain provider
    console.log('🔧 Initializing blockchain connection...');
    initProvider();
    
    // Validate contract addresses
    console.log('✅ Validating contract addresses...');
    const addressesValid = validateContractAddresses();
    
    if (!addressesValid) {
      console.warn('⚠️  Some contract addresses are missing. Check your .env file.');
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 SureStack Protocol Backend API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   - Health check: http://localhost:${PORT}/health`);
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

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Auto-start the server
startServer();

