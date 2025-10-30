#!/usr/bin/env node

/**
 * Start script for SureStack Protocol Backend
 * Loads environment variables and starts the server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { start } from '../src/server.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🚀 Starting SureStack Protocol Backend...');
console.log('📁 Environment loaded from:', join(__dirname, '..', '.env'));

// Import and start the server
import '../src/server.js';

