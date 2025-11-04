#!/usr/bin/env node
/**
 * SureStack Protocol — Backend Start Script
 * Loads environment and launches Express server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env before launching
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🚀 Launching SureStack Protocol Backend...');
console.log('📁 Using environment file:', join(__dirname, '..', '.env'));

// Directly run server (auto-starts inside server.js)
import('../src/server.js');