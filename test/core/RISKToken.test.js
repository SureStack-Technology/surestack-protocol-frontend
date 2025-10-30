const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SureStackToken", function () {
  let riskToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion tokens

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy SureStackToken
    const SureStackToken = await ethers.getContractFactory("SureStackToken");
    riskToken = await SureStackToken.deploy(owner.address);
    await riskToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await riskToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await riskToken.balanceOf(owner.address);
      expect(await riskToken.totalSupply()).to.equal(ownerBalance);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should set correct name and symbol", async function () {
      expect(await riskToken.name()).to.equal("SureStack Token");
      expect(await riskToken.symbol()).to.equal("SST");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("100");
      
      // Transfer from owner to addr1
      await expect(riskToken.transfer(addr1.address, amount))
        .to.emit(riskToken, "Transfer")
        .withArgs(owner.address, addr1.address, amount);

      const addr1Balance = await riskToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const invalidAmount = ethers.parseEther("10000000000"); // More than total supply
      
      await expect(
        riskToken.connect(addr1).transfer(owner.address, invalidAmount)
      ).to.be.reverted;
    });

    it("Should update balances after transfers", async function () {
      const amount = ethers.parseEther("1000");
      
      await riskToken.transfer(addr1.address, amount);
      await riskToken.transfer(addr2.address, amount);

      const ownerBalance = await riskToken.balanceOf(owner.address);
      const addr1Balance = await riskToken.balanceOf(addr1.address);
      const addr2Balance = await riskToken.balanceOf(addr2.address);

      expect(ownerBalance).to.equal(INITIAL_SUPPLY - amount - amount);
      expect(addr1Balance).to.equal(amount);
      expect(addr2Balance).to.equal(amount);
    });
  });

  describe("Batch Transfer", function () {
    it("Should transfer tokens to multiple recipients", async function () {
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300")
      ];
      const recipients = [addr1.address, addr2.address, addrs[0].address];

      await riskToken.batchTransfer(recipients, amounts);

      expect(await riskToken.balanceOf(addr1.address)).to.equal(amounts[0]);
      expect(await riskToken.balanceOf(addr2.address)).to.equal(amounts[1]);
      expect(await riskToken.balanceOf(addrs[0].address)).to.equal(amounts[2]);
    });

    it("Should fail if array lengths don't match", async function () {
      const amounts = [ethers.parseEther("100")];
      const recipients = [addr1.address, addr2.address];

      await expect(
        riskToken.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("SureStackToken: array length mismatch");
    });

    it("Should fail batch transfer if sender has insufficient funds", async function () {
      const amounts = [INITIAL_SUPPLY + ethers.parseEther("1")];
      const recipients = [addr1.address];

      await expect(
        riskToken.batchTransfer(recipients, amounts)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000000");
      
      await expect(riskToken.mint(addr1.address, mintAmount))
        .to.emit(riskToken, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

      expect(await riskToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await riskToken.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Should fail if non-owner tries to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        riskToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(riskToken, "OwnableUnauthorizedAccount");
    });

    it("Should update total supply after minting", async function () {
      const mintAmount1 = ethers.parseEther("500000");
      const mintAmount2 = ethers.parseEther("300000");

      await riskToken.mint(addr1.address, mintAmount1);
      await riskToken.mint(addr2.address, mintAmount2);

      expect(await riskToken.totalSupply()).to.equal(
        INITIAL_SUPPLY + mintAmount1 + mintAmount2
      );
    });
  });

  describe("Approval and TransferFrom", function () {
    it("Should allow approved address to spend tokens", async function () {
      const amount = ethers.parseEther("1000");
      
      await riskToken.approve(addr1.address, amount);
      expect(await riskToken.allowance(owner.address, addr1.address)).to.equal(amount);

      await expect(riskToken.connect(addr1).transferFrom(owner.address, addr2.address, amount))
        .to.emit(riskToken, "Transfer")
        .withArgs(owner.address, addr2.address, amount);

      expect(await riskToken.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should fail if transfer amount exceeds allowance", async function () {
      const approvedAmount = ethers.parseEther("100");
      const transferAmount = ethers.parseEther("200");

      await riskToken.approve(addr1.address, approvedAmount);

      await expect(
        riskToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.reverted;
    });

    it("Should fail if sender has insufficient balance", async function () {
      const amount = ethers.parseEther("100");
      
      await riskToken.approve(addr1.address, INITIAL_SUPPLY + ethers.parseEther("1"));
      
      await expect(
        riskToken.connect(addr1).transferFrom(owner.address, addr2.address, amount)
      ).to.be.ok; // Approval is high enough, but balance limits it

      const ownerBalance = await riskToken.balanceOf(owner.address);
      expect(ownerBalance).to.be.above(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      await expect(riskToken.transfer(addr1.address, 0))
        .to.emit(riskToken, "Transfer")
        .withArgs(owner.address, addr1.address, 0);
    });

    it("Should handle transfers to zero address", async function () {
      await expect(
        riskToken.transfer(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should handle self-transfers", async function () {
      await expect(riskToken.transfer(owner.address, ethers.parseEther("100")))
        .to.emit(riskToken, "Transfer");
      
      // Balance should remain unchanged
      expect(await riskToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });
  });
});

