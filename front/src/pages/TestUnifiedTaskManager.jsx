import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';
import { cidToBytes32 } from '../utils/cidUtils';
import { UnifiedTaskManagerABI } from '../contracts';

const TestUnifiedTaskManager = () => {
  const { contracts, account } = useWeb3();
  const { provider, signer } = useAuth();
  const [taskCount, setTaskCount] = useState(0);
  const [contractAddress, setContractAddress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [directContract, setDirectContract] = useState(null);

  // Function to get ABI from Hardhat artifact
  const getABI = (abiObject) => {
    if (Array.isArray(abiObject)) {
      return abiObject; // Already an array
    } else if (abiObject && abiObject.abi) {
      return abiObject.abi; // Hardhat artifact format
    } else {
      console.error('Invalid ABI format:', abiObject);
      return []; // Empty ABI as fallback
    }
  };

  // Create a direct contract instance
  const createDirectContract = () => {
    try {
      if (!signer) {
        console.error('No signer available');
        return null;
      }

      // Hardcoded address for UnifiedTaskManager from deployments2.json
      const unifiedTaskManagerAddress = '0x4721c90702CB8d0664D0E6499aEb03e36bff8e8B';

      // Create contract instance
      const contract = new ethers.Contract(
        unifiedTaskManagerAddress,
        getABI(UnifiedTaskManagerABI),
        signer
      );

      console.log('Created direct contract instance with address:', unifiedTaskManagerAddress);
      setContractAddress(unifiedTaskManagerAddress);
      setDirectContract(contract);
      return contract;
    } catch (error) {
      console.error('Error creating direct contract:', error);
      setError(`Error creating direct contract: ${error.message}`);
      return null;
    }
  };

  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        // Try to use the direct contract first
        let contract = directContract;

        // If no direct contract, create one
        if (!contract) {
          contract = createDirectContract();
          if (!contract) {
            // Fall back to the contract from context
            if (contracts.unifiedTaskManager) {
              contract = contracts.unifiedTaskManager;
              const address = contract.address;
              setContractAddress(address);
              console.log('Using contract from context with address:', address);
            } else {
              throw new Error('No contract available');
            }
          }
        }

        // Get task count
        if (contract) {
          try {
            // Check if getTaskCount function exists
            if (typeof contract.getTaskCount === 'function') {
              const count = await contract.getTaskCount();
              setTaskCount(count.toString());
              console.log('Task count:', count.toString());
            } else {
              console.warn('getTaskCount function not available on contract');
              setTaskCount('N/A - function not available');
            }
          } catch (error) {
            console.error('Error getting task count:', error);
            setError(`Error getting task count: ${error.message}`);
          }
        }
      } catch (error) {
        console.error('Error fetching contract info:', error);
        setError(`Error fetching contract info: ${error.message}`);
      }
    };

    fetchContractInfo();
  }, [contracts.unifiedTaskManager, directContract, signer]);

  const handleCreateTask = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Try to use the direct contract first
      let contract = directContract;

      // If no direct contract, create one
      if (!contract) {
        contract = createDirectContract();
        if (!contract) {
          // Fall back to the contract from context
          if (contracts.unifiedTaskManager) {
            contract = contracts.unifiedTaskManager;
          } else {
            throw new Error('No contract available');
          }
        }
      }

      // Get contract address (ethers v5 doesn't have getAddress method)
      const contractAddress = contract.address;
      console.log('Using contract with address:', contractAddress);

      // Simple task parameters
      const title = "Test Task";
      const description = "This is a test task";
      const dataCid = "bafkreib45bpzjdean37m2zjfrogu62c3nhndt7waavog3yo3gzf7mnemjy";
      const dataCidBytes32 = cidToBytes32(dataCid);
      const rewardPerSubmission = ethers.utils.parseEther("0.1"); // 0.1 dataFIL
      const rewardPerReview = ethers.utils.parseEther("0.05"); // 0.05 dataFIL
      const requiredSubmissions = 5;
      const requiredReviewers = 2;

      console.log('Creating simple task with parameters:', {
        title,
        description,
        dataCidBytes32,
        rewardPerSubmission: rewardPerSubmission.toString(),
        rewardPerReview: rewardPerReview.toString(),
        requiredSubmissions,
        requiredReviewers
      });

      // Try to use createSimpleTask if available
      if (contract.functions.createSimpleTask) {
        console.log('Using createSimpleTask function');

        // Estimate gas
        const gasEstimate = await contract.estimateGas.createSimpleTask(
          title,
          description,
          dataCidBytes32,
          rewardPerSubmission,
          rewardPerReview,
          requiredSubmissions,
          requiredReviewers
        );

        console.log('Gas estimate:', gasEstimate.toString());

        // Get current gas price and add 50%
        const gasPrice = (await contract.provider.getGasPrice()).mul(150).div(100);
        console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

        // Create task
        const tx = await contract.createSimpleTask(
          title,
          description,
          dataCidBytes32,
          rewardPerSubmission,
          rewardPerReview,
          requiredSubmissions,
          requiredReviewers,
          {
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
            gasPrice
          }
        );

        console.log('Transaction sent:', tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt);

        // Check if task was created successfully
        if (receipt.status === 1) {
          // Try to find TaskCreated event
          const event = receipt.events.find(e => e.event === 'TaskCreated');
          if (event) {
            const taskId = event.args.taskId.toString();
            setSuccess(`Task created successfully with ID: ${taskId}`);

            // Update task count
            const count = await contracts.unifiedTaskManager.getTaskCount();
            setTaskCount(count.toString());
          } else {
            setSuccess('Task created successfully, but could not find task ID');
          }
        } else {
          setError('Transaction failed');
        }
      } else {
        // Fall back to createTask
        console.log('createSimpleTask not available, using createTask function');

        // Additional parameters for full createTask
        const deadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
        const nominatedReviewers = [account]; // Use current account as reviewer
        const taskType = 1; // Image Classification
        const consensusMechanism = 1; // Majority Vote
        const instructions = "Classify the images according to the given categories";
        const categories = ["Cat", "Dog", "Bird"];
        const minConsensusPercentage = 75;
        const requireEvidence = true;
        const maxSubmissionsPerUser = 3;
        const maxReviewsPerUser = 5;
        const requireVerification = false;

        console.log('Full task parameters:', {
          title,
          description,
          dataCidBytes32,
          rewardPerSubmission: rewardPerSubmission.toString(),
          rewardPerReview: rewardPerReview.toString(),
          requiredSubmissions,
          requiredReviewers,
          deadline,
          nominatedReviewers,
          taskType,
          consensusMechanism,
          instructions,
          categories,
          minConsensusPercentage,
          requireEvidence,
          maxSubmissionsPerUser,
          maxReviewsPerUser,
          requireVerification
        });

        // Estimate gas
        const gasEstimate = await contract.estimateGas.createTask(
          title,
          description,
          dataCidBytes32,
          rewardPerSubmission,
          rewardPerReview,
          requiredSubmissions,
          requiredReviewers,
          deadline,
          nominatedReviewers,
          taskType,
          consensusMechanism,
          instructions,
          categories,
          minConsensusPercentage,
          requireEvidence,
          maxSubmissionsPerUser,
          maxReviewsPerUser,
          requireVerification
        );

        console.log('Gas estimate:', gasEstimate.toString());

        // Get current gas price and add 50%
        const gasPrice = (await contract.provider.getGasPrice()).mul(150).div(100);
        console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

        // Create task
        const tx = await contract.createTask(
          title,
          description,
          dataCidBytes32,
          rewardPerSubmission,
          rewardPerReview,
          requiredSubmissions,
          requiredReviewers,
          deadline,
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
          {
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
            gasPrice
          }
        );

        console.log('Transaction sent:', tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt);

        // Check if task was created successfully
        if (receipt.status === 1) {
          // Try to find TaskCreated event
          const event = receipt.events.find(e => e.event === 'TaskCreated');
          if (event) {
            const taskId = event.args.taskId.toString();
            setSuccess(`Task created successfully with ID: ${taskId}`);

            // Update task count
            const count = await contracts.unifiedTaskManager.getTaskCount();
            setTaskCount(count.toString());
          } else {
            setSuccess('Task created successfully, but could not find task ID');
          }
        } else {
          setError('Transaction failed');
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setError(`Error creating task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test UnifiedTaskManager Contract</h1>

      <div className="mb-4">
        <p><strong>Contract Address:</strong> {contractAddress || 'Not initialized'}</p>
        <p><strong>Task Count:</strong> {taskCount}</p>
      </div>

      <button
        onClick={handleCreateTask}
        disabled={loading || !contracts.unifiedTaskManager}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
      >
        {loading ? 'Creating Task...' : 'Create Test Task'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
    </div>
  );
};

export default TestUnifiedTaskManager;
