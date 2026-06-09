/**
 * Stable GET /api/auth/me payload for the frontend.
 * Explorer Access does not require Telegram — tier defaults come from DB sync.
 *
 * @param {Record<string, unknown>} user
 */
export function formatAuthMeResponse(user) {
  const wallets = Array.isArray(user.wallets) ? user.wallets : []

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    membershipTier: user.membershipTier,
    subscriptionStatus: user.subscriptionStatus,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    foundersPassLinked: user.foundersPassLinked,
    foundingMember: user.foundingMember,
    foundingCohort: user.foundingCohort,
    founderClaimedAt: user.founderClaimedAt,
    founderDiscountPercent: user.founderDiscountPercent,
    founderCredentialStatus: user.founderCredentialStatus,
    institutionalIntent: user.institutionalIntent,
    governanceAccessEligible: user.governanceAccessEligible,
    explorerComplimentaryPrimeAnalystConsumed: user.explorerComplimentaryPrimeAnalystConsumed,
    ...(user.devMembershipOverrideActive ? { devMembershipOverrideActive: true } : {}),
    wallets: wallets.map((w) => ({
      id: w.id,
      address: w.address,
      walletType: w.walletType || 'EVM',
      walletChain: w.walletChain || String(w.chainId ?? '11155111'),
      chainId: w.chainId,
      verifiedAt: w.verifiedAt,
    })),
  }
}
