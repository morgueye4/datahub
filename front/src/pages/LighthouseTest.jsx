import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import LighthouseUpload from '../../components/LighthouseUpload.jsx';

const LighthouseTest = () => {
  return (
    <Container>
      <h1 className="mb-4">Lighthouse Integration Test</h1>

      <Alert variant="info" className="mb-4">
        <Alert.Heading>About Lighthouse Storage</Alert.Heading>
        <p>
          Lighthouse is a permanent storage protocol that allows users to upload and store files on IPFS and Filecoin with
          built-in encryption and access control features.
        </p>
        <hr />
        <p className="mb-0">
          This page demonstrates how to use Lighthouse for encrypted and unencrypted file storage in our DataDAO platform.
        </p>
      </Alert>

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Upload Files to IPFS/Filecoin</Card.Title>
              <Card.Text>
                Upload files with or without encryption. For encrypted files, you can set access conditions to control who can decrypt them.
              </Card.Text>
              <LighthouseUpload />
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Key Features</Card.Title>
              <ul className="list-unstyled">
                <li>✅ Permanent storage on Filecoin</li>
                <li>✅ Encryption with Kavach</li>
                <li>✅ Programmable access control</li>
                <li>✅ Token-gated access</li>
                <li>✅ Time-based access controls</li>
                <li>✅ Share and revoke access</li>
              </ul>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title>Access Control Examples</Card.Title>
              <Card.Text>You can restrict access based on:</Card.Text>
              <ul>
                <li>Token ownership (ERC20, ERC721)</li>
                <li>DAO membership</li>
                <li>Specific wallet addresses</li>
                <li>Time-based restrictions</li>
                <li>Multiple conditions (AND/OR)</li>
              </ul>
              <a
                href="https://docs.lighthouse.storage/lighthouse-1/how-to/encryption-features/access-control-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-primary"
              >
                Learn More
              </a>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LighthouseTest;
