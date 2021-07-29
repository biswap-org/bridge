// npx hardhat run scripts/deployBSCTest.js --network testnet

const hre = require("hardhat");

async function main() {
  const BscVault = await hre.ethers.getContractFactory("BscVault");
  const bscVault = await BscVault.deploy();

  await greeter.deployed();

  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
