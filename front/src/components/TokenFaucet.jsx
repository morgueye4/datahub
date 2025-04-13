import { useState } from 'react'
import { Button, Alert, Spinner, Card } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'
import { useProvider } from '../hooks/useProvider'

const TokenFaucet = () => {
  const { user } = useAuth()
  const { contracts } = useWeb3()
  const provider = useProvider()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [txHash, setTxHash] = useState(null)

  const requestTokens = async () => {
    if (!user || !user.walletAddress) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setTxHash(null)

      // Check if we have the rewardToken contract
      if (!contracts.rewardToken) {
        throw new Error('Reward token contract not available. Please check your connection.')
      }

      console.log('Requesting tokens for address:', user.walletAddress)

      // Check if the contract has a faucet function
      if (typeof contracts.rewardToken.faucet === 'function') {
        // Get gas price and increase it by 50% to ensure transaction goes through
        const feeData = await provider.getFeeData()
        const gasPrice = feeData.gasPrice.mul(150).div(100)
        console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei')

        // Call the faucet function on the contract
        const tx = await contracts.rewardToken.faucet({
          gasPrice
        })

        console.log('Transaction sent:', tx.hash)
        setTxHash(tx.hash)

        // Wait for the transaction to be mined
        const receipt = await tx.wait()

        console.log('Transaction mined:', receipt)

        // Check if the transaction was successful
        if (receipt.status === 1) {
          setSuccess('100 dataFIL tokens have been sent to your wallet!')
        } else {
          throw new Error('Transaction failed')
        }
      } else {
        // If there's no faucet function, try to use the mint function if available
        if (typeof contracts.rewardToken.mint === 'function') {
          // Get gas price and increase it by 50% to ensure transaction goes through
          const feeData = await provider.getFeeData()
          const gasPrice = feeData.gasPrice.mul(150).div(100)

          // Call the mint function on the contract
          const tx = await contracts.rewardToken.mint(
            user.walletAddress,
            ethers.utils.parseEther('100'),
            { gasPrice }
          )

          console.log('Transaction sent:', tx.hash)
          setTxHash(tx.hash)

          // Wait for the transaction to be mined
          const receipt = await tx.wait()

          console.log('Transaction mined:', receipt)

          // Check if the transaction was successful
          if (receipt.status === 1) {
            setSuccess('100 dataFIL tokens have been sent to your wallet!')
          } else {
            throw new Error('Transaction failed')
          }
        } else {
          // If neither function is available, throw an error
          throw new Error('No faucet or mint function available on the token contract')
        }
      }

      // In a real implementation, we would call the API:
      // const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faucet/request`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     address: user.walletAddress
      //   })
      // })
      //
      // const data = await response.json()
      //
      // if (!response.ok) {
      //   throw new Error(data.message || 'Failed to request tokens')
      // }
      //
      // setSuccess(data.message)
      // if (data.data && data.data.txHash) {
      //   setTxHash(data.data.txHash)
      // }
    } catch (err) {
      console.error('Error requesting tokens:', err)
      setError(err.message || 'Failed to request tokens')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h4 className="mb-0">dataFIL Token Faucet</h4>
      </Card.Header>
      <Card.Body>
        <p>
          Need dataFIL tokens to participate in governance? Request some from our faucet!
        </p>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-3">
            {success}
            {txHash && (
              <div className="mt-2">
                <strong>Transaction: </strong>
                <a
                  href={`https://calibration.filfox.info/en/message/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-break"
                >
                  {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                </a>
              </div>
            )}
          </Alert>
        )}

        <Button
          variant="primary"
          onClick={requestTokens}
          disabled={loading || !user}
          className="w-100"
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Requesting Tokens...
            </>
          ) : (
            'Request 100 dataFIL Tokens'
          )}
        </Button>

        <div className="mt-3 text-muted small">
          <p className="mb-1">
            <strong>Note:</strong> This faucet is for testing purposes only. Tokens have no real value.
          </p>
          <p className="mb-0">
            You can request tokens up to 3 times per day with a cooldown period between requests.
          </p>
        </div>
      </Card.Body>
    </Card>
  )
}

export default TokenFaucet
