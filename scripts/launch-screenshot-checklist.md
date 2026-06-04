# P4 Launch Screenshot Checklist

Generated: 2026-06-04T00:27:40.381Z

## Prerequisites

- [ ] Backend running on `http://localhost:5001` with `DEV_FORCE_MEMBERSHIP_TIER=INTELLIGENCE_PRO` (or signed-in Prime account)
- [ ] Frontend running on `http://localhost:3000`
- [ ] Prime Command Center loaded at `/dashboard`

## Assets to capture

| # | Asset | Query / Mint | Chain | Screenshot file | Status |
|---|-------|--------------|-------|-----------------|--------|
| 1 | LINK | `LINK` | Ethereum | `screenshots/p4-link.png` | [ ] |
| 2 | USDC | `USDC` | Ethereum | `screenshots/p4-usdc.png` | [ ] |
| 3 | WIF | `WIF` | Solana | `screenshots/p4-wif.png` | [ ] |
| 4 | BONK | `BONK` | Solana | `screenshots/p4-bonk.png` | [ ] |
| 5 | Unknown pump.fun mint | `VGz5JN59ozf2Mtsv8R4FbCDUWxtEgmAdKEBZL4Epump` | Solana | `screenshots/p4-unknown-solana.png` | [ ] |
| 6 | Unknown EVM contract | `0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef` | Ethereum | `screenshots/p4-unknown-evm.png` | [ ] |

## Per-screenshot verification

For each capture, confirm:

- [ ] **No fabricated intelligence** on unknown assets (no risk score, no DeFi/MEME classification)
- [ ] **Correct banner** — unverified asset banner visible on unknown mints/contracts
- [ ] **Correct classification** — known assets show registry-backed labels; unknown show `UNKNOWN ASSET`
- [ ] **Correct confidence** — known > 60%; unknown ≤ 20%
- [ ] **Compliance disclaimer** visible in Prime shell footer
- [ ] **Executive Intelligence card** — risk suppressed for unknown assets

## Known asset expectations

| Asset | Expected state | Expected classification |
|-------|----------------|-------------------------|
| LINK | SCANNER_VALIDATED / FULLY_VALIDATED | Oracle / blue-chip (not UNKNOWN) |
| USDC | FULLY_VALIDATED | Stablecoin |
| WIF | SCANNER_VALIDATED | Meme / narrative (not UNKNOWN) |
| BONK | SCANNER_VALIDATED | Meme speculative |

## Unknown asset expectations

| Asset | Expected state | Expected classification | Risk score |
|-------|----------------|-------------------------|------------|
| pump.fun mint | UNKNOWN_ASSET / MINT_DETECTED | UNKNOWN ASSET | None |
| random EVM | UNKNOWN_ASSET | UNKNOWN ASSET | None |

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product | | | [ ] |
| Engineering | | | [ ] |
| Compliance | | | [ ] |

> **Note:** Automated screenshot capture is not configured (no Playwright). Capture manually and store under `scripts/screenshots/` or attach to launch ticket.
