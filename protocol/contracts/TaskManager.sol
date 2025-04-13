// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TaskManager
 * @dev Manages data collection and labeling tasks
 */
contract TaskManager is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    // Task types
    enum TaskType { DataCollection, DataLabeling, DataValidation, DataCuration }

    // Task status
    enum TaskStatus { Open, InProgress, Completed, Cancelled }

    // Privacy level
    enum PrivacyLevel { Public, Private, Restricted }

    // Task structure
    struct Task {
        uint256 id;
        address creator;
        string title;
        string description;
        TaskType taskType;
        TaskStatus status;
        uint256 reward;
        uint256 reviewReward;
        uint256 requiredSubmissions;
        uint256 requiredValidations;
        uint256 deadline;
        PrivacyLevel privacyLevel;
        string accessConditionsCID;
        string dataCID;
        string instructionsCID;
        uint256 createdAt;
        uint256 completedAt;
        address[] reviewers;
        uint256 submissionCount;
        uint256 validatedSubmissionCount;
    }

    // Submission structure
    struct Submission {
        uint256 id;
        uint256 taskId;
        address submitter;
        string dataCID;
        bool isEncrypted;
        uint256 validationCount;
        bool isApproved;
        uint256 createdAt;
        mapping(address => bool) validatedBy;
        mapping(address => bool) approvedBy;
        mapping(address => bool) rejectedBy;
    }

    // DAO token
    IERC20 public daoToken;

    // Task counter
    Counters.Counter private _taskIdCounter;

    // Submission counter
    Counters.Counter private _submissionIdCounter;

    // Mapping from task ID to task
    mapping(uint256 => Task) public tasks;

    // Mapping from submission ID to submission
    mapping(uint256 => Submission) public submissions;

    // Mapping from task ID to submission IDs
    mapping(uint256 => uint256[]) public taskSubmissions;

    // Mapping from task ID to whether a user has submitted to the task
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    // Mapping from task ID to whether a user has reviewed the task
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    // Events
    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        string title,
        TaskType taskType,
        uint256 reward,
        uint256 reviewReward,
        uint256 deadline
    );
    event TaskUpdated(uint256 indexed taskId, TaskStatus status);
    event ReviewerAdded(uint256 indexed taskId, address indexed reviewer);
    event SubmissionCreated(
        uint256 indexed submissionId,
        uint256 indexed taskId,
        address indexed submitter,
        string dataCID,
        bool isEncrypted
    );
    event SubmissionValidated(
        uint256 indexed submissionId,
        address indexed validator,
        bool approved
    );
    event SubmissionApproved(uint256 indexed submissionId, uint256 indexed taskId);
    event RewardClaimed(address indexed user, uint256 amount, string reason);

    /**
     * @dev Constructor
     * @param _daoToken The address of the DAO token
     */
    constructor(address _daoToken) {
        require(_daoToken != address(0), "TaskManager: zero address");
        daoToken = IERC20(_daoToken);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new task
     * @param title The title of the task
     * @param description The description of the task
     * @param taskType The type of the task
     * @param reward The reward amount for the task
     * @param reviewReward The reward amount for reviewers
     * @param requiredSubmissions The number of required submissions
     * @param requiredValidations The number of required validations per submission
     * @param deadline The deadline for the task
     * @param privacyLevel The privacy level of the task
     * @param accessConditionsCID The CID of the access conditions (for private tasks)
     * @param instructionsCID The CID of the task instructions
     * @return The ID of the created task
     */
    function createTask(
        string memory title,
        string memory description,
        TaskType taskType,
        uint256 reward,
        uint256 reviewReward,
        uint256 requiredSubmissions,
        uint256 requiredValidations,
        uint256 deadline,
        PrivacyLevel privacyLevel,
        string memory accessConditionsCID,
        string memory instructionsCID
    ) external nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "TaskManager: title cannot be empty");
        require(bytes(description).length > 0, "TaskManager: description cannot be empty");
        require(reward > 0, "TaskManager: reward must be greater than 0");
        require(requiredSubmissions > 0, "TaskManager: required submissions must be greater than 0");
        require(requiredValidations > 0, "TaskManager: required validations must be greater than 0");
        require(deadline > block.timestamp, "TaskManager: deadline must be in the future");

        // If the task is private or restricted, access conditions must be provided
        if (privacyLevel != PrivacyLevel.Public) {
            require(bytes(accessConditionsCID).length > 0, "TaskManager: access conditions CID cannot be empty");
        }

        // Ensure the creator has enough tokens for rewards
        uint256 totalReward = reward * requiredSubmissions + reviewReward * requiredSubmissions * requiredValidations;
        require(daoToken.transferFrom(msg.sender, address(this), totalReward), "TaskManager: token transfer failed");

        // Create the task
        uint256 taskId = _taskIdCounter.current();
        _taskIdCounter.increment();

        tasks[taskId] = Task({
            id: taskId,
            creator: msg.sender,
            title: title,
            description: description,
            taskType: taskType,
            status: TaskStatus.Open,
            reward: reward,
            reviewReward: reviewReward,
            requiredSubmissions: requiredSubmissions,
            requiredValidations: requiredValidations,
            deadline: deadline,
            privacyLevel: privacyLevel,
            accessConditionsCID: accessConditionsCID,
            dataCID: "",
            instructionsCID: instructionsCID,
            createdAt: block.timestamp,
            completedAt: 0,
            reviewers: new address[](0),
            submissionCount: 0,
            validatedSubmissionCount: 0
        });

        emit TaskCreated(
            taskId,
            msg.sender,
            title,
            taskType,
            reward,
            reviewReward,
            deadline
        );

        return taskId;
    }

    /**
     * @dev Add a reviewer to a task
     * @param taskId The ID of the task
     * @param reviewer The address of the reviewer
     */
    function addReviewer(uint256 taskId, address reviewer) external {
        require(tasks[taskId].creator == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "TaskManager: not authorized");
        require(tasks[taskId].status == TaskStatus.Open, "TaskManager: task is not open");
        require(reviewer != tasks[taskId].creator, "TaskManager: creator cannot be a reviewer");

        // Check if the reviewer is already added
        for (uint256 i = 0; i < tasks[taskId].reviewers.length; i++) {
            require(tasks[taskId].reviewers[i] != reviewer, "TaskManager: reviewer already added");
        }

        tasks[taskId].reviewers.push(reviewer);
        emit ReviewerAdded(taskId, reviewer);
    }

    /**
     * @dev Update the status of a task
     * @param taskId The ID of the task
     * @param status The new status of the task
     */
    function updateTaskStatus(uint256 taskId, TaskStatus status) external {
        require(tasks[taskId].creator == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "TaskManager: not authorized");
        require(tasks[taskId].status != status, "TaskManager: task already has this status");

        tasks[taskId].status = status;

        if (status == TaskStatus.Completed) {
            tasks[taskId].completedAt = block.timestamp;
        }

        emit TaskUpdated(taskId, status);
    }

    /**
     * @dev Submit to a task
     * @param taskId The ID of the task
     * @param dataCID The CID of the submission data
     * @param isEncrypted Whether the submission is encrypted
     * @return The ID of the created submission
     */
    function submitToTask(
        uint256 taskId,
        string memory dataCID,
        bool isEncrypted
    ) external nonReentrant returns (uint256) {
        require(tasks[taskId].status == TaskStatus.Open, "TaskManager: task is not open");
        require(tasks[taskId].creator != msg.sender, "TaskManager: creator cannot submit to their own task");
        require(!hasSubmitted[taskId][msg.sender], "TaskManager: already submitted to this task");
        require(block.timestamp <= tasks[taskId].deadline, "TaskManager: task deadline has passed");
        require(tasks[taskId].submissionCount < tasks[taskId].requiredSubmissions, "TaskManager: maximum submissions reached");
        require(bytes(dataCID).length > 0, "TaskManager: data CID cannot be empty");

        // Create the submission
        uint256 submissionId = _submissionIdCounter.current();
        _submissionIdCounter.increment();

        Submission storage submission = submissions[submissionId];
        submission.id = submissionId;
        submission.taskId = taskId;
        submission.submitter = msg.sender;
        submission.dataCID = dataCID;
        submission.isEncrypted = isEncrypted;
        submission.validationCount = 0;
        submission.isApproved = false;
        submission.createdAt = block.timestamp;

        // Update task
        taskSubmissions[taskId].push(submissionId);
        hasSubmitted[taskId][msg.sender] = true;
        tasks[taskId].submissionCount++;

        emit SubmissionCreated(submissionId, taskId, msg.sender, dataCID, isEncrypted);

        return submissionId;
    }

    /**
     * @dev Validate a submission
     * @param submissionId The ID of the submission
     * @param approved Whether the submission is approved
     */
    function validateSubmission(uint256 submissionId, bool approved) external nonReentrant {
        Submission storage submission = submissions[submissionId];
        uint256 taskId = submission.taskId;

        require(submission.submitter != address(0), "TaskManager: submission does not exist");
        require(submission.submitter != msg.sender, "TaskManager: cannot validate own submission");
        require(!submission.validatedBy[msg.sender], "TaskManager: already validated this submission");

        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "TaskManager: task is not open");

        // Check if the validator is authorized
        bool isAuthorized = false;
        if (task.reviewers.length > 0) {
            for (uint256 i = 0; i < task.reviewers.length; i++) {
                if (task.reviewers[i] == msg.sender) {
                    isAuthorized = true;
                    break;
                }
            }
        } else {
            // If no specific reviewers are set, any DAO member can validate
            isAuthorized = true; // In a real implementation, check if the user is a DAO member
        }

        require(isAuthorized, "TaskManager: not authorized to validate");

        // Record validation
        submission.validatedBy[msg.sender] = true;
        submission.validationCount++;

        if (approved) {
            submission.approvedBy[msg.sender] = true;
        } else {
            submission.rejectedBy[msg.sender] = true;
        }

        emit SubmissionValidated(submissionId, msg.sender, approved);

        // Check if the submission has received enough validations
        if (submission.validationCount >= task.requiredValidations) {
            // Count approvals
            uint256 approvalCount = 0;
            for (uint256 i = 0; i < task.reviewers.length; i++) {
                if (submission.approvedBy[task.reviewers[i]]) {
                    approvalCount++;
                }
            }

            // If majority approved, mark as approved
            if (approvalCount > task.requiredValidations / 2) {
                submission.isApproved = true;
                task.validatedSubmissionCount++;

                // Reward the submitter
                require(daoToken.transfer(submission.submitter, task.reward), "TaskManager: token transfer failed");
                emit RewardClaimed(submission.submitter, task.reward, "Submission approved");

                emit SubmissionApproved(submissionId, taskId);

                // Check if the task is complete
                if (task.validatedSubmissionCount >= task.requiredSubmissions) {
                    task.status = TaskStatus.Completed;
                    task.completedAt = block.timestamp;
                    emit TaskUpdated(taskId, TaskStatus.Completed);
                }
            }
        }

        // Reward the validator
        require(daoToken.transfer(msg.sender, task.reviewReward), "TaskManager: token transfer failed");
        emit RewardClaimed(msg.sender, task.reviewReward, "Submission validated");
    }

    /**
     * @dev Get basic task details
     * @param taskId The ID of the task
     * @return id The task ID
     * @return creator The task creator
     * @return title The task title
     * @return description The task description
     * @return taskType The task type
     * @return status The task status
     * @return reward The task reward
     * @return reviewReward The review reward
     */
    function getTaskBasic(uint256 taskId) external view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        TaskType taskType,
        TaskStatus status,
        uint256 reward,
        uint256 reviewReward
    ) {
        Task storage task = tasks[taskId];
        return (
            task.id,
            task.creator,
            task.title,
            task.description,
            task.taskType,
            task.status,
            task.reward,
            task.reviewReward
        );
    }

    /**
     * @dev Get task requirements
     * @param taskId The ID of the task
     * @return requiredSubmissions The required number of submissions
     * @return requiredValidations The required number of validations
     * @return deadline The task deadline
     * @return privacyLevel The privacy level
     * @return submissionCount The submission count
     * @return validatedSubmissionCount The validated submission count
     */
    function getTaskRequirements(uint256 taskId) external view returns (
        uint256 requiredSubmissions,
        uint256 requiredValidations,
        uint256 deadline,
        PrivacyLevel privacyLevel,
        uint256 submissionCount,
        uint256 validatedSubmissionCount
    ) {
        Task storage task = tasks[taskId];
        return (
            task.requiredSubmissions,
            task.requiredValidations,
            task.deadline,
            task.privacyLevel,
            task.submissionCount,
            task.validatedSubmissionCount
        );
    }

    /**
     * @dev Get task content details
     * @param taskId The ID of the task
     * @return accessConditionsCID The access conditions CID
     * @return dataCID The data CID
     * @return instructionsCID The instructions CID
     * @return createdAt The creation timestamp
     * @return completedAt The completion timestamp
     */
    function getTaskContent(uint256 taskId) external view returns (
        string memory accessConditionsCID,
        string memory dataCID,
        string memory instructionsCID,
        uint256 createdAt,
        uint256 completedAt
    ) {
        Task storage task = tasks[taskId];
        return (
            task.accessConditionsCID,
            task.dataCID,
            task.instructionsCID,
            task.createdAt,
            task.completedAt
        );
    }

    /**
     * @dev Get the reviewers of a task
     * @param taskId The ID of the task
     * @return The reviewers
     */
    function getTaskReviewers(uint256 taskId) external view returns (address[] memory) {
        return tasks[taskId].reviewers;
    }

    /**
     * @dev Get a submission by ID
     * @param submissionId The ID of the submission
     * @return id The ID of the submission
     * @return taskId The ID of the task
     * @return submitter The address of the submitter
     * @return dataCID The CID of the submission data
     * @return isEncrypted Whether the submission is encrypted
     * @return validationCount The number of validations
     * @return isApproved Whether the submission is approved
     * @return createdAt When the submission was created
     */
    function getSubmission(uint256 submissionId) external view returns (
        uint256 id,
        uint256 taskId,
        address submitter,
        string memory dataCID,
        bool isEncrypted,
        uint256 validationCount,
        bool isApproved,
        uint256 createdAt
    ) {
        Submission storage submission = submissions[submissionId];
        return (
            submission.id,
            submission.taskId,
            submission.submitter,
            submission.dataCID,
            submission.isEncrypted,
            submission.validationCount,
            submission.isApproved,
            submission.createdAt
        );
    }

    /**
     * @dev Check if a user has validated a submission
     * @param submissionId The ID of the submission
     * @param validator The address of the validator
     * @return Whether the user has validated the submission
     */
    function hasValidated(uint256 submissionId, address validator) external view returns (bool) {
        return submissions[submissionId].validatedBy[validator];
    }

    /**
     * @dev Check if a user has approved a submission
     * @param submissionId The ID of the submission
     * @param validator The address of the validator
     * @return Whether the user has approved the submission
     */
    function hasApproved(uint256 submissionId, address validator) external view returns (bool) {
        return submissions[submissionId].approvedBy[validator];
    }

    /**
     * @dev Check if a user has rejected a submission
     * @param submissionId The ID of the submission
     * @param validator The address of the validator
     * @return Whether the user has rejected the submission
     */
    function hasRejected(uint256 submissionId, address validator) external view returns (bool) {
        return submissions[submissionId].rejectedBy[validator];
    }

    /**
     * @dev Get the submissions for a task
     * @param taskId The ID of the task
     * @return The submission IDs
     */
    function getTaskSubmissions(uint256 taskId) external view returns (uint256[] memory) {
        return taskSubmissions[taskId];
    }

    /**
     * @dev Get the number of tasks
     * @return The number of tasks
     */
    function getTaskCount() external view returns (uint256) {
        return _taskIdCounter.current();
    }

    /**
     * @dev Get the number of submissions
     * @return The number of submissions
     */
    function getSubmissionCount() external view returns (uint256) {
        return _submissionIdCounter.current();
    }

    /**
     * @dev Set the DAO contract address (admin only)
     * @param daoContract The address of the DAO contract
     */
    function setDAOContract(address daoContract) external onlyRole(ADMIN_ROLE) {
        require(daoContract != address(0), "TaskManager: zero address");
        _setupRole(DAO_ROLE, daoContract);
    }
}
