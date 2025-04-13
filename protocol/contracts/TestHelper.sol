// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestHelper
 * @dev A helper contract for testing purposes
 */
contract TestHelper is Ownable {
    // Event emitted for testing
    event TestEvent(string message, address sender);
    
    /**
     * @dev Emit a test event
     * @param message The message to emit
     */
    function emitTestEvent(string memory message) external {
        emit TestEvent(message, msg.sender);
    }
    
    /**
     * @dev Force join a user to the DAO
     * @param daoContract The address of the DAO contract
     * @param account The address of the account to join
     */
    function testForceJoinDAO(address daoContract, address account) external onlyOwner {
        (bool success, ) = daoContract.call(abi.encodeWithSignature("forceJoin(address)", account));
        require(success, "Call to forceJoinDAO failed");
    }
    
    /**
     * @dev Force grant a role to a user
     * @param daoContract The address of the DAO contract
     * @param role The role to grant
     * @param account The address of the account to grant the role to
     */
    function testForceGrantRole(address daoContract, bytes32 role, address account) external onlyOwner {
        (bool success, ) = daoContract.call(abi.encodeWithSignature("grantRole(bytes32,address)", role, account));
        require(success, "Call to forceGrantRole failed");
    }
    
    /**
     * @dev Force set the reputation of a user
     * @param daoContract The address of the DAO contract
     * @param account The address of the account
     * @param reputation The reputation to set
     */
    function testForceSetReputation(address daoContract, address account, uint256 reputation) external onlyOwner {
        (bool success, ) = daoContract.call(abi.encodeWithSignature("setReputation(address,uint256)", account, reputation));
        require(success, "Call to forceSetReputation failed");
    }
    
    /**
     * @dev Force create a dataset
     * @param datasetRegistry The address of the dataset registry
     * @param name The name of the dataset
     * @param description The description of the dataset
     * @param owner The owner of the dataset
     */
    function testForceCreateDataset(
        address datasetRegistry,
        string memory name,
        string memory description,
        address owner
    ) external onlyOwner {
        (bool success, ) = datasetRegistry.call(
            abi.encodeWithSignature(
                "createDataset(string,string,address)",
                name,
                description,
                owner
            )
        );
        require(success, "Call to forceCreateDataset failed");
    }
    
    /**
     * @dev Force create a task
     * @param taskManager The address of the task manager
     * @param title The title of the task
     * @param description The description of the task
     * @param creator The creator of the task
     */
    function testForceCreateTask(
        address taskManager,
        string memory title,
        string memory description,
        address creator
    ) external onlyOwner {
        require(block.timestamp + 1 days > block.timestamp, "Overflow check");
        
        (bool success, ) = taskManager.call(
            abi.encodeWithSignature(
                "createTask(string,string,uint8,uint256,uint256,uint256,address)",
                title,
                description,
                1, // Task type: Data Labeling
                10 ether, // Reward amount
                5 ether, // Review reward
                2, // Number of reviewers
                creator
            )
        );
        require(success, "Call to forceCreateTask failed");
    }
}
