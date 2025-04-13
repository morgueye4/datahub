import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';
import { Container, Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { UnifiedTaskManagerABI } from '../contracts';

const TestTaskCreation = () => {
  const { contracts, isConnected } = useWeb3();
  const { isAuthenticated, connectWallet, signer } = useAuth();
  const [title, setTitle] = useState('Test Task');
  const [description, setDescription] = useState('Test Description');
  const [taskType, setTaskType] = useState(0); // 0 = DataCollection
  const [rewardAmount, setRewardAmount] = useState('10');
  const [reviewReward, setReviewReward] = useState('5');
  const [numReviewers, setNumReviewers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [taskCount, setTaskCount] = useState(0);
  const [contractAddress, setContractAddress] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('1000000');
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
      setError(`Error creating contract: ${error.message || error}`);
      return null;
    }
  };

  useEffect(() => {
    const fetchTaskCount = async () => {
      // Try to use the direct contract first
      let contract = directContract;

      // If no direct contract, try to create one
      if (!contract && signer) {
        contract = createDirectContract();
      }

      // If still no contract, try to use the one from Web3Context
      if (!contract && contracts?.unifiedTaskManager) {
        contract = contracts.unifiedTaskManager;
      }

      if (contract) {
        try {
          console.log('Using contract:', contract);
          console.log('Contract address:', contract.address);
          console.log('Contract functions:', Object.keys(contract.functions));

          const count = await contract.getTaskCount();
          setTaskCount(count.toString());
          setContractAddress(contract.address);

          // Get current gas price
          const networkProvider = contract.provider;
          const currentGasPrice = await networkProvider.getGasPrice();
          setGasPrice(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
        } catch (error) {
          console.error('Error fetching task count:', error);
          setError(`Error fetching task count: ${error.message || error}`);
        }
      } else {
        console.log('No contract available');
        console.log('Available contracts from Web3Context:', contracts ? Object.keys(contracts) : 'none');
        console.log('Signer available:', !!signer);

        // If we have a signer but no contract, try to create one directly
        if (signer && !contract) {
          createDirectContract();
        }
      }
    };

    if (isAuthenticated) {
      fetchTaskCount();
    }
  }, [contracts, isConnected, isAuthenticated, signer, directContract]);

  const handleCreateTask = async () => {
    // Try to use the direct contract first
    let contract = directContract;

    // If no direct contract, try to create one
    if (!contract && signer) {
      contract = createDirectContract();
    }

    // If still no contract, try to use the one from Web3Context
    if (!contract && contracts?.unifiedTaskManager) {
      contract = contracts.unifiedTaskManager;
    }

    if (!contract) {
      setError('No contract available. Please connect your wallet and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Creating task with parameters:', {
        title,
        description,
        taskType: parseInt(taskType),
        rewardAmount: ethers.utils.parseEther(rewardAmount),
        reviewReward: ethers.utils.parseEther(reviewReward),
        numReviewers: parseInt(numReviewers)
      });

      // Calculate gas price (50% higher than current)
      const networkProvider = contract.provider;
      const currentGasPrice = await networkProvider.getGasPrice();
      const increasedGasPrice = currentGasPrice.mul(150).div(100);

      console.log('Using gas price:', ethers.utils.formatUnits(increasedGasPrice, 'gwei'), 'gwei');
      console.log('Using gas limit:', gasLimit);
      console.log('Using contract at address:', contract.address);
      console.log('Contract functions:', Object.keys(contract.functions));

      // Create task with explicit gas parameters
      const tx = await contract.createTask(
        title,
        description,
        parseInt(taskType),
        ethers.utils.parseEther(rewardAmount),
        ethers.utils.parseEther(reviewReward),
        parseInt(numReviewers),
        {
          gasLimit: ethers.BigNumber.from(gasLimit),
          gasPrice: increasedGasPrice
        }
      );

      console.log('Transaction sent:', tx.hash);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction mined:', receipt);

      // Get updated task count
      const newCount = await contract.getTaskCount();
      setTaskCount(newCount.toString());

      setSuccess(`Task created successfully! Transaction hash: ${tx.hash}`);
    } catch (error) {
      console.error('Error creating task:', error);
      setError(`Error creating task: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Card className="p-4">
        <Card.Title as="h4" className="mb-4">Test Task Creation</Card.Title>

        <div className="mb-3">
          <p>Contract Address: {contractAddress || 'Not connected'}</p>
          <p>Current Task Count: {taskCount}</p>
          <p>Current Gas Price: {gasPrice} gwei</p>
          <p>Wallet Connected: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>Signer Available: {signer ? 'Yes' : 'No'}</p>
          <p>Web3 Connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>Direct Contract: {directContract ? 'Initialized' : 'Not initialized'}</p>
          <p>Web3Context Contract: {contracts?.unifiedTaskManager ? 'Available' : 'Not available'}</p>

          {!isAuthenticated && (
            <Button
              variant="success"
              onClick={connectWallet}
              className="mb-3"
            >
              Connect Wallet
            </Button>
          )}

          {isAuthenticated && !directContract && (
            <Button
              variant="warning"
              onClick={createDirectContract}
              className="mb-3 ms-2"
            >
              Initialize Contract Directly
            </Button>
          )}

          {isAuthenticated && (
            <>
              <Button
                variant="info"
                onClick={() => {
                  console.log('Debug info:');
                  console.log('Signer:', signer);
                  console.log('Contracts:', contracts);
                  console.log('Direct contract:', directContract);
                  console.log('Is authenticated:', isAuthenticated);
                  console.log('Is connected:', isConnected);

                  // Try to get task count directly
                  if (directContract) {
                    directContract.getTaskCount().then(count => {
                      console.log('Task count from direct contract:', count.toString());
                    }).catch(err => {
                      console.error('Error getting task count from direct contract:', err);
                    });
                  } else if (contracts?.unifiedTaskManager) {
                    contracts.unifiedTaskManager.getTaskCount().then(count => {
                      console.log('Task count from Web3Context contract:', count.toString());
                    }).catch(err => {
                      console.error('Error getting task count from Web3Context contract:', err);
                    });
                  }
                }}
                className="mb-3 ms-2"
              >
                Debug Contract
              </Button>

              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    setLoading(true);
                    setError(null);

                    // Get contract addresses
                    const taskManagerAddress = '0x4721c90702CB8d0664D0E6499aEb03e36bff8e8B';
                    const tokenAddress = '0xFA72FC2139510d056bE14570c8073eF8a05Cc85B';

                    // Create contract instances directly with minimal ABIs
                    const taskManagerABI = [
                      'function createTask(string title, string description, uint8 taskType, uint256 rewardAmount, uint256 reviewReward, uint256 numReviewers) returns (uint256)',
                      'function getTaskCount() view returns (uint256)'
                    ];

                    const tokenABI = [
                      'function approve(address spender, uint256 amount) returns (bool)',
                      'function balanceOf(address owner) view returns (uint256)',
                      'function allowance(address owner, address spender) view returns (uint256)'
                    ];

                    if (!signer) {
                      throw new Error('No signer available. Please connect your wallet.');
                    }

                    const taskManager = new ethers.Contract(taskManagerAddress, taskManagerABI, signer);
                    const token = new ethers.Contract(tokenAddress, tokenABI, signer);
                    console.log('Created contract instances');

                    // Set minimal parameters
                    const minTitle = 'Test';
                    const minDesc = 'Test';
                    const minType = 0; // DataCollection
                    const minReward = ethers.utils.parseEther('1');
                    const minReviewReward = ethers.utils.parseEther('0.5');
                    const minReviewers = 1;

                    // Calculate total reward needed
                    const totalReward = minReward.add(minReviewReward.mul(minReviewers));
                    console.log('Total reward needed:', ethers.utils.formatEther(totalReward), 'tokens');

                    // Check token balance
                    const userAddress = await signer.getAddress();
                    const balance = await token.balanceOf(userAddress);
                    console.log('Token balance:', ethers.utils.formatEther(balance), 'tokens');

                    if (balance.lt(totalReward)) {
                      throw new Error(`Insufficient token balance. You need at least ${ethers.utils.formatEther(totalReward)} tokens.`);
                    }

                    // Check token allowance
                    const allowance = await token.allowance(userAddress, taskManagerAddress);
                    console.log('Current allowance:', ethers.utils.formatEther(allowance), 'tokens');

                    // Approve tokens if needed
                    if (allowance.lt(totalReward)) {
                      console.log('Approving tokens for task manager...');
                      const approvalAmount = ethers.utils.parseEther('1000'); // Approve a large amount

                      const approveTx = await token.approve(taskManagerAddress, approvalAmount, {
                        gasLimit: ethers.BigNumber.from('500000'),
                      });

                      console.log('Approval transaction sent:', approveTx.hash);
                      setSuccess(`Approval transaction sent: ${approveTx.hash}. Waiting for confirmation...`);

                      // Wait for approval transaction to be mined
                      const approveReceipt = await approveTx.wait();
                      console.log('Approval transaction mined:', approveReceipt);

                      // Check new allowance
                      const newAllowance = await token.allowance(userAddress, taskManagerAddress);
                      console.log('New allowance:', ethers.utils.formatEther(newAllowance), 'tokens');
                    }

                    // Set high gas limit
                    const gasLimitBN = ethers.BigNumber.from('3000000'); // Very high gas limit

                    // Get current gas price and increase it
                    const networkProvider = ethers.getDefaultProvider('https://api.calibration.node.glif.io/rpc/v1');
                    const currentGasPrice = await networkProvider.getGasPrice();
                    const increasedGasPrice = currentGasPrice.mul(300).div(100); // Triple the gas price

                    console.log('Using gas price:', ethers.utils.formatUnits(increasedGasPrice, 'gwei'), 'gwei');
                    console.log('Using gas limit:', gasLimitBN.toString());

                    console.log('Sending transaction with parameters:', {
                      title: minTitle,
                      description: minDesc,
                      taskType: minType,
                      rewardAmount: ethers.utils.formatEther(minReward),
                      reviewReward: ethers.utils.formatEther(minReviewReward),
                      numReviewers: minReviewers
                    });

                    // Create task with minimal parameters
                    const tx = await taskManager.createTask(
                      minTitle,
                      minDesc,
                      minType,
                      minReward,
                      minReviewReward,
                      minReviewers,
                      {
                        gasLimit: gasLimitBN,
                        gasPrice: increasedGasPrice
                      }
                    );

                    console.log('Transaction sent:', tx.hash);
                    setSuccess(`Test transaction sent: ${tx.hash}`);

                    // Wait for transaction to be mined
                    const receipt = await tx.wait();
                    console.log('Transaction mined:', receipt);

                    // Get updated task count
                    const newCount = await taskManager.getTaskCount();
                    setTaskCount(newCount.toString());

                    setSuccess(`Test task created successfully! Transaction hash: ${tx.hash}`);
                  } catch (error) {
                    console.error('Error creating test task:', error);
                    setError(`Error creating test task: ${error.message || error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="mb-3 ms-2"
                disabled={loading}
              >
                Create Test Task (With Token Approval)
              </Button>
            </>
          )}
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-3">
            {success}
          </Alert>
        )}

        <Form>
          <Row className="mb-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Task Type</Form.Label>
                <Form.Select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value={0}>Data Collection</option>
                  <option value={1}>Data Labeling</option>
                  <option value={2}>Data Validation</option>
                  <option value={3}>Model Training</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Number of Reviewers</Form.Label>
                <Form.Control
                  type="number"
                  value={numReviewers}
                  onChange={(e) => setNumReviewers(e.target.value)}
                  min={1}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Reward Amount (DATA)</Form.Label>
                <Form.Control
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  min={0}
                  step={0.1}
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Review Reward (DATA)</Form.Label>
                <Form.Control
                  type="number"
                  value={reviewReward}
                  onChange={(e) => setReviewReward(e.target.value)}
                  min={0}
                  step={0.1}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Gas Limit</Form.Label>
                <Form.Control
                  type="number"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  min={100000}
                  step={100000}
                />
              </Form.Group>
            </Col>
          </Row>

          <Button
            variant="primary"
            onClick={handleCreateTask}
            disabled={loading || !isConnected || !isAuthenticated}
            className="w-100 py-2 mt-3"
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Create Task'}
          </Button>

          {!isAuthenticated && (
            <Alert variant="warning" className="mt-3">
              Please connect your wallet first
            </Alert>
          )}
        </Form>
      </Card>
    </Container>
  );
};

export default TestTaskCreation;
