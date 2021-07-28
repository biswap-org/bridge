pragma solidity =0.6.6;

import "./libs/Address.sol";
import "./libs/SafeMath.sol";
import "./libs/SafeERC20.sol";
import "./libs/Ownable.sol";
import "./interfaces/IERC20.sol";

contract MaticMinter is Ownable{
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    uint public constant MIN_AMOUNT = 1e18;
    address public tokenAddress;
    bool public pause = false;
    
    struct EventStr{
        uint blockNumber;
        uint8 chainID;
        address from;
        address to;
        uint amount;
        // bool direction; //true: vault => minter and vice versa
        bool isComplited;
    }

    mapping (bytes32 => EventStr) public eventStore;

    event SwapStart(bytes32 indexed eventHash, uint blokNumber, address fromAddr, address indexed toAddr, uint amount);
    event SwapEnd(bytes32 indexed eventHash, uint8 indexed fromChainID, address fromAddr, address indexed toAddr, uint amount);
    
    //emit when started swap was ended in target chain
    event SwapComplited(bytes32 indexed eventHash, address fromAddr, address toAddr, uint amount);

    constructor(address _tokenAddress) public{
        tokenAddress = _tokenAddress;
    }
    
    modifier stopBridge(){
        require(!pause, "bridge is paused");
        _;
    }

    function swapStart(address to, uint amount) public stopBridge{
        require(amount >= MIN_AMOUNT && to != address(0));
        
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
        IERC20(tokenAddress).safeBurn(msg.sender, amount);
        emit SwapStart(eventHash, block.number, msg.sender, to, amount);
    }

    function swapEnd(uint8 fromChainID, bytes32 eventHash, uint blockNumber, address from, address to, uint amount) public onlyOwner stopBridge{
        require(amount > 0 && to != address(0));
        require(fromChainID != getChainID(), "Swop worked between different chains");
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

        IERC20(tokenAddress).safeMint(to, amount);
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

    function getChainID() internal pure returns (uint8) {
        uint8 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    function setTokenAddress(address _tokenAddress) public onlyOwner{
        tokenAddress = _tokenAddress;

    }

    function pausedBridge(bool _pause) public onlyOwner{
        pause = _pause;
    }

}