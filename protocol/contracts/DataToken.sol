// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DataToken
 * @dev ERC20 token for the DataDAO ecosystem (DataFIL)
 */
contract DataToken is ERC20, ERC20Burnable, AccessControl {
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Faucet parameters
    uint256 public faucetAmount = 100 ether; // 100 tokens
    uint256 public faucetCooldown = 1 days;
    mapping(address => uint256) public lastFaucetTime;
    
    // Events
    event FaucetClaimed(address indexed user, uint256 amount);
    event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    
    /**
     * @dev Constructor
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialSupply The initial supply of the token
     * @param admin The admin address
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address admin
    ) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        
        _mint(admin, initialSupply);
    }
    
    /**
     * @dev Mint new tokens
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @dev Claim tokens from the faucet
     */
    function claimFromFaucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + faucetCooldown,
            "DataToken: faucet cooldown not expired"
        );
        
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        
        emit FaucetClaimed(msg.sender, faucetAmount);
    }
    
    /**
     * @dev Set the faucet amount
     * @param amount The new faucet amount
     */
    function setFaucetAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        uint256 oldAmount = faucetAmount;
        faucetAmount = amount;
        emit FaucetAmountUpdated(oldAmount, amount);
    }
    
    /**
     * @dev Set the faucet cooldown
     * @param cooldown The new faucet cooldown
     */
    function setFaucetCooldown(uint256 cooldown) external onlyRole(ADMIN_ROLE) {
        uint256 oldCooldown = faucetCooldown;
        faucetCooldown = cooldown;
        emit FaucetCooldownUpdated(oldCooldown, cooldown);
    }
    
    /**
     * @dev Grant the minter role to an address
     * @param minter The address to grant the minter role to
     */
    function addMinter(address minter) external onlyRole(ADMIN_ROLE) {
        grantRole(MINTER_ROLE, minter);
    }
    
    /**
     * @dev Revoke the minter role from an address
     * @param minter The address to revoke the minter role from
     */
    function removeMinter(address minter) external onlyRole(ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, minter);
    }
    
    /**
     * @dev Check if an address can claim from the faucet
     * @param user The address to check
     * @return Whether the address can claim from the faucet
     */
    function canClaimFromFaucet(address user) external view returns (bool) {
        return block.timestamp >= lastFaucetTime[user] + faucetCooldown;
    }
    
    /**
     * @dev Get the time until an address can claim from the faucet
     * @param user The address to check
     * @return The time until the address can claim from the faucet (0 if can claim now)
     */
    function timeUntilFaucet(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastFaucetTime[user] + faucetCooldown;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
}
