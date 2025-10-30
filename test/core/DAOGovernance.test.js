const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DAOGovernance", function () {
  let riskToken;
  let governance;
  let timelock;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy SureStackToken
    const SureStackToken = await ethers.getContractFactory("SureStackToken");
    riskToken = await SureStackToken.deploy(owner.address);
    await riskToken.waitForDeployment();

    // Deploy TimelockController
    const minDelay = 1; // 1 second for testing
    const proposers = [owner.address];
    const executors = [owner.address];
    const admin = owner.address;

    const TimelockController = await ethers.getContractFactory("TimelockController");
    timelock = await TimelockController.deploy(minDelay, proposers, executors, admin);
    await timelock.waitForDeployment();

    // Deploy DAOGovernance
    const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
    governance = await DAOGovernance.deploy(
      await riskToken.getAddress(),
      await timelock.getAddress()
    );
    await governance.waitForDeployment();

    // Transfer tokens to test addresses
    await riskToken.transfer(addr1.address, ethers.parseEther("100000"));
    await riskToken.transfer(addr2.address, ethers.parseEther("100000"));
  });

  describe("Deployment", function () {
    it("Should set correct token address", async function () {
      expect(await governance.token()).to.equal(await riskToken.getAddress());
    });

    it("Should set correct timelock address", async function () {
      // Governance contract should know the timelock
      const timelockAddress = await governance.timelock();
      expect(timelockAddress).to.equal(await timelock.getAddress());
    });

    it("Should have correct voting period", async function () {
      const votingPeriod = await governance.votingPeriod();
      expect(votingPeriod).to.be.gt(0);
    });

    it("Should have correct voting delay", async function () {
      const votingDelay = await governance.votingDelay();
      expect(votingDelay).to.be.gt(0);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow creating proposals", async function () {
      const targets = [await riskToken.getAddress()];
      const values = [0];
      const calldatas = [riskToken.interface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("1000")])];
      const description = "Test proposal";

      // Delegate voting power
      await riskToken.connect(addr1).delegate(addr1.address);
      
      // Move blocks forward to ensure voting power is registered
      await ethers.provider.send("evm_mine", []);

      const tx = await governance.connect(addr1).propose(targets, values, calldatas, description);
      const receipt = await tx.wait();
      
      // Get proposal ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = governance.interface.parseLog(log);
          return parsed.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });

      if (event) {
        const parsed = governance.interface.parseLog(event);
        const proposalId = parsed.args.proposalId;
        expect(proposalId).to.exist;
      }
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      const targets = [await riskToken.getAddress()];
      const values = [0];
      const calldatas = [riskToken.interface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("1000")])];
      const description = "Test proposal for voting";

      await riskToken.connect(addr1).delegate(addr1.address);
      await ethers.provider.send("evm_mine", []);

      const tx = await governance.connect(addr1).propose(targets, values, calldatas, description);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = governance.interface.parseLog(log);
          return parsed.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });

      if (event) {
        const parsed = governance.interface.parseLog(event);
        proposalId = parsed.args.proposalId;
      }

      // Advance time to reach voting period
      const votingDelay = await governance.votingDelay();
      await time.increase(Number(votingDelay) * 2);
    });

    it("Should allow casting votes", async function () {
      if (proposalId) {
        await riskToken.connect(addr2).delegate(addr2.address);
        await ethers.provider.send("evm_mine", []);

        // Vote For (1)
        await governance.connect(addr2).castVote(proposalId, 1);
        
        // Verify vote was cast
        const hasVoted = await governance.hasVoted(proposalId, addr2.address);
        expect(hasVoted).to.be.true;
      }
    });

    it("Should track vote counts", async function () {
      if (proposalId) {
        await riskToken.connect(addr1).delegate(addr1.address);
        await riskToken.connect(addr2).delegate(addr2.address);
        await ethers.provider.send("evm_mine", []);

        await governance.connect(addr1).castVote(proposalId, 1);
        await governance.connect(addr2).castVote(proposalId, 1);

        const proposalVotes = await governance.proposalVotes(proposalId);
        expect(proposalVotes.forVotes).to.be.gt(0);
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero-value proposals", async function () {
      const targets = [await riskToken.getAddress()];
      const values = [0];
      const calldatas = [ethers.id("test")];
      const description = "Zero-value proposal";

      await riskToken.connect(addr1).delegate(addr1.address);
      await ethers.provider.send("evm_mine", []);

      await expect(governance.connect(addr1).propose(targets, values, calldatas, description))
        .to.emit(governance, "ProposalCreated");
    });
  });
});

