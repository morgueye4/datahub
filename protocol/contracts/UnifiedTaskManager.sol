// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title UnifiedTaskManager
 * @dev A contract for managing tasks
 */
contract UnifiedTaskManager is Ownable {
    using Counters for Counters.Counter;

    // Task types
    enum TaskType { DataCollection, DataLabeling, DataValidation, ModelTraining }

    // Task status
    enum TaskStatus { Open, InProgress, Completed, Cancelled }

    // Task structure
    struct Task {
        uint256 id;
        address creator;
        string title;
        string description;
        TaskType taskType;
        uint256 rewardAmount;
        uint256 reviewReward;
        uint256 numReviewers;
        address[] reviewers;
        TaskStatus status;
        uint256 createdAt;
        uint256 deadline;
        string dataCID;
        string instructionsCID;
    }

    // Counter for task IDs
    Counters.Counter private _taskIdCounter;

    // Mapping from task ID to task
    mapping(uint256 => Task) private _tasks;

    // Mapping from task ID to whether a user has submitted to the task
    mapping(uint256 => mapping(address => bool)) private _hasSubmitted;

    // Mapping from task ID to whether a user has reviewed the task
    mapping(uint256 => mapping(address => bool)) private _hasReviewed;

    // Events
    event TaskCreated(uint256 indexed taskId, address indexed creator, string title, string description, TaskType taskType, uint256 rewardAmount, uint256 reviewReward, uint256 numReviewers);
    event TaskUpdated(uint256 indexed taskId, TaskStatus status);
    event ReviewerAdded(uint256 indexed taskId, address indexed reviewer);
    event SubmissionRecorded(uint256 indexed taskId, address indexed submitter);
    event ReviewRecorded(uint256 indexed taskId, address indexed reviewer);

    /**
     * @dev Create a new task
     * @param title The title of the task
     * @param description The description of the task
     * @param taskType The type of the task
     * @param rewardAmount The reward amount for the task
     * @param reviewReward The reward amount for reviewers
     * @param numReviewers The number of reviewers required
     * @return The ID of the created task
     */
    function createTask(
        string memory title,
        string memory description,
        TaskType taskType,
        uint256 rewardAmount,
        uint256 reviewReward,
        uint256 numReviewers
    ) external returns (uint256) {
        return _createTask(title, description, taskType, rewardAmount, reviewReward, numReviewers, msg.sender);
    }

    /**
     * @dev Create a new task with a specific creator (for testing)
     * @param title The title of the task
     * @param description The description of the task
     * @param taskType The type of the task
     * @param rewardAmount The reward amount for the task
     * @param reviewReward The reward amount for reviewers
     * @param numReviewers The number of reviewers required
     * @param creator The creator of the task
     * @return The ID of the created task
     */
    function _createTask(
        string memory title,
        string memory description,
        TaskType taskType,
        uint256 rewardAmount,
        uint256 reviewReward,
        uint256 numReviewers,
        address creator
    ) internal returns (uint256) {
        uint256 taskId = _taskIdCounter.current();
        _taskIdCounter.increment();

        Task storage task = _tasks[taskId];
        task.id = taskId;
        task.creator = creator;
        task.title = title;
        task.description = description;
        task.taskType = taskType;
        task.rewardAmount = rewardAmount;
        task.reviewReward = reviewReward;
        task.numReviewers = numReviewers;
        task.status = TaskStatus.Open;
        task.createdAt = block.timestamp;
        task.deadline = block.timestamp + 7 days;

        emit TaskCreated(taskId, creator, title, description, taskType, rewardAmount, reviewReward, numReviewers);

        return taskId;
    }

    /**
     * @dev Add a reviewer to a task
     * @param taskId The ID of the task
     * @param reviewer The address of the reviewer
     */
    function addReviewer(uint256 taskId, address reviewer) external {
        Task storage task = _tasks[taskId];
        require(task.creator == msg.sender, "Only the task creator can add reviewers");
        require(task.status == TaskStatus.Open, "Task is not open");
        require(task.reviewers.length < task.numReviewers, "Maximum number of reviewers reached");
        require(reviewer != task.creator, "Creator cannot be a reviewer");

        // Check if the reviewer is already added
        for (uint256 i = 0; i < task.reviewers.length; i++) {
            require(task.reviewers[i] != reviewer, "Reviewer already added");
        }

        task.reviewers.push(reviewer);
        emit ReviewerAdded(taskId, reviewer);
    }

    /**
     * @dev Update the status of a task
     * @param taskId The ID of the task
     * @param status The new status of the task
     */
    function updateTaskStatus(uint256 taskId, TaskStatus status) external {
        Task storage task = _tasks[taskId];
        require(task.creator == msg.sender, "Only the task creator can update the status");
        require(task.status != status, "Task already has this status");

        task.status = status;
        emit TaskUpdated(taskId, status);
    }

    /**
     * @dev Record a submission for a task
     * @param taskId The ID of the task
     * @param submitter The address of the submitter
     */
    function recordSubmission(uint256 taskId, address submitter) external {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open, "Task is not open");
        require(task.creator != submitter, "Creator cannot submit to their own task");
        require(!_hasSubmitted[taskId][submitter], "Already submitted to this task");

        _hasSubmitted[taskId][submitter] = true;
        emit SubmissionRecorded(taskId, submitter);
    }

    /**
     * @dev Record a review for a task
     * @param taskId The ID of the task
     * @param reviewer The address of the reviewer
     */
    function recordReview(uint256 taskId, address reviewer) external {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open || task.status == TaskStatus.InProgress, "Task is not open or in progress");

        // Check if the reviewer is authorized
        bool isAuthorized = false;
        for (uint256 i = 0; i < task.reviewers.length; i++) {
            if (task.reviewers[i] == reviewer) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Not an authorized reviewer");
        require(!_hasReviewed[taskId][reviewer], "Already reviewed this task");

        _hasReviewed[taskId][reviewer] = true;
        emit ReviewRecorded(taskId, reviewer);
    }

    /**
     * @dev Get a task by ID
     * @param taskId The ID of the task
     * @return id The task ID
     * @return creator The task creator
     * @return title The task title
     * @return description The task description
     * @return taskType The task type
     * @return rewardAmount The task reward amount
     * @return reviewReward The review reward amount
     * @return numReviewers The number of reviewers required
     * @return reviewers The list of reviewers
     * @return status The task status
     * @return createdAt The task creation time
     * @return deadline The task deadline
     */
    function getTask(uint256 taskId) external view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        TaskType taskType,
        uint256 rewardAmount,
        uint256 reviewReward,
        uint256 numReviewers,
        address[] memory reviewers,
        TaskStatus status,
        uint256 createdAt,
        uint256 deadline
    ) {
        Task storage task = _tasks[taskId];
        return (
            task.id,
            task.creator,
            task.title,
            task.description,
            task.taskType,
            task.rewardAmount,
            task.reviewReward,
            task.numReviewers,
            task.reviewers,
            task.status,
            task.createdAt,
            task.deadline
        );
    }

    /**
     * @dev Get the number of tasks
     * @return The number of tasks
     */
    function getTaskCount() external view returns (uint256) {
        return _taskIdCounter.current();
    }

    /**
     * @dev Check if a user has submitted to a task
     * @param taskId The ID of the task
     * @param submitter The address of the submitter
     * @return True if the user has submitted to the task, false otherwise
     */
    function hasSubmitted(uint256 taskId, address submitter) external view returns (bool) {
        return _hasSubmitted[taskId][submitter];
    }

    /**
     * @dev Check if a user has reviewed a task
     * @param taskId The ID of the task
     * @param reviewer The address of the reviewer
     * @return True if the user has reviewed the task, false otherwise
     */
    function hasReviewed(uint256 taskId, address reviewer) external view returns (bool) {
        return _hasReviewed[taskId][reviewer];
    }

    /**
     * @dev Check if a user is a reviewer for a task
     * @param taskId The ID of the task
     * @param reviewer The address of the reviewer
     * @return True if the user is a reviewer for the task, false otherwise
     */
    function isReviewer(uint256 taskId, address reviewer) external view returns (bool) {
        Task storage task = _tasks[taskId];
        for (uint256 i = 0; i < task.reviewers.length; i++) {
            if (task.reviewers[i] == reviewer) {
                return true;
            }
        }
        return false;
    }
}
