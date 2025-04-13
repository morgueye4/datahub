import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button, Spinner } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, truncateAddress } from '../utils/formatting'
import cidUtils from '../utils/cidUtils'
import { submissionsAPI } from '../services/api'

const SubmissionList = ({ taskId }) => {
  const { contracts } = useWeb3()
  const { user } = useAuth()

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!taskId) {
        console.log('Task ID is undefined');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching submissions for task ID:', taskId);

        // First, get submissions from our backend
        const response = await submissionsAPI.getSubmissionsForTask(taskId);
        console.log('Backend submissions response:', response);

        const backendSubmissions = response.success ? response.data : [];
        console.log('Backend submissions:', backendSubmissions);

        if (!backendSubmissions || backendSubmissions.length === 0) {
          console.log('No submissions found in backend');
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // For now, let's just use the backend data directly
        // This avoids issues with blockchain connectivity
        const processedSubmissions = backendSubmissions.map(submission => {
          // Add default values for any missing fields
          return {
            ...submission,
            reviewCount: submission.reviewCount || 0,
            isApproved: submission.isApproved,
            createdAt: submission.createdAt ? new Date(submission.createdAt) : new Date(),
            // Parse metadata if it exists
            metadata: submission.metadata ? (
              typeof submission.metadata === 'string' ? (
                // Try to parse as JSON, but handle non-JSON strings
                (() => {
                  try {
                    return JSON.parse(submission.metadata);
                  } catch (e) {
                    console.log('Failed to parse metadata as JSON:', e);
                    return { text: submission.metadata }; // Treat as plain text
                  }
                })()
              ) : submission.metadata
            ) : {}
          };
        });

        setSubmissions(processedSubmissions);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Failed to load submissions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [contracts.submissionManager, taskId]);

  if (!taskId) {
    return (
      <div className="alert alert-warning" role="alert">
        Task ID is required to load submissions.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No submissions found for this task.
      </div>
    );
  }

  return (
    <div className="submission-list">
      <h3 className="mb-3">Submissions ({submissions.length})</h3>

      {submissions.map(submission => (
        <Card key={submission.id} className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <Card.Title>
                  Submission #{submission.id}
                  {submission.isApproved && (
                    <Badge bg="success" className="ms-2">Approved</Badge>
                  )}
                  {submission.isApproved === false && (
                    <Badge bg="danger" className="ms-2">Rejected</Badge>
                  )}
                  {submission.isApproved === null && (
                    <Badge bg="warning" text="dark" className="ms-2">Pending Review</Badge>
                  )}
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  By {(() => {
                    const submitterAddress = submission.submitter || submission.submitterAddress;
                    if (!submitterAddress) return 'Unknown Submitter';
                    return submitterAddress === user?.walletAddress ? 'You' : truncateAddress(submitterAddress);
                  })()}
                  {' • '}
                  {formatDate(submission.createdAt)}
                </Card.Subtitle>
              </div>
              <div>
                <Badge bg="info" className="me-2">
                  {submission.reviewCount} {submission.reviewCount === 1 ? 'Review' : 'Reviews'}
                </Badge>
              </div>
            </div>

            <Card.Text className="mt-3">
              {submission.metadata ? (
                // Try to parse metadata JSON to get content
                (() => {
                  try {
                    // If metadata is already an object, use it directly
                    if (typeof submission.metadata === 'object' && submission.metadata !== null) {
                      if (submission.metadata.text) {
                        const text = submission.metadata.text;
                        return text.length > 100 ? `${text.substring(0, 100)}...` : text;
                      } else if (submission.metadata.content) {
                        const content = submission.metadata.content;
                        return content.length > 100 ? `${content.substring(0, 100)}...` : content;
                      } else {
                        const json = JSON.stringify(submission.metadata);
                        return json.length > 100 ? `${json.substring(0, 100)}...` : json;
                      }
                    }

                    // If metadata is a string, try to parse it as JSON
                    if (typeof submission.metadata === 'string') {
                      try {
                        const parsedMetadata = JSON.parse(submission.metadata);
                        if (parsedMetadata.content) {
                          const content = parsedMetadata.content;
                          return content.length > 100 ? `${content.substring(0, 100)}...` : content;
                        } else {
                          const json = JSON.stringify(parsedMetadata);
                          return json.length > 100 ? `${json.substring(0, 100)}...` : json;
                        }
                      } catch (parseError) {
                        // If it's not valid JSON, just return the string
                        const text = submission.metadata;
                        return text.length > 100 ? `${text.substring(0, 100)}...` : text;
                      }
                    }

                    return 'No content available';
                  } catch (e) {
                    console.error('Error handling metadata:', e);
                    return typeof submission.metadata === 'string' ?
                      (submission.metadata.length > 100 ?
                        `${submission.metadata.substring(0, 100)}...` : submission.metadata) :
                      'No content available';
                  }
                })()
              ) : 'No submission data available'}
            </Card.Text>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <small className="text-muted">
                  CID: {submission.submissionCid ? truncateAddress(submission.submissionCid) : 'N/A'}
                </small>
              </div>
              <div>
                <Button
                  as={Link}
                  to={`/submissions/${submission.id}`}
                  variant="outline-primary"
                  size="sm"
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  )
}

export default SubmissionList
