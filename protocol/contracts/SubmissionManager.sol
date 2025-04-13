// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SubmissionManager
 * @dev A contract for managing submissions to tasks
 */
contract SubmissionManager is Ownable {
    using Counters for Counters.Counter;
    
    // Submission status
    enum SubmissionStatus { Pending, Approved, Rejected }
    
    // Submission structure
    struct Submission {
        uint256 id;
        uint256 taskId;
        address submitter;
        string dataCID;
        string metadataCID;
        SubmissionStatus status;
        uint256 createdAt;
        mapping(address => bool) reviewers;
        mapping(address => bool) approvals;
        mapping(address => bool) rejections;
        uint256 approvalCount;
        uint256 rejectionCount;
    }
    
    // Counter for submission IDs
    Counters.Counter private _submissionIdCounter;
    
    // Mapping from submission ID to submission
    mapping(uint256 => Submission) private _submissions;
    
    // Mapping from task ID to submission IDs
    mapping(uint256 => uint256[]) private _taskSubmissions;
    
    // Events
    event SubmissionCreated(uint256 indexed submissionId, uint256 indexed taskId, address indexed submitter, string dataCID);
    event SubmissionReviewed(uint256 indexed submissionId, address indexed reviewer, bool approved);
    event SubmissionStatusUpdated(uint256 indexed submissionId, SubmissionStatus status);
    
    /**
     * @dev Create a new submission
     * @param taskId The ID of the task
     * @param dataCID The CID of the submission data
     * @param metadataCID The CID of the submission metadata
     * @return The ID of the created submission
     */
    function createSubmission(uint256 taskId, string memory dataCID, string memory metadataCID) external returns (uint256) {
        uint256 submissionId = _submissionIdCounter.current();
        _submissionIdCounter.increment();
        
        Submission storage submission = _submissions[submissionId];
        submission.id = submissionId;
        submission.taskId = taskId;
        submission.submitter = msg.sender;
        submission.dataCID = dataCID;
        submission.metadataCID = metadataCID;
        submission.status = SubmissionStatus.Pending;
        submission.createdAt = block.timestamp;
        
        _taskSubmissions[taskId].push(submissionId);
        
        emit SubmissionCreated(submissionId, taskId, msg.sender, dataCID);
        
        return submissionId;
    }
    
    /**
     * @dev Review a submission
     * @param submissionId The ID of the submission
     * @param approved Whether the submission is approved
     */
    function reviewSubmission(uint256 submissionId, bool approved) external {
        Submission storage submission = _submissions[submissionId];
        require(submission.submitter != address(0), "Submission does not exist");
        require(submission.status == SubmissionStatus.Pending, "Submission is not pending");
        require(!submission.reviewers[msg.sender], "Already reviewed this submission");
        require(submission.submitter != msg.sender, "Cannot review own submission");
        
        submission.reviewers[msg.sender] = true;
        
        if (approved) {
            submission.approvals[msg.sender] = true;
            submission.approvalCount++;
        } else {
            submission.rejections[msg.sender] = true;
            submission.rejectionCount++;
        }
        
        emit SubmissionReviewed(submissionId, msg.sender, approved);
        
        // Update submission status if consensus is reached
        // For simplicity, we'll use a simple majority rule
        if (submission.approvalCount > submission.rejectionCount && submission.approvalCount >= 2) {
            submission.status = SubmissionStatus.Approved;
            emit SubmissionStatusUpdated(submissionId, SubmissionStatus.Approved);
        } else if (submission.rejectionCount > submission.approvalCount && submission.rejectionCount >= 2) {
            submission.status = SubmissionStatus.Rejected;
            emit SubmissionStatusUpdated(submissionId, SubmissionStatus.Rejected);
        }
    }
    
    /**
     * @dev Get a submission by ID
     * @param submissionId The ID of the submission
     * @return id The ID of the submission
     * @return taskId The ID of the task
     * @return submitter The address of the submitter
     * @return dataCID The CID of the submission data
     * @return metadataCID The CID of the submission metadata
     * @return status The status of the submission
     * @return createdAt The time the submission was created
     * @return approvalCount The number of approvals
     * @return rejectionCount The number of rejections
     */
    function getSubmission(uint256 submissionId) external view returns (
        uint256 id,
        uint256 taskId,
        address submitter,
        string memory dataCID,
        string memory metadataCID,
        SubmissionStatus status,
        uint256 createdAt,
        uint256 approvalCount,
        uint256 rejectionCount
    ) {
        Submission storage submission = _submissions[submissionId];
        return (
            submission.id,
            submission.taskId,
            submission.submitter,
            submission.dataCID,
            submission.metadataCID,
            submission.status,
            submission.createdAt,
            submission.approvalCount,
            submission.rejectionCount
        );
    }
    
    /**
     * @dev Get the submission IDs for a task
     * @param taskId The ID of the task
     * @return The submission IDs
     */
    function getTaskSubmissions(uint256 taskId) external view returns (uint256[] memory) {
        return _taskSubmissions[taskId];
    }
    
    /**
     * @dev Get the number of submissions
     * @return The number of submissions
     */
    function getSubmissionCount() external view returns (uint256) {
        return _submissionIdCounter.current();
    }
    
    /**
     * @dev Check if a user has reviewed a submission
     * @param submissionId The ID of the submission
     * @param reviewer The address of the reviewer
     * @return True if the user has reviewed the submission, false otherwise
     */
    function hasReviewed(uint256 submissionId, address reviewer) external view returns (bool) {
        return _submissions[submissionId].reviewers[reviewer];
    }
    
    /**
     * @dev Check if a user has approved a submission
     * @param submissionId The ID of the submission
     * @param reviewer The address of the reviewer
     * @return True if the user has approved the submission, false otherwise
     */
    function hasApproved(uint256 submissionId, address reviewer) external view returns (bool) {
        return _submissions[submissionId].approvals[reviewer];
    }
    
    /**
     * @dev Check if a user has rejected a submission
     * @param submissionId The ID of the submission
     * @param reviewer The address of the reviewer
     * @return True if the user has rejected the submission, false otherwise
     */
    function hasRejected(uint256 submissionId, address reviewer) external view returns (bool) {
        return _submissions[submissionId].rejections[reviewer];
    }
}
