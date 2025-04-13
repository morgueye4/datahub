// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MembershipManager
 * @dev Manages DAO membership through token staking
 */
contract MembershipManager is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    
    // Membership tiers
    enum MemberTier { None, Basic, Advanced, Premium }
    
    // Member structure
    struct Member {
        bool exists;
        MemberTier tier;
        uint256 reputation;
        uint256 stakedAmount;
        uint256 joinedAt;
        uint256 lastActivityAt;
    }
    
    // DAO token
    IERC20 public daoToken;
    
    // Tier requirements
    uint256 public basicStakeAmount = 100 ether;    // 100 tokens for Basic tier
    uint256 public advancedStakeAmount = 1000 ether; // 1000 tokens for Advanced tier
    uint256 public premiumStakeAmount = 10000 ether; // 10000 tokens for Premium tier
    
    // Minimum stake time (to prevent quick unstaking)
    uint256 public minStakeTime = 7 days;
    
    // Member counter
    Counters.Counter private _memberCounter;
    
    // Mapping from address to member
    mapping(address => Member) public members;
    
    // Events
    event MemberJoined(address indexed member, MemberTier tier, uint256 stakedAmount);
    event MemberLeft(address indexed member, uint256 unstakedAmount);
    event TierUpgraded(address indexed member, MemberTier oldTier, MemberTier newTier);
    event ReputationUpdated(address indexed member, uint256 oldReputation, uint256 newReputation);
    event StakeAdded(address indexed member, uint256 amount);
    event StakeRemoved(address indexed member, uint256 amount);
    event TierRequirementsUpdated(uint256 basicStake, uint256 advancedStake, uint256 premiumStake);
    
    /**
     * @dev Constructor
     * @param _daoToken The address of the DAO token
     */
    constructor(address _daoToken) {
        require(_daoToken != address(0), "MembershipManager: zero address");
        daoToken = IERC20(_daoToken);
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        
        // Add the deployer as a member with Premium tier
        _addMember(msg.sender, MemberTier.Premium, 0);
    }
    
    /**
     * @dev Join the DAO by staking tokens
     * @param amount The amount of tokens to stake
     */
    function joinDAO(uint256 amount) external nonReentrant {
        require(!members[msg.sender].exists, "MembershipManager: already a member");
        require(amount >= basicStakeAmount, "MembershipManager: insufficient stake for basic tier");
        
        // Determine the tier based on the staked amount
        MemberTier tier;
        if (amount >= premiumStakeAmount) {
            tier = MemberTier.Premium;
        } else if (amount >= advancedStakeAmount) {
            tier = MemberTier.Advanced;
        } else {
            tier = MemberTier.Basic;
        }
        
        // Transfer tokens from the user to this contract
        require(daoToken.transferFrom(msg.sender, address(this), amount), "MembershipManager: token transfer failed");
        
        // Add the member
        _addMember(msg.sender, tier, amount);
    }
    
    /**
     * @dev Add a member (internal function)
     * @param account The address of the member
     * @param tier The membership tier
     * @param stakedAmount The amount of tokens staked
     */
    function _addMember(address account, MemberTier tier, uint256 stakedAmount) internal {
        members[account] = Member({
            exists: true,
            tier: tier,
            reputation: 0,
            stakedAmount: stakedAmount,
            joinedAt: block.timestamp,
            lastActivityAt: block.timestamp
        });
        
        _memberCounter.increment();
        
        emit MemberJoined(account, tier, stakedAmount);
    }
    
    /**
     * @dev Force join a user to the DAO (admin only)
     * @param account The address of the account to join
     * @param tier The membership tier
     */
    function forceJoin(address account, MemberTier tier) external onlyRole(ADMIN_ROLE) {
        require(!members[account].exists, "MembershipManager: already a member");
        require(tier != MemberTier.None, "MembershipManager: invalid tier");
        
        _addMember(account, tier, 0);
    }
    
    /**
     * @dev Leave the DAO and unstake tokens
     */
    function leaveDAO() external nonReentrant {
        require(members[msg.sender].exists, "MembershipManager: not a member");
        require(block.timestamp >= members[msg.sender].joinedAt + minStakeTime, "MembershipManager: minimum stake time not reached");
        
        uint256 stakedAmount = members[msg.sender].stakedAmount;
        
        // Remove the member
        delete members[msg.sender];
        _memberCounter.decrement();
        
        // Transfer tokens back to the user
        if (stakedAmount > 0) {
            require(daoToken.transfer(msg.sender, stakedAmount), "MembershipManager: token transfer failed");
        }
        
        emit MemberLeft(msg.sender, stakedAmount);
    }
    
    /**
     * @dev Stake more tokens to upgrade tier
     * @param amount The amount of tokens to stake
     */
    function stakeMore(uint256 amount) external nonReentrant {
        require(members[msg.sender].exists, "MembershipManager: not a member");
        require(amount > 0, "MembershipManager: amount must be greater than 0");
        
        // Transfer tokens from the user to this contract
        require(daoToken.transferFrom(msg.sender, address(this), amount), "MembershipManager: token transfer failed");
        
        // Update staked amount
        uint256 newStakedAmount = members[msg.sender].stakedAmount + amount;
        members[msg.sender].stakedAmount = newStakedAmount;
        
        // Check if tier can be upgraded
        MemberTier oldTier = members[msg.sender].tier;
        MemberTier newTier = oldTier;
        
        if (oldTier == MemberTier.Basic && newStakedAmount >= advancedStakeAmount) {
            newTier = MemberTier.Advanced;
        } else if (oldTier <= MemberTier.Advanced && newStakedAmount >= premiumStakeAmount) {
            newTier = MemberTier.Premium;
        }
        
        // Update tier if needed
        if (newTier != oldTier) {
            members[msg.sender].tier = newTier;
            emit TierUpgraded(msg.sender, oldTier, newTier);
        }
        
        // Update last activity
        members[msg.sender].lastActivityAt = block.timestamp;
        
        emit StakeAdded(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens (partial withdrawal)
     * @param amount The amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        require(members[msg.sender].exists, "MembershipManager: not a member");
        require(amount > 0, "MembershipManager: amount must be greater than 0");
        require(amount <= members[msg.sender].stakedAmount, "MembershipManager: insufficient staked amount");
        require(block.timestamp >= members[msg.sender].joinedAt + minStakeTime, "MembershipManager: minimum stake time not reached");
        
        // Calculate new staked amount
        uint256 newStakedAmount = members[msg.sender].stakedAmount - amount;
        
        // Check if the new staked amount is sufficient for the current tier
        MemberTier oldTier = members[msg.sender].tier;
        MemberTier newTier = oldTier;
        
        if (oldTier == MemberTier.Premium && newStakedAmount < premiumStakeAmount) {
            if (newStakedAmount >= advancedStakeAmount) {
                newTier = MemberTier.Advanced;
            } else if (newStakedAmount >= basicStakeAmount) {
                newTier = MemberTier.Basic;
            } else {
                revert("MembershipManager: unstake would drop below basic tier");
            }
        } else if (oldTier == MemberTier.Advanced && newStakedAmount < advancedStakeAmount) {
            if (newStakedAmount >= basicStakeAmount) {
                newTier = MemberTier.Basic;
            } else {
                revert("MembershipManager: unstake would drop below basic tier");
            }
        } else if (oldTier == MemberTier.Basic && newStakedAmount < basicStakeAmount) {
            revert("MembershipManager: unstake would drop below basic tier");
        }
        
        // Update staked amount
        members[msg.sender].stakedAmount = newStakedAmount;
        
        // Update tier if needed
        if (newTier != oldTier) {
            members[msg.sender].tier = newTier;
            emit TierUpgraded(msg.sender, oldTier, newTier);
        }
        
        // Update last activity
        members[msg.sender].lastActivityAt = block.timestamp;
        
        // Transfer tokens back to the user
        require(daoToken.transfer(msg.sender, amount), "MembershipManager: token transfer failed");
        
        emit StakeRemoved(msg.sender, amount);
    }
    
    /**
     * @dev Update a member's reputation (admin or DAO only)
     * @param member The address of the member
     * @param reputation The new reputation
     */
    function updateReputation(address member, uint256 reputation) external {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender), "MembershipManager: must have admin or DAO role");
        require(members[member].exists, "MembershipManager: not a member");
        
        uint256 oldReputation = members[member].reputation;
        members[member].reputation = reputation;
        
        emit ReputationUpdated(member, oldReputation, reputation);
    }
    
    /**
     * @dev Update tier requirements (admin only)
     * @param _basicStakeAmount The new basic tier stake amount
     * @param _advancedStakeAmount The new advanced tier stake amount
     * @param _premiumStakeAmount The new premium tier stake amount
     */
    function updateTierRequirements(
        uint256 _basicStakeAmount,
        uint256 _advancedStakeAmount,
        uint256 _premiumStakeAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(_basicStakeAmount > 0, "MembershipManager: basic stake must be greater than 0");
        require(_advancedStakeAmount > _basicStakeAmount, "MembershipManager: advanced stake must be greater than basic");
        require(_premiumStakeAmount > _advancedStakeAmount, "MembershipManager: premium stake must be greater than advanced");
        
        basicStakeAmount = _basicStakeAmount;
        advancedStakeAmount = _advancedStakeAmount;
        premiumStakeAmount = _premiumStakeAmount;
        
        emit TierRequirementsUpdated(_basicStakeAmount, _advancedStakeAmount, _premiumStakeAmount);
    }
    
    /**
     * @dev Set the minimum stake time (admin only)
     * @param _minStakeTime The new minimum stake time
     */
    function setMinStakeTime(uint256 _minStakeTime) external onlyRole(ADMIN_ROLE) {
        minStakeTime = _minStakeTime;
    }
    
    /**
     * @dev Set the DAO contract address (admin only)
     * @param daoContract The address of the DAO contract
     */
    function setDAOContract(address daoContract) external onlyRole(ADMIN_ROLE) {
        require(daoContract != address(0), "MembershipManager: zero address");
        _setupRole(DAO_ROLE, daoContract);
    }
    
    /**
     * @dev Check if an address is a member
     * @param account The address to check
     * @return True if the address is a member, false otherwise
     */
    function isMember(address account) external view returns (bool) {
        return members[account].exists;
    }
    
    /**
     * @dev Get the membership tier of an address
     * @param account The address to check
     * @return The membership tier
     */
    function getMemberTier(address account) external view returns (uint8) {
        if (!members[account].exists) {
            return uint8(MemberTier.None);
        }
        return uint8(members[account].tier);
    }
    
    /**
     * @dev Get the reputation of an address
     * @param account The address to check
     * @return The reputation
     */
    function getReputation(address account) external view returns (uint256) {
        if (!members[account].exists) {
            return 0;
        }
        return members[account].reputation;
    }
    
    /**
     * @dev Get the staked amount of an address
     * @param account The address to check
     * @return The staked amount
     */
    function getStakedAmount(address account) external view returns (uint256) {
        return members[account].stakedAmount;
    }
    
    /**
     * @dev Get the number of members
     * @return The number of members
     */
    function getMemberCount() external view returns (uint256) {
        return _memberCounter.current();
    }
    
    /**
     * @dev Get member details
     * @param account The address of the member
     * @return exists Whether the member exists
     * @return tier The membership tier
     * @return reputation The reputation
     * @return stakedAmount The staked amount
     * @return joinedAt When the member joined
     * @return lastActivityAt When the member was last active
     */
    function getMember(address account) external view returns (
        bool exists,
        MemberTier tier,
        uint256 reputation,
        uint256 stakedAmount,
        uint256 joinedAt,
        uint256 lastActivityAt
    ) {
        Member memory member = members[account];
        return (
            member.exists,
            member.tier,
            member.reputation,
            member.stakedAmount,
            member.joinedAt,
            member.lastActivityAt
        );
    }
}
