import React, { useState } from 'react';
import { Button, Modal, ListGroup } from 'react-bootstrap';

const CidHelper = () => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button variant="link" className="p-0 text-decoration-none" onClick={handleShow}>
        How to get a CID?
      </Button>

      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>How to Get a CID for Your File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            A CID (Content Identifier) is a unique identifier for your file on IPFS/Filecoin. 
            Here's how you can get a CID for your file:
          </p>
          
          <h5>Option 1: Use Lighthouse Storage (Recommended)</h5>
          <ListGroup className="mb-3">
            <ListGroup.Item>1. Go to <a href="https://files.lighthouse.storage/" target="_blank" rel="noopener noreferrer">Lighthouse Files</a></ListGroup.Item>
            <ListGroup.Item>2. Connect your wallet</ListGroup.Item>
            <ListGroup.Item>3. Click "Upload" and select your file</ListGroup.Item>
            <ListGroup.Item>4. After the upload completes, click on your file</ListGroup.Item>
            <ListGroup.Item>5. Copy the CID (it looks like "bafkreiglmcsn3qruzigzbuaw6qbq7vznum2msntjzaxyhkj25obqgsylmq")</ListGroup.Item>
          </ListGroup>
          
          <h5>Option 2: Use web3.storage</h5>
          <ListGroup className="mb-3">
            <ListGroup.Item>1. Go to <a href="https://web3.storage/" target="_blank" rel="noopener noreferrer">web3.storage</a></ListGroup.Item>
            <ListGroup.Item>2. Create an account or sign in</ListGroup.Item>
            <ListGroup.Item>3. Click "Upload" and select your file</ListGroup.Item>
            <ListGroup.Item>4. After the upload completes, copy the CID</ListGroup.Item>
          </ListGroup>
          
          <h5>Option 3: Use IPFS Desktop</h5>
          <ListGroup className="mb-3">
            <ListGroup.Item>1. Download and install <a href="https://docs.ipfs.tech/install/ipfs-desktop/" target="_blank" rel="noopener noreferrer">IPFS Desktop</a></ListGroup.Item>
            <ListGroup.Item>2. Add your file to IPFS</ListGroup.Item>
            <ListGroup.Item>3. Copy the CID from the file details</ListGroup.Item>
          </ListGroup>
          
          <div className="alert alert-info">
            <strong>Note:</strong> The CID should look something like "bafkreiglmcsn3qruzigzbuaw6qbq7vznum2msntjzaxyhkj25obqgsylmq" or "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx".
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CidHelper;
