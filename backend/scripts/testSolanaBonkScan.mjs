/**
 * Local smoke test: BONK Solana scan (no HTTP auth).
 * Usage: node scripts/testSolanaBonkScan.mjs
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { analyzeSolanaRisk } from '../src/services/solanaRiskScanner/solanaScannerEngine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', '..')
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(root, '.env'), override: true })
dotenv.config({ path: join(root, '.env.local'), override: true })

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'

console.log('[testSolanaBonkScan] env', {
  hasRpc: Boolean(process.env.SOLANA_RPC_URL || process.env.HELIUS_API_KEY),
  birdeye: Boolean(process.env.BIRDEYE_API_KEY && process.env.BIRDEYE_API_KEY !== 'real_key_here'),
})

const report = await analyzeSolanaRisk(BONK)
const tc = report.tokenConcentration || {}
console.log('[testSolanaBonkScan] result', {
  success: report.success,
  error: report.error,
  trustScore: report.trustScore,
  trustBand: report.trustBand,
  marketCapUsd: tc.marketCapUsd,
  liquidityUsd: tc.liquidityUsd,
  volume24hUsd: tc.volume24hUsd,
  holderCount: tc.holderCount,
  top10: tc.top10HolderPct,
  top1: tc.largestWalletPct,
  jupiter: tc.jupiterClassification,
  mintAuthority: report.mintAuthority,
  freezeAuthority: report.freezeAuthority,
})

if (!report.success) process.exit(1)
if (tc.marketCapUsd == null && tc.liquidityUsd == null) {
  console.warn('[testSolanaBonkScan] WARN: market fields still empty')
  process.exit(2)
}
