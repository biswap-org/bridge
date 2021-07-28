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
    bool public isActive;
    
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

    event SwapStart(address indexed fromAddr, address indexed toAddr, uint amount);
    event SwapEnd(bytes32 indexed eventHash, uint8 fromChain, address indexed fromAddr, address indexed toAddr, uint amount);

    constructor(address _tokenAddress) public{
        tokenAddress = _tokenAddress;
        isActive = true;
    }
    
    modifier onlyActivated(){
        require(isActive, "Avaliable only when activated");
        _;
    }

    function swapStart(address to, uint amount) public onlyActivated{
        require(amount >= MIN_AMOUNT && to != address(0));
        IERC20(tokenAddress).safeBurn(msg.sender, amount);
        emit SwapStart(msg.sender, to, amount);
    }

    function swapEnd(bytes32 eventHash, uint8 fromChainID, uint blockNumber, address from, address to, uint amount) public onlyOwner onlyActivated{
        require(amount > 0 && to != address(0));
        bytes32 reseivedHash = keccak256(abi.encode(blockNumber, fromChainID, from, to, amount));
        require(reseivedHash == eventHash, "Wrong args received");
        require(eventStore[reseivedHash].isComplited == false, "Swap was ended!");
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
    }

}