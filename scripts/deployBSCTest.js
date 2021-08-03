// npx hardhat run scripts/deployBSCTest.js --network testnetBSC
// const config = require(`../config.json`);
const { ethers, network } = require(`hardhat`);

async function main() {
    let accounts = await ethers.getSigners();
    console.log(`Deployer address: ${ accounts[0].address}`,
        `\nStart deploying BSW Token contract on ${ network.name }`);

    const BSWToken = await ethers.getContractFactory(`BSWToken`);
    const bswToken = await BSWToken.deploy();
    await bswToken.deployed();
    await bswToken.deployTransaction.wait();
    console.log(`Bsw Token contract deployed to:`, bswToken.address);

    console.log(`Start deploying BSCVault contract on ${ network.name }`);
    const BscVault = await ethers.getContractFactory(`BscVault`);
    const bscVault = await BscVault.deploy(bswToken.address);

    await bscVault.deployed();
    console.log(`bscVault contract deployed to:`, bscVault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
