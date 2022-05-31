## ***General concept***
The exchange architecture consists of 2 smart contracts `BscVault` in the BSC network and` MaticMinter` in the Polygon network (MATIC)
Tokens at the beginning of the exchange in the direction of `BSC => Polygon` are blocked by the` BscVault` contract in the BSC network and the same amount is mined
(minus the established commission) by the contract `MaticMinter` in the Polygon network (MATIC).

During the reverse exchange in the direction of `Polygon => BSC`, tokens are burned in the Polygon network by the contract` MaticMinter`
and are unlocked in the BSC network from the `BscVault` contract.
> Calling of the functions of completion of exchanges is realized through the server.

## ***`Private sale` begins with the deployment of this smart contract***
1. To participate in the `token-sale`, the user must be authorized to buy. To do this, the owner (deployer) of the contract must add him to the `whitelist`  
```solidity
   function swapStart (
      uint toChainID,
      address to,
      uint amount)
```
> Before calling the function, it is necessary to approve the BSW token in the BSC network to the address of the smart contract `BscVault` for the exchange amount

On successful execution of the function, event is generated
`SwapStart (eventHash, _depositCount, toChainID, msg.sender, to, amount)`

2. When event `SwapStart` is received from the` BscVault` contract on the BSC network, the server calls the `swapEnd` function of the` MaticMinter` contract on the Polygon network (MATIC):
```solidity
   function swapEnd (
      bytes32 eventHash,
      uint _depositCount,
      uint fromChainID,
      address from,
      address to,
      uint amount)
   ```
   In this case, the amount of `amount` is minted in the Polygon network (MATIC) to the recipient` address to`.

Successful execution of the function results in
event `SwapEnd (receivedHash, _depositCount, fromChainID, from, to, amount)` c contract `MaticMinter` in Polygon network (MATIC)

3. When the server receives event `SwapEnd` from the contract` MaticMinter` in the Polygon network (MATIC),
   the exchange is completed by calling the `setSwapComplete` function of the` BscVault` contract in the BSC network:

```solidity
   function setSwapComplete (bytes32 eventHash)
```
   The exchange is complete.

## ***How to participate in the purchase `Narfex`***
1. Sale starts when `owner` (deployer) deploy this smart contract in mainnet, you have `timeEndSale` in seconds to participate in the `token-sale`

2. To participate in the `token-sale`, the user must be authorized to buy. To do this, the owner (deployer) of the contract must add him to the `whitelist`
```solidity
    function addWhitelist(address _address)
```
   In this case, `address` is address of user, whose allowed to buy tokens.

3. Then you should deposit your BUSD tokens to buy Narfex by `firstNarfexPrice` - fixed price of Narfex
```solidity
   function buyTokens(uint256 amount)
```
   `amount` it is your deposit in BUSD. Your tokens will be locked in this contract for period of time

4. After 60 days from `boughtTime` you have allowance to unlock tokens for the amount equivalent to the deposit in BUSD. And every 120 days after unlocking from the previous item, you can receive 10 percent of the remaining locked amount of Narfex. 
```solidity
   function unlock()
```
   The sale is complete.
   
5. You can also `withdraw` any unlocked amount of Narfex tokens available to you at any time.   
```solidity
   function withdraw(uint256 _numberOfTokens)
```
   `_numberOfTokens` - amont of tokens which you would like to spend
   
## ***For now you already know how to buy Narfex in private sale Good luck***
