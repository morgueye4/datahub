// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title GovernanceModule
 * @dev Governance module for the DataDAO
 */
contract GovernanceModule is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    
    // Proposal types
    enum ProposalType {
        General,
        TaskCreation,
        DatasetValidation,
        MembershipRule,
        Treasury,
        ContractUpgrade
    }
    
    // Proposal status
    enum ProposalStatus {
        Active,
        Passed,
        Rejected,
        Executed,
        Cancelled
    }
    
    // Vote type
    enum VoteType {
        None,
        For,
        Against,
        Abstain
    }
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        ProposalType proposalType;
        ProposalStatus status;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string[] signatures;
        bool executed;
        mapping(address => VoteType) hasVoted;
    }
    
    // DAO token
    IERC20 public daoToken;
    
    // Proposal counter
    Counters.Counter private _proposalIdCounter;
    
    // Governance parameters
    uint256 public proposalThreshold = 100 ether; // 100 tokens to create a proposal
    uint256 public votingPeriod = 3 days; // 3 days for voting
    uint256 public votingDelay = 1 days; // 1 day delay before voting starts
    uint256 public quorumVotes = 1000 ether; // 1000 tokens required for quorum
    
    // Mapping from proposal ID to proposal
    mapping(uint256 => Proposal) public proposals;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        ProposalType proposalType,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType voteType,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event GovernanceParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    /**
     * @dev Constructor
     * @param _daoToken The address of the DAO token
     */
    constructor(address _daoToken) {
        require(_daoToken != address(0), "GovernanceModule: zero address");
        daoToken = IERC20(_daoToken);
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Create a proposal
     * @param title The title of the proposal
     * @param description The description of the proposal
     * @param proposalType The type of the proposal
     * @param targets The target addresses for calls to be made
     * @param values The values to be passed to the calls
     * @param calldatas The calldatas to be passed to the calls
     * @param signatures The signatures for the calls
     * @return The ID of the created proposal
     */
    function propose(
        string memory title,
        string memory description,
        ProposalType proposalType,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string[] memory signatures
    ) external nonReentrant returns (uint256) {
        require(
            daoToken.balanceOf(msg.sender) >= proposalThreshold,
            "GovernanceModule: proposer votes below proposal threshold"
        );
        require(targets.length > 0, "GovernanceModule: must provide actions");
        require(
            targets.length == values.length &&
            targets.length == calldatas.length &&
            targets.length == signatures.length,
            "GovernanceModule: proposal function information arity mismatch"
        );
        
        uint256 proposalId = _proposalIdCounter.current();
        _proposalIdCounter.increment();
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.proposalType = proposalType;
        proposal.status = ProposalStatus.Active;
        proposal.startTime = block.timestamp + votingDelay;
        proposal.endTime = proposal.startTime + votingPeriod;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.signatures = signatures;
        proposal.executed = false;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            proposalType,
            proposal.startTime,
            proposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param proposalId The ID of the proposal
     * @param voteType The type of vote
     */
    function castVote(uint256 proposalId, VoteType voteType) external nonReentrant {
        require(voteType != VoteType.None, "GovernanceModule: invalid vote type");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "GovernanceModule: proposal not active");
        require(block.timestamp >= proposal.startTime, "GovernanceModule: voting not started");
        require(block.timestamp <= proposal.endTime, "GovernanceModule: voting ended");
        require(proposal.hasVoted[msg.sender] == VoteType.None, "GovernanceModule: already voted");
        
        uint256 votes = daoToken.balanceOf(msg.sender);
        require(votes > 0, "GovernanceModule: no voting power");
        
        proposal.hasVoted[msg.sender] = voteType;
        
        if (voteType == VoteType.For) {
            proposal.forVotes += votes;
        } else if (voteType == VoteType.Against) {
            proposal.againstVotes += votes;
        } else if (voteType == VoteType.Abstain) {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, voteType, votes);
        
        // Check if the proposal can be resolved early
        _checkProposalStatus(proposalId);
    }
    
    /**
     * @dev Execute a proposal
     * @param proposalId The ID of the proposal
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Passed, "GovernanceModule: proposal not passed");
        require(!proposal.executed, "GovernanceModule: proposal already executed");
        
        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            require(success, "GovernanceModule: transaction execution reverted");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal
     * @param proposalId The ID of the proposal
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            proposal.proposer == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "GovernanceModule: not proposer or admin"
        );
        require(proposal.status == ProposalStatus.Active, "GovernanceModule: proposal not active");
        require(!proposal.executed, "GovernanceModule: proposal already executed");
        
        proposal.status = ProposalStatus.Cancelled;
        
        emit ProposalCancelled(proposalId);
    }
    
    /**
     * @dev Check and update the status of a proposal
     * @param proposalId The ID of the proposal
     */
    function _checkProposalStatus(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.status != ProposalStatus.Active) {
            return;
        }
        
        // If voting period has ended, determine the outcome
        if (block.timestamp > proposal.endTime) {
            if (proposal.forVotes > proposal.againstVotes && proposal.forVotes >= quorumVotes) {
                proposal.status = ProposalStatus.Passed;
            } else {
                proposal.status = ProposalStatus.Rejected;
            }
        }
        // Early resolution if quorum is reached and outcome is clear
        else if (proposal.forVotes >= quorumVotes && proposal.forVotes > proposal.againstVotes * 2) {
            proposal.status = ProposalStatus.Passed;
        } else if (proposal.againstVotes >= quorumVotes && proposal.againstVotes > proposal.forVotes * 2) {
            proposal.status = ProposalStatus.Rejected;
        }
    }
    
    /**
     * @dev Update the proposal status
     * @param proposalId The ID of the proposal
     */
    function updateProposalStatus(uint256 proposalId) external {
        _checkProposalStatus(proposalId);
    }
    
    /**
     * @dev Set the proposal threshold
     * @param newProposalThreshold The new proposal threshold
     */
    function setProposalThreshold(uint256 newProposalThreshold) external onlyRole(ADMIN_ROLE) {
        uint256 oldProposalThreshold = proposalThreshold;
        proposalThreshold = newProposalThreshold;
        emit GovernanceParameterUpdated("proposalThreshold", oldProposalThreshold, newProposalThreshold);
    }
    
    /**
     * @dev Set the voting period
     * @param newVotingPeriod The new voting period
     */
    function setVotingPeriod(uint256 newVotingPeriod) external onlyRole(ADMIN_ROLE) {
        uint256 oldVotingPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;
        emit GovernanceParameterUpdated("votingPeriod", oldVotingPeriod, newVotingPeriod);
    }
    
    /**
     * @dev Set the voting delay
     * @param newVotingDelay The new voting delay
     */
    function setVotingDelay(uint256 newVotingDelay) external onlyRole(ADMIN_ROLE) {
        uint256 oldVotingDelay = votingDelay;
        votingDelay = newVotingDelay;
        emit GovernanceParameterUpdated("votingDelay", oldVotingDelay, newVotingDelay);
    }
    
    /**
     * @dev Set the quorum votes
     * @param newQuorumVotes The new quorum votes
     */
    function setQuorumVotes(uint256 newQuorumVotes) external onlyRole(ADMIN_ROLE) {
        uint256 oldQuorumVotes = quorumVotes;
        quorumVotes = newQuorumVotes;
        emit GovernanceParameterUpdated("quorumVotes", oldQuorumVotes, newQuorumVotes);
    }
    
    /**
     * @dev Get the proposal details
     * @param proposalId The ID of the proposal
     * @return id The proposal ID
     * @return proposer The proposer address
     * @return title The proposal title
     * @return description The proposal description
     * @return proposalType The proposal type
     * @return status The proposal status
     * @return startTime The proposal start time
     * @return endTime The proposal end time
     * @return forVotes The number of votes for the proposal
     * @return againstVotes The number of votes against the proposal
     * @return abstainVotes The number of abstain votes
     * @return executed Whether the proposal has been executed
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        ProposalType proposalType,
        ProposalStatus status,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.proposalType,
            proposal.status,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed
        );
    }
    
    /**
     * @dev Get the proposal actions
     * @param proposalId The ID of the proposal
     * @return targets The target addresses
     * @return values The values
     * @return signatures The signatures
     * @return calldatas The calldatas
     */
    function getProposalActions(uint256 proposalId) external view returns (
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.targets,
            proposal.values,
            proposal.signatures,
            proposal.calldatas
        );
    }
    
    /**
     * @dev Get the vote type of a voter for a proposal
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return The vote type
     */
    function getVoteType(uint256 proposalId, address voter) external view returns (VoteType) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get the number of proposals
     * @return The number of proposals
     */
    function getProposalCount() external view returns (uint256) {
        return _proposalIdCounter.current();
    }
    
    /**
     * @dev Set the DAO contract address (admin only)
     * @param daoContract The address of the DAO contract
     */
    function setDAOContract(address daoContract) external onlyRole(ADMIN_ROLE) {
        require(daoContract != address(0), "GovernanceModule: zero address");
        _setupRole(DAO_ROLE, daoContract);
    }
    
    /**
     * @dev Receive function to allow the contract to receive ETH
     */
    receive() external payable {}
}
