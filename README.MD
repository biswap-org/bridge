## ***Общая концепция***
Архитектура обмена состоит из 2-х смарт контрактов `BscVault` в сети BSC и `MaticMinter` в сети Polygon(MATIC)
Токены при начале обмена по направлению `BSC => Polygon` блокируются контрактом `BscVault` в сети BSC и майнится такое же количество 
(за вычетом установленной комиссии) контрактом `MaticMinter` в сети Polygon(MATIC). 

При обратном обмене в направлении `Polygon => BSC` токены сжигаются в сети Polygon контрактом `MaticMinter` 
и разблокируются в сети BSC с контракта `BscVault`.
>Вызов функций завершения обменов реализуется через сервер.

## ***Обмен `BSC => Polygon`***
1. Обмен инициируется пользователем вызовом функции `swapStart` контракта `BscVault` в сети BSC
```solidity
function swapStart(
        uint toChainID,
        address to,
        uint amount)
```
>Перед вызовом функции необходимо выполнить Approve токена BSW в сети BSC на адрес смарт контракта `BscVault` на сумму обмена

При успешном выполнении функции генерируется event 
`SwapStart(eventHash, _depositCount, toChainID, msg.sender, to, amount)`

2. При получении event `SwapStart` от контракта `BscVault` в сети BSC, сервер вызывает функцию `swapEnd` контракта `MaticMinter` в сети Polygon(MATIC):
```solidity
function swapEnd(
        bytes32 eventHash,
        uint _depositCount,
        uint fromChainID,
        address from,
        address to,
        uint amount)
```
При этом сумма `amount` минтится в сети Polygon(MATIC) на получателя `address to`.

Результатом успешного выполнения функции является получение 
event `SwapEnd(receivedHash, _depositCount, fromChainID, from, to, amount)` c контракта `MaticMinter` в сети Polygon(MATIC)

3. При получении сервером event `SwapEnd` c контракта `MaticMinter` в сети Polygon(MATIC), 
завершение обмена происходит вызовом функции `setSwapComplete` контракта `BscVault` в сети BSC:
```solidity
function setSwapComplete(bytes32 eventHash)
```
Обмен завершен.

## ***Обмен `Polygon => BSC`***
1. Обмен инициируется пользователем вызовом функции `swapStart` контракта `MaticMinter` в сети Polygon(MATIC)
```solidity
function swapStart(address to, uint amount)
```
При этом сумма `amount` сжигается с баланса пользователя

При успешном выполнении функции генерируется event
`SwapStart(eventHash, _depositCount, vaultChainID, msg.sender, to, amount)`

2. При получении event `SwapStart` от контракта `MaticMinter` в сети Polygon(MATIC), 
сервер вызывает функцию `swapEnd` контракта `BscVault` в сети BSC:
```solidity
function swapEnd(
        bytes32 eventHash,
        uint depositCount,
        uint fromChainID,
        address from,
        address to,
        uint amount)
```
Контракт `BscVault` в сети BSC разблокирует сумму `amount` Токена BSW в сети BSC в пользу `address to` 
на сумму `amount` за вычетом комиссии

Результатом успешного выполнения функции является получение
event `SwapEnd(receivedHash, depositCount, fromChainID, from, to, amount)` с контракта `BscVault` в сети BSC.

3. При получении сервером event `SwapEnd` c контракта `BscVault` в сети BSC,
   завершение обмена происходит вызовом функции `setSwapComplete` контракта `MaticMinter` в сети Polygon(MATIC):
```solidity
function setSwapComplete(bytes32 eventHash)
```
Обмен завершен.

## ***Контроль целостности баланса токена***

При завершении всех обменов, при выполнении условия
>`depositCount` контракта `MaticMinter` == `registeredChains[MaticChainId].depositCount` контракта `BscVault`

баланс контракта `BscVault` должен равнятся `totalSupply()` BSW токена в сети Polygon(MATIC)

Таким образом, при законченных обменах на стороне контракта `BscVault`: 
>`totalSupply()` BSW токена в сети Polygon(MATIC) может быть равен или меньше баланса токена BSW контракта `BscVault`