const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

let bswToken, bscVault, maticBSWToken, maticMinter, accounts;
before(async function() {
    const BswToken = await ethers.getContractFactory("BSWToken");
    bswToken = await BswToken.deploy();
    await bswToken.deployed();

    const BscVault = await ethers.getContractFactory("BscVault");
    bscVault = await BscVault.deploy(bswToken.address);

    const MaticBSWToken = await ethers.getContractFactory("MaticBSWToken");
    maticBSWToken = await MaticBSWToken.deploy();
    await maticBSWToken.deployed();

    let MaticMinter = await ethers.getContractFactory("MaticMinter");
    maticMinter = await MaticMinter.deploy(maticBSWToken.address);

    accounts = await ethers.getSigners() //await greeter.connect(addr1).setGreeting("Hallo, Erde!");

});

describe("BscVault", function() {
    it("Get init commission", async function() {
        expect(await bscVault.swapCommission()).to.equal(0);
    });

    it("check owner balance of tokens", async function(){
        let tokenBalance = await bswToken.balanceOf(accounts[0].address);
        expect(tokenBalance).to.equal(BigNumber.from("10000000000000000000000000"));
    });

    it("Add target chain to BSCVault", async function(){
        let tx = await bscVault.addNewChain(1, maticMinter.address, maticBSWToken.address);
        await tx.wait();
        let res = await bscVault.registeredChains("1");
        expect(res.minter).equal(maticMinter.address, "New chain added successfully");
    })

    it("Swap start from BSC", function(){

    });

})
