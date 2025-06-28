//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BiatecToken is ERC20, Pausable, Ownable {
    uint8 private _decimals;
    address public minter;

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter can perform this action");
        _;
    }

    constructor(string memory name, string memory symbol, uint8 decimals_, address minter_, uint256 premint) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        
        // If minter is zero address, set owner as minter
        minter = (minter_ == address(0)) ? msg.sender : minter_;
        
        // Premint tokens to the minter address if premint > 0
        if (premint > 0) {
            _mint(minter, premint);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Minting is restricted to the minter only.
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }

    // Burning is open to anyone and burns from their own balance.
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // Burning from another address (requires approval).
    function burnFrom(address from, uint256 amount) public {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }

    // Pause the contract (only owner)
    function pause() public onlyOwner {
        _pause();
    }

    // Unpause the contract (only owner)
    function unpause() public onlyOwner {
        _unpause();
    }

    // Change the minter address (only owner)
    function setMinter(address newMinter) public onlyOwner {
        require(newMinter != address(0), "Minter cannot be zero address");
        address oldMinter = minter;
        minter = newMinter;
        emit MinterChanged(oldMinter, newMinter);
    }

    // Event to track minter changes
    event MinterChanged(address indexed oldMinter, address indexed newMinter);

    // Override _update to include pausable functionality
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
