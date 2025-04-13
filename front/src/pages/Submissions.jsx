import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Form, InputGroup } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, truncateAddress } from '../utils/formatting'
import cidUtils from '../utils/cidUtils'
import StarRating from '../components/StarRating'

const Submissions = () => {
  const { contracts } = useWeb3()
  const { isAuthenticated, user } = useAuth()

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, mine, pending, approved, rejected
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch submissions from backend API
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/submissions`)

        if (!response.ok) {
          throw new Error(`Failed to fetch submissions: ${response.statusText}`)
        }

        const result = await response.json()
        console.log('Submissions from API:', result)

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch submissions')
        }

        // Process submissions
        const processedSubmissions = result.data.map(submission => {
          return {
            id: submission.id,
            taskId: submission.taskId,
            taskTitle: `Task #${submission.taskId}`,
            submitter: submission.submitterAddress,
            submissionCid: submission.submissionCid,
            isApproved: submission.isApproved || false,
            reviewCount: submission.reviewCount || 0,
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
          }
        })

        setSubmissions(processedSubmissions)
      } catch (err) {
        console.error('Error fetching submissions:', err)
        setError('Failed to load submissions. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
  }, [])

  // Filter submissions based on current filter and search term
  const filteredSubmissions = submissions.filter(submission => {
    // Apply filter
    if (filter === 'mine' && submission.submitter !== user?.walletAddress) {
      return false
    }
    if (filter === 'pending' && submission.isApproved !== null) {
      return false
    }
    if (filter === 'approved' && submission.isApproved !== true) {
      return false
    }
    if (filter === 'rejected' && submission.isApproved !== false) {
      return false
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        submission.taskTitle.toLowerCase().includes(searchLower) ||
        submission.submissionCid.toLowerCase().includes(searchLower) ||
        submission.submitter.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  const handleFilterChange = (e) => {
    setFilter(e.target.value)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-3">Loading submissions...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Submissions</h1>

      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Filter Submissions</Form.Label>
            <Form.Select value={filter} onChange={handleFilterChange}>
              <option value="all">All Submissions</option>
              {isAuthenticated && <option value="mine">My Submissions</option>}
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Search</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search by task title, content, or address"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>

      {filteredSubmissions.length === 0 ? (
        <Alert variant="info">
          No submissions found matching your criteria.
        </Alert>
      ) : (
        <>
          <p className="mb-4">Showing {filteredSubmissions.length} submissions</p>

          {filteredSubmissions.map(submission => (
            <Card key={submission.id} className="mb-4">
              <Card.Body>
                <Row>
                  <Col md={9}>
                    <div className="d-flex justify-content-between">
                      <div>
                        <h5 className="mb-1">
                          <Link to={`/submissions/${submission.id}`}>
                            Submission #{submission.id}
                          </Link>
                          {submission.isApproved === true && (
                            <Badge bg="success" className="ms-2">Approved</Badge>
                          )}
                          {submission.isApproved === false && submission.reviewCount > 0 && (
                            <Badge bg="danger" className="ms-2">Rejected</Badge>
                          )}
                          {(submission.isApproved === null || (submission.isApproved === false && submission.reviewCount === 0)) && (
                            <Badge bg="warning" text="dark" className="ms-2">Pending Review</Badge>
                          )}
                        </h5>
                        <p className="text-muted mb-2">
                          For task: <Link to={`/tasks/${submission.taskId}`}>{submission.taskTitle}</Link>
                        </p>
                        <p className="text-muted mb-3">
                          Submitted by {submission.submitter === user?.walletAddress ? 'You' : truncateAddress(submission.submitter)}
                          {' • '}
                          {formatDate(submission.createdAt)}
                        </p>
                      </div>
                      <div>
                        <Badge bg="info">
                          {submission.reviewCount} {submission.reviewCount === 1 ? 'Review' : 'Reviews'}
                        </Badge>
                      </div>
                    </div>

                    {submission.submissionCid && (
                      <p className="mb-2">
                        <small className="text-muted">
                          Submission CID: {truncateAddress(submission.submissionCid)}
                        </small>
                      </p>
                    )}
                  </Col>
                  <Col md={3} className="d-flex flex-column justify-content-center align-items-end">
                    <Button
                      as={Link}
                      to={`/submissions/${submission.id}`}
                      variant="outline-primary"
                      className="mb-2 w-100"
                    >
                      View Details
                    </Button>

                    {isAuthenticated && user?.walletAddress !== submission.submitter &&
                     submission.isApproved === null && (
                      <Button
                        as={Link}
                        to={`/submissions/${submission.id}`}
                        variant="outline-success"
                        className="w-100"
                      >
                        Review
                      </Button>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
        </>
      )}
    </Container>
  )
}

export default Submissions
