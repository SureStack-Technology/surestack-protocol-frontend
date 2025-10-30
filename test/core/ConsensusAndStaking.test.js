const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConsensusAndStaking", function () {
  let riskToken;
  let consensusStaking;
  let owner;
  let validator1;
  let validator2;
  let sequencer;

  const MIN_STAKE = ethers.parseEther("1000");
  const STAKE_AMOUNT = ethers.parseEther("5000");

  beforeEach(async function () {
    // Get signers
    [owner, validator1, validator2, sequencer] = await ethers.getSigners();

    // Deploy SureStackToken
    const SureStackToken = await ethers.getContractFactory("SureStackToken");
    riskToken = await SureStackToken.deploy(owner.address);
    await riskToken.waitForDeployment();

    // Deploy ConsensusAndStaking
    const ConsensusAndStaking = await ethers.getContractFactory("ConsensusAndStaking");
    consensusStaking = await ConsensusAndStaking.deploy(
      await riskToken.getAddress(),
      sequencer.address
    );
    await consensusStaking.waitForDeployment();

    // Transfer tokens to validators
    await riskToken.transfer(validator1.address, ethers.parseEther("100000"));
    await riskToken.transfer(validator2.address, ethers.parseEther("100000"));
  });

  describe("Deployment", function () {
    it("Should set correct risk token address", async function () {
      expect(await consensusStaking.riskToken()).to.equal(await riskToken.getAddress());
    });

    it("Should set correct sequencer address", async function () {
      expect(await consensusStaking.sequencerAddress()).to.equal(sequencer.address);
    });

    it("Should initialize with correct minimum stake amount", async function () {
      expect(await consensusStaking.MIN_STAKE_AMOUNT()).to.equal(MIN_STAKE);
    });

    it("Should initialize current round ID to 0", async function () {
      expect(await consensusStaking.currentRoundId()).to.equal(0);
    });
  });

  describe("Staking", function () {
    it("Should allow validator to stake minimum amount", async function () {
      // Approve and stake
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), MIN_STAKE);
      
      await expect(consensusStaking.connect(validator1).stake(MIN_STAKE))
        .to.emit(consensusStaking, "Staked")
        .withArgs(validator1.address, MIN_STAKE);

      // Check validator profile
      const profile = await consensusStaking.validatorProfiles(validator1.address);
      expect(profile.stakedAmount).to.equal(MIN_STAKE);
      expect(profile.isActive).to.be.true;
    });

    it("Should fail if stake amount is below minimum", async function () {
      const smallAmount = ethers.parseEther("500");
      
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), smallAmount);
      
      await expect(
        consensusStaking.connect(validator1).stake(smallAmount)
      ).to.be.reverted;
    });

    it("Should fail if validator has insufficient balance", async function () {
      const poorValidator = (await ethers.getSigners())[10];
      
      await expect(
        consensusStaking.connect(poorValidator).stake(MIN_STAKE)
      ).to.be.reverted;
    });

    it("Should allow adding more stake to existing stake", async function () {
      // Initial stake
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), MIN_STAKE);
      await consensusStaking.connect(validator1).stake(MIN_STAKE);

      // Additional stake
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator1).stake(STAKE_AMOUNT);

      const profile = await consensusStaking.validatorProfiles(validator1.address);
      expect(profile.stakedAmount).to.equal(MIN_STAKE + STAKE_AMOUNT);
    });
  });

  describe("Assessment Submission", function () {
    beforeEach(async function () {
      // Setup validators
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator1).stake(STAKE_AMOUNT);
      
      await riskToken.connect(validator2).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator2).stake(STAKE_AMOUNT);
    });

    it("Should allow validator to submit assessment", async function () {
      // First, sequencer publishes round data
      const epochTimestamp = Math.floor(Date.now() / 1000);
      const correlationHash = ethers.keccak256(ethers.toUtf8Bytes("test-correlation"));
      
      // Sequencer publishes round data
      await consensusStaking.connect(sequencer).publishRoundData(epochTimestamp, correlationHash);
      
      const roundId = await consensusStaking.currentRoundId();
      const riskScore = 75;

      await expect(
        consensusStaking.connect(validator1).submitAssessment(riskScore, correlationHash)
      ).to.emit(consensusStaking, "AssessmentSubmitted")
        .withArgs(validator1.address, roundId, riskScore);
    });

    it("Should fail if non-validator tries to submit", async function () {
      const nonValidator = (await ethers.getSigners())[10];
      const riskScore = 75;
      const correlationHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

      await expect(
        consensusStaking.connect(nonValidator).submitAssessment(riskScore, correlationHash)
      ).to.be.reverted;
    });

    it("Should fail if risk score is out of range", async function () {
      const invalidScore = 150; // Should be 0-100
      const correlationHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

      await expect(
        consensusStaking.connect(validator1).submitAssessment(invalidScore, correlationHash)
      ).to.be.reverted;
    });
  });

  describe("Round Settlement", function () {
    beforeEach(async function () {
      // Setup validators
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator1).stake(STAKE_AMOUNT);
      
      await riskToken.connect(validator2).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator2).stake(STAKE_AMOUNT);
    });

    it("Should allow sequencer to settle round", async function () {
      // First, publish round data
      const epochTimestamp = Math.floor(Date.now() / 1000);
      const correlationHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await consensusStaking.connect(sequencer).publishRoundData(epochTimestamp, correlationHash);
      
      const roundId = await consensusStaking.currentRoundId();
      
      // Wait for submission window to close
      const submissionWindowEnd = await consensusStaking.currentRound().then(r => r.submissionWindowEnd);
      await ethers.provider.send("evm_increaseTime", [10]); // Increase time by 10 seconds
      await ethers.provider.send("evm_mine", []); // Mine a block
      
      await expect(consensusStaking.connect(sequencer).calculateAndSettleRound())
        .to.emit(consensusStaking, "RoundSettled");
      
      expect(await consensusStaking.currentRoundId()).to.equal(roundId + 1n);
    });

    it("Should fail if non-sequencer tries to settle", async function () {
      await expect(
        consensusStaking.connect(validator1).calculateAndSettleRound()
      ).to.be.reverted;
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      // Setup validator
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), STAKE_AMOUNT);
      await consensusStaking.connect(validator1).stake(STAKE_AMOUNT);
    });

    it("Should allow validator to request unstake", async function () {
      const unstakeAmount = ethers.parseEther("2000");
      const unlockTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
      
      await expect(consensusStaking.connect(validator1).requestUnstake(unstakeAmount))
        .to.emit(consensusStaking, "UnstakeRequested");

      const profile = await consensusStaking.validatorProfiles(validator1.address);
      expect(profile.unstakeLockoutEnd).to.be.above(BigInt(unlockTime - 100));
    });

    it("Should fail if unstake amount exceeds staked amount", async function () {
      const excessiveAmount = STAKE_AMOUNT + ethers.parseEther("1000");
      
      await expect(
        consensusStaking.connect(validator1).requestUnstake(excessiveAmount)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount stake attempt", async function () {
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), 0);
      
      await expect(
        consensusStaking.connect(validator1).stake(0)
      ).to.be.reverted;
    });

    it("Should prevent duplicate stakes within same transaction", async function () {
      await riskToken.connect(validator1).approve(await consensusStaking.getAddress(), MIN_STAKE * 2n);
      
      await consensusStaking.connect(validator1).stake(MIN_STAKE);
      
      // Try to stake again immediately
      await expect(consensusStaking.connect(validator1).stake(MIN_STAKE))
        .to.emit(consensusStaking, "Staked");
      
      const profile = await consensusStaking.validatorProfiles(validator1.address);
      expect(profile.stakedAmount).to.equal(MIN_STAKE * 2n);
    });
  });
});

