// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ContractRegistry.sol";

/**
 * @title DataDAOCore
 * @dev Central contract for the DataDAO system that coordinates all other contracts
 */
contract DataDAOCore is Ownable, ReentrancyGuard {
    // Contract registry
    ContractRegistry public contractRegistry;
    
    // DAO parameters
    string public name;
    string public description;
    uint256 public createdAt;
    
    // Contract names
    string public constant MEMBERSHIP_MANAGER = "MembershipManager";
    string public constant TASK_MANAGER = "TaskManager";
    string public constant DATASET_REGISTRY = "DatasetRegistry";
    string public constant REWARD_DISTRIBUTOR = "RewardDistributor";
    string public constant DEAL_CLIENT = "DealClient";
    string public constant DATA_TOKEN = "DataToken";
    string public constant GOVERNANCE_MODULE = "GovernanceModule";
    
    // Events
    event DAOInitialized(string name, string description, address owner);
    event ContractRegistrySet(address contractRegistry);
    
    /**
     * @dev Constructor
     * @param _name The name of the DAO
     * @param _description The description of the DAO
     * @param _contractRegistry The address of the contract registry
     */
    constructor(
        string memory _name,
        string memory _description,
        address _contractRegistry
    ) {
        name = _name;
        description = _description;
        createdAt = block.timestamp;
        
        if (_contractRegistry != address(0)) {
            contractRegistry = ContractRegistry(_contractRegistry);
            emit ContractRegistrySet(_contractRegistry);
        }
        
        emit DAOInitialized(_name, _description, msg.sender);
    }
    
    /**
     * @dev Set the contract registry
     * @param _contractRegistry The address of the contract registry
     */
    function setContractRegistry(address _contractRegistry) external onlyOwner {
        require(_contractRegistry != address(0), "DataDAOCore: zero address");
        contractRegistry = ContractRegistry(_contractRegistry);
        emit ContractRegistrySet(_contractRegistry);
    }
    
    /**
     * @dev Check if a user is a member of the DAO
     * @param user The address of the user
     * @return True if the user is a member, false otherwise
     */
    function isMember(address user) external view returns (bool) {
        if (address(contractRegistry) == address(0)) return false;
        
        address membershipManager = contractRegistry.getContractAddress(MEMBERSHIP_MANAGER);
        if (membershipManager == address(0)) return false;
        
        // Call the membership manager to check if the user is a member
        (bool success, bytes memory data) = membershipManager.staticcall(
            abi.encodeWithSignature("isMember(address)", user)
        );
        
        if (!success || data.length == 0) return false;
        
        return abi.decode(data, (bool));
    }
    
    /**
     * @dev Get the membership tier of a user
     * @param user The address of the user
     * @return The membership tier (0 = None, 1 = Basic, 2 = Advanced, 3 = Premium)
     */
    function getMemberTier(address user) external view returns (uint8) {
        if (address(contractRegistry) == address(0)) return 0;
        
        address membershipManager = contractRegistry.getContractAddress(MEMBERSHIP_MANAGER);
        if (membershipManager == address(0)) return 0;
        
        // Call the membership manager to get the user's tier
        (bool success, bytes memory data) = membershipManager.staticcall(
            abi.encodeWithSignature("getMemberTier(address)", user)
        );
        
        if (!success || data.length == 0) return 0;
        
        return abi.decode(data, (uint8));
    }
    
    /**
     * @dev Get the reputation of a user
     * @param user The address of the user
     * @return The reputation score
     */
    function getReputation(address user) external view returns (uint256) {
        if (address(contractRegistry) == address(0)) return 0;
        
        address membershipManager = contractRegistry.getContractAddress(MEMBERSHIP_MANAGER);
        if (membershipManager == address(0)) return 0;
        
        // Call the membership manager to get the user's reputation
        (bool success, bytes memory data) = membershipManager.staticcall(
            abi.encodeWithSignature("getReputation(address)", user)
        );
        
        if (!success || data.length == 0) return 0;
        
        return abi.decode(data, (uint256));
    }
    
    /**
     * @dev Get DAO statistics
     * @return memberCount The number of members
     * @return taskCount The number of tasks
     * @return datasetCount The number of datasets
     * @return proposalCount The number of proposals
     */
    function getDAOStats() external view returns (
        uint256 memberCount,
        uint256 taskCount,
        uint256 datasetCount,
        uint256 proposalCount
    ) {
        memberCount = 0;
        taskCount = 0;
        datasetCount = 0;
        proposalCount = 0;
        
        if (address(contractRegistry) == address(0)) return (0, 0, 0, 0);
        
        // Get member count
        address membershipManager = contractRegistry.getContractAddress(MEMBERSHIP_MANAGER);
        if (membershipManager != address(0)) {
            (bool success, bytes memory data) = membershipManager.staticcall(
                abi.encodeWithSignature("getMemberCount()")
            );
            
            if (success && data.length > 0) {
                memberCount = abi.decode(data, (uint256));
            }
        }
        
        // Get task count
        address taskManager = contractRegistry.getContractAddress(TASK_MANAGER);
        if (taskManager != address(0)) {
            (bool success, bytes memory data) = taskManager.staticcall(
                abi.encodeWithSignature("getTaskCount()")
            );
            
            if (success && data.length > 0) {
                taskCount = abi.decode(data, (uint256));
            }
        }
        
        // Get dataset count
        address datasetRegistry = contractRegistry.getContractAddress(DATASET_REGISTRY);
        if (datasetRegistry != address(0)) {
            (bool success, bytes memory data) = datasetRegistry.staticcall(
                abi.encodeWithSignature("getDatasetCount()")
            );
            
            if (success && data.length > 0) {
                datasetCount = abi.decode(data, (uint256));
            }
        }
        
        // Get proposal count
        address governanceModule = contractRegistry.getContractAddress(GOVERNANCE_MODULE);
        if (governanceModule != address(0)) {
            (bool success, bytes memory data) = governanceModule.staticcall(
                abi.encodeWithSignature("getProposalCount()")
            );
            
            if (success && data.length > 0) {
                proposalCount = abi.decode(data, (uint256));
            }
        }
        
        return (memberCount, taskCount, datasetCount, proposalCount);
    }
}
