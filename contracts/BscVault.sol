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
    address public rootToken;

    struct MinterEntity {
        address minter;
        address token;
        bool active;
    }

    mapping (uint8 => MinterEntity) public registeredChains; // chainID => MinterEntity

    event Deposit(uint8 indexed toChain, address indexed fromAddr, address indexed toAddr, uint amount);
    event Withdraw(uint8 indexed fromChain, address indexed fromAddr, address indexed toAddr, uint amount);

    modifier onlyActivatedChains(uint8 _chainID){
        require(registeredChains[_chainID].active == true, "Only activated chains");
        _;
    }

    constructor(address _rootToken) public {
        rootToken = _rootToken;
    }
    
    function addNewChain(uint8 _chainID, address _minter, address _token) public onlyOwner returns(bool){
        require(registeredChains[_chainID].minter == address(0), 'Chain has already been registered');
        MinterEntity memory minterEntity = MinterEntity({
            minter: _minter,
            token: _token,
            active: true
        });
        registeredChains[_chainID] = minterEntity;
        return true;
    }

    function changeActivationChain(uint8 _chainID, bool _activate) public onlyOwner returns(bool){
        require(registeredChains[_chainID].minter != address(0), 'Chain is not registered');
        registeredChains[_chainID].active = _activate;
        return true;
    }

    function deposit(uint8 _toChainID, address _to, uint _amount) public onlyActivatedChains(_toChainID){

        _deposit(_toChainID, _to, _amount);
    }

    function _deposit(uint8 _toChainID, address _to, uint _amount) private onlyActivatedChains(_toChainID){
        require(_amount >= MIN_AMOUNT);
        IERC20(rootToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        emit Deposit(_toChainID, msg.sender, _to, _amount);
    }

    function withdraw(uint8 _FromChainID, address _from, address _to, uint _amount) public onlyOwner onlyActivatedChains(_FromChainID){
        _withdrawRootToken(_to, _amount);
        emit Withdraw(_FromChainID, _from, _to, _amount);
    }

    function _withdrawRootToken(address _to, uint _amount) private {
        require(IERC20(rootToken).balanceOf(address(this) >= _amount);
        require(_amount >= MIN_AMOUNT);

        IERC20(rootToken).safeTransfer(_to, _amount);
    }
}