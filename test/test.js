const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, network } = require("hardhat");

let bswToken, bscVault, maticBSWToken, maticMinter, accounts, vaultChainId;
before(async function() {
    accounts = await ethers.getSigners() //await greeter.connect(addr1).setGreeting("Hallo, Erde!");
    const BswToken = await ethers.getContractFactory("BSWToken");
    bswToken = await BswToken.deploy();
    vaultChainId = network.config["chainId"];
    await bswToken.deployed();

    const BscVault = await ethers.getContractFactory("BscVault");
    bscVault = await BscVault.deploy(bswToken.address);

    const MaticBSWToken = await ethers.getContractFactory("MaticBSWToken");
    maticBSWToken = await MaticBSWToken.deploy();
    await maticBSWToken.deployed();
    let MaticMinter = await ethers.getContractFactory("MaticMinter");
    maticMinter = await MaticMinter.deploy(maticBSWToken.address, "2");//vaultChainId
    await maticMinter.deployed();
});

describe("BscVault", function() {

    it("Change commission to 0,1%", async function () {
        let tx = await bscVault.setCommission(10, accounts[0].address);
        await tx.wait();
        expect(await bscVault.swapCommission()).equal(10)
    })

    it("Check owner balance of tokens", async function(){
        let tokenBalance = await bswToken.balanceOf(accounts[0].address);
        expect(tokenBalance).to.equal(BigNumber.from("10000000000000000000000000"));
    });

    it("Add new chain to BSCVault", async function(){
        let tx = await bscVault.addNewChain(1, maticMinter.address, maticBSWToken.address);
        await tx.wait();
        let res = await bscVault.registeredChains("1");
        expect(res.minter).equal(maticMinter.address, "New chain added successfully");
    })

    it("Swap start from BSC", async function(){
        let val = BigNumber.from("10000000000000000000");
        let tx_allowance = await bswToken.approve(bscVault.address, val);
        let tx = await bscVault.swapStart("1", accounts[0].address, val);
        let receipt = await tx.wait();
        let event = receipt.events?.filter((x) => {return x.event === "SwapStart"});
        // console.log(val);
        console.log(event[0].args["eventHash"]);
        let abiencode = ethers.utils.defaultAbiCoder.encode(["uint", "uint", "address", "address", "string"],[1, vaultChainId, accounts[0].address, accounts[0].address, val.toHexString()])
        let checkEventHash = ethers.utils.keccak256(abiencode);
        console.log(abiencode);
        console.log(checkEventHash);

    });

})
