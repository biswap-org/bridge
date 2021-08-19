## ***General concept***
The exchange architecture consists of 2 smart contracts `BscVault` in the BSC network and` MaticMinter` in the Polygon network (MATIC)
Tokens at the beginning of the exchange in the direction of `BSC => Polygon` are blocked by the` BscVault` contract in the BSC network and the same amount is mined
(minus the established commission) by the contract `MaticMinter` in the Polygon network (MATIC).

During the reverse exchange in the direction of `Polygon => BSC`, tokens are burned in the Polygon network by the contract` MaticMinter`
and are unlocked in the BSC network from the `BscVault` contract.
> Calling of the functions of completion of exchanges is realized through the server.

## ***Exchange `BSC => Polygon`***
1. The exchange is initiated by the user by calling the `swapStart` function of the` BscVault` contract in the BSC network
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

## ***Exchange `Polygon => BSC`***
1. The exchange is initiated by the user by calling the `swapStart` function of the` MaticMinter` contract in the Polygon network (MATIC)
```solidity
   function swapStart (address to, uint amount)
```
   In this case, the amount of `amount` is burned from the user's balance

On successful execution of the function, event is generated
`SwapStart (eventHash, _depositCount, vaultChainID, msg.sender, to, amount)`

2. Upon receipt of event `SwapStart` from the contract` MaticMinter` in the Polygon network (MATIC),
   the server calls the `swapEnd` function of the` BscVault` contract on the BSC network:
```solidity
   function swapEnd (
      bytes32 eventHash,
      uint depositCount,
      uint fromChainID,
      address from,
      address to,
      uint amount)
```
   The BscVault contract in the BSC network will unlock the BSW Token amount in the BSC network in favor of the address to
   for the amount `amount` minus the commission

Successful execution of the function results in
event `SwapEnd (receivedHash, depositCount, fromChainID, from, to, amount)` from contract `BscVault` on the BSC network.

3. When the server receives event `SwapEnd` from the` BscVault` contract in the BSC network,
   the exchange is completed by calling the `setSwapComplete` function of the` MaticMinter` contract in the Polygon network (MATIC):
```solidity
   function setSwapComplete (bytes32 eventHash)
```
   The exchange is complete.

## ***Controlling the integrity of the token balance***

Upon completion of all exchanges, if the condition
> `depositCount` of contract` MaticMinter` == `registeredChains [MaticChainId] .depositCount` of contract` BscVault`

the balance of the `BscVault` contract must equal` totalSupply () `BSW token in the Polygon network (MATIC)

Thus, with completed exchanges on the side of the `BscVault` contract:
> `totalSupply ()` BSW token in the Polygon network (MATIC) can be equal to or less than the BSW token balance of the `BscVault` contract