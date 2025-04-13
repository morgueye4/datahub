import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';

const TestPage = () => {
  const { contracts } = useWeb3();
  const { isAuthenticated, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dao');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // DAO Test State
  const [daoAddress, setDaoAddress] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [roleType, setRoleType] = useState('REVIEWER_ROLE');
  const [reputation, setReputation] = useState(100);
  
  // Task Test State
  const [taskTitle, setTaskTitle] = useState('Test Task');
  const [taskDescription, setTaskDescription] = useState('This is a test task created for testing purposes.');
  const [taskReward, setTaskReward] = useState('10');
  const [taskReviewReward, setTaskReviewReward] = useState('5');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskReviewers, setTaskReviewers] = useState('');
  
  // Dataset Test State
  const [datasetName, setDatasetName] = useState('Test Dataset');
  const [datasetDescription, setDatasetDescription] = useState('This is a test dataset created for testing purposes.');
  const [datasetPrice, setDatasetPrice] = useState('50');
  const [datasetAccessLevel, setDatasetAccessLevel] = useState('Public');
  
  useEffect(() => {
    // Set default deadline to 7 days from now
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setTaskDeadline(defaultDeadline.toISOString().split('T')[0]);
    
    // Set default target address to current user
    if (isAuthenticated && user?.walletAddress) {
      setTargetAddress(user.walletAddress);
    }
    
    // Get contract addresses
    if (contracts.daoContract) {
      setDaoAddress(contracts.daoContract.address);
    }
  }, [isAuthenticated, user, contracts]);
  
  const handleForceJoinDAO = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const tx = await contracts.daoContract.forceJoinDAO(targetAddress);
      await tx.wait();
      
      setSuccess(`Successfully added ${targetAddress} to the DAO`);
    } catch (err) {
      console.error('Error forcing DAO join:', err);
      setError(`Failed to force DAO join: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForceGrantRole = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      let roleHash;
      if (roleType === 'REVIEWER_ROLE') {
        roleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('REVIEWER_ROLE'));
      } else if (roleType === 'CURATOR_ROLE') {
        roleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('CURATOR_ROLE'));
      } else if (roleType === 'CORE_CONTRIBUTOR_ROLE') {
        roleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('CORE_CONTRIBUTOR_ROLE'));
      } else {
        throw new Error('Invalid role type');
      }
      
      const tx = await contracts.daoContract.forceGrantRole(roleHash, targetAddress);
      await tx.wait();
      
      setSuccess(`Successfully granted ${roleType} to ${targetAddress}`);
    } catch (err) {
      console.error('Error granting role:', err);
      setError(`Failed to grant role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForceSetReputation = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const tx = await contracts.daoContract.forceSetReputation(targetAddress, reputation);
      await tx.wait();
      
      setSuccess(`Successfully set reputation of ${targetAddress} to ${reputation}`);
    } catch (err) {
      console.error('Error setting reputation:', err);
      setError(`Failed to set reputation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForceCreateTask = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Parse reviewers
      const reviewerAddresses = taskReviewers.split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);
      
      // Convert deadline to timestamp
      const deadlineDate = new Date(taskDeadline);
      const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
      
      // Create task parameters
      const taskParams = {
        title: taskTitle,
        description: taskDescription,
        dataCid: ethers.utils.formatBytes32String('test-cid'),
        rewardPerSubmission: ethers.utils.parseEther(taskReward),
        rewardPerReview: ethers.utils.parseEther(taskReviewReward),
        maxSubmissions: 10,
        requiredReviewers: 1,
        deadline: deadlineTimestamp,
        creator: targetAddress,
        nominatedReviewers: reviewerAddresses,
        taskType: 0, // DataCollection
        consensusMechanism: 0, // Majority
        instructions: 'Test instructions',
        categories: ['test'],
        minConsensusPercentage: 51,
        requireEvidence: false,
        maxSubmissionsPerUser: 3,
        maxReviewsPerUser: 5,
        requireVerification: false
      };
      
      const tx = await contracts.unifiedTaskManager.forceCreateTask(
        taskParams.title,
        taskParams.description,
        taskParams.dataCid,
        taskParams.rewardPerSubmission,
        taskParams.rewardPerReview,
        taskParams.maxSubmissions,
        taskParams.requiredReviewers,
        taskParams.deadline,
        taskParams.creator,
        taskParams.nominatedReviewers,
        taskParams.taskType,
        taskParams.consensusMechanism,
        taskParams.instructions,
        taskParams.categories,
        taskParams.minConsensusPercentage,
        taskParams.requireEvidence,
        taskParams.maxSubmissionsPerUser,
        taskParams.maxReviewsPerUser,
        taskParams.requireVerification
      );
      
      const receipt = await tx.wait();
      
      // Find the TaskCreated event
      const event = receipt.events.find(e => e.event === 'TaskCreated');
      const taskId = event.args.taskId.toString();
      
      setSuccess(`Successfully created task with ID: ${taskId}`);
    } catch (err) {
      console.error('Error creating task:', err);
      setError(`Failed to create task: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForceCreateDataset = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Map access level to enum
      let accessLevelEnum = 0; // Public
      if (datasetAccessLevel === 'Private') {
        accessLevelEnum = 1;
      } else if (datasetAccessLevel === 'Restricted') {
        accessLevelEnum = 2;
      }
      
      const tx = await contracts.datasetRegistry.forceCreateDataset(
        datasetName,
        datasetDescription,
        ethers.utils.formatBytes32String('test-dataset-cid'),
        targetAddress,
        accessLevelEnum,
        ethers.utils.parseEther(datasetPrice),
        ['test-category'],
        ['test-tag']
      );
      
      const receipt = await tx.wait();
      
      // Find the DatasetRegistered event
      const event = receipt.events.find(e => e.event === 'DatasetRegistered');
      const datasetId = event.args.datasetId.toString();
      
      setSuccess(`Successfully created dataset with ID: ${datasetId}`);
    } catch (err) {
      console.error('Error creating dataset:', err);
      setError(`Failed to create dataset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-5">
      <h1 className="mb-4">Testing Page</h1>
      <p className="text-muted mb-4">
        This page provides testing functions to quickly set up the system for testing purposes.
        These functions bypass normal checks and should only be used for testing.
      </p>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="dao" title="DAO Testing">
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">DAO Testing Functions</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>DAO Contract Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={daoAddress}
                    disabled
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Target Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="0x..."
                  />
                  <Form.Text className="text-muted">
                    The address to add to the DAO or grant roles to
                  </Form.Text>
                </Form.Group>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <Button
                      variant="primary"
                      onClick={handleForceJoinDAO}
                      disabled={loading || !isAuthenticated}
                      className="w-100"
                    >
                      {loading ? 'Processing...' : 'Force Join DAO'}
                    </Button>
                  </Col>
                </Row>
                
                <hr />
                
                <Form.Group className="mb-3">
                  <Form.Label>Role Type</Form.Label>
                  <Form.Select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                  >
                    <option value="REVIEWER_ROLE">Reviewer</option>
                    <option value="CURATOR_ROLE">Curator</option>
                    <option value="CORE_CONTRIBUTOR_ROLE">Core Contributor</option>
                  </Form.Select>
                </Form.Group>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <Button
                      variant="primary"
                      onClick={handleForceGrantRole}
                      disabled={loading || !isAuthenticated}
                      className="w-100"
                    >
                      {loading ? 'Processing...' : 'Force Grant Role'}
                    </Button>
                  </Col>
                </Row>
                
                <hr />
                
                <Form.Group className="mb-3">
                  <Form.Label>Reputation</Form.Label>
                  <Form.Control
                    type="number"
                    value={reputation}
                    onChange={(e) => setReputation(parseInt(e.target.value))}
                    min="0"
                  />
                </Form.Group>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <Button
                      variant="primary"
                      onClick={handleForceSetReputation}
                      disabled={loading || !isAuthenticated}
                      className="w-100"
                    >
                      {loading ? 'Processing...' : 'Force Set Reputation'}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="tasks" title="Task Testing">
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Task Testing Functions</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Task Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Creator Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        placeholder="0x..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Task Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                  />
                </Form.Group>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reward per Submission (dataFIL)</Form.Label>
                      <Form.Control
                        type="number"
                        value={taskReward}
                        onChange={(e) => setTaskReward(e.target.value)}
                        min="0"
                        step="0.1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reward per Review (dataFIL)</Form.Label>
                      <Form.Control
                        type="number"
                        value={taskReviewReward}
                        onChange={(e) => setTaskReviewReward(e.target.value)}
                        min="0"
                        step="0.1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Deadline</Form.Label>
                      <Form.Control
                        type="date"
                        value={taskDeadline}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Nominated Reviewers (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    value={taskReviewers}
                    onChange={(e) => setTaskReviewers(e.target.value)}
                    placeholder="0x123..., 0x456..."
                  />
                  <Form.Text className="text-muted">
                    Leave empty to allow any reviewer
                  </Form.Text>
                </Form.Group>
                
                <Button
                  variant="primary"
                  onClick={handleForceCreateTask}
                  disabled={loading || !isAuthenticated}
                >
                  {loading ? 'Processing...' : 'Force Create Task'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="datasets" title="Dataset Testing">
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Dataset Testing Functions</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Dataset Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Owner Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        placeholder="0x..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Dataset Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={datasetDescription}
                    onChange={(e) => setDatasetDescription(e.target.value)}
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Price (dataFIL)</Form.Label>
                      <Form.Control
                        type="number"
                        value={datasetPrice}
                        onChange={(e) => setDatasetPrice(e.target.value)}
                        min="0"
                        step="1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Access Level</Form.Label>
                      <Form.Select
                        value={datasetAccessLevel}
                        onChange={(e) => setDatasetAccessLevel(e.target.value)}
                      >
                        <option value="Public">Public</option>
                        <option value="Private">Private</option>
                        <option value="Restricted">Restricted</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Button
                  variant="primary"
                  onClick={handleForceCreateDataset}
                  disabled={loading || !isAuthenticated}
                >
                  {loading ? 'Processing...' : 'Force Create Dataset'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TestPage;
