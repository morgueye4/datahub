import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Tabs, Tab } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { tasksAPI } from '../services/api'
import { formatDate, isDeadlinePassed } from '../utils/dateUtils'
import SubmissionForm from '../components/SubmissionForm'
import SubmissionList from '../components/SubmissionList'
import { ethers } from 'ethers'

// CSS for wallet addresses and long strings
const styles = {
  walletAddress: {
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    fontSize: '0.9em'
  },
  longString: {
    wordBreak: 'break-all',
    overflowWrap: 'break-word'
  }
}

const TaskDetail = () => {
  const { taskId } = useParams()
  const { isAuthenticated, user } = useAuth()
  const { contracts } = useWeb3()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Fetching task data for taskId:', taskId)
        if (!taskId) {
          // Instead of throwing an error, redirect to the tasks list
          window.location.href = '/tasks'
          return
        }

        // Use the taskId directly without parsing it as an integer
        // This allows for UUID format IDs used by Deno KV
        const response = await tasksAPI.getTaskById(taskId)
        console.log('API Response:', response)

        if (!response || !response.success || !response.data) {
          throw new Error(response?.message || 'Invalid task data received')
        }

        const taskData = response.data
        console.log('Setting task data:', taskData)
        setTask(taskData)
      } catch (err) {
        console.error('Error fetching task data:', err)
        setError(err.message || 'Failed to load task data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchTaskData()
  }, [taskId])

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge bg="success">Open</Badge>
      case 'closed':
        return <Badge bg="secondary">Closed</Badge>
      default:
        return <Badge bg="info">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading task details...</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    )
  }

  if (!task) {
    return (
      <Container className="my-5">
        <Alert variant="warning">
          <Alert.Heading>Task Not Found</Alert.Heading>
          <p>The requested task could not be found.</p>
        </Alert>
      </Container>
    )
  }

  const handleSubmissionCreated = (submissionId) => {
    // Switch to the submissions tab after creating a submission
    setActiveTab('submissions')
    setShowSubmissionForm(false)
  }

  const handleCloseTask = async () => {
    if (!contracts.taskManager) {
      setError('Task Manager contract not initialized')
      return
    }

    try {
      // Get current gas price and add 50%
      const provider = contracts.taskManager.provider
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice.mul(150).div(100)

      // Close task on blockchain
      const tx = await contracts.taskManager.closeTask(task.contractTaskId, {
        gasLimit: 100000,
        gasPrice
      })

      console.log('Transaction sent:', tx.hash)

      // Wait for transaction to be mined
      await tx.wait()

      // Refresh task data
      window.location.reload()
    } catch (err) {
      console.error('Error closing task:', err)
      setError(`Failed to close task: ${err.message}`)
    }
  }

  const canSubmitWork = () => {
    console.log('Checking if user can submit work:');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user?.walletAddress:', user?.walletAddress);
    console.log('task.creatorAddress:', task?.creatorAddress);
    console.log('task.status:', task?.status);

    if (!isAuthenticated) {
      console.log('Cannot submit: User not authenticated');
      return false;
    }
    if (!user?.walletAddress) {
      console.log('Cannot submit: No wallet address');
      return false;
    }
    if (task.creatorAddress?.toLowerCase() === user.walletAddress.toLowerCase()) {
      console.log('Cannot submit: User is task creator');
      return false;
    }
    if (task.status !== 'open') {
      console.log('Cannot submit: Task status is not open');
      return false;
    }
    console.log('User can submit work');
    return true;
  };

  const getSubmitWorkMessage = () => {
    console.log('Getting submit work message:');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user?.walletAddress:', user?.walletAddress);
    console.log('task.creatorAddress:', task?.creatorAddress);
    console.log('task.status:', task?.status);

    if (!isAuthenticated) {
      return 'Please connect your wallet to submit work';
    }
    if (!user?.walletAddress) {
      return 'Please connect your wallet to submit work';
    }
    if (task.creatorAddress?.toLowerCase() === user.walletAddress.toLowerCase()) {
      return 'Task creators cannot submit work to their own tasks';
    }
    if (task.status !== 'open') {
      return 'This task is not open for submissions';
    }
    return null;
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>{task?.title || 'Loading...'}</h1>
          <div className="d-flex align-items-center mb-3">
            {task && getStatusBadge(task.status)}
            {task && (
              <span className="ms-3 text-muted">
                Created by: <span style={styles.walletAddress}>{task.creatorAddress}</span>
              </span>
            )}
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="details" title="Task Details">
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Description</Card.Title>
                  <Card.Text style={{ whiteSpace: 'pre-line' }}>
                    {task.description}
                  </Card.Text>
                </Card.Body>
              </Card>

              {/* Task details */}
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Task Details</Card.Title>
                  <Row>
                    <Col md={6}>
                      <p><strong>Task Type:</strong> {task.taskType}</p>
                      <p><strong>Reward:</strong> {task.rewardPerSubmission} tokens per submission</p>
                      <p><strong>Deadline:</strong> {formatDate(task.deadline)}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Required Reviewers:</strong> {task.requiredReviewers}</p>
                      <p><strong>Status:</strong> {task.status}</p>
                      <p>
                        <strong>Data CID:</strong>{' '}
                        <a
                          href={`https://gateway.lighthouse.storage/ipfs/${task.dataCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-break"
                        >
                          <span style={styles.longString}>{task.dataCid}</span>
                        </a>
                      </p>
                    </Col>
                  </Row>

                  {task.nominatedReviewers && task.nominatedReviewers.length > 0 && (
                    <>
                      <hr />
                      <h6>Nominated Reviewers:</h6>
                      <ul>
                        {task.nominatedReviewers.map((reviewer, index) => (
                          <li key={index} style={styles.walletAddress}>{reviewer}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card.Body>
              </Card>

              {/* Deadline warning */}
              {task.deadline && isDeadlinePassed(task.deadline) && (
                <Alert variant="warning">
                  <Alert.Heading>Task Deadline Has Passed</Alert.Heading>
                  <p>
                    The deadline for this task was {formatDate(task.deadline)}.
                    You can still submit your work, but it will only be saved to the backend database,
                    not to the blockchain.
                  </p>
                </Alert>
              )}
            </Tab>

            <Tab eventKey="submissions" title="Submissions">
              {!task ? (
                <div className="text-center my-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading task data...</p>
                </div>
              ) : showSubmissionForm ? (
                <Card className="mb-4">
                  <Card.Body>

                    <SubmissionForm
                      taskId={task.id}
                      onSubmissionCreated={handleSubmissionCreated}
                    />
                    <div className="d-flex justify-content-end mt-3">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowSubmissionForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ) : (
                <div className="mb-4">
                  {canSubmitWork() ? (
                    <Button
                      variant="primary"
                      onClick={() => setShowSubmissionForm(true)}
                      className="mb-3"
                    >
                      Submit Work
                    </Button>
                  ) : (
                    <Alert variant="info">
                      {getSubmitWorkMessage()}
                    </Alert>
                  )}
                  {task && <SubmissionList taskId={task.id} />}
                </div>
              )}
            </Tab>
          </Tabs>
        </Col>

        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Actions</Card.Title>

              {isAuthenticated ? (
                <>
                  {user?.walletAddress === task.creatorAddress ? (
                    <Alert variant="info">
                      You created this task. You cannot submit work for your own task.
                    </Alert>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-100 mb-3"
                      disabled={task.status !== 'open'}
                      onClick={() => {
                        setActiveTab('submissions')
                        setShowSubmissionForm(true)
                      }}
                    >
                      Submit Work
                    </Button>
                  )}

                  {task.status === 'open' && user?.walletAddress === task.creatorAddress && (
                    <Button
                      variant="outline-danger"
                      className="w-100"
                      onClick={handleCloseTask}
                    >
                      Close Task
                    </Button>
                  )}
                </>
              ) : (
                <Alert variant="warning">
                  Please connect your wallet to interact with this task.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title>Blockchain Details</Card.Title>
              <p><strong>Contract Task ID:</strong> {task.contractTaskId}</p>
              <p>
                <strong>Transaction:</strong>{' '}
                {task.txHash ? (
                  <a
                    href={`${import.meta.env.VITE_NETWORK_EXPLORER_URL}/message/${task.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-break"
                  >
                    <span style={styles.longString}>{task.txHash}</span>
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default TaskDetail
