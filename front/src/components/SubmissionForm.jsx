import { useState } from 'react'
import { Form, Button, Alert, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'
import { uploadToLighthouse } from '../services/lighthouse'
import { tasksAPI } from '../services/api'
import cidUtils from '../utils/cidUtils'

const SubmissionForm = ({ taskId, onSubmissionCreated }) => {
  const { isAuthenticated, user } = useAuth()
  const { contracts } = useWeb3()
  const navigate = useNavigate()

  const [submissionData, setSubmissionData] = useState('')
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [uploadedCid, setUploadedCid] = useState('')
  const [useExistingCid, setUseExistingCid] = useState(false)
  const [existingCid, setExistingCid] = useState('')

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmissionDataChange = (e) => {
    setSubmissionData(e.target.value)
  }

  const handleExistingCidChange = (e) => {
    setExistingCid(e.target.value)
  }

  const handleToggleUseExistingCid = () => {
    setUseExistingCid(!useExistingCid)
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!file) {
      setError('Please select a file to upload')
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      // Upload file to Lighthouse
      const cid = await uploadToLighthouse(file)
      setUploadedCid(cid)

      console.log('File uploaded successfully with CID:', cid)
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(`Failed to upload file: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setError('Please connect your wallet first')
      return
    }

    // Validate form
    if (!submissionData) {
      setError('Please provide submission data')
      return
    }

    const cidToUse = useExistingCid ? existingCid : uploadedCid

    if (!cidToUse) {
      setError('Please upload a file or provide an existing CID')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // We'll use the backend API instead of directly interacting with the blockchain
      // No need to check for contracts.submissionManager

      // Use taskId directly without parsing it as an integer
      // This allows for UUID format IDs used by Deno KV

      // Get task details to check if user is the creator and get contractTaskId
      const taskResponse = await tasksAPI.getTaskById(taskId)
      if (!taskResponse || !taskResponse.data) {
        throw new Error('Task not found')
      }

      const task = taskResponse.data
      if (task.creatorAddress?.toLowerCase() === user.walletAddress.toLowerCase()) {
        throw new Error('Task creators cannot submit work to their own tasks')
      }

      if (!task.contractTaskId) {
        throw new Error('Task not found on blockchain')
      }

      console.log('Creating submission with parameters:', {
        taskId: taskId,
        contractTaskId: task.contractTaskId,
        submissionData,
        cid: cidToUse
      })

      // First, submit to the blockchain
      console.log('Creating submission on blockchain')
      let txHash = null;
      let contractError = null;
      let contractSubmissionId = null;

      try {
        if (!contracts.submissionManager) {
          throw new Error('Submission Manager contract not initialized')
        }

        // Convert CID to bytes32 for the contract
        const submissionCidBytes32 = cidUtils.cidToBytes32(cidToUse);

        // Get current gas price and add 50%
        const provider = contracts.submissionManager.provider;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice.mul(150).div(100);

        console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

        // Submit work to blockchain
        const tx = await contracts.submissionManager.submitWork(
          task.contractTaskId,
          submissionCidBytes32,
          submissionData,
          {
            gasPrice
          }
        );

        console.log('Transaction sent:', tx.hash);
        txHash = tx.hash;

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt);

        // Get submission ID from event
        const event = receipt.events.find(e => e.event === 'SubmissionCreated');
        const contractSubmissionId = event ? event.args.submissionId.toNumber() : null;
        console.log('Submission created on blockchain with ID:', contractSubmissionId);
      } catch (err) {
        console.error('Error creating submission on blockchain:', err);
        contractError = err;
      }

      // Now, submit to the backend API
      console.log('Creating submission via backend API')

      // Prepare submission data for the backend
      const submissionPayload = {
        taskId: taskId,
        submitterAddress: user.walletAddress,
        submissionCid: cidToUse,
        contractSubmissionId: contractSubmissionId, // Include the blockchain submission ID
        txHash: txHash, // Include the transaction hash
        // Format metadata as an object with text field to avoid JSON parsing issues
        metadata: { text: submissionData },
        // Keep data for backward compatibility
        data: { text: submissionData },
        status: 'pending'
      }

      // Send submission to backend API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionPayload)
      })

      if (!response.ok) {
        throw new Error(`Failed to create submission: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Submission created:', result)

      if (!result.success) {
        throw new Error(result.message || 'Failed to create submission')
      }

      // If we had a contract error, show a warning but don't fail completely
      if (contractError) {
        setError(`Warning: Submission saved in database but blockchain transaction failed: ${contractError.message}`);
      }

      // Make sure we have a valid ID before navigating
      if (!result.data || !result.data.id) {
        throw new Error("Server returned invalid submission data");
      }

      const submissionId = result.data.id

      // No need to wait for a transaction to be mined since we're using the backend API
      console.log('Submission created with ID:', submissionId)

      // Call the callback if provided
      if (onSubmissionCreated) {
        onSubmissionCreated(submissionId)
      }

      // Navigate to submission details page
      navigate(`/submissions/${submissionId}`)
    } catch (err) {
      console.error('Error creating submission:', err)
      let errorMessage = err.message

      // Handle specific error cases
      if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas fee'
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection'
      } else if (err.code === 'CALL_EXCEPTION') {
        errorMessage = 'Contract call failed. The task might be closed or you might not have permission'
      }

      setError(`Failed to create submission: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="submission-form">
      <h3>Submit Solution</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Submission Notes</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={submissionData}
            onChange={handleSubmissionDataChange}
            placeholder="Provide details about your submission"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Use existing CID"
            checked={useExistingCid}
            onChange={handleToggleUseExistingCid}
          />
        </Form.Group>

        {useExistingCid ? (
          <Form.Group className="mb-3">
            <Form.Label>Existing CID</Form.Label>
            <Form.Control
              type="text"
              value={existingCid}
              onChange={handleExistingCidChange}
              placeholder="Enter existing CID"
              required
            />
            <Form.Text className="text-muted">
              Enter a CID for content already stored on IPFS/Filecoin
            </Form.Text>
          </Form.Group>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Upload File</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
                disabled={isUploading || uploadedCid}
              />
              <Form.Text className="text-muted">
                Upload your solution file (max 100MB)
              </Form.Text>
            </Form.Group>

            {!uploadedCid && (
              <div className="d-grid mb-3">
                <Button
                  variant="secondary"
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload File'
                  )}
                </Button>
              </div>
            )}

            {uploadedCid && (
              <Alert variant="success" className="mb-3">
                File uploaded successfully! CID: {uploadedCid}
              </Alert>
            )}
          </>
        )}

        <div className="d-grid">
          <Button
            variant="primary"
            type="submit"
            size="lg"
            disabled={isSubmitting || (!uploadedCid && !useExistingCid) || (useExistingCid && !existingCid)}
          >
            {isSubmitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              'Submit Solution'
            )}
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default SubmissionForm
