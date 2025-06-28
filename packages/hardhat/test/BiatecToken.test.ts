import { expect } from "chai";
import { ethers } from "hardhat";

describe("BiatecToken", function () {
  let biatecToken: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const BiatecTokenFactory = await ethers.getContractFactory("BiatecToken");
    const premintAmount = ethers.parseUnits("1000000", 6); // 1,000,000 tokens with 6 decimals
    biatecToken = await BiatecTokenFactory.deploy("Token Test", "Test", 6, owner.address, premintAmount);
    await biatecToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name", async function () {
      expect(await biatecToken.name()).to.equal("Token Test");
    });

    it("Should set the right symbol", async function () {
      expect(await biatecToken.symbol()).to.equal("Test");
    });

    it("Should set the right decimals", async function () {
      expect(await biatecToken.decimals()).to.equal(6);
    });

    it("Should have zero total supply initially", async function () {
      expect(await biatecToken.totalSupply()).to.equal(ethers.parseUnits("1000000", 6));
    });

    it("Should premint tokens to minter address", async function () {
      const expectedPremint = ethers.parseUnits("1000000", 6);
      expect(await biatecToken.balanceOf(owner.address)).to.equal(expectedPremint);
      expect(await biatecToken.totalSupply()).to.equal(expectedPremint);
    });

    it("Should work with zero premint", async function () {
      const BiatecTokenFactory = await ethers.getContractFactory("BiatecToken");
      const zeroPremintToken = await BiatecTokenFactory.deploy("Zero Token", "ZERO", 6, owner.address, 0);
      await zeroPremintToken.waitForDeployment();

      expect(await zeroPremintToken.totalSupply()).to.equal(0);
      expect(await zeroPremintToken.balanceOf(owner.address)).to.equal(0);
    });

    it("Should set the right minter", async function () {
      expect(await biatecToken.minter()).to.equal(owner.address);
    });

    it("Should set the right owner", async function () {
      expect(await biatecToken.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await biatecToken.paused()).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to specified address when called by minter", async function () {
      const mintAmount = ethers.parseUnits("100", 6); // 100 tokens with 6 decimals
      const premintAmount = ethers.parseUnits("1000000", 6); // Initial premint amount
      const expectedTotalSupply = premintAmount + mintAmount;

      await biatecToken.mint(addr1.address, mintAmount);

      expect(await biatecToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await biatecToken.totalSupply()).to.equal(expectedTotalSupply);
    });

    it("Should revert when non-minter tries to mint tokens", async function () {
      const mintAmount = ethers.parseUnits("50", 6); // 50 tokens with 6 decimals

      // Try to mint from a different account (non-minter)
      await expect(biatecToken.connect(addr1).mint(addr2.address, mintAmount)).to.be.revertedWith(
        "Only minter can perform this action",
      );
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      const mintAmount = ethers.parseUnits("1000", 6);
      await biatecToken.mint(addr1.address, mintAmount);
    });

    it("Should allow anyone to burn their own tokens", async function () {
      const burnAmount = ethers.parseUnits("100", 6);
      const initialBalance = await biatecToken.balanceOf(addr1.address);
      const initialSupply = await biatecToken.totalSupply();

      await biatecToken.connect(addr1).burn(burnAmount);

      expect(await biatecToken.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
      expect(await biatecToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should allow burning from another address with approval", async function () {
      const burnAmount = ethers.parseUnits("50", 6);
      const initialBalance = await biatecToken.balanceOf(addr1.address);
      const initialSupply = await biatecToken.totalSupply();

      // Approve addr2 to burn tokens from addr1
      await biatecToken.connect(addr1).approve(addr2.address, burnAmount);

      // Burn from addr1 by addr2
      await biatecToken.connect(addr2).burnFrom(addr1.address, burnAmount);

      expect(await biatecToken.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
      expect(await biatecToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should revert when trying to burn more than balance", async function () {
      const balance = await biatecToken.balanceOf(addr1.address);
      const burnAmount = balance + ethers.parseUnits("1", 6);

      await expect(biatecToken.connect(addr1).burn(burnAmount)).to.be.revertedWithCustomError(
        biatecToken,
        "ERC20InsufficientBalance",
      );
    });

    it("Should revert when trying to burnFrom without sufficient allowance", async function () {
      const burnAmount = ethers.parseUnits("100", 6);

      await expect(biatecToken.connect(addr2).burnFrom(addr1.address, burnAmount)).to.be.revertedWithCustomError(
        biatecToken,
        "ERC20InsufficientAllowance",
      );
    });
  });

  describe("Pausable", function () {
    beforeEach(async function () {
      // Mint some tokens for testing
      const mintAmount = ethers.parseUnits("1000", 6);
      await biatecToken.mint(addr1.address, mintAmount);
    });

    it("Should allow owner to pause the contract", async function () {
      await biatecToken.pause();
      expect(await biatecToken.paused()).to.equal(true);
    });

    it("Should allow owner to unpause the contract", async function () {
      await biatecToken.pause();
      await biatecToken.unpause();
      expect(await biatecToken.paused()).to.equal(false);
    });

    it("Should revert when non-owner tries to pause", async function () {
      await expect(biatecToken.connect(addr1).pause()).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when non-owner tries to unpause", async function () {
      await biatecToken.pause();
      await expect(biatecToken.connect(addr1).unpause()).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should prevent transfers when paused", async function () {
      const transferAmount = ethers.parseUnits("100", 6);

      await biatecToken.pause();

      await expect(biatecToken.connect(addr1).transfer(addr2.address, transferAmount)).to.be.revertedWithCustomError(
        biatecToken,
        "EnforcedPause",
      );
    });

    it("Should prevent minting when paused", async function () {
      const mintAmount = ethers.parseUnits("100", 6);

      await biatecToken.pause();

      await expect(biatecToken.mint(addr2.address, mintAmount)).to.be.revertedWithCustomError(
        biatecToken,
        "EnforcedPause",
      );
    });

    it("Should prevent burning when paused", async function () {
      const burnAmount = ethers.parseUnits("100", 6);

      await biatecToken.pause();

      await expect(biatecToken.connect(addr1).burn(burnAmount)).to.be.revertedWithCustomError(
        biatecToken,
        "EnforcedPause",
      );
    });

    it("Should allow transfers after unpausing", async function () {
      const transferAmount = ethers.parseUnits("100", 6);
      const initialBalance = await biatecToken.balanceOf(addr1.address);

      await biatecToken.pause();
      await biatecToken.unpause();

      await biatecToken.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await biatecToken.balanceOf(addr1.address)).to.equal(initialBalance - transferAmount);
      expect(await biatecToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });
  });

  describe("Minter Management", function () {
    it("Should allow owner to change minter", async function () {
      expect(await biatecToken.minter()).to.equal(owner.address);

      await biatecToken.setMinter(addr1.address);

      expect(await biatecToken.minter()).to.equal(addr1.address);
    });

    it("Should emit MinterChanged event when minter is changed", async function () {
      await expect(biatecToken.setMinter(addr1.address))
        .to.emit(biatecToken, "MinterChanged")
        .withArgs(owner.address, addr1.address);
    });

    it("Should revert when non-owner tries to change minter", async function () {
      await expect(biatecToken.connect(addr1).setMinter(addr2.address)).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when trying to set minter to zero address", async function () {
      await expect(biatecToken.setMinter(ethers.ZeroAddress)).to.be.revertedWith("Minter cannot be zero address");
    });

    it("Should allow new minter to mint tokens", async function () {
      const mintAmount = ethers.parseUnits("100", 6);

      // Change minter to addr1
      await biatecToken.setMinter(addr1.address);

      // New minter should be able to mint
      await biatecToken.connect(addr1).mint(addr2.address, mintAmount);

      expect(await biatecToken.balanceOf(addr2.address)).to.equal(mintAmount);
    });

    it("Should prevent old minter from minting after minter change", async function () {
      const mintAmount = ethers.parseUnits("100", 6);

      // Change minter to addr1
      await biatecToken.setMinter(addr1.address);

      // Old minter (owner) should not be able to mint anymore
      await expect(biatecToken.mint(addr2.address, mintAmount)).to.be.revertedWith(
        "Only minter can perform this action",
      );
    });
  });

  describe("Ownership Management", function () {
    it("Should allow owner to transfer ownership", async function () {
      expect(await biatecToken.owner()).to.equal(owner.address);

      // Transfer ownership to addr1
      await biatecToken.transferOwnership(addr1.address);

      expect(await biatecToken.owner()).to.equal(addr1.address);
    });

    it("Should emit OwnershipTransferred event when ownership is transferred", async function () {
      await expect(biatecToken.transferOwnership(addr1.address))
        .to.emit(biatecToken, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
    });

    it("Should revert when non-owner tries to transfer ownership", async function () {
      await expect(biatecToken.connect(addr1).transferOwnership(addr2.address)).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when trying to transfer ownership to zero address", async function () {
      await expect(biatecToken.transferOwnership(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableInvalidOwner",
      );
    });

    it("Should allow new owner to perform owner functions", async function () {
      // Transfer ownership to addr1
      await biatecToken.transferOwnership(addr1.address);

      // New owner should be able to pause the contract
      await biatecToken.connect(addr1).pause();
      expect(await biatecToken.paused()).to.equal(true);

      // New owner should be able to change minter
      await biatecToken.connect(addr1).setMinter(addr2.address);
      expect(await biatecToken.minter()).to.equal(addr2.address);
    });

    it("Should prevent old owner from performing owner functions after transfer", async function () {
      // Transfer ownership to addr1
      await biatecToken.transferOwnership(addr1.address);

      // Old owner should not be able to pause anymore
      await expect(biatecToken.pause()).to.be.revertedWithCustomError(biatecToken, "OwnableUnauthorizedAccount");

      // Old owner should not be able to change minter anymore
      await expect(biatecToken.setMinter(addr2.address)).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should allow owner to renounce ownership", async function () {
      expect(await biatecToken.owner()).to.equal(owner.address);

      // Renounce ownership
      await biatecToken.renounceOwnership();

      expect(await biatecToken.owner()).to.equal(ethers.ZeroAddress);
    });

    it("Should emit OwnershipTransferred event when ownership is renounced", async function () {
      await expect(biatecToken.renounceOwnership())
        .to.emit(biatecToken, "OwnershipTransferred")
        .withArgs(owner.address, ethers.ZeroAddress);
    });

    it("Should prevent any owner functions after ownership is renounced", async function () {
      // Renounce ownership
      await biatecToken.renounceOwnership();

      // Nobody should be able to pause anymore
      await expect(biatecToken.pause()).to.be.revertedWithCustomError(biatecToken, "OwnableUnauthorizedAccount");

      await expect(biatecToken.connect(addr1).pause()).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );

      // Nobody should be able to change minter anymore
      await expect(biatecToken.setMinter(addr1.address)).to.be.revertedWithCustomError(
        biatecToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should maintain minter functionality after ownership transfer", async function () {
      const mintAmount = ethers.parseUnits("100", 6);

      // Mint some tokens before transfer
      await biatecToken.mint(addr2.address, mintAmount);
      expect(await biatecToken.balanceOf(addr2.address)).to.equal(mintAmount);

      // Transfer ownership
      await biatecToken.transferOwnership(addr1.address);

      // Original minter should still be able to mint
      await biatecToken.mint(addr2.address, mintAmount);
      expect(await biatecToken.balanceOf(addr2.address)).to.equal(mintAmount * 2n);
    });
  });
});
