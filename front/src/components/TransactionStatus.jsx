import { Alert, Spinner } from 'react-bootstrap'

const TransactionStatus = ({ status, className = '' }) => {
  if (!status) return null

  const { pending, success, error, txHash } = status

  const getExplorerUrl = (hash) => {
    const explorerUrl = import.meta.env.VITE_NETWORK_EXPLORER_URL || 'https://calibration.filfox.info'
    return `${explorerUrl}/tx/${hash}`
  }

  if (pending) {
    return (
      <Alert variant="info" className={className}>
        <div className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Transaction pending. Please wait...</span>
        </div>
        <p className="mt-2 mb-0 small">
          <strong>Note:</strong> You need to approve the transaction in your MetaMask wallet.
          If you don't see the MetaMask popup, click the MetaMask icon in your browser extensions.
        </p>
      </Alert>
    )
  }

  if (success) {
    return (
      <Alert variant="success" className={className}>
        <Alert.Heading>Transaction Successful!</Alert.Heading>
        {txHash && (
          <p>
            Transaction Hash:{' '}
            <a
              href={getExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-break"
            >
              {txHash}
            </a>
          </p>
        )}
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className={className}>
        <Alert.Heading>Transaction Failed</Alert.Heading>
        <p>{error}</p>
      </Alert>
    )
  }

  return null
}

export default TransactionStatus
