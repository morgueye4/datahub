import { useState, useEffect } from 'react'
import { Form, Button, Alert, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'

const ReviewForm = ({ taskId, submissionId, contractSubmissionId, onReviewCreated }) => {
  const { isAuthenticated, user } = useAuth()
  const { contracts } = useWeb3()
  const navigate = useNavigate()

  // State variables
  const [rating, setRating] = useState(3)
  const [comments, setComments] = useState('')
  const [isApproved, setIsApproved] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [canReview, setCanReview] = useState(true)
  const [submissionData, setSubmissionData] = useState(null)

  // Fetch submission data and check if user can review
  useEffect(() => {
    const checkCanReview = async () => {
      if (!isAuthenticated || !user?.walletAddress || !submissionId) {
        return
      }

      try {
        // Fetch submission details
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/submissions/${submissionId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch submission: ${response.statusText}`)
        }

        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to fetch submission')
        }

        const submission = data.data
        setSubmissionData(submission)

        // Check if user is the submitter
        const submitterAddress = submission.submitter || submission.submitterAddress
        console.log('Checking if user can review:', {
          userAddress: user.walletAddress.toLowerCase(),
          submitterAddress: submitterAddress?.toLowerCase(),
          isSubmitter: submitterAddress && user.walletAddress.toLowerCase() === submitterAddress.toLowerCase()
        })

        if (submitterAddress && user.walletAddress.toLowerCase() === submitterAddress.toLowerCase()) {
          console.log('User cannot review their own submission')
          setCanReview(false)
          setError('You cannot review your own submission')
          return
        }

        // Fetch task details to check if user is the creator
        const taskResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${submission.taskId}`)
        if (!taskResponse.ok) {
          throw new Error(`Failed to fetch task: ${taskResponse.statusText}`)
        }

        const taskData = await taskResponse.json()
        if (!taskData.success || !taskData.data) {
          throw new Error(taskData.message || 'Failed to fetch task')
        }

        const task = taskData.data

        // Check if user is the task creator
        if (task.creatorAddress && user.walletAddress.toLowerCase() === task.creatorAddress.toLowerCase()) {
          setCanReview(false)
          setError('Task creators cannot review submissions')
          return
        }

        setCanReview(true)
      } catch (err) {
        console.error('Error checking if user can review:', err)
        setError(`Error: ${err.message}`)
        setCanReview(false)
      }
    }

    checkCanReview()
  }, [isAuthenticated, user, submissionId])

  // These state variables are now declared at the top of the component

  const handleRatingChange = (e) => {
    setRating(parseInt(e.target.value))
  }

  const handleCommentsChange = (e) => {
    setComments(e.target.value)
  }

  const handleApprovalChange = (e) => {
    setIsApproved(e.target.value === 'approved')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setError('Please connect your wallet first')
      return
    }

    // Validate form
    if (!comments) {
      setError('Please provide review comments')
      return
    }

    // Check if user can review this submission
    console.log('Submit attempt - canReview:', canReview)
    if (!canReview) {
      console.log('Preventing submission - user cannot review')
      setError('You cannot review this submission')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      if (!contracts.submissionManager) {
        throw new Error('Submission Manager contract not initialized')
      }

      // Use the submission data we already fetched in useEffect
      if (!submissionData) {
        throw new Error('Submission data not available')
      }

      // For testing purposes, we'll use the user's wallet address to determine if they can review
      // This is a workaround for the missing contractSubmissionId
      const submitterAddress = submissionData.submitter || submissionData.submitterAddress;

      // Check if the current user is the submitter
      if (submitterAddress && user.walletAddress.toLowerCase() === submitterAddress.toLowerCase()) {
        console.error('Cannot review own submission - addresses match:', {
          userAddress: user.walletAddress.toLowerCase(),
          submitterAddress: submitterAddress.toLowerCase()
        });
        setError('You cannot review your own submission');
        setIsSubmitting(false);
        return;
      }

      // Fetch task details to check if user is the creator
      try {
        const taskResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${submissionData.taskId}`);
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          if (taskData.success && taskData.data) {
            const creatorAddress = taskData.data.creator || taskData.data.creatorAddress;

            // Check if the current user is the task creator
            if (creatorAddress && user.walletAddress.toLowerCase() === creatorAddress.toLowerCase()) {
              console.error('Task creator cannot review - addresses match:', {
                userAddress: user.walletAddress.toLowerCase(),
                creatorAddress: creatorAddress.toLowerCase()
              });
              setError('Task creators cannot review submissions');
              setIsSubmitting(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error checking if user is task creator:', err);
      }

      // First, try to create the review on the blockchain
      // This is the most important part for the hackathon
      let txHash = null;
      let contractError = null;

      try {
        // Use the contractSubmissionId passed as a prop
        console.log('Using contract approach with submission ID:', contractSubmissionId);
        const submissionIdForContract = contractSubmissionId || 1;

        console.log('Creating review with parameters:', {
          taskId,
          submissionId,
          submissionIdForContract,
          rating,
          comments,
          isApproved
        });

        // Get current gas price and add 50%
        const provider = contracts.submissionManager.provider;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice.mul(150).div(100);

        console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

        // Create review on blockchain using the numeric contractSubmissionId
        const tx = await contracts.submissionManager.reviewSubmission(
          submissionIdForContract,
          isApproved,
          comments,
          {
            gasPrice
          }
        );

        console.log('Transaction sent:', tx.hash);
        txHash = tx.hash;

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt);
      } catch (err) {
        console.error('Error creating review on blockchain:', err);
        contractError = err;
      }

      // Now create the review in the backend database
      // Include the transaction hash if we have one
      const reviewResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          reviewerAddress: user.walletAddress,
          approved: isApproved,
          feedback: comments,
          txHash: txHash // Include the transaction hash if we have one
        }),
      });

      if (!reviewResponse.ok) {
        const errorData = await reviewResponse.json();
        throw new Error(errorData.message || 'Failed to create review');
      }

      const reviewData = await reviewResponse.json();
      console.log('Review created via backend:', reviewData);

      // If we had a contract error, show a warning but don't fail completely
      if (contractError) {
        setError(`Warning: Review saved in database but blockchain transaction failed: ${contractError.message}`);
      }

      // Call the callback if provided
      if (onReviewCreated) {
        onReviewCreated();
      }

      // Navigate to submission details page
      navigate(`/submissions/${submissionId}`);
    } catch (err) {
      console.error('Error creating review:', err)
      setError(`Failed to create review: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="review-form">
      <h3>Review Submission</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Rating (1-5)</Form.Label>
          <Form.Control
            type="range"
            min="1"
            max="5"
            value={rating}
            onChange={handleRatingChange}
            className="mb-2"
          />
          <div className="d-flex justify-content-between">
            <span>Poor (1)</span>
            <span>Excellent (5)</span>
          </div>
          <div className="text-center">
            <strong>Selected Rating: {rating}</strong>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Decision</Form.Label>
          <Form.Select
            value={isApproved ? 'approved' : 'rejected'}
            onChange={handleApprovalChange}
          >
            <option value="approved">Approve Submission</option>
            <option value="rejected">Reject Submission</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Comments</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={comments}
            onChange={handleCommentsChange}
            placeholder="Provide detailed feedback about the submission"
            required
          />
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting || !canReview}
        >
          {isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Submitting Review...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </Form>
    </div>
  )
}

export default ReviewForm
