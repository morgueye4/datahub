import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import { formatDate, truncateAddress } from '../utils/formatting'
import cidUtils from '../utils/cidUtils'
import { ethers } from 'ethers'

const SubmissionDetail = () => {
  const { submissionId } = useParams()
  const { contracts } = useWeb3()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [submission, setSubmission] = useState(null)
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const fetchSubmissionAndTask = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!submissionId) {
          throw new Error('Submission ID is required')
        }

        // Use the submissionId directly without parsing it as an integer
        // This allows for UUID format IDs used by Deno KV

        // Fetch submission from backend API instead of directly from blockchain
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/submissions/${submissionId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch submission: ${response.statusText}`)
        }

        const submissionData = await response.json()
        console.log('Submission data from API:', submissionData)

        if (!submissionData.success || !submissionData.data) {
          throw new Error(submissionData.message || 'Failed to fetch submission')
        }

        const processedSubmission = submissionData.data

        // Fetch reviews to determine the actual status
        try {
          const reviewsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reviews/submission/${submissionId}`)
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json()
            console.log('Reviews data from API:', reviewsData)

            if (reviewsData.success && reviewsData.data && reviewsData.data.length > 0) {
              // Count approvals and rejections
              const approvals = reviewsData.data.filter(r => r.isApproved === true).length
              const rejections = reviewsData.data.filter(r => r.isApproved === false).length

              // Update submission status based on reviews
              if (approvals > rejections) {
                processedSubmission.isApproved = true
                processedSubmission.status = 'approved'
              } else if (rejections > 0) {
                processedSubmission.isApproved = false
                processedSubmission.status = 'rejected'
              }

              console.log('Updated submission status based on reviews:', {
                approvals,
                rejections,
                isApproved: processedSubmission.isApproved,
                status: processedSubmission.status
              })
            }
          }
        } catch (reviewError) {
          console.error('Error fetching reviews:', reviewError)
          // Continue with the submission data we have
        }

        setSubmission(processedSubmission)

        // Fetch task details from backend API
        const taskResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${processedSubmission.taskId}`)
        if (!taskResponse.ok) {
          throw new Error(`Failed to fetch task: ${taskResponse.statusText}`)
        }

        const taskData = await taskResponse.json()
        console.log('Task data from API:', taskData)

        if (!taskData.success || !taskData.data) {
          throw new Error(taskData.message || 'Failed to fetch task')
        }

        setTask(taskData.data)

        // Check if user can review this submission and if they have access to view it
        if (isAuthenticated && user?.walletAddress) {
          const submitterAddress = processedSubmission.submitter || processedSubmission.submitterAddress;
          const creatorAddress = taskData.data?.creatorAddress;
          const userAddress = user.walletAddress.toLowerCase();

          // Get nominated reviewers from task data if available
          let nominatedReviewers = [];
          try {
            if (taskData.data.nominatedReviewers && Array.isArray(taskData.data.nominatedReviewers)) {
              nominatedReviewers = taskData.data.nominatedReviewers.map(addr => addr.toLowerCase());
            }
          } catch (e) {
            console.error('Error processing nominated reviewers:', e);
          }

          // Check if user has access to view this submission
          // User has access if they are:
          // 1. The submission author
          // 2. The task creator
          // 3. A nominated reviewer
          const isSubmitter = submitterAddress && userAddress === submitterAddress.toLowerCase();
          const isTaskCreator = creatorAddress && userAddress === creatorAddress.toLowerCase();
          const isNominatedReviewer = nominatedReviewers.includes(userAddress);

          const userHasAccess = isSubmitter || isTaskCreator || isNominatedReviewer;
          setHasAccess(userHasAccess);

          // User can review if they are not the submitter and not the task creator
          // and they are a nominated reviewer (if there are any)
          if (submitterAddress && creatorAddress) {
            const canUserReview =
              userAddress !== submitterAddress.toLowerCase() &&
              userAddress !== creatorAddress.toLowerCase() &&
              (nominatedReviewers.length === 0 || isNominatedReviewer);

            setCanReview(canUserReview);
          } else {
            // Default to false if we don't have the necessary information
            setCanReview(false);
          }
        } else {
          setHasAccess(false);
          setCanReview(false);
        }
      } catch (err) {
        console.error('Error fetching submission details:', err)
        setError(err.message || 'Failed to load submission details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissionAndTask()
  }, [contracts.submissionManager, contracts.taskManager, submissionId, isAuthenticated, user])

  const handleReviewCreated = () => {
    // Refresh the page to show the new review
    window.location.reload()
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-3">Loading submission details...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button as={Link} to="/tasks" variant="primary">
          Back to Tasks
        </Button>
      </Container>
    )
  }

  // Check if user has access to view this submission
  if (!hasAccess && isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <h4>Access Restricted</h4>
          <p>You don't have permission to view this submission. Only the following users can access this submission:</p>
          <ul>
            <li>The submission author</li>
            <li>The task creator</li>
            <li>Nominated reviewers for this task</li>
          </ul>
          <Button as={Link} to="/tasks" variant="primary" className="mt-3">
            Back to Tasks
          </Button>
        </Alert>
      </Container>
    )
  }

  if (!submission || !task) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Submission not found</Alert>
        <Button as={Link} to="/tasks" variant="primary">
          Back to Tasks
        </Button>
      </Container>
    )
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Submission Details</h2>
        <Button as={Link} to={`/tasks/${submission.taskId}`} variant="outline-primary">
          Back to Task
        </Button>
      </div>

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Submission #{submission.id}</h4>
                <div>
                  {submission.isApproved === true && (
                    <Badge bg="success" className="ms-2">Approved</Badge>
                  )}
                  {submission.isApproved === false && (
                    <Badge bg="danger" className="ms-2">Rejected</Badge>
                  )}
                  {submission.isApproved === null && (
                    <Badge bg="warning" text="dark" className="ms-2">Pending Review</Badge>
                  )}
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <Card.Title>For Task: {task.title}</Card.Title>
              <Card.Subtitle className="mb-3 text-muted">
                Submitted by {
                  (() => {
                    const submitterAddress = submission.submitter || submission.submitterAddress;
                    if (!submitterAddress) return 'Unknown';
                    return submitterAddress === user?.walletAddress ? 'You' : truncateAddress(submitterAddress);
                  })()
                }
                {' • '}
                {formatDate(submission.createdAt)}
              </Card.Subtitle>

              <div className="mb-4">
                <strong>Submission Notes:</strong>
                <div className="p-3 bg-light rounded mt-2">
                  {(() => {
                    try {
                      // If data is an object, try to display it nicely
                      if (typeof submission.data === 'object' && submission.data !== null) {
                        if (submission.data.text) {
                          return submission.data.text;
                        } else if (submission.data.content) {
                          return submission.data.content;
                        } else {
                          return JSON.stringify(submission.data, null, 2);
                        }
                      }

                      // If metadata is available, try to use that
                      if (submission.metadata) {
                        if (typeof submission.metadata === 'object' && submission.metadata !== null) {
                          if (submission.metadata.text) {
                            return submission.metadata.text;
                          } else if (submission.metadata.content) {
                            return submission.metadata.content;
                          } else {
                            return JSON.stringify(submission.metadata, null, 2);
                          }
                        } else if (typeof submission.metadata === 'string') {
                          try {
                            const parsed = JSON.parse(submission.metadata);
                            if (parsed.text) {
                              return parsed.text;
                            } else if (parsed.content) {
                              return parsed.content;
                            } else {
                              return submission.metadata;
                            }
                          } catch (e) {
                            // If not valid JSON, just return the string
                            return submission.metadata;
                          }
                        }
                      }

                      // Fallback to data as string
                      return submission.data ?
                        (typeof submission.data === 'string' ?
                          submission.data :
                          JSON.stringify(submission.data, null, 2)) :
                        'No submission data available';
                    } catch (e) {
                      console.error('Error displaying submission data:', e);
                      return 'Error displaying submission data';
                    }
                  })()
                  }
                </div>
              </div>

              {(submission.dataCid || submission.submissionCid) && (
                <div className="mb-4">
                  <strong>Submission Data:</strong>
                  <div className="p-3 bg-light rounded mt-2">
                    <p className="mb-2">CID: {submission.submissionCid || submission.dataCid}</p>
                    <a
                      href={cidUtils.getCidUrl(submission.submissionCid || submission.dataCid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View Data
                    </a>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  <Badge bg="info">
                    {submission.reviewCount} {submission.reviewCount === 1 ? 'Review' : 'Reviews'}
                  </Badge>
                </div>

                {submission && canReview && (
                  <Button
                    variant="primary"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    {showReviewForm ? 'Cancel Review' : 'Add Review'}
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>

          {showReviewForm && canReview && submission && (
            <Card className="mb-4">
              <Card.Body>
                <ReviewForm
                  taskId={submission.taskId}
                  submissionId={submission.id}
                  contractSubmissionId={submission.contractSubmissionId || 1}
                  onReviewCreated={handleReviewCreated}
                />
              </Card.Body>
            </Card>
          )}

          {showReviewForm && !canReview && submission && (
            <Card className="mb-4">
              <Card.Body>
                <Alert variant="warning">
                  You cannot review this submission because you are either the submitter or the task creator.
                </Alert>
              </Card.Body>
            </Card>
          )}

          <ReviewList submissionId={submission.id} />
        </Col>

        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Task Information</h4>
            </Card.Header>
            <Card.Body>
              <Card.Title>{task.title}</Card.Title>
              <Card.Subtitle className="mb-3 text-muted">
                Created by {
                  (() => {
                    const creatorAddress = task.creator || task.creatorAddress;
                    if (!creatorAddress) return 'Unknown';
                    return creatorAddress === user?.walletAddress ? 'You' : truncateAddress(creatorAddress);
                  })()
                }
              </Card.Subtitle>

              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1">{task.description}</p>
              </div>

              <div className="mb-3">
                <strong>Reward:</strong>
                <p className="mt-1">{task.reward || task.rewardPerSubmission || '0'} dataFIL</p>
              </div>

              <div className="mb-3">
                <strong>Deadline:</strong>
                <p className="mt-1">{formatDate(task.deadline)}</p>
              </div>

              <div className="mb-3">
                <strong>Status:</strong>
                <div className="mt-1">
                  {task.isClosed ? (
                    <Badge bg="secondary">Closed</Badge>
                  ) : (
                    <Badge bg="success">Open</Badge>
                  )}
                </div>
              </div>

              <Button
                as={Link}
                to={`/tasks/${task.id}`}
                variant="outline-primary"
                className="w-100"
              >
                View Task Details
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default SubmissionDetail
