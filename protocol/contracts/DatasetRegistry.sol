// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DatasetRegistry
 * @dev Registry for datasets with access control and monetization
 */
contract DatasetRegistry is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEAL_CLIENT_ROLE = keccak256("DEAL_CLIENT_ROLE");

    // Access types
    enum AccessType { Public, TokenGated, NFTGated, Subscription, PayPerUse }

    // Dataset structure
    struct Dataset {
        uint256 id;
        string name;
        string description;
        address owner;
        string metadataCID;
        string dataCID;
        bool isEncrypted;
        string accessConditionsCID;
        AccessType accessType;
        uint256 price;
        uint256 createdAt;
        bool hasFilecoinDeal;
        uint64 dealId;
        bool validated;
        uint256 usageCount;
        uint256 revenue;
        uint256[] taskIds; // IDs of tasks that contributed to this dataset
    }

    // DAO token
    IERC20 public daoToken;

    // Dataset counter
    Counters.Counter private _datasetIdCounter;

    // Mapping from dataset ID to dataset
    mapping(uint256 => Dataset) public datasets;

    // Mapping from dataset ID to whether a user has access
    mapping(uint256 => mapping(address => bool)) public datasetAccess;

    // Mapping from dataset ID to whether a user has purchased access
    mapping(uint256 => mapping(address => bool)) public datasetPurchased;

    // Mapping from dataset ID to subscription expiry time
    mapping(uint256 => mapping(address => uint256)) public subscriptionExpiry;

    // Events
    event DatasetCreated(
        uint256 indexed datasetId,
        address indexed owner,
        string name,
        string dataCID,
        bool isEncrypted,
        AccessType accessType,
        uint256 price
    );
    event DatasetValidated(uint256 indexed datasetId, address indexed validator);
    event DatasetAccessGranted(uint256 indexed datasetId, address indexed user);
    event DatasetAccessRevoked(uint256 indexed datasetId, address indexed user);
    event DatasetPurchased(uint256 indexed datasetId, address indexed buyer, uint256 price);
    event DatasetUsed(uint256 indexed datasetId, address indexed user);
    event FilecoinDealCreated(uint256 indexed datasetId, uint64 dealId);
    event RewardClaimed(address indexed owner, uint256 amount);

    /**
     * @dev Constructor
     * @param _daoToken The address of the DAO token
     */
    constructor(address _daoToken) {
        require(_daoToken != address(0), "DatasetRegistry: zero address");
        daoToken = IERC20(_daoToken);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new dataset
     * @param name The name of the dataset
     * @param description The description of the dataset
     * @param metadataCID The CID of the dataset metadata
     * @param dataCID The CID of the dataset
     * @param isEncrypted Whether the dataset is encrypted
     * @param accessConditionsCID The CID of the access conditions
     * @param accessType The access type of the dataset
     * @param price The price of the dataset
     * @param taskIds The IDs of tasks that contributed to this dataset
     * @return The ID of the created dataset
     */
    function createDataset(
        string memory name,
        string memory description,
        string memory metadataCID,
        string memory dataCID,
        bool isEncrypted,
        string memory accessConditionsCID,
        AccessType accessType,
        uint256 price,
        uint256[] memory taskIds
    ) external nonReentrant returns (uint256) {
        require(bytes(name).length > 0, "DatasetRegistry: name cannot be empty");
        require(bytes(description).length > 0, "DatasetRegistry: description cannot be empty");
        require(bytes(dataCID).length > 0, "DatasetRegistry: data CID cannot be empty");

        // If the dataset is not public, access conditions must be provided
        if (accessType != AccessType.Public) {
            require(bytes(accessConditionsCID).length > 0, "DatasetRegistry: access conditions CID cannot be empty");

            // If the dataset is paid, price must be greater than 0
            if (accessType == AccessType.Subscription || accessType == AccessType.PayPerUse) {
                require(price > 0, "DatasetRegistry: price must be greater than 0");
            }
        }

        // Create the dataset
        uint256 datasetId = _datasetIdCounter.current();
        _datasetIdCounter.increment();

        datasets[datasetId] = Dataset({
            id: datasetId,
            name: name,
            description: description,
            owner: msg.sender,
            metadataCID: metadataCID,
            dataCID: dataCID,
            isEncrypted: isEncrypted,
            accessConditionsCID: accessConditionsCID,
            accessType: accessType,
            price: price,
            createdAt: block.timestamp,
            hasFilecoinDeal: false,
            dealId: 0,
            validated: false,
            usageCount: 0,
            revenue: 0,
            taskIds: taskIds
        });

        // Grant access to the owner
        datasetAccess[datasetId][msg.sender] = true;

        emit DatasetCreated(
            datasetId,
            msg.sender,
            name,
            dataCID,
            isEncrypted,
            accessType,
            price
        );

        return datasetId;
    }

    /**
     * @dev Validate a dataset
     * @param datasetId The ID of the dataset
     */
    function validateDataset(uint256 datasetId) external {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender), "DatasetRegistry: not authorized");
        require(!datasets[datasetId].validated, "DatasetRegistry: already validated");

        datasets[datasetId].validated = true;
        emit DatasetValidated(datasetId, msg.sender);
    }

    /**
     * @dev Record a Filecoin deal for a dataset
     * @param datasetId The ID of the dataset
     * @param dealId The ID of the Filecoin deal
     */
    function recordFilecoinDeal(uint256 datasetId, uint64 dealId) external {
        require(hasRole(DEAL_CLIENT_ROLE, msg.sender), "DatasetRegistry: not authorized");
        require(!datasets[datasetId].hasFilecoinDeal, "DatasetRegistry: already has Filecoin deal");

        datasets[datasetId].hasFilecoinDeal = true;
        datasets[datasetId].dealId = dealId;

        emit FilecoinDealCreated(datasetId, dealId);
    }

    /**
     * @dev Grant access to a dataset
     * @param datasetId The ID of the dataset
     * @param user The address of the user
     */
    function grantAccess(uint256 datasetId, address user) external {
        require(
            datasets[datasetId].owner == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DAO_ROLE, msg.sender),
            "DatasetRegistry: not authorized"
        );

        datasetAccess[datasetId][user] = true;
        emit DatasetAccessGranted(datasetId, user);
    }

    /**
     * @dev Revoke access to a dataset
     * @param datasetId The ID of the dataset
     * @param user The address of the user
     */
    function revokeAccess(uint256 datasetId, address user) external {
        require(
            datasets[datasetId].owner == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DAO_ROLE, msg.sender),
            "DatasetRegistry: not authorized"
        );

        // Cannot revoke access from the owner
        require(datasets[datasetId].owner != user, "DatasetRegistry: cannot revoke owner access");

        datasetAccess[datasetId][user] = false;
        emit DatasetAccessRevoked(datasetId, user);
    }

    /**
     * @dev Purchase access to a dataset
     * @param datasetId The ID of the dataset
     * @param duration The duration of the subscription (in seconds, only for subscription access type)
     */
    function purchaseAccess(uint256 datasetId, uint256 duration) external nonReentrant {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.validated, "DatasetRegistry: not validated");
        require(dataset.accessType != AccessType.Public, "DatasetRegistry: dataset is public");
        require(dataset.owner != msg.sender, "DatasetRegistry: owner already has access");

        if (dataset.accessType == AccessType.Subscription) {
            require(duration > 0, "DatasetRegistry: duration must be greater than 0");
        } else {
            require(duration == 0, "DatasetRegistry: duration must be 0 for non-subscription access");
        }

        // Calculate price
        uint256 price = dataset.price;
        if (dataset.accessType == AccessType.Subscription) {
            // Price is per month (30 days), so calculate based on duration
            price = (price * duration) / 30 days;
        }

        // Transfer tokens from buyer to contract
        require(daoToken.transferFrom(msg.sender, address(this), price), "DatasetRegistry: token transfer failed");

        // Update dataset revenue
        dataset.revenue += price;

        // Grant access
        datasetAccess[datasetId][msg.sender] = true;
        datasetPurchased[datasetId][msg.sender] = true;

        // Set subscription expiry if applicable
        if (dataset.accessType == AccessType.Subscription) {
            subscriptionExpiry[datasetId][msg.sender] = block.timestamp + duration;
        }

        emit DatasetPurchased(datasetId, msg.sender, price);
    }

    /**
     * @dev Record dataset usage
     * @param datasetId The ID of the dataset
     * @param user The address of the user
     */
    function recordUsage(uint256 datasetId, address user) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DAO_ROLE, msg.sender),
            "DatasetRegistry: not authorized"
        );
        require(hasAccess(datasetId, user), "DatasetRegistry: user does not have access");

        Dataset storage dataset = datasets[datasetId];

        // For pay-per-use datasets, charge the user
        if (dataset.accessType == AccessType.PayPerUse && user != dataset.owner) {
            require(daoToken.transferFrom(user, address(this), dataset.price), "DatasetRegistry: token transfer failed");
            dataset.revenue += dataset.price;
        }

        dataset.usageCount++;
        emit DatasetUsed(datasetId, user);
    }

    /**
     * @dev Claim rewards for dataset usage
     * @param datasetId The ID of the dataset
     */
    function claimRewards(uint256 datasetId) external nonReentrant {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.owner == msg.sender, "DatasetRegistry: not the owner");
        require(dataset.revenue > 0, "DatasetRegistry: no revenue to claim");

        uint256 amount = dataset.revenue;
        dataset.revenue = 0;

        // Transfer tokens to the owner
        require(daoToken.transfer(msg.sender, amount), "DatasetRegistry: token transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    /**
     * @dev Check if a user has access to a dataset
     * @param datasetId The ID of the dataset
     * @param user The address of the user
     * @return Whether the user has access
     */
    function hasAccess(uint256 datasetId, address user) public view returns (bool) {
        Dataset storage dataset = datasets[datasetId];

        // Owner always has access
        if (dataset.owner == user) {
            return true;
        }

        // Public datasets are accessible to everyone
        if (dataset.accessType == AccessType.Public) {
            return true;
        }

        // Check if the user has been granted access
        if (datasetAccess[datasetId][user]) {
            // For subscription access, check if the subscription is still valid
            if (dataset.accessType == AccessType.Subscription) {
                return block.timestamp <= subscriptionExpiry[datasetId][user];
            }

            return true;
        }

        return false;
    }

    /**
     * @dev Get dataset basic details
     * @param datasetId The ID of the dataset
     * @return id The dataset ID
     * @return name The dataset name
     * @return description The dataset description
     * @return owner The dataset owner
     * @return price The dataset price
     * @return createdAt The creation timestamp
     * @return validated Whether the dataset is validated
     */
    function getDatasetBasic(uint256 datasetId) external view returns (
        uint256 id,
        string memory name,
        string memory description,
        address owner,
        uint256 price,
        uint256 createdAt,
        bool validated
    ) {
        Dataset storage dataset = datasets[datasetId];
        return (
            dataset.id,
            dataset.name,
            dataset.description,
            dataset.owner,
            dataset.price,
            dataset.createdAt,
            dataset.validated
        );
    }

    /**
     * @dev Get dataset storage details
     * @param datasetId The ID of the dataset
     * @return metadataCID The metadata CID
     * @return dataCID The data CID
     * @return isEncrypted Whether the dataset is encrypted
     * @return accessConditionsCID The access conditions CID
     * @return accessType The access type
     * @return hasFilecoinDeal Whether the dataset has a Filecoin deal
     * @return dealId The Filecoin deal ID
     */
    function getDatasetStorage(uint256 datasetId) external view returns (
        string memory metadataCID,
        string memory dataCID,
        bool isEncrypted,
        string memory accessConditionsCID,
        AccessType accessType,
        bool hasFilecoinDeal,
        uint64 dealId
    ) {
        Dataset storage dataset = datasets[datasetId];
        return (
            dataset.metadataCID,
            dataset.dataCID,
            dataset.isEncrypted,
            dataset.accessConditionsCID,
            dataset.accessType,
            dataset.hasFilecoinDeal,
            dataset.dealId
        );
    }

    /**
     * @dev Get dataset usage details
     * @param datasetId The ID of the dataset
     * @return usageCount The usage count
     * @return revenue The revenue generated
     */
    function getDatasetUsage(uint256 datasetId) external view returns (
        uint256 usageCount,
        uint256 revenue
    ) {
        Dataset storage dataset = datasets[datasetId];
        return (
            dataset.usageCount,
            dataset.revenue
        );
    }

    /**
     * @dev Get the task IDs that contributed to a dataset
     * @param datasetId The ID of the dataset
     * @return The task IDs
     */
    function getDatasetTaskIds(uint256 datasetId) external view returns (uint256[] memory) {
        return datasets[datasetId].taskIds;
    }

    /**
     * @dev Get the subscription expiry time for a user
     * @param datasetId The ID of the dataset
     * @param user The address of the user
     * @return The subscription expiry time
     */
    function getSubscriptionExpiry(uint256 datasetId, address user) external view returns (uint256) {
        return subscriptionExpiry[datasetId][user];
    }

    /**
     * @dev Get the number of datasets
     * @return The number of datasets
     */
    function getDatasetCount() external view returns (uint256) {
        return _datasetIdCounter.current();
    }

    /**
     * @dev Set the DAO contract address (admin only)
     * @param daoContract The address of the DAO contract
     */
    function setDAOContract(address daoContract) external onlyRole(ADMIN_ROLE) {
        require(daoContract != address(0), "DatasetRegistry: zero address");
        _setupRole(DAO_ROLE, daoContract);
    }

    /**
     * @dev Set the DealClient contract address (admin only)
     * @param dealClient The address of the DealClient contract
     */
    function setDealClientContract(address dealClient) external onlyRole(ADMIN_ROLE) {
        require(dealClient != address(0), "DatasetRegistry: zero address");
        _setupRole(DEAL_CLIENT_ROLE, dealClient);
    }
}
