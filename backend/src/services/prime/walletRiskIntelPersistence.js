import { prisma } from '../../lib/prisma.js'

/**
 * Persist append-only timeline rows and generate in-app Prime alerts when state meaningfully shifts.
 *
 * @param {{
 *   userId: string
 *   wallet: string
 *   chainId: number
 *   snapshotId: string
 *   score: number
 *   band: string
 *   findingsCodes: string[]
 *   trigger?: string
 * }} opts
 */
export async function persistWalletRiskTimeline({ userId, wallet, chainId, snapshotId, score, band, findingsCodes, trigger }) {
  const wl = wallet.toLowerCase()

  const last = await prisma.walletRiskHistory.findFirst({
    where: { userId, walletAddress: wl, chainId },
    orderBy: { createdAt: 'desc' },
    select: {
      score: true,
      findingsCodes: true,
      id: true,
    },
  })

  await prisma.walletRiskHistory.create({
    data: {
      userId,
      walletAddress: wl,
      chainId,
      score,
      band,
      snapshotId,
      previousScore: last?.score ?? null,
      findingsCodes: Array.from(new Set((findingsCodes || []).filter(Boolean))),
      trigger: trigger || 'API_REFRESH',
    },
  })

  await maybeCreateAlertsFromWalletShift({
    userId,
    wallet: wl,
    chainId,
    score,
    lastScore: last?.score ?? null,
    lastCodes: last?.findingsCodes || [],
    nextCodes: findingsCodes || [],
  })
}

async function maybeCreateAlertsFromWalletShift({ userId, wallet, chainId, score, lastScore, lastCodes, nextCodes }) {
  if (typeof lastScore === 'number') {
    const delta = score - lastScore
    if (delta <= -12) {
      await createDedupAlert({
        userId,
        wallet,
        chainId,
        severity: delta <= -22 ? 'HIGH' : 'WATCH',
        alertType: 'SCORE_DROP',
        title: 'Material wallet risk deterioration',
        detail: `Weighted risk score moved ${delta} versus the prior persisted scan.`,
        meta: { from: lastScore, to: score, chainId },
      })
    } else if (delta >= 15) {
      await createDedupAlert({
        userId,
        wallet,
        chainId,
        severity: 'INFO',
        alertType: 'SCORE_IMPROVEMENT',
        title: 'Wallet risk posture materially improved',
        detail: `Weighted risk score strengthened by ${delta} points versus last scan.`,
        meta: { from: lastScore, to: score, chainId },
      })
    }
  }

  const lastSet = new Set(lastCodes)
  const nextSet = new Set(nextCodes)
  for (const code of nextSet) {
    if (lastSet.has(code)) continue
    if (
      code === 'UNLIMITED_APPROVAL_SURFACE' ||
      code === 'APPROVAL_EXPOSURE' ||
      code === 'NETWORK_CLUSTERING'
    ) {
      await createDedupAlert({
        userId,
        wallet,
        chainId,
        severity: code === 'NETWORK_CLUSTERING' ? 'WATCH' : 'HIGH',
        alertType: 'THREAT_NOTICE',
        title: 'Operational exposure surface shifted',
        detail: `New intelligence driver detected: ${code.replaceAll('_', ' ')}.`,
        meta: { code, chainId },
      })
      break // avoid spamming correlated drivers in single scan batch
    }
  }
}

async function createDedupAlert({ userId, wallet, chainId, severity, alertType, title, detail, meta }) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 16)
  const existing = await prisma.primeAlert.findFirst({
    where: {
      userId,
      alertType,
      title,
      createdAt: { gte: since },
      walletAddress: wallet,
      chainId,
    },
    select: { id: true },
  })
  if (existing) return

  await prisma.primeAlert.create({
    data: {
      userId,
      walletAddress: wallet,
      chainId,
      severity,
      alertType,
      title,
      detail,
      metadata: meta || {},
    },
  })
}
