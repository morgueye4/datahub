import { ethers } from 'ethers'
import cidUtils from '../utils/cidUtils'

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Helper function to make API requests
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
const apiRequest = async (endpoint, options = {}) => {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Don't include credentials by default to avoid CORS issues
    // credentials: 'include',
    mode: 'cors',
  }

  const url = `${API_BASE_URL}${endpoint}`

  try {
    console.log(`Making API request to: ${url}`);
    const response = await fetch(url, { ...defaultOptions, ...options })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json()
    console.log(`API response:`, data);

    if (!data.success && data.success !== undefined) {
      throw new Error(data.message || 'API request failed')
    }

    return data
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

/**
 * API functions for interacting with the backend
 */
export const backendAPI = {
  /**
   * Get all tasks
   * @returns {Promise<Array>} Array of tasks
   */
  getTasks: async () => {
    try {
      console.log('Fetching all tasks...');
      const response = await apiRequest('/tasks')
      console.log('Tasks fetched successfully:', response);
      return response.data || []
    } catch (error) {
      console.error('Error fetching tasks:', error)
      // Return empty array instead of throwing to prevent UI errors
      return []
    }
  },

  /**
   * Get task by ID
   * @param {number} id - Task ID
   * @returns {Promise<Object>} Task data
   */
  getTaskById: async (id) => {
    try {
      console.log(`backendAPI.getTaskById called with id: ${id}`);
      if (!id) {
        console.error('Task ID is required');
        return null;
      }

      const response = await apiRequest(`/tasks/${id}`);
      console.log(`API response for task ${id}:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      return null;
    }
  },

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  createTask: async (taskData) => {
    try {
      const response = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })
      return response.data
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  },

  /**
   * Get all submissions for a task
   * @param {number} taskId - Task ID
   * @returns {Promise<Array>} Array of submissions
   */
  getSubmissionsForTask: async (taskId) => {
    try {
      const response = await apiRequest(`/submissions/task/${taskId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching submissions for task ${taskId}:`, error)
      return []
    }
  },

  /**
   * Get submission by ID
   * @param {number} id - Submission ID
   * @returns {Promise<Object>} Submission data
   */
  getSubmissionById: async (id) => {
    try {
      const response = await apiRequest(`/submissions/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching submission ${id}:`, error)
      return null
    }
  },

  /**
   * Create a new submission
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} Created submission
   */
  createSubmission: async (submissionData) => {
    try {
      const response = await apiRequest('/submissions', {
        method: 'POST',
        body: JSON.stringify(submissionData),
      })
      return response.data
    } catch (error) {
      console.error('Error creating submission:', error)
      throw error
    }
  },

  /**
   * Get all reviews for a submission
   * @param {number} submissionId - Submission ID
   * @returns {Promise<Array>} Array of reviews
   */
  getReviewsForSubmission: async (submissionId) => {
    try {
      const response = await apiRequest(`/reviews/submission/${submissionId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching reviews for submission ${submissionId}:`, error)
      return []
    }
  },

  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Created review
   */
  createReview: async (reviewData) => {
    try {
      const response = await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify(reviewData),
      })
      return response.data
    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  },
}

/**
 * API functions for interacting with smart contracts
 */
export const smartContractAPI = {
  /**
   * Create a task on the blockchain
   * Note: While this function accepts many parameters for backward compatibility,
   * the actual contract call only uses a subset of these parameters.
   *
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {string} rewardPerSubmission - Reward per submission in ETH
   * @param {string} rewardPerReview - Reward per review in ETH
   * @param {number} deadline - Task deadline as Unix timestamp
   * @param {string} dataCid - Task data CID
   * @param {number} requiredSubmissions - Required number of submissions
   * @param {number} requiredReviewers - Required number of reviewers
   * @param {Array<string>} nominatedReviewers - Array of nominated reviewer addresses
   * @param {number} taskType - Task type (1 = Image Classification, 2 = Text Classification, etc.)
   * @param {number} consensusMechanism - Consensus mechanism (1 = Majority, 2 = Unanimous, etc.)
   * @param {string} instructions - Task instructions
   * @param {Array<string>} categories - Array of categories
   * @param {number} minConsensusPercentage - Minimum consensus percentage
   * @param {boolean} requireEvidence - Whether evidence is required
   * @param {number} maxSubmissionsPerUser - Maximum submissions per user
   * @param {number} maxReviewsPerUser - Maximum reviews per user
   * @param {boolean} requireVerification - Whether verification is required
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Result object with success flag and task ID
   */
  createTask: async (
    title,
    description,
    rewardPerSubmission,
    rewardPerReview,
    deadline,
    dataCid,
    requiredSubmissions,
    requiredReviewers,
    nominatedReviewers,
    taskType,
    consensusMechanism,
    instructions,
    categories,
    minConsensusPercentage,
    requireEvidence,
    maxSubmissionsPerUser,
    maxReviewsPerUser,
    requireVerification,
    contracts
  ) => {
    try {

      console.log('Creating task on blockchain with data:', {
        title,
        description,
        rewardPerSubmission,
        rewardPerReview,
        deadline,
        dataCid,
        dataCidType: typeof dataCid,
        dataCidIsObject: typeof dataCid === 'object',
        dataCidKeys: typeof dataCid === 'object' ? Object.keys(dataCid) : [],
        requiredSubmissions,
        requiredReviewers,
        nominatedReviewers: nominatedReviewers?.length || 0,
        taskType,
        consensusMechanism
      });

      // Ensure dataCid is a string
      if (typeof dataCid === 'object' && dataCid !== null) {
        console.warn('dataCid is an object, converting to string');
        if (dataCid.toString) {
          dataCid = dataCid.toString();
        } else {
          dataCid = JSON.stringify(dataCid);
        }
        console.log('Converted dataCid:', dataCid);
      }

      // Validate contracts
      if (!contracts) {
        throw new Error('Contracts not provided');
      }

      // Validate task manager contract
      if (!contracts.taskManager) {
        throw new Error('Task Manager contract not initialized');
      }

      // Prioritize using the UnifiedTaskManager contract
      let contractType = 'UnifiedTaskManager';
      let taskManagerContract;

      // Check if we have the UnifiedTaskManager contract available
      if (contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract with address:', taskManagerContract.address);
      }
      // Fall back to the original TaskManager if UnifiedTaskManager is not available
      else if (contracts.taskManager) {
        taskManagerContract = contracts.taskManager;
        contractType = 'TaskManager';
        console.log('Falling back to TaskManager contract with address:', taskManagerContract.address);
      }
      else {
        throw new Error('No task manager contract available');
      }

      console.log('Contract type:', contractType);
      console.log('Contract address:', taskManagerContract.address);

      // Convert rewards to wei
      const rewardPerSubmissionInWei = ethers.utils.parseEther(rewardPerSubmission.toString());
      const rewardPerReviewInWei = ethers.utils.parseEther(rewardPerReview.toString());

      // Convert CID to bytes32
      let dataCidBytes32;
      try {
        // Check if dataCid is a valid string
        if (typeof dataCid !== 'string' || !dataCid) {
          console.error('Invalid dataCid:', dataCid);
          dataCidBytes32 = ethers.constants.HashZero; // Use zero hash as fallback
        } else {
          // Make sure we're not passing a BigNumber
          if (dataCid.type === 'BigNumber' && dataCid.hex) {
            console.error('dataCid is a BigNumber, not a string:', dataCid);
            dataCidBytes32 = ethers.constants.HashZero; // Use zero hash as fallback
          } else {
            dataCidBytes32 = cidUtils.cidToBytes32(dataCid);
          }
        }
        console.log('Converted CID to bytes32:', dataCidBytes32);
      } catch (error) {
        console.error('Error converting CID to bytes32:', error);
        dataCidBytes32 = ethers.constants.HashZero; // Use zero hash as fallback
      }

      // Ensure dataCidBytes32 is a valid bytes32 value
      if (typeof dataCidBytes32 !== 'string' || !dataCidBytes32.startsWith('0x') || dataCidBytes32.length !== 66) {
        console.error('Invalid dataCidBytes32 format:', dataCidBytes32);
        dataCidBytes32 = ethers.constants.HashZero; // Use zero hash as fallback
        console.log('Using zero hash as fallback for dataCidBytes32');
      }

      let tx;
      let gasEstimate;
      let txOptions;

      try {
        // Log parameters for the UnifiedTaskManager contract
        console.log('Parameters for task creation:', {
          title,
          description,
          dataCidBytes32,
          rewardPerSubmissionInWei: rewardPerSubmissionInWei.toString(),
          rewardPerReviewInWei: rewardPerReviewInWei.toString(),
          requiredSubmissions,
          requiredReviewers,
          deadline,
          nominatedReviewers: nominatedReviewers.length,
          taskType,
          consensusMechanism,
          instructions: instructions.substring(0, 20) + '...',
          categories,
          minConsensusPercentage,
          requireEvidence,
          maxSubmissionsPerUser,
          maxReviewsPerUser,
          requireVerification
        });

        // Estimate gas for the UnifiedTaskManager contract
        console.log('Estimating gas for createTask...');

        // Map the taskType to the correct enum value
        // TaskType enum: { DataCollection: 0, DataLabeling: 1, DataValidation: 2, ModelTraining: 3 }
        let taskTypeEnum;
        switch(parseInt(taskType)) {
          case 1: // Image Classification in the UI
          case 2: // Text Classification in the UI
          case 3: // Audio Classification in the UI
            taskTypeEnum = 1; // DataLabeling in the contract
            break;
          case 4: // Data Validation in the UI
            taskTypeEnum = 2; // DataValidation in the contract
            break;
          case 5: // Model Training in the UI
            taskTypeEnum = 3; // ModelTraining in the contract
            break;
          default:
            taskTypeEnum = 0; // DataCollection in the contract
        }

        console.log('Using simplified createTask with 6 parameters');
        console.log('Parameters:', {
          title,
          description,
          taskTypeEnum,
          rewardPerSubmissionInWei: rewardPerSubmissionInWei.toString(),
          rewardPerReviewInWei: rewardPerReviewInWei.toString(),
          requiredReviewers
        });

        // Log the contract address to verify
        console.log('Contract address being used:', taskManagerContract.address);

        gasEstimate = await taskManagerContract.estimateGas.createTask(
          title,
          description,
          taskTypeEnum,
          rewardPerSubmissionInWei,
          rewardPerReviewInWei,
          requiredReviewers
        );

        console.log('Gas estimate:', gasEstimate.toString());

        // If gas estimation succeeds, send the transaction with a higher gas limit and price
        const provider = contracts.taskManager.provider;
        const feeData = await provider.getFeeData();
        console.log('Current gas price:', ethers.utils.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');

        // Use a higher gas price (1.5x the current gas price)
        const higherGasPrice = feeData.gasPrice.mul(150).div(100);
        console.log('Using gas price:', ethers.utils.formatUnits(higherGasPrice, 'gwei'), 'gwei');

        // Transaction options
        txOptions = {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice: higherGasPrice // Use higher gas price
        };
      } catch (error) {
        console.error('Gas estimation failed:', error);

        // Try with a fixed gas limit and higher gas price as a fallback
        const provider = contracts.taskManager.provider;
        const feeData = await provider.getFeeData();
        console.log('Current gas price (fallback):', ethers.utils.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');

        // Use a higher gas price (2x the current gas price for fallback)
        const higherGasPrice = feeData.gasPrice.mul(200).div(100);
        console.log('Using gas price (fallback):', ethers.utils.formatUnits(higherGasPrice, 'gwei'), 'gwei');

        // Transaction options
        txOptions = {
          gasLimit: 5000000, // Use a high fixed gas limit
          gasPrice: higherGasPrice // Use higher gas price
        };
      }

      // Send the transaction with the UnifiedTaskManager contract
      console.log('Sending createTask transaction...');
      console.log('Contract address:', taskManagerContract.address);
      console.log('Contract interface:', JSON.stringify(taskManagerContract.interface.fragments.map(f => f.name)));
      console.log('Contract functions:', JSON.stringify(Object.keys(taskManagerContract.functions)));

      // Debug mode - try to get more information about the contract
      try {
        const taskCount = await taskManagerContract.getTaskCount();
        console.log('Current task count:', taskCount.toString());
      } catch (error) {
        console.log('Error getting task count:', error.message);
      }

      // Skip token checks for debugging
      console.log('Skipping token checks for debugging...');

      // Map the taskType to the correct enum value (same mapping as above)
      // TaskType enum: { DataCollection: 0, DataLabeling: 1, DataValidation: 2, ModelTraining: 3 }
      let taskTypeEnum;
      switch(parseInt(taskType)) {
        case 1: // Image Classification in the UI
        case 2: // Text Classification in the UI
        case 3: // Audio Classification in the UI
          taskTypeEnum = 1; // DataLabeling in the contract
          break;
        case 4: // Data Validation in the UI
          taskTypeEnum = 2; // DataValidation in the contract
          break;
        case 5: // Model Training in the UI
          taskTypeEnum = 3; // ModelTraining in the contract
          break;
        default:
          taskTypeEnum = 0; // DataCollection in the contract
      }

      // Log final parameters
      console.log('Final transaction parameters:', {
        title,
        description,
        taskTypeEnum,
        rewardPerSubmissionInWei: rewardPerSubmissionInWei.toString(),
        rewardPerReviewInWei: rewardPerReviewInWei.toString(),
        requiredReviewers,
        contractAddress: taskManagerContract.address
      });

      // Try with a simpler approach - just the required parameters
      console.log('Trying simplified createTask call...');

      // Get gas price and increase it by 20%
      const gasPrice = (await taskManagerContract.provider.getGasPrice()).mul(120).div(100);
      console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

      // Set a more reasonable gas limit
      const gasLimit = ethers.BigNumber.from(500000); // 500,000 gas
      console.log('Using manual gas limit:', gasLimit.toString());

      try {
        console.log('Sending createTask transaction with parameters:', {
          title,
          description,
          taskTypeEnum,
          rewardPerSubmissionInWei: rewardPerSubmissionInWei.toString(),
          rewardPerReviewInWei: rewardPerReviewInWei.toString(),
          requiredReviewers
        });

        // Try with no gas parameters first
        console.log('Trying with no gas parameters...');
        try {
          tx = await taskManagerContract.createTask(
            title,
            description,
            taskTypeEnum,
            rewardPerSubmissionInWei,
            rewardPerReviewInWei,
            requiredReviewers
          );
        } catch (noGasError) {
          console.log('Transaction without gas parameters failed:', noGasError.message);

          // Try with minimal gas parameters
          console.log('Trying with minimal gas parameters...');
          try {
            tx = await taskManagerContract.createTask(
              title,
              description,
              taskTypeEnum,
              rewardPerSubmissionInWei,
              rewardPerReviewInWei,
              requiredReviewers,
              {
                gasLimit: gasLimit
              }
            );
          } catch (minGasError) {
            console.log('Transaction with minimal gas parameters failed:', minGasError.message);

            // Try with full gas parameters as a last resort
            console.log('Trying with full gas parameters...');
            tx = await taskManagerContract.createTask(
              title,
              description,
              taskTypeEnum,
              rewardPerSubmissionInWei,
              rewardPerReviewInWei,
              requiredReviewers,
              {
                gasLimit: gasLimit,
                gasPrice: gasPrice
              }
            );
          }
        }
      } catch (txError) {
        console.error('All transaction attempts failed:', txError);
        throw new Error(`Transaction failed: ${txError.message}`);
      }

      console.log('Transaction sent:', tx.hash);

      // Add more detailed transaction monitoring
      const txProvider = taskManagerContract.provider;

      // Get transaction details
      const txDetails = await txProvider.getTransaction(tx.hash);
      console.log('Transaction details:', {
        hash: txDetails.hash,
        from: txDetails.from,
        to: txDetails.to,
        gasLimit: txDetails.gasLimit.toString(),
        gasPrice: ethers.utils.formatUnits(txDetails.gasPrice, 'gwei') + ' gwei',
        nonce: txDetails.nonce,
        data: txDetails.data.substring(0, 66) + '...' // Show first 66 chars of data
      });

      // Wait for transaction to be mined with a timeout
      let receipt;
      try {
        console.log('Waiting for transaction to be mined...');
        receipt = await tx.wait();
        console.log('Transaction mined:', {
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status // 1 = success, 0 = failure
        });
      } catch (error) {
        console.error('Error waiting for transaction:', error);

        // Check transaction status manually
        const txStatus = await txProvider.getTransactionReceipt(tx.hash);
        if (txStatus) {
          console.log('Transaction status:', {
            blockNumber: txStatus.blockNumber,
            blockHash: txStatus.blockHash,
            gasUsed: txStatus.gasUsed.toString(),
            status: txStatus.status
          });
          receipt = txStatus;
        } else {
          console.log('Transaction still pending');

          // Return the transaction hash anyway so we can track it
          receipt = { transactionHash: tx.hash, events: [] };
        }
      }

      // Get task ID from event
      let taskId = null;
      if (receipt.events && Array.isArray(receipt.events)) {
        const taskCreatedEvent = receipt.events.find(event => event.event === 'TaskCreated');
        if (taskCreatedEvent && taskCreatedEvent.args) {
          taskId = taskCreatedEvent.args.taskId.toNumber();
          console.log('Task ID from event:', taskId);
        }
      }

      // If we couldn't get the task ID from events, try to decode logs manually
      if (taskId === null && receipt.logs && Array.isArray(receipt.logs)) {
        console.log('Trying to decode logs manually...');

        // TaskCreated event signature: TaskCreated(uint256 indexed taskId, address indexed creator)
        const taskCreatedTopic = ethers.utils.id('TaskCreated(uint256,address)');

        // Find the log with the TaskCreated event signature
        const taskCreatedLog = receipt.logs.find(log => log.topics[0] === taskCreatedTopic);

        if (taskCreatedLog) {
          // The taskId is the second topic (index 1) since it's the first indexed parameter
          taskId = parseInt(taskCreatedLog.topics[1], 16);
          console.log('Task ID from logs:', taskId);
        } else {
          console.error('Could not find TaskCreated event in logs');
          throw new Error('Failed to get task ID from blockchain');
        }
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        taskId
      };
    } catch (error) {
      console.error('Error creating task on blockchain:', error);

      // Extract more detailed error information
      let errorMessage = 'Failed to create task on blockchain';

      if (error.reason) {
        errorMessage = `Contract error: ${error.reason}`;
      } else if (error.message) {
        // Check for common error patterns in the message
        if (error.message.includes('execution reverted')) {
          const revertReason = error.message.match(/reason="([^"]*)"/)?.[1] || 'Unknown reason';
          errorMessage = `Contract execution reverted: ${revertReason}`;
        } else if (error.message.includes('user denied transaction')) {
          errorMessage = 'Transaction was rejected in MetaMask';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Close a task on the blockchain
   * @param {number} taskId - Task ID
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Result object with success flag
   */
  closeTask: async (taskId, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;

      // Use UnifiedTaskManager if available
      if (contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for closeTask');
      } else if (!contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      const tx = await taskManagerContract.closeTask(taskId)
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error closing task on blockchain:', error)
      return {
        success: false,
        error: error.message || 'Failed to close task on blockchain'
      }
    }
  },

  /**
   * Submit a solution to a task on the blockchain
   * @param {number} taskId - Task ID
   * @param {string} submissionCid - Submission CID
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Result object with success flag and submission ID
   */
  submitSolution: async (taskId, submissionCid, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;
      let submissionManagerContract = null;

      // Check if we have the enhanced submission manager
      if (contracts.enhancedSubmissionManager) {
        submissionManagerContract = contracts.enhancedSubmissionManager;
        console.log('Using EnhancedSubmissionManager contract for submitSolution');
      }

      // Use UnifiedTaskManager if available and no submission manager
      if (!submissionManagerContract && contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for submitSolution');
      } else if (!submissionManagerContract && !contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      // Convert CID to bytes32
      const submissionCidBytes32 = cidUtils.cidToBytes32(submissionCid)
      console.log('Converted submission CID to bytes32:', submissionCidBytes32)

      let tx;
      if (submissionManagerContract) {
        // Use the submission manager if available
        tx = await submissionManagerContract.submitSolution(taskId, submissionCidBytes32);
      } else {
        // Fall back to task manager
        tx = await taskManagerContract.submitSolution(taskId, submissionCidBytes32);
      }

      const receipt = await tx.wait()

      // Get submission ID from event
      let submissionId = null
      if (receipt.events) {
        const submissionCreatedEvent = receipt.events.find(event => event.event === 'SubmissionCreated')
        if (submissionCreatedEvent && submissionCreatedEvent.args) {
          submissionId = submissionCreatedEvent.args.submissionId.toNumber()
        }
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        submissionId
      }
    } catch (error) {
      console.error('Error submitting solution on blockchain:', error)
      return {
        success: false,
        error: error.message || 'Failed to submit solution on blockchain'
      }
    }
  },

  /**
   * Review a submission on the blockchain
   * @param {number} taskId - Task ID
   * @param {number} submissionId - Submission ID
   * @param {boolean} approved - Whether the submission is approved
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Result object with success flag and review ID
   */
  reviewSubmission: async (taskId, submissionId, approved, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;
      let submissionManagerContract = null;

      // Check if we have the enhanced submission manager
      if (contracts.enhancedSubmissionManager) {
        submissionManagerContract = contracts.enhancedSubmissionManager;
        console.log('Using EnhancedSubmissionManager contract for reviewSubmission');
      }

      // Use UnifiedTaskManager if available and no submission manager
      if (!submissionManagerContract && contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for reviewSubmission');
      } else if (!submissionManagerContract && !contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      let tx;
      if (submissionManagerContract) {
        // Use the submission manager if available
        tx = await submissionManagerContract.reviewSubmission(taskId, submissionId, approved);
      } else {
        // Fall back to task manager
        tx = await taskManagerContract.reviewSubmission(taskId, submissionId, approved);
      }

      const receipt = await tx.wait()

      // Get review ID from event
      let reviewId = null
      if (receipt.events) {
        const reviewCreatedEvent = receipt.events.find(event => event.event === 'ReviewCreated')
        if (reviewCreatedEvent && reviewCreatedEvent.args) {
          reviewId = reviewCreatedEvent.args.reviewId.toNumber()
        }
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        reviewId
      }
    } catch (error) {
      console.error('Error reviewing submission on blockchain:', error)
      return {
        success: false,
        error: error.message || 'Failed to review submission on blockchain'
      }
    }
  },

  /**
   * Get task details from the blockchain
   * @param {number} taskId - Task ID
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Task details
   */
  getTaskDetails: async (taskId, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;

      // Use UnifiedTaskManager if available
      if (contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for getTaskDetails');
      } else if (!contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      const taskDetails = await taskManagerContract.getTask(taskId)

      // Convert bytes32 CID to string
      const dataCid = cidUtils.bytes32ToCid(taskDetails.dataCid)

      // Create a basic task details object
      const basicTaskDetails = {
        title: taskDetails.title,
        description: taskDetails.description,
        rewardPerSubmission: ethers.utils.formatEther(taskDetails.rewardPerSubmission),
        deadline: taskDetails.deadline.toNumber(),
        dataCid,
        requiredReviewers: taskDetails.requiredReviewers.toNumber(),
        status: taskDetails.status,
        creatorAddress: taskDetails.creator
      }

      // Add additional fields if they exist in the task details
      if (taskDetails.rewardPerReview) {
        basicTaskDetails.rewardPerReview = ethers.utils.formatEther(taskDetails.rewardPerReview);
      }

      if (taskDetails.requiredSubmissions) {
        basicTaskDetails.requiredSubmissions = taskDetails.requiredSubmissions.toNumber();
      }

      if (taskDetails.taskType !== undefined) {
        basicTaskDetails.taskType = taskDetails.taskType;
      }

      if (taskDetails.consensusMechanism !== undefined) {
        basicTaskDetails.consensusMechanism = taskDetails.consensusMechanism;
      }

      if (taskDetails.instructions) {
        basicTaskDetails.instructions = taskDetails.instructions;
      }

      if (taskDetails.categories) {
        basicTaskDetails.categories = taskDetails.categories;
      }

      if (taskDetails.minConsensusPercentage) {
        basicTaskDetails.minConsensusPercentage = taskDetails.minConsensusPercentage.toNumber();
      }

      if (taskDetails.requireEvidence !== undefined) {
        basicTaskDetails.requireEvidence = taskDetails.requireEvidence;
      }

      if (taskDetails.maxSubmissionsPerUser) {
        basicTaskDetails.maxSubmissionsPerUser = taskDetails.maxSubmissionsPerUser.toNumber();
      }

      if (taskDetails.maxReviewsPerUser) {
        basicTaskDetails.maxReviewsPerUser = taskDetails.maxReviewsPerUser.toNumber();
      }

      if (taskDetails.requireVerification !== undefined) {
        basicTaskDetails.requireVerification = taskDetails.requireVerification;
      }

      return basicTaskDetails;
    } catch (error) {
      console.error('Error getting task details from blockchain:', error)
      return null
    }
  },

  /**
   * Get submission details from the blockchain
   * @param {number} taskId - Task ID
   * @param {number} submissionId - Submission ID
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Submission details
   */
  getSubmissionDetails: async (taskId, submissionId, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;
      let submissionManagerContract = null;

      // Check if we have the enhanced submission manager
      if (contracts.enhancedSubmissionManager) {
        submissionManagerContract = contracts.enhancedSubmissionManager;
        console.log('Using EnhancedSubmissionManager contract for getSubmissionDetails');
      }

      // Use UnifiedTaskManager if available and no submission manager
      if (!submissionManagerContract && contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for getSubmissionDetails');
      } else if (!submissionManagerContract && !contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      let submissionDetails;
      if (submissionManagerContract) {
        // Use the submission manager if available
        submissionDetails = await submissionManagerContract.getSubmission(taskId, submissionId);
      } else {
        // Fall back to task manager
        submissionDetails = await taskManagerContract.getSubmission(taskId, submissionId);
      }

      // Convert bytes32 CID to string
      const submissionCid = cidUtils.bytes32ToCid(submissionDetails.dataCid)

      // Create a basic submission details object
      const basicSubmissionDetails = {
        submitter: submissionDetails.submitter,
        submissionCid,
        isApproved: submissionDetails.isApproved,
        reviewCount: submissionDetails.reviewCount.toNumber()
      }

      // Add additional fields if they exist in the submission details
      if (submissionDetails.metadata) {
        basicSubmissionDetails.metadata = submissionDetails.metadata;
      }

      if (submissionDetails.timestamp) {
        basicSubmissionDetails.timestamp = submissionDetails.timestamp.toNumber();
      }

      if (submissionDetails.reviewers) {
        basicSubmissionDetails.reviewers = submissionDetails.reviewers;
      }

      return basicSubmissionDetails;
    } catch (error) {
      console.error('Error getting submission details from blockchain:', error)
      return null
    }
  },

  /**
   * Get review details from the blockchain
   * @param {number} taskId - Task ID
   * @param {number} submissionId - Submission ID
   * @param {number} reviewId - Review ID
   * @param {Object} contracts - Contract instances
   * @returns {Promise<Object>} Review details
   */
  getReviewDetails: async (taskId, submissionId, reviewId, contracts) => {
    try {
      if (!contracts) {
        throw new Error('Contracts not provided')
      }

      // Determine which contract to use
      let taskManagerContract = contracts.taskManager;
      let submissionManagerContract = null;

      // Check if we have the enhanced submission manager
      if (contracts.enhancedSubmissionManager) {
        submissionManagerContract = contracts.enhancedSubmissionManager;
        console.log('Using EnhancedSubmissionManager contract for getReviewDetails');
      }

      // Use UnifiedTaskManager if available and no submission manager
      if (!submissionManagerContract && contracts.unifiedTaskManager) {
        taskManagerContract = contracts.unifiedTaskManager;
        console.log('Using UnifiedTaskManager contract for getReviewDetails');
      } else if (!submissionManagerContract && !contracts.taskManager) {
        throw new Error('Task Manager contract not initialized')
      }

      let reviewDetails;
      if (submissionManagerContract) {
        // Use the submission manager if available
        reviewDetails = await submissionManagerContract.getReview(taskId, submissionId, reviewId);
      } else {
        // Fall back to task manager
        reviewDetails = await taskManagerContract.getReview(taskId, submissionId, reviewId);
      }

      // Create a basic review details object
      const basicReviewDetails = {
        reviewer: reviewDetails.reviewer,
        approved: reviewDetails.approved
      }

      // Add additional fields if they exist in the review details
      if (reviewDetails.feedback) {
        basicReviewDetails.feedback = reviewDetails.feedback;
      }

      if (reviewDetails.timestamp) {
        basicReviewDetails.timestamp = reviewDetails.timestamp.toNumber();
      }

      return basicReviewDetails;
    } catch (error) {
      console.error('Error getting review details from blockchain:', error)
      return null
    }
  }
}

// Export API objects for backward compatibility
export const tasksAPI = {
  getAllTasks: async () => {
    try {
      console.log('tasksAPI.getAllTasks called');
      const data = await backendAPI.getTasks();
      console.log('backendAPI.getTasks returned:', data);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error in getAllTasks:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch tasks',
        data: [] // Always return an empty array to prevent UI errors
      };
    }
  },

  getTaskById: async (id) => {
    try {
      console.log(`tasksAPI.getTaskById called with id: ${id}`);
      const data = await backendAPI.getTaskById(id);
      console.log(`backendAPI.getTaskById returned:`, data);

      if (!data) {
        return {
          success: false,
          message: `Task with ID ${id} not found`,
          data: null
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error in getTaskById(${id}):`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch task',
        data: null
      };
    }
  },

  createTask: async (taskData) => {
    try {
      const data = await backendAPI.createTask(taskData);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error in createTask:', error);
      return {
        success: false,
        message: error.message || 'Failed to create task'
      };
    }
  }
};

export const submissionsAPI = {
  getSubmissionsForTask: async (taskId) => {
    try {
      const data = await backendAPI.getSubmissionsForTask(taskId);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error in getSubmissionsForTask(${taskId}):`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch submissions'
      };
    }
  },

  getSubmissionById: async (id) => {
    try {
      const data = await backendAPI.getSubmissionById(id);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error in getSubmissionById(${id}):`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch submission'
      };
    }
  },

  createSubmission: async (submissionData) => {
    try {
      const data = await backendAPI.createSubmission(submissionData);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error in createSubmission:', error);
      return {
        success: false,
        message: error.message || 'Failed to create submission'
      };
    }
  }
};

// Export both API objects as default
export default {
  backend: backendAPI,
  smartContract: smartContractAPI,
  tasks: tasksAPI,
  submissions: submissionsAPI
}
