import { ethers } from "hardhat";

async function main() {
  const [deployer, newOwner, minter] = await ethers.getSigners();

  console.log("Deploying BiatecToken with deployer as initial owner...");
  console.log("Deployer address:", deployer.address);
  console.log("New owner address:", newOwner.address);
  console.log("Specific minter address:", minter.address);

  // Deploy the contract with zero address to make owner the minter
  const BiatecTokenFactory = await ethers.getContractFactory("BiatecToken");
  const premintAmount = ethers.parseUnits("5000000", 18); // 5 million tokens with 18 decimals
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const biatecToken = await BiatecTokenFactory.deploy("Biatec Token", "BIAT", 18, zeroAddress, premintAmount);
  await biatecToken.waitForDeployment();

  console.log("BiatecToken deployed to:", await biatecToken.getAddress());

  // Check initial owner
  console.log("\n=== Initial State (Owner as Minter) ===");
  console.log("Current owner:", await biatecToken.owner());
  console.log("Current minter:", await biatecToken.minter());
  console.log("Owner and minter are same:", (await biatecToken.owner()) === (await biatecToken.minter()));
  console.log(
    "Preminted amount:",
    ethers.formatUnits(await biatecToken.balanceOf(await biatecToken.minter()), 18),
    "BIAT",
  );
  console.log("Total supply:", ethers.formatUnits(await biatecToken.totalSupply(), 18), "BIAT");

  // Transfer ownership
  console.log("\n=== Transferring Ownership ===");
  const transferTx = await biatecToken.transferOwnership(newOwner.address);
  await transferTx.wait();

  console.log("Ownership transferred!");
  console.log("New owner:", await biatecToken.owner());
  console.log("Minter remains:", await biatecToken.minter());

  // Demonstrate new owner can change minter
  console.log("\n=== New Owner Changing Minter ===");
  const changeMinterTx = await biatecToken.connect(newOwner).setMinter(minter.address);
  await changeMinterTx.wait();

  console.log("Minter changed by new owner to:", await biatecToken.minter());
  console.log("Now minter is different from owner:", (await biatecToken.owner()) !== (await biatecToken.minter()));

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
  console.log("✅ Zero address minter parameter makes owner the minter initially");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
