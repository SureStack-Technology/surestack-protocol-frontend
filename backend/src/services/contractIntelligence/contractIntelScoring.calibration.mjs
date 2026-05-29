/**
 * Offline scoring calibration — run: node contractIntelScoring.calibration.mjs
 * Uses mocked on-chain / explorer signals (no live API keys required).
 */
import { scoreFromSignals } from './contractIntelScoring.js'

const ADDR = {
  uniswap: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  usdc: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  weth: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2',
  vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
}

function mockProductionContract({ proxy = true, txCount = 12000, name, verified = true }) {
  return {
    onChain: {
      mode: 'live',
      isContract: true,
      bytecodeLength: 24000,
      upgradeableProxy: proxy,
      proxyImplementation: proxy ? '0x' + 'a'.repeat(40) : null,
      privilegedSelectors: { owner: true, pause: false, unpause: false, mint: false, blacklist: false },
      onChainActivityCount: txCount,
    },
    goPlus: null,
    etherscan: verified
      ? { verified: true, contractName: name, proxy: proxy ? '1' : '0', implementation: null }
      : null,
  }
}

const cases = [
  {
    label: 'Uniswap V3 Router',
    address: ADDR.uniswap,
    ...mockProductionContract({ proxy: true, txCount: 25000, name: 'SwapRouter02' }),
    expect: { min: 85, max: 95 },
  },
  {
    label: 'Permit2',
    address: ADDR.permit2,
    ...mockProductionContract({ proxy: false, txCount: 50000, name: 'Permit2' }),
    expect: { min: 80, max: 95 },
  },
  {
    label: 'USDC',
    address: ADDR.usdc,
    ...mockProductionContract({ proxy: true, txCount: 80000, name: 'FiatTokenProxy' }),
    expect: { min: 80, max: 95 },
  },
  {
    label: 'WETH',
    address: ADDR.weth,
    ...mockProductionContract({ proxy: false, txCount: 200000, name: 'WETH9' }),
    expect: { min: 90, max: 100 },
  },
  {
    label: 'Vitalik EOA',
    address: ADDR.vitalik,
    onChain: { mode: 'live', isContract: false, bytecodeLength: 0, onChainActivityCount: 1200 },
    goPlus: null,
    etherscan: null,
    expect: { eoa: true },
  },
]

let failed = 0
for (const c of cases) {
  const core = scoreFromSignals({
    onChain: c.onChain,
    goPlus: c.goPlus,
    etherscan: c.etherscan,
    tier: 'prime_lite',
    address: c.address,
    chainId: 1,
  })

  if (c.expect.eoa) {
    const ok = core.isContract === false && core.trustScore == null
    console.log(`${ok ? '✓' : '✗'} ${c.label}: EOA (score=${core.trustScore})`)
    if (!ok) failed++
    continue
  }

  const ok = core.trustScore >= c.expect.min && core.trustScore <= c.expect.max
  console.log(
    `${ok ? '✓' : '✗'} ${c.label}: ${core.trustBand} · ${core.trustScore} (expected ${c.expect.min}–${c.expect.max})`,
  )
  if (!ok) failed++
}

process.exit(failed > 0 ? 1 : 0)
