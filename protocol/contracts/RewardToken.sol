// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @dev ERC20 token for rewarding users in the decentralized data labeling platform
 */
contract RewardToken is ERC20, Ownable {
    // Maximum supply of tokens
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    
    // Event emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @dev Constructor
     */
    constructor() ERC20("DataFIL", "DFIL") {
        // Mint initial supply to the deployer
        _mint(msg.sender, 1000000 * 10**18); // 1 million tokens
    }
    
    /**
     * @dev Mint tokens to an address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Request tokens from the faucet
     * @param amount The amount of tokens to request
     */
    function requestTokens(uint256 amount) external {
        require(amount <= 100 * 10**18, "Cannot request more than 100 tokens at once");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
}
