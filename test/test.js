const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, network } = require("hardhat");

let bswToken, bscVault, maticBSWToken, maticMinter, accounts, vaultChainId, decimals;
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
    decimals = await bswToken.decimals();
    decimals = new BigNumber.from(10).pow(decimals);
});

describe("Check BscVault contract", function() {

    it("Change commission to 0,1%", async function () {
        let tx = await bscVault.setCommission(10, accounts[10].address);
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

    it("Add MaticMinter as a Minter on MaticBSWToken", async function(){
        await maticBSWToken.addMinter(maticMinter.address);
        expect(await maticBSWToken.isMinter(maticMinter.address)).equal(true);
    });

    it("Swap \"val\" BSWTokens from BSC to Matic with commission 0.1%", async function(){
        let val = BigNumber.from(100).mul(decimals);
        await bswToken.approve(bscVault.address, val);
        let tx = await bscVault.swapStart("1", accounts[0].address, val);
        let receipt = await tx.wait();
        let event = receipt.events?.filter((x) => {return x.event === "SwapStart"});
        let swapCommission = await bscVault.swapCommission();
        let commissionAmount = val.mul(swapCommission).div(10000);
        let valMinusCommission = val.sub(commissionAmount);
        expect(await bswToken.balanceOf(bscVault.address)).equal(valMinusCommission);
        expect(await bswToken.balanceOf(accounts[10].address)).equal(commissionAmount);
        let txRegisteredChain = await bscVault.registeredChains("1");
        expect(txRegisteredChain.depositCount).equal(1);

        let realHash = event[0].args["eventHash"];
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
            ["uint", "uint", "uint", "address", "address", "uint"],
            [1, 2, 31337, accounts[1].address, accounts[1].address, valMinusCommission.toBigInt()]
            )
        let testEventHash = ethers.utils.keccak256(abiencode); //need to change to another chainID

        // console.log(
        //     "Current commission, percentile: ", swapCommission.toString(),
        //     "\nreal event hash: ", realHash,
        //     "\ntest event hash: ", testEventHash,
        //     "\nCommission amount: ", commissionAmount.toString(),
        //     "\nAmount to swap w/o commission, gwei: ", valMinusCommission.toString()
        //     );

        let txSwapEnd = await maticMinter.swapEnd(
            testEventHash,
            1,
            2,
            accounts[1].address,
            accounts[1].address,
            valMinusCommission.toBigInt());

        await txSwapEnd.wait();
        expect(await maticBSWToken.balanceOf(accounts[1].address)).equal(valMinusCommission);

        let txSwapComplete = await bscVault.setSwapComplete(realHash);
        await txSwapComplete.wait();
        let txEventStore = await bscVault.eventStore(realHash);
        expect(txEventStore.isCompleted).equal(true);
    });

    it("Swap \"val\" BSWTokens from BSC to Matic without commission", async function(){
        await bscVault.setCommission(0, accounts[10].address);
        expect(await bscVault.swapCommission()).equal(0);
        let balanceBefore = await bswToken.balanceOf(bscVault.address);
        let val = BigNumber.from(100).mul(decimals);
        await bswToken.approve(bscVault.address, val);
        let tx = await bscVault.swapStart("1", accounts[0].address, val);
        let receipt = await tx.wait();
        let event = receipt.events?.filter((x) => {return x.event === "SwapStart"});
        let balanceAfter = await bswToken.balanceOf(bscVault.address);
        expect(balanceAfter.sub(balanceBefore)).equal(val);

        let realHash = event[0].args["eventHash"];
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 2, 31337, accounts[2].address, accounts[2].address, val]
            )
        let testEventHash = ethers.utils.keccak256(abiencode); //need to change to another chainID

        let txSwapEnd = await maticMinter.swapEnd(
            testEventHash,
            1,
            2,
            accounts[2].address,
            accounts[2].address,
            val);

        await txSwapEnd.wait();
        expect(await maticBSWToken.balanceOf(accounts[2].address)).equal(val);

        let txSwapComplete = await bscVault.setSwapComplete(realHash);
        await txSwapComplete.wait();
        let txEventStore = await bscVault.eventStore(realHash);
        expect(txEventStore.isCompleted).equal(true);
    });

    it("Check if we can do StartSwap on bscVault 2 times in a row with 1 approve", async function (){
        let val = BigNumber.from(100).mul(decimals);
        let currentAlowances = await bswToken.allowance(accounts[0].address, bscVault.address);
        expect(currentAlowances).equal(0);
        await bswToken.approve(bscVault.address, val);
        await bscVault.swapStart("1", accounts[0].address, val);
        await expect(bscVault.swapStart("1", accounts[0].address, val)).to.be
            .revertedWith('Not enough allowance');
    });

    it("Try SwapStart with unregistered ChainID", async function (){
        let val = BigNumber.from(100).mul(decimals);
        await bswToken.approve(bscVault.address, val);
        await expect(bscVault.swapStart("2", accounts[1].address, val)).to.be
            .revertedWith('Only activated chains');
    })

    it("Check over max amount swap start bscVault", async function (){
        let val = BigNumber.from(1000).mul(decimals);
        await bswToken.approve(bscVault.address, val.mul(decimals));
        await expect(bscVault.swapStart("1", accounts[0].address, val)).to.be
            .emit(bscVault, "SwapStart");
        await expect(bscVault.swapStart("1", accounts[0].address, val.add(1))).to.be
            .revertedWith('Wrong amount');

    });

    it("Check phase overload on bscVault", async function (){
        let totalSwapEnd = await maticMinter.totalSwapEnd();
        let val = BigNumber.from(5000).mul(decimals).sub(totalSwapEnd);
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 2, 31337, accounts[2].address, accounts[2].address, val.add(1)]
            )
        let testEventHash = ethers.utils.keccak256(abiencode); //need to change to another chainID

        await expect(maticMinter.swapEnd(
            testEventHash,
            1,
            2,
            accounts[2].address,
            accounts[2].address,
            val.add(1))).to.be.revertedWith("Current phase completed");

        abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 2, 31337, accounts[0].address, accounts[0].address, val]
            )
        testEventHash = ethers.utils.keccak256(abiencode); //need to change to another chainID

        await expect(maticMinter.swapEnd(
            testEventHash,
            1,
            2,
            accounts[0].address,
            accounts[0].address,
            val)).to.be.emit(maticMinter, "SwapEnd");

    })
})

