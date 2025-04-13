import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const DAOAbout = () => {
  return (
    <Container className="py-4">
      <h1 className="mb-4">About DataDAO</h1>
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h2 className="mb-3">What is DataDAO?</h2>
              <p>
                DataDAO is a decentralized autonomous organization (DAO) focused on curating and monetizing high-quality data for AI training. 
                It leverages blockchain technology and decentralized storage on Filecoin to create a transparent and fair ecosystem for data 
                contributors, reviewers, and consumers.
              </p>
              <p>
                Our mission is to build a community-governed platform that incentivizes the creation and curation of valuable datasets 
                while ensuring fair compensation for contributors and maintaining high data quality standards.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h3 className="mb-3">How It Works</h3>
              <ol>
                <li className="mb-2">
                  <strong>Task Creation:</strong> Members can create data collection or labeling tasks with specific requirements and rewards.
                </li>
                <li className="mb-2">
                  <strong>Submissions:</strong> Contributors submit their work, which is stored on Filecoin via Lighthouse.
                </li>
                <li className="mb-2">
                  <strong>Review Process:</strong> Nominated reviewers evaluate submissions based on quality and adherence to requirements.
                </li>
                <li className="mb-2">
                  <strong>Reward Distribution:</strong> Approved submissions receive DATA tokens as rewards.
                </li>
                <li className="mb-2">
                  <strong>Data Monetization:</strong> High-quality datasets can be monetized through the DAO, with proceeds distributed to contributors.
                </li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h3 className="mb-3">Governance</h3>
              <p>
                DataDAO is governed by its members through a proposal and voting system. Members with DATA tokens can:
              </p>
              <ul>
                <li className="mb-2">
                  <strong>Create Proposals:</strong> Suggest changes to the DAO's parameters, treasury allocations, or new initiatives.
                </li>
                <li className="mb-2">
                  <strong>Vote on Proposals:</strong> Cast votes based on their token holdings, with one token equaling one vote.
                </li>
                <li className="mb-2">
                  <strong>Execute Decisions:</strong> Once approved, proposals are automatically executed through smart contracts.
                </li>
              </ul>
              <p>
                This ensures that the DAO operates transparently and democratically, with decisions reflecting the collective will of its members.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h3 className="mb-3">DATA Token</h3>
              <p>
                The DATA token is the native governance token of the DataDAO ecosystem. It serves multiple purposes:
              </p>
              <Row>
                <Col md={6}>
                  <ul>
                    <li className="mb-2">
                      <strong>Governance:</strong> Holders can create and vote on proposals proportional to their holdings.
                    </li>
                    <li className="mb-2">
                      <strong>Rewards:</strong> Contributors receive DATA tokens for approved submissions.
                    </li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul>
                    <li className="mb-2">
                      <strong>Access:</strong> Tokens may be required to access premium datasets or features.
                    </li>
                    <li className="mb-2">
                      <strong>Staking:</strong> Members can stake tokens to earn additional benefits or rewards.
                    </li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h3 className="mb-3">Technical Architecture</h3>
              <p>
                DataDAO is built on a stack of decentralized technologies:
              </p>
              <ul>
                <li className="mb-2">
                  <strong>Smart Contracts:</strong> Ethereum-compatible contracts deployed on Filecoin's FEVM for governance, task management, and rewards.
                </li>
                <li className="mb-2">
                  <strong>Decentralized Storage:</strong> Data is stored on Filecoin through Lighthouse, ensuring permanence and accessibility.
                </li>
                <li className="mb-2">
                  <strong>Frontend:</strong> A React-based dApp that interacts with the blockchain and provides a user-friendly interface.
                </li>
                <li className="mb-2">
                  <strong>Backend:</strong> A Node.js server that handles off-chain operations and integrates with Lighthouse for storage.
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <div className="text-center mb-4">
        <Button as={Link} to="/dao" variant="primary" size="lg" className="me-3">
          Go to DAO Dashboard
        </Button>
        <Button as={Link} to="/tasks" variant="outline-primary" size="lg">
          Browse Tasks
        </Button>
      </div>
    </Container>
  )
}

export default DAOAbout
