pragma solidity =0.6.6;

import "./libs/Address.sol";
import "./libs/SafeMath.sol";
import "./libs/SafeERC20.sol";
import "./libs/Ownable.sol";
// import "./interfaces/IERC20.sol";

contract BscVault is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint public constant MIN_AMOUNT = 1e18;
    uint public swapCommission;
    address public rootToken;
    address public commissionReceiver;
    bool public pause = false;

    struct MinterEntity{
        address minter;
        address token;
        bool active;
    }

    struct EventStr{
        uint blockNumber;
        uint8 chainID;
        address from;
        address to;
        uint amount;
        // bool direction; //true: vault => minter and vice versa
        bool isComplited;
    }

    mapping (uint8 => MinterEntity) public registeredChains; // chainID => MinterEntity
    mapping (bytes32 => EventStr) public eventStore;

    event SwapStart(bytes32 indexed eventHash, uint blokNumber, uint8 indexed toChainID, address fromAddr, address indexed toAddr, uint amount);
    event SwapEnd(bytes32 indexed eventHash, uint8 indexed fromChainID, address fromAddr, address indexed toAddr, uint amount);
    
    //emit when started swap was ended in target chain
    event SwapComplited(bytes32 indexed eventHash, address fromAddr, address toAddr, uint amount);

    modifier onlyActivatedChains(uint8 chainID){
        require(registeredChains[chainID].active == true, "Only activated chains");
        _;
    }

    modifier stopBridge(){
        require(!pause, "bridge is paused");
        _;
    }

    constructor(address _rootToken) public {
        rootToken = _rootToken;
        commissionReceiver = msg.sender;
    }
    
    function pausedBridge(bool _pause) public onlyOwner{
        pause = _pause;
    }

    function setCommissionParameters(uint _swapCommission, address _commissionReceiver) external onlyOwner{
        require(_swapCommission <10000, "swapCommission must be lt 10000");
        require(_commissionReceiver != address(0));
        swapCommission = _swapCommission;
        commissionReceiver = _commissionReceiver;
    }

    function addNewChain(uint8 chainID, address minter, address token) public onlyOwner returns(bool){
        require(registeredChains[chainID].minter == address(0), 'ChainID has already been registered');
        MinterEntity memory minterEntity = MinterEntity({
            minter: minter,
            token: token,
            active: true
        });
        registeredChains[chainID] = minterEntity;
        return true;
    }

    function changeActivationChain(uint8 chainID, bool activate) public onlyOwner{
        require(registeredChains[chainID].minter != address(0), 'Chain is not registered');
        registeredChains[chainID].active = activate;
    }

    function swapStart(uint8 toChainID, address to, uint amount) public onlyActivatedChains(toChainID) stopBridge{
        require(amount >= MIN_AMOUNT && to != address(0));
        uint commission;
        if(swapCommission > 0){
            commission = _commissionCalculate(amount);
            amount = amount.sub(commission);
        }
        EventStr memory eventStr = EventStr({
            blockNumber: block.number,
            chainID: getChainID(),
            from: msg.sender,
            to: to,
            amount: amount,
            isComplited: false
        });
        bytes32 eventHash = keccak256(abi.encode(block.number, getChainID(), msg.sender, to, amount));
        require(eventStore[eventHash].blockNumber == 0, "It's avaliable just 1 swap in current block with same: chainID, from, to, amount");
        eventStore[eventHash] = eventStr;
        _depositToken(amount);
        _withdrawCommission(commission);
        emit SwapStart(eventHash, block.number, toChainID, msg.sender, to, amount);
    }

    function _depositToken(uint amount) private {
        IERC20(rootToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    function swapEnd(uint8 fromChainID, bytes32 eventHash, uint blockNumber, address from, address to, uint amount) public onlyOwner onlyActivatedChains(fromChainID) stopBridge{
        require(amount > 0 && to != address(0));
        bytes32 reseivedHash = keccak256(abi.encode(blockNumber, fromChainID, from, to, amount));
        require(reseivedHash == eventHash, "Wrong args received");
        require(eventStore[reseivedHash].isComplited == false, "Swap was ended before!");
        EventStr memory eventStr = EventStr({
            blockNumber: blockNumber,
            chainID: fromChainID,
            from: from,
            to: to,
            amount: amount,
            isComplited: true
        });
        eventStore[reseivedHash] = eventStr;

        if(swapCommission > 0){
            uint commission = _commissionCalculate(amount);
            amount = amount.sub(commission);
            _withdrawCommission(commission);
        }
        _transferToken(to, amount);
        emit SwapEnd(reseivedHash, fromChainID, from, to, amount);
    }

    function setSwapComplite(bytes32 eventHash) public onlyOwner{
        require(eventStore[eventHash].blockNumber != 0, "Event hash not finded");
        eventStore[eventHash].isComplited = true;
        address fromAddr = eventStore[eventHash].from;
        address toAddr = eventStore[eventHash].to;
        uint amount = eventStore[eventHash].amount;
        emit SwapComplited(eventHash, fromAddr, toAddr, amount);
    }

    function _transferToken(address to, uint amount) private {
        IERC20(rootToken).safeTransfer(to, amount);
    }

    function _commissionCalculate(uint amount) internal view returns(uint fee){
        fee = commissionReceiver != address(0) ? amount.mul(swapCommission).div(10000) : 0;
    }

    function _withdrawCommission(uint commission) internal{
        if(commission > 0){
            _transferToken(commissionReceiver, commission);
        }
    }
    
    function getChainID() internal pure returns (uint8) {
        uint8 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}