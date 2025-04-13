// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DataDAORegistry
 * @dev Registry for datasets in the Data DAO
 */
contract DataDAORegistry is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MEMBER_ROLE = keccak256("MEMBER_ROLE");
    bytes32 public constant DATASET_PROVIDER_ROLE = keccak256("DATASET_PROVIDER_ROLE");

    // Access levels for datasets
    enum AccessLevel {
        Public,     // Anyone can access
        Restricted, // Only DAO members can access
        Private     // Only specific addresses can access
    }

    // Dataset structure
    struct Dataset {
        uint256 id;
        address owner;
        string name;
        string description;
        string metadataCID;
        string dataCID;
        uint256 createdAt;
        uint256 price;
        AccessLevel accessLevel;
        bool isValidated;
        uint256 usageCount;
        mapping(address => bool) authorizedUsers;
    }

    // Mapping from dataset ID to dataset
    mapping(uint256 => Dataset) public datasets;
    
    // Counter for dataset IDs
    uint256 public datasetCount;
    
    // Governance token
    IERC20 public governanceToken;

    // Events
    event DatasetRegistered(uint256 indexed id, address indexed owner, string name, string dataCID);
    event DatasetValidated(uint256 indexed id, address indexed validator);
    event DatasetAccessed(uint256 indexed id, address indexed user);
    event DatasetPurchased(uint256 indexed id, address indexed buyer, uint256 price);
    event RewardsDistributed(address indexed owner, uint256 amount);

    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token
     */
    constructor(address _governanceToken) {
        governanceToken = IERC20(_governanceToken);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(MEMBER_ROLE, msg.sender);
        _setupRole(DATASET_PROVIDER_ROLE, msg.sender);
    }

    /**
     * @dev Register a new dataset
     * @param _name Name of the dataset
     * @param _description Description of the dataset
     * @param _metadataCID CID of the dataset metadata
     * @param _dataCID CID of the dataset
     * @param _price Price of the dataset (0 for free)
     * @param _accessLevel Access level of the dataset
     * @return id ID of the registered dataset
     */
    function registerDataset(
        string memory _name,
        string memory _description,
        string memory _metadataCID,
        string memory _dataCID,
        uint256 _price,
        AccessLevel _accessLevel
    ) external returns (uint256) {
        require(hasRole(MEMBER_ROLE, msg.sender), "Must be a DAO member to register datasets");
        
        datasetCount++;
        uint256 newDatasetId = datasetCount;
        
        Dataset storage newDataset = datasets[newDatasetId];
        newDataset.id = newDatasetId;
        newDataset.owner = msg.sender;
        newDataset.name = _name;
        newDataset.description = _description;
        newDataset.metadataCID = _metadataCID;
        newDataset.dataCID = _dataCID;
        newDataset.createdAt = block.timestamp;
        newDataset.price = _price;
        newDataset.accessLevel = _accessLevel;
        newDataset.isValidated = false;
        newDataset.usageCount = 0;
        
        // If the owner is the only authorized user initially
        newDataset.authorizedUsers[msg.sender] = true;
        
        // Grant dataset provider role if they don't have it yet
        if (!hasRole(DATASET_PROVIDER_ROLE, msg.sender)) {
            grantRole(DATASET_PROVIDER_ROLE, msg.sender);
        }
        
        emit DatasetRegistered(newDatasetId, msg.sender, _name, _dataCID);
        
        return newDatasetId;
    }

    /**
     * @dev Validate a dataset
     * @param _datasetId ID of the dataset to validate
     */
    function validateDataset(uint256 _datasetId) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Must be an admin to validate datasets");
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        
        Dataset storage dataset = datasets[_datasetId];
        dataset.isValidated = true;
        
        emit DatasetValidated(_datasetId, msg.sender);
    }

    /**
     * @dev Authorize a user to access a private dataset
     * @param _datasetId ID of the dataset
     * @param _user Address of the user to authorize
     */
    function authorizeUser(uint256 _datasetId, address _user) external {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        require(dataset.owner == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        
        dataset.authorizedUsers[_user] = true;
    }

    /**
     * @dev Check if a user can access a dataset
     * @param _datasetId ID of the dataset
     * @param _user Address of the user
     * @return bool Whether the user can access the dataset
     */
    function canAccessDataset(uint256 _datasetId, address _user) public view returns (bool) {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        
        // Public datasets can be accessed by anyone
        if (dataset.accessLevel == AccessLevel.Public) {
            return true;
        }
        
        // Restricted datasets can be accessed by DAO members
        if (dataset.accessLevel == AccessLevel.Restricted) {
            return hasRole(MEMBER_ROLE, _user);
        }
        
        // Private datasets can only be accessed by authorized users
        return dataset.authorizedUsers[_user];
    }

    /**
     * @dev Record dataset access
     * @param _datasetId ID of the dataset
     */
    function recordAccess(uint256 _datasetId) external {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        require(canAccessDataset(_datasetId, msg.sender), "Not authorized to access this dataset");
        
        Dataset storage dataset = datasets[_datasetId];
        dataset.usageCount++;
        
        emit DatasetAccessed(_datasetId, msg.sender);
    }

    /**
     * @dev Purchase access to a dataset
     * @param _datasetId ID of the dataset
     */
    function purchaseDataset(uint256 _datasetId) external nonReentrant {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        require(dataset.price > 0, "Dataset is free");
        require(!dataset.authorizedUsers[msg.sender], "Already purchased");
        
        // Transfer tokens from buyer to contract
        require(governanceToken.transferFrom(msg.sender, address(this), dataset.price), "Token transfer failed");
        
        // Authorize the buyer
        dataset.authorizedUsers[msg.sender] = true;
        
        emit DatasetPurchased(_datasetId, msg.sender, dataset.price);
    }

    /**
     * @dev Claim rewards for dataset usage
     * @param _datasetId ID of the dataset
     */
    function claimRewards(uint256 _datasetId) external nonReentrant {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        require(dataset.owner == msg.sender, "Not the dataset owner");
        
        // Calculate rewards based on usage (simplified model)
        uint256 rewards = dataset.usageCount * 1 ether / 100; // 0.01 tokens per use
        
        // Reset usage count
        dataset.usageCount = 0;
        
        // Transfer rewards
        require(governanceToken.transfer(msg.sender, rewards), "Token transfer failed");
        
        emit RewardsDistributed(msg.sender, rewards);
    }

    /**
     * @dev Get dataset details
     * @param _datasetId ID of the dataset
     * @return owner Owner of the dataset
     * @return name Name of the dataset
     * @return description Description of the dataset
     * @return metadataCID CID of the dataset metadata
     * @return dataCID CID of the dataset
     * @return createdAt Creation timestamp
     * @return price Price of the dataset
     * @return accessLevel Access level of the dataset
     * @return isValidated Whether the dataset is validated
     * @return usageCount Usage count of the dataset
     */
    function getDatasetDetails(uint256 _datasetId) external view returns (
        address owner,
        string memory name,
        string memory description,
        string memory metadataCID,
        string memory dataCID,
        uint256 createdAt,
        uint256 price,
        AccessLevel accessLevel,
        bool isValidated,
        uint256 usageCount
    ) {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        
        return (
            dataset.owner,
            dataset.name,
            dataset.description,
            dataset.metadataCID,
            dataset.dataCID,
            dataset.createdAt,
            dataset.price,
            dataset.accessLevel,
            dataset.isValidated,
            dataset.usageCount
        );
    }

    /**
     * @dev Check if a user is authorized to access a dataset
     * @param _datasetId ID of the dataset
     * @param _user Address of the user
     * @return bool Whether the user is authorized
     */
    function isAuthorized(uint256 _datasetId, address _user) external view returns (bool) {
        require(_datasetId > 0 && _datasetId <= datasetCount, "Invalid dataset ID");
        Dataset storage dataset = datasets[_datasetId];
        return dataset.authorizedUsers[_user];
    }
}
