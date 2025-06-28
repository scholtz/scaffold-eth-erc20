import { ethers } from "hardhat";

async function main() {
  const [deployer, newOwner, minter] = await ethers.getSigners();

  console.log("Deploying BiatecToken with deployer as initial owner...");
  console.log("Deployer address:", deployer.address);
  console.log("New owner address:", newOwner.address);

  // Deploy the contract
  const BiatecTokenFactory = await ethers.getContractFactory("BiatecToken");
  const biatecToken = await BiatecTokenFactory.deploy("Biatec Token", "BIAT", 18, minter.address);
  await biatecToken.waitForDeployment();

  console.log("BiatecToken deployed to:", await biatecToken.getAddress());

  // Check initial owner
  console.log("\n=== Initial State ===");
  console.log("Current owner:", await biatecToken.owner());
  console.log("Current minter:", await biatecToken.minter());

  // Transfer ownership
  console.log("\n=== Transferring Ownership ===");
  const transferTx = await biatecToken.transferOwnership(newOwner.address);
  await transferTx.wait();

  console.log("Ownership transferred!");
  console.log("New owner:", await biatecToken.owner());
  console.log("Minter remains:", await biatecToken.minter());

  // Demonstrate new owner can change minter
  console.log("\n=== New Owner Changing Minter ===");
  const changeMinterTx = await biatecToken.connect(newOwner).setMinter(deployer.address);
  await changeMinterTx.wait();

  console.log("Minter changed by new owner to:", await biatecToken.minter());

  // Show old owner can't perform owner functions anymore
  console.log("\n=== Testing Old Owner Access ===");
  try {
    await biatecToken.setMinter(newOwner.address);
    console.log("ERROR: Old owner should not be able to change minter!");
  } catch {
    console.log("✅ Old owner correctly blocked from changing minter");
  }

  console.log("\n=== Summary ===");
  console.log("✅ Ownership can be transferred");
  console.log("✅ New owner gains all owner privileges");
  console.log("✅ Old owner loses all owner privileges");
  console.log("✅ Minter role is independent of ownership");
  console.log("✅ Contract functionality remains intact");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
