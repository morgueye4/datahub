import { Navbar, Nav, Container, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const { isAuthenticated, user, connectWallet, disconnectWallet } = useAuth()

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Decentralized Data Labeling</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/tasks">Tasks</Nav.Link>
            <Nav.Link as={Link} to="/submissions">Submissions</Nav.Link>
            <Nav.Link as={Link} to="/dao">DAO</Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/create-task">Create Task</Nav.Link>
                <Nav.Link as={Link} to="/rewards">Rewards</Nav.Link>
                <Nav.Link as={Link} to="/token">Tokens</Nav.Link>
                <Nav.Link as={Link} to="/test-task-creation">Test Task Creation</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <div className="d-flex align-items-center">
                <span className="me-2 wallet-address">{user?.walletAddress?.substring(0, 6)}...{user?.walletAddress?.substring(38)}</span>
                <Button variant="outline-danger" size="sm" onClick={disconnectWallet}>Disconnect</Button>
              </div>
            ) : (
              <Button variant="primary" onClick={connectWallet}>Connect Wallet</Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation
