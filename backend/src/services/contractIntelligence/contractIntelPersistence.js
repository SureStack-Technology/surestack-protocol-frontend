import { prisma } from '../../lib/prisma.js'

/**
 * @param {string} userId
 * @param {object} reportPayload full analyze payload
 */
export async function persistContractIntelligenceReport(userId, reportPayload) {
  const address = String(reportPayload.address).toLowerCase()
  const chainId = Number(reportPayload.chainId)
  const tier = String(reportPayload.tier || 'prime_lite')

  const row = await prisma.contractIntelligenceReport.upsert({
    where: {
      userId_contractAddress_chainId: {
        userId,
        contractAddress: address,
        chainId,
      },
    },
    create: {
      userId,
      contractAddress: address,
      chainId,
      tier,
      trustScore: reportPayload.trustScore != null ? Number(reportPayload.trustScore) : 0,
      trustBand: reportPayload.trustBand != null ? String(reportPayload.trustBand) : 'N_A',
      report: reportPayload,
    },
    update: {
      tier,
      trustScore: reportPayload.trustScore != null ? Number(reportPayload.trustScore) : 0,
      trustBand: reportPayload.trustBand != null ? String(reportPayload.trustBand) : 'N_A',
      report: reportPayload,
    },
  })

  await prisma.contractIntelligenceHistory.create({
    data: {
      userId,
      contractAddress: address,
      chainId,
      tier,
      trustScore: row.trustScore,
      trustBand: row.trustBand,
      trigger: 'API_ANALYZE',
      reportId: row.id,
    },
  })

  return row
}

export async function getCachedContractReport(userId, address, chainId) {
  return prisma.contractIntelligenceReport.findUnique({
    where: {
      userId_contractAddress_chainId: {
        userId,
        contractAddress: String(address).toLowerCase(),
        chainId: Number(chainId),
      },
    },
  })
}

export async function listContractHistory(userId, address, chainId, limit = 12) {
  return prisma.contractIntelligenceHistory.findMany({
    where: {
      userId,
      contractAddress: String(address).toLowerCase(),
      chainId: Number(chainId),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      trustScore: true,
      trustBand: true,
      tier: true,
      trigger: true,
      createdAt: true,
    },
  })
}
