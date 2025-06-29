//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BiatecToken is ERC20, Pausable, Ownable {
    uint8 private _decimals;
    mapping(address => bool) public minters;

    modifier onlyMinter() {
        require(minters[msg.sender], "Only minter can perform this action");
        _;
    }

    modifier onlyMinterOrOwner() {
        require(minters[msg.sender] || msg.sender == owner(), "Only minter or owner can perform this action");
        _;
    }

    constructor(string memory name, string memory symbol, uint8 decimals_, uint256 initialSupply, address initialSupplyReceiver) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        minters[msg.sender] = true; // Owner is minter by default
        if (initialSupply > 0) {
            address receiver = (initialSupplyReceiver == address(0)) ? msg.sender : initialSupplyReceiver;
            _mint(receiver, initialSupply);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Minting is restricted to minters or owner only.
    function mint(address to, uint256 amount) public onlyMinterOrOwner {
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

    // Add a new minter (only owner)
    function addMinter(address newMinter) public onlyOwner {
        require(newMinter != address(0), "Minter cannot be zero address");
        require(!minters[newMinter], "Already a minter");
        minters[newMinter] = true;
        emit MinterAdded(newMinter);
    }

    // Remove a minter (only owner)
    function removeMinter(address minterToRemove) public onlyOwner {
        require(minters[minterToRemove], "Not a minter");
        minters[minterToRemove] = false;
        emit MinterRemoved(minterToRemove);
    }

    // List all minters (view function)
    function listMinters(address[] calldata possibleMinters) public view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < possibleMinters.length; i++) {
            if (minters[possibleMinters[i]]) {
                count++;
            }
        }
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < possibleMinters.length; i++) {
            if (minters[possibleMinters[i]]) {
                result[idx] = possibleMinters[i];
                idx++;
            }
        }
        return result;
    }

    event MinterAdded(address indexed newMinter);
    event MinterRemoved(address indexed removedMinter);

    // Override _update to include pausable functionality
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
