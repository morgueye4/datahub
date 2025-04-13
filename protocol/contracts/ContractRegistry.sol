// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContractRegistry
 * @dev A registry for storing contract addresses
 */
contract ContractRegistry is Ownable {
    // Mapping from contract name to contract address
    mapping(string => address) private contractAddresses;
    
    // Event emitted when a contract is registered
    event ContractRegistered(string name, address contractAddress);
    
    /**
     * @dev Register a contract
     * @param name The name of the contract
     * @param contractAddress The address of the contract
     */
    function registerContract(string memory name, address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "ContractRegistry: zero address");
        contractAddresses[name] = contractAddress;
        emit ContractRegistered(name, contractAddress);
    }
    
    /**
     * @dev Get the address of a contract
     * @param name The name of the contract
     * @return The address of the contract
     */
    function getContractAddress(string memory name) external view returns (address) {
        address contractAddress = contractAddresses[name];
        require(contractAddress != address(0), "ContractRegistry: contract not registered");
        return contractAddress;
    }
    
    /**
     * @dev Check if a contract is registered
     * @param name The name of the contract
     * @return True if the contract is registered, false otherwise
     */
    function isContractRegistered(string memory name) external view returns (bool) {
        return contractAddresses[name] != address(0);
    }
}
