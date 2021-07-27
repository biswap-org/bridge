pragma solidity =0.6.6;

import "./libs/Address.sol";
import "./libs/SafeMath.sol";
import "./libs/SafeERC20.sol";
import "./libs/Ownable.sol";
import "./interfaces/IERC20.sol";

contract BscVault is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint public constant MIN_AMOUNT = 1e18;
    uint public swapCommission;
    uint public totalCommission;
    address public rootToken;
    address public commissionReceiver;

    struct MinterEntity {
        address minter;
        address token;
        bool active;
        uint lockedAmount;
    }

    mapping (uint8 => MinterEntity) public registeredChains; // chainID => MinterEntity

    event SwapStart(uint8 indexed toChain, address indexed fromAddr, address indexed toAddr, uint amount);
    event SwapEnd(uint8 indexed fromChain, address indexed fromAddr, address indexed toAddr, uint amount);

    modifier onlyActivatedChains(uint8 chainID){
        require(registeredChains[chainID].active == true, "Only activated chains");
        _;
    }

    constructor(address _rootToken) public {
        rootToken = _rootToken;
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
            active: true,
            lockedAmount: 0
        });
        registeredChains[chainID] = minterEntity;
        return true;
    }

    function changeActivationChain(uint8 chainID, bool activate) public onlyOwner returns(bool){
        require(registeredChains[chainID].minter != address(0), 'Chain is not registered');
        registeredChains[chainID].active = activate;
        return true;
    }

    function swapStart(uint8 toChainID, address to, uint amount) public onlyActivatedChains(toChainID){
        require(amount >= MIN_AMOUNT && to != address(0));
        if(swapCommission > 0 && commissionReceiver != address(0)){
            uint commission = _commissionCalculate(amount);
            amount = amount.sub(commission);
            totalCommission = totalCommission.add(commission);
        }
        _depositToken(amount);
        emit SwapStart(toChainID, msg.sender, to, amount);
    }

    function _depositToken(uint amount) private {
        IERC20(rootToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    function swapEnd(uint8 fromChainID, address from, address to, uint amount) public onlyOwner onlyActivatedChains(fromChainID){
        require(amount >= MIN_AMOUNT);
        if(swapCommission > 0 && commissionReceiver != address(0)){
            uint commission = _commissionCalculate(amount);
            amount = amount.sub(commission);
            totalCommission = totalCommission.add(commission);
        }
        _withdrawRootToken(to, amount);
        emit SwapEnd(fromChainID, from, to, amount);
    }

    function _withdrawRootToken(address to, uint amount) private {
        require(IERC20(rootToken).balanceOf(address(this)) >= amount);
        IERC20(rootToken).safeTransfer(to, amount);
    }

    function _commissionCalculate(uint amount) internal view returns(uint fee){
        fee = commissionReceiver != address(0) ? amount.mul(swapCommission).div(10000) : 0;
    }

    function withdrawFee() public onlyOwner{
        require(commissionReceiver != address(0),"Fee receiver not set");
        _withdrawRootToken(commissionReceiver, totalCommission);
        totalCommission = 0;
    }
}