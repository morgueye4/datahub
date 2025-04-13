// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RewardDistributor
 * @dev A contract for distributing rewards to users
 */
contract RewardDistributor is Ownable, ReentrancyGuard {
    // Reward token
    IERC20 public rewardToken;
    
    // Mapping from user to pending rewards
    mapping(address => uint256) public pendingRewards;
    
    // Events
    event RewardAdded(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _rewardToken The address of the reward token
     */
    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }
    
    /**
     * @dev Add rewards for a user
     * @param user The address of the user
     * @param amount The amount of rewards to add
     */
    function addReward(address user, uint256 amount) external onlyOwner {
        pendingRewards[user] += amount;
        emit RewardAdded(user, amount);
    }
    
    /**
     * @dev Add rewards for multiple users
     * @param users The addresses of the users
     * @param amounts The amounts of rewards to add
     */
    function addRewardBatch(address[] memory users, uint256[] memory amounts) external onlyOwner {
        require(users.length == amounts.length, "Arrays must have the same length");
        
        for (uint256 i = 0; i < users.length; i++) {
            pendingRewards[users[i]] += amounts[i];
            emit RewardAdded(users[i], amounts[i]);
        }
    }
    
    /**
     * @dev Claim rewards
     */
    function claimReward() external nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        pendingRewards[msg.sender] = 0;
        
        require(rewardToken.transfer(msg.sender, amount), "Token transfer failed");
        emit RewardClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Get the pending rewards for a user
     * @param user The address of the user
     * @return The pending rewards
     */
    function getPendingReward(address user) external view returns (uint256) {
        return pendingRewards[user];
    }
}