describe("Check MaticMinter contract", function(){
    it("Swap \"val\" BSWTokens from Matic to BSC with commission 0,1% on BSCVault size", async function(){
        let val = await maticBSWToken.balanceOf(accounts[1].address);
        await bscVault.setCommission(10, accounts[10].address);
        console.log("Total supply MaticBSWToken before swapStart: ", (await maticBSWToken.totalSupply()).toString());
        let tx = await maticMinter.connect(accounts[1]).swapStart(accounts[1].address, val);
        let receipt = await tx.wait();
        let event = receipt.events?.filter((x) => {return x.event === "SwapStart"});
        console.log("Event StartSwap with amount: ", (event[0].args["amount"]).toString());
        let balanceAfter = await maticBSWToken.balanceOf(accounts[1].address);
        expect(balanceAfter).equal(0);
        console.log("Total supply MaticBSWToken after swapStart: ", (await maticBSWToken.totalSupply()).toString());

        let realHash = event[0].args["eventHash"];
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 1, 31337, accounts[1].address, accounts[1].address, val.toBigInt()]
            )
        let testEventHash = ethers.utils.keccak256(abiencode);

        let txSwapEnd = await bscVault.swapEnd(testEventHash, 1, 1, accounts[1].address, accounts[1].address, val);
        await txSwapEnd.wait();
        let swapCommission = await bscVault.swapCommission();
        let commissionAmount = val.mul(swapCommission).div(10000);
        let valMinusCommission = val.sub(commissionAmount);
        expect(await bswToken.balanceOf(accounts[1].address)).equal(valMinusCommission);
        let txSwapComplete = await maticMinter.setSwapComplete(realHash);
        await txSwapComplete.wait();
        let txEventStore = await maticMinter.eventStore(realHash);
        expect(txEventStore.isCompleted).equal(true);
    });

    it("Swap \"val\" BSWTokens from Matic to BSC without commission", async function(){
        let val = await maticBSWToken.balanceOf(accounts[2].address);
        await bscVault.setCommission(0, accounts[10].address);
        console.log("Total supply MaticBSWToken before swapStart: ", (await maticBSWToken.totalSupply()).toString());
        let tx = await maticMinter.connect(accounts[2]).swapStart(accounts[2].address, val);
        let receipt = await tx.wait();
        let event = receipt.events?.filter((x) => {return x.event === "SwapStart"});
        console.log("Event StartSwap with amount: ", (event[0].args["amount"]).toString());
        let balanceAfterSwap = await maticBSWToken.balanceOf(accounts[2].address);
        expect(balanceAfterSwap).equal(0);
        console.log("Total supply MaticBSWToken after swapStart: ", (await maticBSWToken.totalSupply()).toString());

        let realHash = event[0].args["eventHash"];
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 1, 31337, accounts[2].address, accounts[2].address, val]
            )
        let testEventHash = ethers.utils.keccak256(abiencode);

        console.log("BSCVault account before Swap end", (await bswToken.balanceOf(bscVault.address)).toString())
        let txSwapEnd = await bscVault.swapEnd(testEventHash, 1, 1, accounts[2].address, accounts[2].address, val);
        await txSwapEnd.wait();
        let txSwapComplete = await maticMinter.setSwapComplete(realHash);
        await txSwapComplete.wait();
        let txEventStore = await maticMinter.eventStore(realHash);
        expect(txEventStore.isCompleted).equal(true);
        console.log("BSCVault account after Swap end", (await bswToken.balanceOf(bscVault.address)).toString());
    });

    it("Check over max amount swap start maticMinter", async function (){
        let val = BigNumber.from(1000).mul(decimals);
        let abiencode = ethers.utils.defaultAbiCoder
            .encode(
                ["uint", "uint", "uint", "address", "address", "uint"],
                [1, 2, 31337, accounts[0].address, accounts[0].address, val.mul(2)]
            )
        let testEventHash = ethers.utils.keccak256(abiencode); //need to change to another chainID
        await maticMinter.setPhase(2);
        let txSwapEnd = await maticMinter.swapEnd(
            testEventHash,
            1,
            2,
            accounts[0].address,
            accounts[0].address,
            val.mul(2));
        await expect(maticMinter.swapStart(accounts[0].address, val)).to.be
            .emit(maticMinter, "SwapStart");
        await expect(maticMinter.swapStart(accounts[0].address, val.add(1))).to.be
            .revertedWith('Wrong amount');
    });



})