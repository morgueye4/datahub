import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Alert, Button, Spinner, Form } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'
import { useProvider } from '../hooks/useProvider'

const TokenPage = () => {
  const { isAuthenticated, user } = useAuth()
  const { contracts } = useWeb3()
  const provider = useProvider()
  const [tokenBalance, setTokenBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [txHash, setTxHash] = useState(null)
  const [faucetStatus, setFaucetStatus] = useState(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('100')
  const [isOwner, setIsOwner] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Function to fetch token balance
  const fetchTokenBalance = async () => {
    if (isAuthenticated && user?.walletAddress && contracts?.rewardToken) {
      try {
        setBalanceLoading(true);

        // Get token balance directly from provider for most up-to-date data
        const provider = contracts.rewardToken.provider;
        const tokenContract = new ethers.Contract(
          contracts.rewardToken.address,
          [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
          ],
          provider
        );

        // Force provider to get fresh data from network
        await provider.getBlockNumber(); // This refreshes the provider's cache

        const balance = await tokenContract.balanceOf(user.walletAddress);
        console.log('Fetched token balance:', ethers.utils.formatEther(balance));
        setTokenBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error('Error fetching token balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    }
  };

  // Fetch token balance, check if user is owner, and get faucet status
  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated && user?.walletAddress && contracts?.rewardToken) {
        try {
          // Fetch token balance
          await fetchTokenBalance();

          // Check if user is owner
          const owner = await contracts.rewardToken.owner()
          setIsOwner(owner.toLowerCase() === user.walletAddress.toLowerCase())

          // Fetch faucet status from backend
          try {
            const response = await fetch(`${window.location.origin.replace('5173', '8000')}/faucet/status`)
            const data = await response.json()
            if (data.success) {
              setFaucetStatus(data.data)

              // If we got faucet data, also check the token address
              if (data.data.tokenAddress &&
                  contracts.rewardToken.address.toLowerCase() !== data.data.tokenAddress.toLowerCase()) {
                console.warn('Token address mismatch!', {
                  frontend: contracts.rewardToken.address,
                  backend: data.data.tokenAddress
                });
              }
            }
          } catch (faucetError) {
            console.error('Error fetching faucet status:', faucetError)
          }
        } catch (error) {
          console.error('Error fetching token data:', error)
        }
      }
    }

    fetchData()

    // Set up an interval to refresh the data every 5 seconds
    const intervalId = setInterval(fetchData, 5000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, user, contracts])

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

      console.log('Requesting tokens for address:', user.walletAddress)
      console.log('Using token contract at address:', contracts.rewardToken.address)

      // Skip backend faucet and use direct contract interaction
      if (!contracts.rewardToken) {
        throw new Error('Reward token contract not available. Please check your connection.')
      }

      // Check if the contract has the mint function
      const hasMint = typeof contracts.rewardToken.mint === 'function'
      if (!hasMint) {
        throw new Error('Mint function not available on token contract.')
      }

      console.log('Attempting to mint tokens directly...')

      // Try to mint tokens directly without gas parameters
      try {
        const tx = await contracts.rewardToken.mint(
          user.walletAddress,
          ethers.utils.parseEther('100')
        )

        console.log('Transaction sent:', tx.hash)
        setTxHash(tx.hash)

        // Wait for the transaction to be mined
        const receipt = await tx.wait()

        if (receipt.status === 1) {
          setSuccess('100 dataFIL tokens have been sent to your wallet!')

          // Refresh token balance immediately and then again after a delay
          setTimeout(fetchTokenBalance, 1000);
          setTimeout(fetchTokenBalance, 3000);
          setTimeout(fetchTokenBalance, 6000);
        } else {
          throw new Error('Transaction failed')
        }
      } catch (mintError) {
        console.error('Error minting tokens directly:', mintError)

        // Try with minimal gas parameters
        try {
          console.log('Trying with minimal gas parameters...')

          // Get gas price
          const gasPrice = await provider.getGasPrice()

          const tx = await contracts.rewardToken.mint(
            user.walletAddress,
            ethers.utils.parseEther('100'),
            { gasLimit: 100000 }
          )

          console.log('Transaction sent with gas limit:', tx.hash)
          setTxHash(tx.hash)

          // Wait for the transaction to be mined
          const receipt = await tx.wait()

          if (receipt.status === 1) {
            setSuccess('100 dataFIL tokens have been sent to your wallet!')

            // Refresh token balance immediately and then again after a delay
            setTimeout(fetchTokenBalance, 1000);
            setTimeout(fetchTokenBalance, 3000);
            setTimeout(fetchTokenBalance, 6000);
          } else {
            throw new Error('Transaction failed')
          }
        } catch (gasError) {
          console.error('Error minting with gas parameters:', gasError)
          throw gasError
        }
      }
    } catch (err) {
      console.error('Error requesting tokens:', err)

      // Extract more detailed error information
      let errorMessage = err.message || 'Failed to request tokens'

      if (errorMessage.includes('daily limit')) {
        errorMessage = `${errorMessage} Try again tomorrow.`
      } else if (errorMessage.includes('wait')) {
        errorMessage = `Rate limited: ${errorMessage}`
      } else if (errorMessage.includes('Faucet is not configured')) {
        errorMessage = 'The token faucet is not currently available. Please contact the administrator.'
      } else if (errorMessage.includes('caller is not the owner')) {
        errorMessage = 'Only the contract owner can mint tokens. Please contact the administrator.'
      } else if (errorMessage.includes('user denied transaction')) {
        errorMessage = 'Transaction was rejected in your wallet.'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const mintTokensForAddress = async () => {
    if (!isOwner) {
      setError('Only the contract owner can mint tokens for other addresses')
      return
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      setError('Please enter a valid Ethereum address')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setTxHash(null)

      // Get gas price and increase it by 50% to ensure transaction goes through
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice.mul(150).div(100)

      // Call the mint function on the contract
      const tx = await contracts.rewardToken.mint(
        recipientAddress,
        ethers.utils.parseEther(amount),
        { gasPrice }
      )

      console.log('Transaction sent:', tx.hash)
      setTxHash(tx.hash)

      // Wait for the transaction to be mined
      const receipt = await tx.wait()

      // Check if the transaction was successful
      if (receipt.status === 1) {
        setSuccess(`${amount} dataFIL tokens have been sent to ${recipientAddress}!`)
      } else {
        throw new Error('Transaction failed')
      }
    } catch (err) {
      console.error('Error minting tokens:', err)
      setError(err.message || 'Failed to mint tokens')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Please connect your wallet to view your token balance and request tokens.
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">dataFIL Token Management</h1>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Your Token Balance</h4>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="me-2">
                  <img src="/dataFIL-icon.png" alt="dataFIL" width="32" height="32" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-0">{tokenBalance} <span className="text-muted">dataFIL</span></h3>
                </div>
                <div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={fetchTokenBalance}
                    title="Refresh balance"
                    disabled={balanceLoading}
                  >
                    {balanceLoading ? (
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                    ) : (
                      <span role="img" aria-label="refresh">🔄</span>
                    )}
                  </Button>
                </div>
              </div>

              {parseFloat(tokenBalance) < 20 && (
                <Alert variant="warning" className="mb-3">
                  <Alert.Heading>Low Token Balance</Alert.Heading>
                  <p>
                    You need dataFIL tokens to create tasks and pay rewards. Your current balance may not be sufficient.
                  </p>
                </Alert>
              )}

              {parseFloat(tokenBalance) === 0 && (
                <Alert variant="info" className="mb-3">
                  <Alert.Heading>How to Get Tokens</Alert.Heading>
                  <p>
                    You currently have no tokens. Here are ways to get tokens:
                  </p>
                  <ol className="mb-0">
                    <li>Use the token faucet below (if available)</li>
                    <li>Contact the platform administrator</li>
                    <li>If you're developing locally, deploy your own token contract</li>
                  </ol>
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">dataFIL Token Faucet</h4>
            </Card.Header>
            <Card.Body>
              <p>
                Need dataFIL tokens to participate in the platform? Request some from our faucet!
              </p>

              {faucetStatus ? (
                <Alert variant={faucetStatus.isConfigured ? "info" : "warning"} className="mb-3">
                  <p className="mb-1">
                    <strong>Faucet Status:</strong> {faucetStatus.isConfigured ? 'Online' : 'Offline'}
                  </p>
                  {faucetStatus.isConfigured ? (
                    <>
                      <p className="mb-1">
                        <strong>Tokens per Request:</strong> {faucetStatus.tokensPerRequest} dataFIL
                      </p>
                      {faucetStatus.testMode ? (
                        <p className="mb-0">
                          <strong>Test Mode:</strong> No request limits (cooldown disabled)
                        </p>
                      ) : (
                        <p className="mb-0">
                          <strong>Requests Limit:</strong> {faucetStatus.maxRequestsPerDay} per day with a {faucetStatus.cooldownPeriod} hour cooldown
                        </p>
                      )}
                      {faucetStatus.isOwner && (
                        <p className="mb-0 text-success">
                          <strong>Owner Status:</strong> Faucet wallet is the contract owner (can mint tokens)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mb-0">
                      The backend faucet is not configured. The system will try to use direct contract interaction as a fallback.
                    </p>
                  )}
                </Alert>
              ) : (
                <Alert variant="info" className="mb-3">
                  <p className="mb-0">
                    Checking faucet status...
                  </p>
                </Alert>
              )}

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
                  faucetStatus && !faucetStatus.isConfigured && isOwner
                    ? 'Mint 100 dataFIL Tokens (Owner)'
                    : 'Request 100 dataFIL Tokens'
                )}
              </Button>

              <div className="mt-3 text-muted small">
                <p className="mb-1">
                  <strong>Note:</strong> This faucet is for testing purposes only. Tokens have no real value.
                </p>
                <p className="mb-1">
                  You can request tokens up to 3 times per day with a cooldown period between requests.
                </p>
                <p className="mb-0">
                  <strong>Transaction times:</strong> It may take 15-30 seconds for tokens to appear in your balance after a successful transaction. Use the refresh button to check your updated balance.
                </p>
              </div>
            </Card.Body>
          </Card>


        </Col>

        {isOwner && (
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>
                <h4 className="mb-0">Admin Functions</h4>
              </Card.Header>
              <Card.Body>
                <Alert variant="info" className="mb-3">
                  <Alert.Heading>Contract Owner Access</Alert.Heading>
                  <p>
                    You are the owner of the RewardToken contract. You can mint tokens for any address.
                  </p>
                </Alert>

                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Recipient Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="0x..."
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Amount (dataFIL)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                    />
                  </Form.Group>

                  <Button
                    variant="warning"
                    onClick={mintTokensForAddress}
                    disabled={loading || !recipientAddress}
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
                        Minting Tokens...
                      </>
                    ) : (
                      'Mint Tokens'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Header>
                <h4 className="mb-0">Contract Information</h4>
              </Card.Header>
              <Card.Body>
                <p><strong>Token Contract Address:</strong></p>
                <p className="text-break">{contracts?.rewardToken?.address}</p>

                <p className="mt-3"><strong>Your Address (Owner):</strong></p>
                <p className="text-break">{user?.walletAddress}</p>

                <div className="mt-3">
                  <a
                    href={`https://calibration.filfox.info/en/address/${contracts?.rewardToken?.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary"
                  >
                    View Contract on Explorer
                  </a>
                </div>
              </Card.Body>
            </Card>


          </Col>
        )}
      </Row>
    </Container>
  )
}

export default TokenPage
