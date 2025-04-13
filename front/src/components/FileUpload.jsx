import { useState } from 'react'
import { Form, Button, ProgressBar, Alert, Spinner } from 'react-bootstrap'
import lighthouseService from '../services/lighthouseService'

const FileUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [cid, setCid] = useState(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    try {
      setUploading(true)
      setProgress(0)
      setError(null)

      // Progress callback
      const progressCallback = (progressData) => {
        const percentageDone = (progressData.total / progressData.uploaded) * 100
        setProgress(percentageDone)
      }

      // Upload file to Lighthouse
      const response = await lighthouseService.uploadFile(file, progressCallback)
      
      if (response && response.data && response.data.Hash) {
        const fileCid = response.data.Hash
        setCid(fileCid)
        
        // Call the parent component's callback with the CID
        if (onUploadComplete) {
          onUploadComplete(fileCid, file)
        }
      } else {
        throw new Error('Failed to get CID from upload response')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Control 
          type="file" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Form.Text className="text-muted">
          Select a file to upload to Filecoin via Lighthouse
        </Form.Text>
      </Form.Group>

      {file && !cid && !uploading && (
        <div className="mb-3">
          <Button 
            variant="primary" 
            onClick={handleUpload}
            disabled={uploading}
          >
            Upload File
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mb-3">
          <ProgressBar 
            now={progress} 
            label={`${Math.round(progress)}%`} 
            animated 
            className="mb-2"
          />
          <div className="d-flex align-items-center">
            <Spinner animation="border" size="sm" className="me-2" />
            <span>Uploading to Filecoin via Lighthouse...</span>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {cid && (
        <Alert variant="success" className="mb-3">
          <Alert.Heading>File Uploaded Successfully!</Alert.Heading>
          <p className="mb-0">
            CID: <strong>{cid}</strong>
          </p>
          <p className="mt-2 mb-0">
            <a 
              href={lighthouseService.getLighthouseUrl(cid)} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View File
            </a>
          </p>
        </Alert>
      )}
    </div>
  )
}

export default FileUpload
