// npx hardhat run scripts/deployMaticTest.js --network testnetMatic
// const config = require(`../config.json`);
const { ethers, network } = require(`hardhat`);
const {expect} = require("chai");

async function main() {
    const vaultChainID = 97;
    let accounts = await ethers.getSigners();
    console.log(`Deployer address: ${ accounts[0].address}`,
        `\nStart deploying Matic BSW Token contract on ${ network.name }`);

    const MaticBSWToken = await ethers.getContractFactory(`MaticBSWToken`);
    const maticBSWToken = await MaticBSWToken.deploy();
    await maticBSWToken.deployed();
    await maticBSWToken.deployTransaction.wait();
    console.log(`Matic Bsw Token contract deployed to:`, maticBSWToken.address);

    console.log(`Start deploying MaticMinter contract on ${ network.name }`);
    const MaticMinter = await ethers.getContractFactory(`MaticMinter`);
    const maticMinter = await MaticMinter.deploy(maticBSWToken.address, vaultChainID);

    await maticMinter.deployed();
    console.log(`MaticMinter contract deployed to:`, maticMinter.address);

    console.log(`Add MaticMinter contract as Minter on token contract`);
    await maticBSWToken.addMinter(maticMinter.address);
    if (await maticBSWToken.isMinter(maticMinter.address)){
        console.log(`Matic minter was successfully added as Minter on token contract`);
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
