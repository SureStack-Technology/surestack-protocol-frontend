const { ethers } = require('hardhat')
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') })

async function main() {
  console.log('🧠 [SimulateEvents] Starting DAO event simulation...')

  const [deployer] = await ethers.getSigners()
  console.log('📝 [SimulateEvents] Deployer address:', deployer.address)

  // Get contract addresses from environment
  const daoAddress = process.env.DAO_GOVERNANCE_ADDRESS || process.env.VITE_DAO_GOVERNANCE_ADDRESS
  if (!daoAddress) {
    console.error('❌ [SimulateEvents] DAO_GOVERNANCE_ADDRESS not found in environment')
    process.exit(1)
  }

  console.log('🔍 [SimulateEvents] DAO Governance address:', daoAddress)

  // Load DAO contract
  const daoABI = require('../src/abis/DAOGovernance.json')
  const dao = new ethers.Contract(daoAddress, daoABI, deployer)

  console.log('✅ [SimulateEvents] DAO contract loaded')

  // Simulate proposal creation
  const proposals = [
    'Simulated Proposal A — Adjust Pool Premiums',
    'Simulated Proposal B — Change Quorum Fraction',
    'Simulated Proposal C — Update Reward Allocation',
  ]

  console.log('📋 [SimulateEvents] Creating proposals...')

  for (let i = 0; i < proposals.length; i++) {
    try {
      const desc = proposals[i]
      console.log(`  Creating proposal ${i + 1}: ${desc}`)

      const tx = await dao.propose(
        [ethers.ZeroAddress],
        [0],
        ['0x'],
        desc,
        { gasLimit: 2_000_000 }
      )

      console.log(`  📝 Transaction sent: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`  ✅ Proposal ${i + 1} created in block: ${receipt.blockNumber}`)

      // Find ProposalCreated event
      const proposalCreatedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = dao.interface.parseLog(log)
            return parsed && parsed.name === 'ProposalCreated'
          } catch {
            return false
          }
        }
      )

      if (proposalCreatedEvent) {
        const parsed = dao.interface.parseLog(proposalCreatedEvent)
        const proposalId = parsed.args.proposalId.toString()
        console.log(`  🆔 Proposal ID: ${proposalId}`)
      }

      // Wait a bit between proposals
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (err) {
      console.error(`  ❌ Error creating proposal ${i + 1}:`, err.message)
    }
  }

  // Simulate votes (pseudo-randomized)
  console.log('🗳️ [SimulateEvents] Simulating votes...')

  // Get recent proposals (we'll use IDs 1, 2, 3 as examples)
  // In production, you'd query ProposalCreated events
  const proposalIds = [1, 2, 3]

  for (const id of proposalIds) {
    try {
      // Check if proposal exists
      const state = await dao.state(id).catch(() => null)
      if (state === null || state === 0) {
        console.log(`  ⚠️ Proposal ${id} not found or not active, skipping vote`)
        continue
      }

      // Random vote: 0=Against, 1=For, 2=Abstain
      const support = Math.floor(Math.random() * 3)
      const voteNames = ['Against', 'For', 'Abstain']

      console.log(`  Casting ${voteNames[support]} vote for proposal ${id}...`)

      const tx = await dao.castVote(id, support, { gasLimit: 500_000 })
      console.log(`  📝 Vote transaction sent: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`  ✅ Vote cast in block: ${receipt.blockNumber}`)

      // Wait a bit between votes
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (err) {
      console.error(`  ❌ Error casting vote for proposal ${id}:`, err.message)
    }
  }

  console.log('🎉 [SimulateEvents] DAO simulation complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`  • Created ${proposals.length} proposals`)
  console.log(`  • Cast ${proposalIds.length} votes`)
  console.log('')
  console.log('🌐 View on Sepolia:')
  console.log(`  • DAO: https://sepolia.etherscan.io/address/${daoAddress}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ [SimulateEvents] Error:', error)
    process.exit(1)
  })

















