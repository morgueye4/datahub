import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tasksAPI } from '../services/api'
import { formatDate } from '../utils/dateUtils'

const Tasks = () => {
  const { isAuthenticated } = useAuth()

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'open', 'closed'

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Fetching tasks in Tasks.jsx...')
        const response = await tasksAPI.getAllTasks()
        console.log('Response from tasksAPI.getAllTasks:', response)

        if (response.success) {
          console.log('Setting tasks:', response.data || [])
          setTasks(response.data || [])
        } else {
          console.warn('Task fetch was not successful:', response.message)
          setError(response.message || 'Failed to load tasks')
          // Still set tasks to empty array or response.data if it exists
          setTasks(response.data || [])
        }
      } catch (err) {
        console.error('Error fetching tasks:', err)
        setError(err.message || 'Failed to load tasks. Please try again later.')
        setTasks([])
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Filter tasks based on status
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    if (filter === 'open') return task.status === 'open'
    if (filter === 'closed') return task.status === 'closed'
    return true
  })

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

  if (!isAuthenticated) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          Please connect your wallet to view tasks.
        </Alert>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Tasks</h1>
        <Link to="/create-task">
          <Button variant="primary">Create Task</Button>
        </Link>
      </div>

      <Form.Select
        className="mb-4"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="all">All Tasks</option>
        <option value="open">Open Tasks</option>
        <option value="closed">Closed Tasks</option>
      </Form.Select>

      {filteredTasks.length === 0 ? (
        <Alert variant="info">
          No tasks found.
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {filteredTasks.map(task => (
            <Col key={task.id}>
              <Card>
                <Card.Body>
                  <Card.Title className="d-flex justify-content-between align-items-start">
                    {task.title}
                    {getStatusBadge(task.status)}
                  </Card.Title>
                  <Card.Text className="text-muted">
                    {formatDate(task.deadline)}
                  </Card.Text>
                  <Card.Text>
                    {task.description.length > 100
                      ? `${task.description.substring(0, 100)}...`
                      : task.description}
                  </Card.Text>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-primary">
                      Reward: {task.reward} tokens
                    </span>
                    <Link to={`/tasks/${task.id}`}>
                      <Button variant="outline-primary" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  )
}

export default Tasks
