// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DAOContract
 * @dev Governance contract for the decentralized data labeling platform
 */
contract DAOContract is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    // Proposal types
    uint8 public constant PROPOSAL_TYPE_PARAMETER_CHANGE = 1;
    uint8 public constant PROPOSAL_TYPE_FUND_ALLOCATION = 2;
    uint8 public constant PROPOSAL_TYPE_DATASET_ACCESS = 3;
    uint8 public constant PROPOSAL_TYPE_ROLE_GRANT = 4;

    // Governance parameters
    uint256 public votingPeriod = 3 days;
    uint256 public quorum = 100 ether; // 100 tokens
    uint256 public proposalThreshold = 10 ether; // 10 tokens

    // Governance token
    IERC20 public governanceToken;

    // Member structure
    struct Member {
        bool exists;
        uint256 reputation;
        uint256 joinedAt;
    }

    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint8 proposalType;
        bytes actionData;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    // Counter for proposal IDs
    uint256 public proposalCount;

    // Mapping from address to member
    mapping(address => Member) public members;

    // Mapping from proposal ID to proposal
    mapping(uint256 => Proposal) public proposals;

    // Events
    event MemberJoined(address indexed member, uint256 timestamp);
    event ReputationUpdated(address indexed member, uint256 newReputation);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint8 proposalType);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    event VotingParametersUpdated(uint256 votingPeriod, uint256 quorum, uint256 proposalThreshold);

    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token
     */
    constructor(address _governanceToken) {
        governanceToken = IERC20(_governanceToken);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PROPOSER_ROLE, msg.sender);
        _setupRole(EXECUTOR_ROLE, msg.sender);
        _setupRole(REVIEWER_ROLE, msg.sender);

        // Add the deployer as a member
        _joinDAO(msg.sender);

        // Set initial reputation
        members[msg.sender].reputation = 100;
    }

    /**
     * @dev Join the DAO
     */
    function joinDAO() external {
        _joinDAO(msg.sender);
    }

    /**
     * @dev Force join a user to the DAO (for testing)
     * @param account The address of the account to join
     */
    function forceJoin(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _joinDAO(account);
    }

    /**
     * @dev Internal function to join the DAO
     * @param account The address of the account to join
     */
    function _joinDAO(address account) internal {
        require(!members[account].exists, "Already a member");

        members[account] = Member({
            exists: true,
            reputation: 0,
            joinedAt: block.timestamp
        });

        emit MemberJoined(account, block.timestamp);
    }

    /**
     * @dev Set the reputation of a member
     * @param member The address of the member
     * @param reputation The new reputation
     */
    function setReputation(address member, uint256 reputation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(members[member].exists, "Not a member");

        members[member].reputation = reputation;
        emit ReputationUpdated(member, reputation);
    }

    /**
     * @dev Create a proposal
     * @param _title The title of the proposal
     * @param _description The description of the proposal
     * @param _proposalType The type of the proposal
     * @param _actionData The action data for the proposal
     * @return Proposal ID
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint8 _proposalType,
        bytes memory _actionData
    ) external returns (uint256) {
        require(
            hasRole(PROPOSER_ROLE, msg.sender) ||
            governanceToken.balanceOf(msg.sender) >= proposalThreshold,
            "Insufficient tokens to create proposal"
        );

        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];

        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = _title;
        proposal.description = _description;
        proposal.proposalType = _proposalType;
        proposal.actionData = _actionData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;

        emit ProposalCreated(proposalId, msg.sender, _title, _proposalType);

        return proposalId;
    }

    /**
     * @dev Vote on a proposal
     * @param proposalId The ID of the proposal
     * @param support Whether to support the proposal
     */
    function vote(uint256 proposalId, bool support) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Execute a proposal
     * @param proposalId The ID of the proposal
     */
    function executeProposal(uint256 proposalId) external nonReentrant onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Already executed");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        bool passed = totalVotes >= quorum && proposal.forVotes > proposal.againstVotes;

        proposal.executed = true;

        emit ProposalExecuted(proposalId, passed);

        if (passed) {
            // Execute the proposal based on its type
            if (proposal.proposalType == PROPOSAL_TYPE_PARAMETER_CHANGE) {
                _executeParameterChange(proposal.actionData);
            } else if (proposal.proposalType == PROPOSAL_TYPE_FUND_ALLOCATION) {
                _executeFundAllocation(proposal.actionData);
            } else if (proposal.proposalType == PROPOSAL_TYPE_DATASET_ACCESS) {
                _executeDatasetAccess(proposal.actionData);
            } else if (proposal.proposalType == PROPOSAL_TYPE_ROLE_GRANT) {
                _executeRoleGrant(proposal.actionData);
            }
        }
    }

    /**
     * @dev Execute a parameter change proposal
     * @param actionData The action data for the proposal
     */
    function _executeParameterChange(bytes memory actionData) internal {
        (uint256 newVotingPeriod, uint256 newQuorum, uint256 newProposalThreshold) =
            abi.decode(actionData, (uint256, uint256, uint256));

        votingPeriod = newVotingPeriod;
        quorum = newQuorum;
        proposalThreshold = newProposalThreshold;

        emit VotingParametersUpdated(votingPeriod, quorum, proposalThreshold);
    }

    /**
     * @dev Execute a fund allocation proposal
     * @param actionData The action data for the proposal
     */
    function _executeFundAllocation(bytes memory actionData) internal {
        (address recipient, uint256 amount) = abi.decode(actionData, (address, uint256));

        // Transfer tokens to the recipient
        // This would typically involve interacting with a treasury contract
        // For simplicity, we'll just emit an event
        emit FundAllocation(recipient, amount);
    }

    /**
     * @dev Execute a dataset access proposal
     * @param actionData The action data for the proposal
     */
    function _executeDatasetAccess(bytes memory actionData) internal {
        (uint256 datasetId, uint8 accessLevel) = abi.decode(actionData, (uint256, uint8));

        // Update dataset access level
        // This would typically involve interacting with a dataset registry contract
        // For simplicity, we'll just emit an event
        emit DatasetAccessUpdated(datasetId, accessLevel);
    }

    /**
     * @dev Execute a role grant proposal
     * @param actionData The action data for the proposal
     */
    function _executeRoleGrant(bytes memory actionData) internal {
        (bytes32 role, address account) = abi.decode(actionData, (bytes32, address));

        // Grant the role to the account
        grantRole(role, account);
    }

    /**
     * @dev Get the voting weight of an account
     * @param account The address of the account
     * @return The voting weight
     */
    function getVotingWeight(address account) external view returns (uint256) {
        return governanceToken.balanceOf(account);
    }

    /**
     * @dev Get the proposal details
     * @param proposalId The ID of the proposal
     * @return id The ID of the proposal
     * @return proposer The address of the proposer
     * @return title The title of the proposal
     * @return description The description of the proposal
     * @return proposalType The type of the proposal
     * @return startTime The start time of the proposal
     * @return endTime The end time of the proposal
     * @return forVotes The number of votes for the proposal
     * @return againstVotes The number of votes against the proposal
     * @return executed Whether the proposal has been executed
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        uint8 proposalType,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.proposalType,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed
        );
    }

    /**
     * @dev Check if an account has voted on a proposal
     * @param proposalId The ID of the proposal
     * @param account The address of the account
     * @return Whether the account has voted on the proposal
     */
    function hasVoted(uint256 proposalId, address account) external view returns (bool) {
        return proposals[proposalId].hasVoted[account];
    }

    /**
     * @dev Get the member details
     * @param account The address of the member
     * @return exists Whether the member exists
     * @return reputation The reputation of the member
     * @return joinedAt The time the member joined
     */
    function getMember(address account) external view returns (
        bool exists,
        uint256 reputation,
        uint256 joinedAt
    ) {
        Member storage member = members[account];
        return (
            member.exists,
            member.reputation,
            member.joinedAt
        );
    }

    /**
     * @dev Get the DAO statistics
     * @return memberCount The number of members
     * @return proposalCountValue The number of proposals
     * @return tokenSupply The total supply of the governance token
     */
    function getDAOStats() external view returns (
        uint256 memberCount,
        uint256 proposalCountValue,
        uint256 tokenSupply
    ) {
        // For simplicity, we'll just return some placeholder values
        return (
            1000, // Member count (placeholder)
            proposalCountValue,
            governanceToken.totalSupply()
        );
    }

    // Events for fund allocation and dataset access
    event FundAllocation(address indexed recipient, uint256 amount);
    event DatasetAccessUpdated(uint256 indexed datasetId, uint8 accessLevel);
}
