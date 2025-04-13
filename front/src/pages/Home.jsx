import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { isAuthenticated, connectWallet } = useAuth()

  return (
    <Container>
      <Row className="my-5">
        <Col md={8} className="mx-auto text-center">
          <h1>Decentralized Data Labeling Platform</h1>
          <p className="lead">
            Create, submit, and review data labeling tasks using blockchain technology and decentralized storage.
          </p>

          {!isAuthenticated ? (
            <Button
              variant="primary"
              size="lg"
              onClick={connectWallet}
              className="mt-3"
            >
              Connect Wallet to Get Started
            </Button>
          ) : (
            <Button
              as={Link}
              to="/tasks"
              variant="success"
              size="lg"
              className="mt-3"
            >
              Browse Available Tasks
            </Button>
          )}
        </Col>
      </Row>

      <Row className="mt-5">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Create Tasks</Card.Title>
              <Card.Text>
                Define data labeling tasks, set rewards, and specify requirements for submissions.
              </Card.Text>
              <Button as={Link} to="/create-task" variant="outline-primary" disabled={!isAuthenticated}>
                Create a Task
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Submit Work</Card.Title>
              <Card.Text>
                Browse available tasks, submit your work, and earn rewards for approved submissions.
              </Card.Text>
              <Button as={Link} to="/tasks" variant="outline-primary">
                Find Tasks
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Review Submissions</Card.Title>
              <Card.Text>
                Review submissions from other users, provide feedback, and help maintain quality.
              </Card.Text>
              <Button as={Link} to="/tasks" variant="outline-primary">
                Review Tasks
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
