import { useState } from 'react'
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
// import FileUpload from '../components/FileUpload'
import TransactionStatus from '../components/TransactionStatus'
import CidHelper from '../components/CidHelper'
import { tasksAPI, smartContractAPI } from '../services/api'
import { dateToUnixTimestamp } from '../utils/dateUtils'
import cidUtils from '../utils/cidUtils'

const CreateTask = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { contracts, networkInfo } = useWeb3()

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    rewardPerSubmission: '10',
    rewardPerReview: '5',
    deadline: '',
    taskType: '1', // 1 = Image Classification
    consensusMechanism: '1', // 1 = Majority
    instructions: '',
    categories: '',
    minConsensusPercentage: '75',
    requireEvidence: true,
    maxSubmissionsPerUser: '5',
    maxReviewsPerUser: '10',
    requiredSubmissions: '10',
    requiredReviewers: '2',
    requireVerification: false,
    nominatedReviewersText: '',
    dataCid: '',
    isEncrypted: false,
    accessConditions: '',
    lighthouseCID: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txStatus, setTxStatus] = useState(null)
  const [success, setSuccess] = useState(false)
  const [cidValidationStatus, setCidValidationStatus] = useState(null)

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          Please connect your wallet to create a task.
        </Alert>
      </Container>
    )
  }

  // Show warning if not on the correct network
  if (!networkInfo.isSupported) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          <Alert.Heading>Wrong Network</Alert.Heading>
          <p>
            You are currently connected to {networkInfo.name} (Chain ID: {networkInfo.chainId}).
            Please switch to {import.meta.env.VITE_NETWORK_NAME} to create tasks.
          </p>
        </Alert>
      </Container>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setTaskData(prev => ({ ...prev, [name]: value }))
  }

  const validateCid = (cid) => {
    console.log('Validating CID in CreateTask:', cid);

    if (!cid) {
      setCidValidationStatus({ valid: false, message: 'Please enter a CID' });
      return false;
    }

    // Use our cidUtils to validate the CID
    const isValid = cidUtils.isValidCid(cid);
    console.log('CID validation result:', isValid);

    if (!isValid) {
      setCidValidationStatus({ valid: false, message: 'Invalid CID format. Please enter a valid IPFS/Filecoin CID.' });
      return false;
    }

    setCidValidationStatus({ valid: true, message: 'Valid CID format' });
    return true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent double submission
    if (loading) {
      return
    }

    setLoading(true)
    setError(null)
    setTxStatus({ pending: true })

    try {
      // Validate form
      if (!taskData.title || !taskData.description || !taskData.deadline || !taskData.dataCid) {
        throw new Error('Please fill in all required fields')
      }

      // Validate CID
      const cidIsValid = validateCid(taskData.dataCid)
      if (!cidIsValid) {
        throw new Error('Please enter a valid CID')
      }

      // Process categories
      const categories = taskData.categories
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0)

      // Process nominated reviewers
      let nominatedReviewers = []
      if (taskData.nominatedReviewersText && taskData.nominatedReviewersText.trim()) {
        nominatedReviewers = taskData.nominatedReviewersText
          .split('\n')
          .map(addr => addr.trim())
          .filter(addr => addr.length > 0 && addr.startsWith('0x'))
      }

      // Format data for backend
      const formattedData = {
        title: taskData.title,
        description: taskData.description,
        rewardPerSubmission: parseFloat(taskData.rewardPerSubmission),
        rewardPerReview: parseFloat(taskData.rewardPerReview),
        deadline: dateToUnixTimestamp(new Date(taskData.deadline)),
        dataCid: taskData.dataCid,
        taskType: parseInt(taskData.taskType),
        consensusMechanism: parseInt(taskData.consensusMechanism),
        instructions: taskData.instructions,
        categories: categories,
        minConsensusPercentage: parseInt(taskData.minConsensusPercentage),
        requireEvidence: Boolean(taskData.requireEvidence),
        maxSubmissionsPerUser: parseInt(taskData.maxSubmissionsPerUser),
        maxReviewsPerUser: parseInt(taskData.maxReviewsPerUser),
        requiredSubmissions: parseInt(taskData.requiredSubmissions),
        requiredReviewers: parseInt(taskData.requiredReviewers),
        requireVerification: Boolean(taskData.requireVerification),
        status: 'open',
        creatorAddress: user?.walletAddress,
        nominatedReviewers: nominatedReviewers.length > 0 ? nominatedReviewers : [],
        contractTaskId: null, // Will be set after blockchain transaction
        txHash: null, // Will be set after blockchain transaction
        isEncrypted: Boolean(taskData.isEncrypted),
        accessConditions: taskData.accessConditions,
        lighthouseCID: taskData.lighthouseCID
      }

      console.log('Sending task data to backend:', formattedData)

      // Create task on blockchain first
      const result = await smartContractAPI.createTask(
        formattedData.title,
        formattedData.description,
        formattedData.rewardPerSubmission,
        formattedData.rewardPerReview,
        formattedData.deadline,
        formattedData.dataCid,
        formattedData.requiredSubmissions,
        formattedData.requiredReviewers,
        nominatedReviewers,
        formattedData.taskType,
        formattedData.consensusMechanism,
        formattedData.instructions,
        categories,
        formattedData.minConsensusPercentage,
        formattedData.requireEvidence,
        formattedData.maxSubmissionsPerUser,
        formattedData.maxReviewsPerUser,
        formattedData.requireVerification,
        contracts
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create task on blockchain')
      }

      if (!result.taskId) {
        throw new Error('Failed to get task ID from blockchain')
      }

      setTxStatus({
        pending: false,
        success: true,
        txHash: result.txHash
      })

      // Update the formatted data with blockchain transaction details
      formattedData.contractTaskId = result.taskId
      formattedData.txHash = result.txHash

      console.log('Saving task to backend with contract task ID:', formattedData.contractTaskId)

      // Save to backend
      const backendResult = await tasksAPI.createTask(formattedData)

      if (!backendResult.success) {
        throw new Error(backendResult.message || 'Failed to save task to backend')
      }

      console.log('Backend result:', backendResult)
      const taskId = backendResult.data?.id

      if (!taskId) {
        throw new Error('Failed to get task ID from backend')
      }

      setSuccess(true)

      // Use setTimeout to ensure the state is updated before navigation
      setTimeout(() => {
        navigate(`/tasks/${taskId}`)
      }, 1000)
    } catch (err) {
      console.error('Error creating task:', err)

      // Check for different types of errors
      if (err.code === 'ACTION_REJECTED' || err.message.includes('user denied transaction')) {
        setError('Transaction was rejected in MetaMask. Please approve the transaction to create a task.')
      } else if (err.message.includes('execution reverted')) {
        // Extract the revert reason if available
        const revertReason = err.message.match(/reason="([^"]*)"/)?.[1] || 'Unknown reason';
        setError(`Contract execution failed: ${revertReason}. This may be due to an issue with the contract parameters or insufficient gas.`)
      } else if (err.message.includes('Failed to create task on blockchain')) {
        setError(`${err.message}. Please check that you're connected to the correct network and have sufficient funds.`)
      } else {
        setError(err.message)
      }

      setTxStatus({ pending: false, success: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <h1 className="mb-4">Create New Task</h1>

      {success ? (
        <Alert variant="success">
          <Alert.Heading>Task Created Successfully!</Alert.Heading>
          <p>Your task has been created and is now available for submissions.</p>
          <p>Redirecting to task details page...</p>
        </Alert>
      ) : (
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={taskData.title}
                  onChange={handleChange}
                  placeholder="Enter task title"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={taskData.description}
                  onChange={handleChange}
                  placeholder="Describe the task in detail"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Reward Per Submission (dataFIL)</Form.Label>
                <Form.Control
                  type="number"
                  name="rewardPerSubmission"
                  value={taskData.rewardPerSubmission}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Reward Per Review (dataFIL)</Form.Label>
                <Form.Control
                  type="number"
                  name="rewardPerReview"
                  value={taskData.rewardPerReview}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Deadline</Form.Label>
                <Form.Control
                  type="date"
                  name="deadline"
                  value={taskData.deadline}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Task Type</Form.Label>
                <Form.Select
                  name="taskType"
                  value={taskData.taskType}
                  onChange={handleChange}
                >
                  <option value="1">Image Classification</option>
                  <option value="2">Text Classification</option>
                  <option value="3">Audio Classification</option>
                  <option value="4">Video Classification</option>
                  <option value="5">Data Annotation</option>
                  <option value="6">Data Collection</option>
                  <option value="7">Data Validation</option>
                  <option value="8">Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Consensus Mechanism</Form.Label>
                <Form.Select
                  name="consensusMechanism"
                  value={taskData.consensusMechanism}
                  onChange={handleChange}
                >
                  <option value="1">Majority Vote</option>
                  <option value="2">Weighted Vote</option>
                  <option value="3">Unanimous Vote</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Instructions</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="instructions"
                  value={taskData.instructions}
                  onChange={handleChange}
                  placeholder="Detailed instructions for task completion"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Categories</Form.Label>
                <Form.Control
                  type="text"
                  name="categories"
                  value={taskData.categories}
                  onChange={handleChange}
                  placeholder="Enter categories separated by commas (e.g., Cat, Dog, Bird)"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Minimum Consensus Percentage</Form.Label>
                <Form.Control
                  type="number"
                  name="minConsensusPercentage"
                  value={taskData.minConsensusPercentage}
                  onChange={handleChange}
                  min="50"
                  max="100"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Required Submissions</Form.Label>
                <Form.Control
                  type="number"
                  name="requiredSubmissions"
                  value={taskData.requiredSubmissions}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Required Reviewers</Form.Label>
                <Form.Control
                  type="number"
                  name="requiredReviewers"
                  value={taskData.requiredReviewers}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Max Submissions Per User</Form.Label>
                <Form.Control
                  type="number"
                  name="maxSubmissionsPerUser"
                  value={taskData.maxSubmissionsPerUser}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Max Reviews Per User</Form.Label>
                <Form.Control
                  type="number"
                  name="maxReviewsPerUser"
                  value={taskData.maxReviewsPerUser}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Require Evidence"
                  name="requireEvidence"
                  checked={taskData.requireEvidence}
                  onChange={(e) => setTaskData({ ...taskData, requireEvidence: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Require Verification"
                  name="requireVerification"
                  checked={taskData.requireVerification}
                  onChange={(e) => setTaskData({ ...taskData, requireVerification: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Nominated Reviewers</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="nominatedReviewersText"
                  value={taskData.nominatedReviewersText}
                  onChange={handleChange}
                  placeholder="Enter wallet addresses, one per line"
                  required
                />
                <Form.Text className="text-muted">
                  These addresses will be responsible for reviewing submissions for this task.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Data CID</Form.Label>
                <Form.Control
                  type="text"
                  name="dataCid"
                  value={taskData.dataCid}
                  onChange={handleChange}
                  onBlur={() => validateCid(taskData.dataCid)}
                  placeholder="Enter the CID of your data file (e.g., bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi)"
                  required
                />
                <Form.Text className="text-muted">
                  Enter the CID of a file you've already uploaded to IPFS/Filecoin. <CidHelper />
                  <br />
                  Need to upload a file first? <a href="/lighthouse-test" target="_blank" rel="noopener noreferrer" className="text-primary">Use our Lighthouse uploader</a> to get a CID.
                </Form.Text>
                {cidValidationStatus && (
                  <div className={`mt-2 ${cidValidationStatus.valid ? 'text-success' : 'text-danger'}`}>
                    {cidValidationStatus.message}
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="File is encrypted with Lighthouse"
                  name="isEncrypted"
                  checked={taskData.isEncrypted}
                  onChange={(e) => setTaskData({ ...taskData, isEncrypted: e.target.checked })}
                />
                {taskData.isEncrypted && (
                  <Form.Text className="text-muted">
                    If your file is encrypted, only users who meet the access conditions will be able to view it.
                  </Form.Text>
                )}
              </Form.Group>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              {txStatus && <TransactionStatus status={txStatus} className="mt-3" />}

              <Button
                variant="primary"
                type="submit"
                className="mt-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Creating Task...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Token Balance and Faucet */}
      <div className="mt-4">
        <Card className="mb-4">
          <Card.Header>
            <h4 className="mb-0">Need Tokens?</h4>
          </Card.Header>
          <Card.Body>
            <p>
              You need dataFIL tokens to create tasks and pay rewards. If you don't have enough tokens, your task creation will fail.
            </p>
            <Alert variant="info">
              <p className="mb-0">
                Visit the <Link to="/tokens">Tokens page</Link> to check your balance and request tokens from our faucet.
              </p>
            </Alert>
            <div className="d-grid gap-2">
              <Button as={Link} to="/tokens" variant="primary">
                Go to Tokens Page
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Container>
  )
}

export default CreateTask
