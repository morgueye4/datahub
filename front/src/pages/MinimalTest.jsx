import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';
import { Container, Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';

const MinimalTest = () => {
  const { isAuthenticated, connectWallet, signer } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [taskCount, setTaskCount] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenAllowance, setTokenAllowance] = useState('0');
  
  // Function to get user address
  const getUserAddress = async () => {
    if (signer) {
      return await signer.getAddress();
    }
    return null;
  };
  
  // Function to check token balance
  const checkTokenBalance = async () => {
    try {
      if (!signer) return;
      
      const userAddress = await getUserAddress();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      const balance = await tokenContract.balanceOf(userAddress);
      setTokenBalance(ethers.utils.formatEther(balance));
      return balance;
    } catch (error) {
      console.error('Error checking token balance:', error);
      return ethers.BigNumber.from(0);
    }
  };
  
  // Function to check token allowance
  const checkTokenAllowance = async () => {
    try {
      if (!signer) return;
      
      const userAddress = await getUserAddress();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function allowance(address,address) view returns (uint256)'],
        signer
      );
      
      const allowance = await tokenContract.allowance(userAddress, contractAddress);
      setTokenAllowance(ethers.utils.formatEther(allowance));
      return allowance;
    } catch (error) {
      console.error('Error checking token allowance:', error);
      return ethers.BigNumber.from(0);
    }
  };
  
  // Function to approve tokens
  const approveTokens = async (amount) => {
    try {
      if (!signer) return false;
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address,uint256) returns (bool)'],
        signer
      );
      
      const tx = await tokenContract.approve(contractAddress, amount, {
        gasLimit: ethers.BigNumber.from('500000')
      });
      
      console.log('Approval transaction sent:', tx.hash);
      setSuccess(`Approval transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log('Approval transaction mined:', receipt);
      
      await checkTokenAllowance();
      return true;
    } catch (error) {
      console.error('Error approving tokens:', error);
      setError(`Error approving tokens: ${error.message || error}`);
      return false;
    }
  };
  
  // Function to check task count
  const checkTaskCount = async () => {
    try {
      if (!signer) return;
      
      const taskContract = new ethers.Contract(
        contractAddress,
        ['function getTaskCount() view returns (uint256)'],
        signer
      );
      
      const count = await taskContract.getTaskCount();
      setTaskCount(count.toString());
      return count;
    } catch (error) {
      console.error('Error checking task count:', error);
      return ethers.BigNumber.from(0);
    }
  };
  
  // Initialize addresses
  useEffect(() => {
    setContractAddress('0x4721c90702CB8d0664D0E6499aEb03e36bff8e8B');
    setTokenAddress('0xFA72FC2139510d056bE14570c8073eF8a05Cc85B');
  }, []);
  
  // Update data when authenticated
  useEffect(() => {
    if (isAuthenticated && signer) {
      checkTokenBalance();
      checkTokenAllowance();
      checkTaskCount();
    }
  }, [isAuthenticated, signer, contractAddress, tokenAddress]);
  
  // Function to create a task
  const createTask = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!signer) {
        throw new Error('No signer available. Please connect your wallet.');
      }
      
      // Check token balance
      const balance = await checkTokenBalance();
      const requiredAmount = ethers.utils.parseEther('2'); // 1 for task + 0.5 for review * 2
      
      if (balance.lt(requiredAmount)) {
        throw new Error(`Insufficient token balance. You need at least 2 tokens.`);
      }
      
      // Check token allowance
      const allowance = await checkTokenAllowance();
      
      // Approve tokens if needed
      if (allowance.lt(requiredAmount)) {
        const approvalAmount = ethers.utils.parseEther('1000');
        const approved = await approveTokens(approvalAmount);
        
        if (!approved) {
          throw new Error('Token approval failed.');
        }
      }
      
      // Create task contract instance
      const taskContract = new ethers.Contract(
        contractAddress,
        ['function createTask(string,string,uint8,uint256,uint256,uint256) returns (uint256)'],
        signer
      );
      
      // Task parameters
      const title = 'Minimal Test';
      const description = 'Testing with minimal parameters';
      const taskType = 0; // DataCollection
      const rewardAmount = ethers.utils.parseEther('1');
      const reviewReward = ethers.utils.parseEther('0.5');
      const numReviewers = 2;
      
      console.log('Creating task with parameters:', {
        title,
        description,
        taskType,
        rewardAmount: ethers.utils.formatEther(rewardAmount),
        reviewReward: ethers.utils.formatEther(reviewReward),
        numReviewers
      });
      
      // Send transaction with high gas limit
      const tx = await taskContract.createTask(
        title,
        description,
        taskType,
        rewardAmount,
        reviewReward,
        numReviewers,
        {
          gasLimit: ethers.BigNumber.from('3000000')
        }
      );
      
      console.log('Transaction sent:', tx.hash);
      setSuccess(`Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction mined:', receipt);
      
      // Update task count
      await checkTaskCount();
      await checkTokenBalance();
      
      setSuccess(`Task created successfully! Transaction hash: ${tx.hash}`);
    } catch (error) {
      console.error('Error creating task:', error);
      setError(`Error creating task: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to request tokens from faucet
  const requestTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!signer) {
        throw new Error('No signer available. Please connect your wallet.');
      }
      
      const userAddress = await getUserAddress();
      
      // Call backend faucet API
      const response = await fetch('http://127.0.0.1:8000/faucet/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: userAddress }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request tokens');
      }
      
      setSuccess(`Tokens requested successfully! Transaction hash: ${data.txHash}`);
      
      // Update token balance after a short delay
      setTimeout(async () => {
        await checkTokenBalance();
      }, 5000);
    } catch (error) {
      console.error('Error requesting tokens:', error);
      setError(`Error requesting tokens: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="mt-4">
      <Card className="p-4">
        <Card.Title as="h4" className="mb-4">Minimal Task Creation Test</Card.Title>
        
        <div className="mb-3">
          <p><strong>Wallet Connected:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>Task Manager Contract:</strong> {contractAddress}</p>
          <p><strong>Token Contract:</strong> {tokenAddress}</p>
          <p><strong>Current Task Count:</strong> {taskCount}</p>
          <p><strong>Token Balance:</strong> {tokenBalance} dataFIL</p>
          <p><strong>Token Allowance:</strong> {tokenAllowance} dataFIL</p>
          
          {!isAuthenticated && (
            <Button 
              variant="success" 
              onClick={connectWallet} 
              className="mb-3"
            >
              Connect Wallet
            </Button>
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
        
        <Row className="mb-3">
          <Col>
            <Button
              variant="primary"
              onClick={requestTokens}
              disabled={loading || !isAuthenticated}
              className="w-100"
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Request Tokens from Faucet'}
            </Button>
          </Col>
        </Row>
        
        <Row className="mb-3">
          <Col>
            <Button
              variant="warning"
              onClick={async () => {
                await checkTokenBalance();
                await checkTokenAllowance();
                await checkTaskCount();
              }}
              disabled={!isAuthenticated}
              className="w-100"
            >
              Refresh Data
            </Button>
          </Col>
        </Row>
        
        <Row className="mb-3">
          <Col>
            <Button
              variant="info"
              onClick={async () => {
                const amount = ethers.utils.parseEther('1000');
                await approveTokens(amount);
              }}
              disabled={loading || !isAuthenticated}
              className="w-100"
            >
              Approve 1000 Tokens
            </Button>
          </Col>
        </Row>
        
        <Row>
          <Col>
            <Button
              variant="success"
              onClick={createTask}
              disabled={loading || !isAuthenticated}
              className="w-100"
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Create Minimal Task'}
            </Button>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default MinimalTest;
