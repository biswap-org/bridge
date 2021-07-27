pragma solidity =0.6.6;

import "./libs/Address.sol";
import "./libs/SafeMath.sol";
import "./libs/SafeERC20.sol";
import "./libs/Ownable.sol";
import "./interfaces/IERC20.sol";

contract MaticMinter is Ownable{
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    uint8 public vaultChainID;
    uint public constant MIN_AMOUNT = 1e18;
    address public tokenAddress;

    event SwapStart(uint8 indexed toChain, address indexed fromAddr, address indexed toAddr, uint amount);
    event SwapEnd(uint8 indexed fromChain, address indexed fromAddr, address indexed toAddr, uint amount);

    constructor(address _tokenAddress) public{
        tokenAddress = _tokenAddress;
    }

    function swapStart(address to, uint amount) public{
        require(amount >= MIN_AMOUNT && to != address(0));

        IERC20(tokenAddress).safeBurn(msg.sender, amount);

        emit SwapStart(vaultChainID, msg.sender, to, amount);
    }

    function swapEnd(address from, address to, uint amount) public onlyOwner{
        
    }

}