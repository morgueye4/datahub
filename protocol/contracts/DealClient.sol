// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "filecoin-solidity-api/contracts/v0.8/MarketAPI.sol";
import "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import "filecoin-solidity-api/contracts/v0.8/types/MarketTypes.sol";
import "filecoin-solidity-api/contracts/v0.8/types/AccountTypes.sol";
import "filecoin-solidity-api/contracts/v0.8/utils/FilAddresses.sol";
import "filecoin-solidity-api/contracts/v0.8/utils/BigInts.sol";
import "solidity-cborutils/contracts/CBOR.sol";
import "filecoin-solidity-api/contracts/v0.8/utils/Misc.sol";

using CBOR for CBOR.CBORBuffer;

/**
 * @title DealClient
 * @dev Contract for creating and managing Filecoin storage deals
 */
contract DealClient is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    // Request ID structure
    struct RequestId {
        bytes32 requestId;
        bool valid;
    }

    // Request index structure
    struct RequestIdx {
        uint256 idx;
        bool valid;
    }

    // Provider set structure
    struct ProviderSet {
        bytes provider;
        bool valid;
    }

    // Deal status
    enum Status {
        None,
        RequestSubmitted,
        DealPublished,
        DealActivated,
        DealTerminated
    }

    // Deal request structure
    struct DealRequest {
        bytes piece_cid;
        uint64 piece_size;
        bool verified_deal;
        string label;
        int64 start_epoch;
        int64 end_epoch;
        uint256 storage_price_per_epoch;
        uint256 provider_collateral;
        uint256 client_collateral;
        uint64 extra_params_version;
        ExtraParamsV1 extra_params;
        uint256 timestamp;
        address owner;
    }

    // Extra parameters for the deal
    struct ExtraParamsV1 {
        string location_ref;
        uint64 car_size;
        bool skip_ipni_announce;
        bool remove_unsealed_copy;
    }

    // Constants for Filecoin actors
    uint64 public constant AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 public constant DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 public constant MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    address public constant MARKET_ACTOR_ETH_ADDRESS = address(0xff00000000000000000000000000000000000005);
    address public constant DATACAP_ACTOR_ETH_ADDRESS = address(0xfF00000000000000000000000000000000000007);

    // Mappings
    mapping(bytes32 => RequestIdx) public dealRequestIdx; // contract deal id -> deal index
    DealRequest[] public dealRequests;

    mapping(bytes => RequestId) public pieceRequests; // commP -> dealProposalID
    mapping(bytes => ProviderSet) public pieceProviders; // commP -> provider
    mapping(bytes => uint64) public pieceDeals; // commP -> deal ID
    mapping(bytes => Status) public pieceStatus; // commP -> status

    // Events
    event ReceivedDataCap(string received);
    event DealProposalCreate(
        bytes32 indexed id,
        uint64 size,
        bool indexed verified,
        uint256 price
    );
    event DealStatusUpdate(
        bytes indexed pieceCid,
        Status status,
        uint64 dealId
    );

    /**
     * @dev Constructor
     */
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Serialize extra parameters
     * @param params The extra parameters
     * @return The serialized parameters
     */
    function serializeExtraParamsV1(
        ExtraParamsV1 memory params
    ) pure internal returns (bytes memory) {
        CBOR.CBORBuffer memory buf = CBOR.create(64);
        buf.startFixedArray(4);
        buf.writeString(params.location_ref);
        buf.writeUInt64(params.car_size);
        buf.writeBool(params.skip_ipni_announce);
        buf.writeBool(params.remove_unsealed_copy);
        return buf.data();
    }

    /**
     * @dev Get the provider set for a piece CID
     * @param cid The piece CID
     * @return The provider set
     */
    function getProviderSet(
        bytes calldata cid
    ) public view returns (ProviderSet memory) {
        return pieceProviders[cid];
    }

    /**
     * @dev Get the proposal ID set for a piece CID
     * @param cid The piece CID
     * @return The proposal ID set
     */
    function getProposalIdSet(
        bytes calldata cid
    ) public view returns (RequestId memory) {
        return pieceRequests[cid];
    }

    /**
     * @dev Get the number of deal requests
     * @return The number of deal requests
     */
    function dealsLength() public view returns (uint256) {
        return dealRequests.length;
    }

    /**
     * @dev Get a deal request by index
     * @param index The index of the deal request
     * @return The deal request
     */
    function getDealByIndex(
        uint256 index
    ) public view returns (DealRequest memory) {
        return dealRequests[index];
    }

    /**
     * @dev Make a deal proposal
     * @param piece_cid The piece CID
     * @param piece_size The piece size
     * @param verified_deal Whether the deal is verified
     * @param label The label for the deal
     * @param start_epoch The start epoch
     * @param end_epoch The end epoch
     * @param storage_price_per_epoch The storage price per epoch
     * @param provider_collateral The provider collateral
     * @param client_collateral The client collateral
     * @param extra_params_version The extra parameters version
     * @param location_ref The location reference
     * @param car_size The CAR size
     * @param skip_ipni_announce Whether to skip IPNI announce
     * @param remove_unsealed_copy Whether to remove unsealed copy
     * @return The ID of the deal proposal
     */
    function makeDealProposal(
        bytes memory piece_cid,
        uint64 piece_size,
        bool verified_deal,
        string memory label,
        int64 start_epoch,
        int64 end_epoch,
        uint256 storage_price_per_epoch,
        uint256 provider_collateral,
        uint256 client_collateral,
        uint64 extra_params_version,
        string memory location_ref,
        uint64 car_size,
        bool skip_ipni_announce,
        bool remove_unsealed_copy
    ) public nonReentrant returns (bytes32) {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender), "DealClient: not authorized");

        if (pieceStatus[piece_cid] == Status.DealPublished ||
            pieceStatus[piece_cid] == Status.DealActivated) {
            revert("DealClient: deal with this pieceCid already published");
        }

        ExtraParamsV1 memory extra_params = ExtraParamsV1(
            location_ref,
            car_size,
            skip_ipni_announce,
            remove_unsealed_copy
        );

        DealRequest memory deal = DealRequest(
            piece_cid,
            piece_size,
            verified_deal,
            label,
            start_epoch,
            end_epoch,
            storage_price_per_epoch,
            provider_collateral,
            client_collateral,
            extra_params_version,
            extra_params,
            block.timestamp,
            msg.sender
        );

        uint256 index = dealRequests.length;
        dealRequests.push(deal);

        // Create a unique ID for the deal proposal
        bytes32 id = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, index)
        );
        dealRequestIdx[id] = RequestIdx(index, true);

        pieceRequests[piece_cid] = RequestId(id, true);
        pieceStatus[piece_cid] = Status.RequestSubmitted;

        emit DealProposalCreate(
            id,
            piece_size,
            verified_deal,
            storage_price_per_epoch
        );

        return id;
    }

    /**
     * @dev Get a deal request by ID
     * @param requestId The ID of the deal request
     * @return The deal request
     */
    function getDealRequest(
        bytes32 requestId
    ) internal view returns (DealRequest memory) {
        RequestIdx memory ri = dealRequestIdx[requestId];
        require(ri.valid, "DealClient: proposalId not available");
        return dealRequests[ri.idx];
    }

    /**
     * @dev Get a deal proposal
     * @param proposalId The ID of the proposal
     * @return The CBOR-encoded deal proposal
     */
    function getDealProposal(
        bytes32 proposalId
    ) public view returns (bytes memory) {
        DealRequest memory deal = getDealRequest(proposalId);

        MarketTypes.DealProposal memory ret;
        ret.piece_cid = CommonTypes.Cid(deal.piece_cid);
        ret.piece_size = deal.piece_size;
        ret.verified_deal = deal.verified_deal;
        ret.client = FilAddresses.fromEthAddress(address(this));
        // Set a dummy provider. The provider that picks up this deal will need to set its own address.
        ret.provider = FilAddresses.fromActorID(0);
        ret.label = CommonTypes.DealLabel(bytes(deal.label), true);
        ret.start_epoch = CommonTypes.ChainEpoch.wrap(deal.start_epoch);
        ret.end_epoch = CommonTypes.ChainEpoch.wrap(deal.end_epoch);
        ret.storage_price_per_epoch = BigInts.fromUint256(
            deal.storage_price_per_epoch
        );
        ret.provider_collateral = BigInts.fromUint256(deal.provider_collateral);
        ret.client_collateral = BigInts.fromUint256(deal.client_collateral);

        return MarketCBOR.serializeDealProposal(ret);
    }

    /**
     * @dev Get extra parameters
     * @param proposalId The ID of the proposal
     * @return The extra parameters
     */
    function getExtraParams(
        bytes32 proposalId
    ) public view returns (bytes memory) {
        DealRequest memory deal = getDealRequest(proposalId);
        return serializeExtraParamsV1(deal.extra_params);
    }

    /**
     * @dev Authenticate a message
     * @param params The authentication parameters
     */
    function authenticateMessage(bytes memory params) internal view {
        require(
            msg.sender == MARKET_ACTOR_ETH_ADDRESS,
            "DealClient: msg.sender needs to be market actor f05"
        );

        // For simplicity, we're just returning true for authentication
        // In a production environment, you would want to properly deserialize and validate the message
        // This is a placeholder for the actual authentication logic
    }

    /**
     * @dev Deal notification
     * @param params The deal notification parameters
     */
    function dealNotify(bytes memory params) internal {
        require(
            msg.sender == MARKET_ACTOR_ETH_ADDRESS,
            "DealClient: msg.sender needs to be market actor f05"
        );

        // For simplicity, we're just acknowledging the deal notification
        // In a production environment, you would want to properly deserialize and process the notification
        // This is a placeholder for the actual deal notification logic

        // Emit a generic event for testing purposes
        emit ReceivedDataCap("Deal Notification Received");
    }

    /**
     * @dev Update activation status
     * @param pieceCid The piece CID
     */
    function updateActivationStatus(bytes memory pieceCid) public {
        require(pieceDeals[pieceCid] > 0, "DealClient: no deal published for this piece cid");

        // For simplicity, we're just setting the status to activated
        // In a production environment, you would want to properly check the deal activation status
        pieceStatus[pieceCid] = Status.DealActivated;
        emit DealStatusUpdate(pieceCid, Status.DealActivated, pieceDeals[pieceCid]);
    }

    /**
     * @dev Add balance to the market actor
     * @param value The amount to add
     */
    function addBalance(uint256 value) public payable onlyRole(ADMIN_ROLE) {
        // For simplicity, we're just acknowledging the balance addition
        // In a production environment, you would want to properly add balance to the market actor
        emit ReceivedDataCap("Balance Added");
    }

    /**
     * @dev Withdraw balance from the market actor
     * @param client The client address
     * @param value The amount to withdraw
     * @return The amount withdrawn
     */
    function withdrawBalance(
        address client,
        uint256 value
    ) public onlyRole(ADMIN_ROLE) returns (uint256) {
        // For simplicity, we're just returning the value
        // In a production environment, you would want to properly withdraw balance from the market actor
        emit ReceivedDataCap("Balance Withdrawn");
        return value;
    }

    /**
     * @dev Receive data cap
     * @param params The data cap parameters
     */
    function receiveDataCap(bytes memory params) internal {
        require(
            msg.sender == DATACAP_ACTOR_ETH_ADDRESS,
            "DealClient: msg.sender needs to be datacap actor f07"
        );
        emit ReceivedDataCap("DataCap Received!");
    }

    /**
     * @dev Handle Filecoin method
     * @param method The method number
     * @param params The parameters
     * @return The return values
     */
    function handle_filecoin_method(
        uint64 method,
        uint64,
        bytes memory params
    ) public returns (uint32, uint64, bytes memory) {
        bytes memory ret = new bytes(0);
        uint64 codec = 0;

        if (method == AUTHENTICATE_MESSAGE_METHOD_NUM) {
            authenticateMessage(params);
            // If we haven't reverted, we should return a CBOR true to indicate that verification passed.
            CBOR.CBORBuffer memory buf = CBOR.create(1);
            buf.writeBool(true);
            ret = buf.data();
            codec = Misc.CBOR_CODEC;
        } else if (method == MARKET_NOTIFY_DEAL_METHOD_NUM) {
            dealNotify(params);
        } else if (method == DATACAP_RECEIVER_HOOK_METHOD_NUM) {
            receiveDataCap(params);
        } else {
            revert("DealClient: the filecoin method that was called is not handled");
        }

        return (0, codec, ret);
    }

    /**
     * @dev Set the DAO contract address (admin only)
     * @param daoContract The address of the DAO contract
     */
    function setDAOContract(address daoContract) external onlyRole(ADMIN_ROLE) {
        require(daoContract != address(0), "DealClient: zero address");
        _setupRole(DAO_ROLE, daoContract);
    }
}
