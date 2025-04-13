import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, ProgressBar } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, truncateAddress } from '../utils/formatting'
import { ethers } from 'ethers'

const ProposalDetail = () => {
  const { proposalId } = useParams()
  const { contracts } = useWeb3()
  const { isAuthenticated, user } = useAuth()

  const [proposal, setProposal] = useState(null)
  const [userVote, setUserVote] = useState(null)
  const [userTokenBalance, setUserTokenBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  useEffect(() => {
    const fetchProposalData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch proposal from backend API
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/proposals/${proposalId}`)

          if (response.ok) {
            const result = await response.json()
            console.log('Proposal from API:', result)

            if (result.success && result.data) {
              // Process dates to ensure they are Date objects
              const processedProposal = {
                ...result.data,
                startTime: new Date(result.data.startTime),
                endTime: new Date(result.data.endTime)
              }

              setProposal(processedProposal)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          console.log('Error fetching proposal from API:', err)
          // Continue with contract data
        }

        // If API fails, try to get data from contracts
        if (contracts.dataDAOGovernance) {
          try {
            // Try to get proposal using proposals mapping instead of getProposal function
            const proposalData = await contracts.dataDAOGovernance.proposals(proposalId)

            // Determine status
            const now = Math.floor(Date.now() / 1000)
            let status = 'Pending'

            if (proposalData.executed) {
              status = 'Executed'
            } else if (proposalData.canceled) {
              status = 'Canceled'
            } else if (proposalData.endTime.toNumber() < now) {
              status = 'Expired'
            } else if (proposalData.startTime.toNumber() <= now && proposalData.endTime.toNumber() > now) {
              status = 'Active'
            }

            // Process proposal data
            const processedProposal = {
              id: parseInt(proposalId),
              title: proposalData.title || `Proposal #${proposalId}`,
              description: proposalData.description || 'No description provided',
              proposer: proposalData.proposer,
              targetContract: proposalData.targetContract,
              functionCall: proposalData.functionSignature || 'Unknown function',
              votingPeriod: proposalData.endTime.toNumber() - proposalData.startTime.toNumber(),
              startTime: new Date(proposalData.startTime.toNumber() * 1000),
              endTime: new Date(proposalData.endTime.toNumber() * 1000),
              forVotes: proposalData.forVotes.toNumber(),
              againstVotes: proposalData.againstVotes.toNumber(),
              executed: proposalData.executed,
              canceled: proposalData.canceled,
              status: status
            }

            setProposal(processedProposal)

            // If user is authenticated, fetch their vote and token balance
            if (isAuthenticated && user) {
              try {
                const hasVoted = await contracts.dataDAOGovernance.hasVoted(proposalId, user.walletAddress)

                if (hasVoted) {
                  const vote = await contracts.dataDAOGovernance.getVote(proposalId, user.walletAddress)
                  setUserVote(vote)
                } else {
                  setUserVote(null)
                }

                // Get user's token balance
                const balance = await contracts.dataToken.balanceOf(user.walletAddress)
                setUserTokenBalance(ethers.utils.formatEther(balance))
              } catch (err) {
                console.error('Error fetching user vote data:', err)
              }
            }

            setLoading(false)
            return
          } catch (err) {
            console.error('Error fetching proposal from contract:', err)
            // Continue to fallback data
          }
        }

        // Fallback to static data if both API and contracts fail
        const now = new Date()
        const fallbackProposal = {
          id: parseInt(proposalId),
          title: `Proposal #${proposalId}`,
          description: 'Proposal details not available',
          proposer: '0x0000000000000000000000000000000000000000',
          targetContract: '0x0000000000000000000000000000000000000000',
          functionCall: 'Unknown function',
          votingPeriod: 7 * 24 * 60 * 60, // 7 days in seconds
          startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
          forVotes: 0,
          againstVotes: 0,
          executed: false,
          canceled: false,
          status: 'Unknown'
        }

        setProposal(fallbackProposal)
      } catch (err) {
        console.error('Error fetching proposal details:', err)
        setError('Failed to load proposal details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProposalData()
  }, [contracts, proposalId, isAuthenticated, user])

  // Helper function to determine proposal status
  const getProposalStatus = (proposal) => {
    const now = Math.floor(Date.now() / 1000)

    if (proposal.canceled) return 'canceled'
    if (proposal.executed) return 'executed'
    if (proposal.endTime.toNumber() < now) {
      return proposal.forVotes.gt(proposal.againstVotes) ? 'succeeded' : 'defeated'
    }
    return 'active'
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="primary">Active</Badge>
      case 'succeeded':
        return <Badge bg="success">Succeeded</Badge>
      case 'defeated':
        return <Badge bg="danger">Defeated</Badge>
      case 'executed':
        return <Badge bg="info">Executed</Badge>
      case 'canceled':
        return <Badge bg="secondary">Canceled</Badge>
      default:
        return <Badge bg="light" text="dark">{status}</Badge>
    }
  }

  // Calculate voting progress
  const calculateProgress = () => {
    if (!proposal) return { forPercentage: 0, againstPercentage: 0 }

    const totalVotes = proposal.forVotes + proposal.againstVotes

    if (totalVotes === 0) {
      return { forPercentage: 0, againstPercentage: 0 }
    }

    const forPercentage = Math.round((proposal.forVotes / totalVotes) * 100)
    const againstPercentage = 100 - forPercentage

    return { forPercentage, againstPercentage }
  }

  // Handle voting
  const handleVote = async (support) => {
    if (!isAuthenticated) {
      setActionError('Please connect your wallet first')
      return
    }

    if (!contracts.dataDAOGovernance) {
      setActionError('DAO Governance contract not initialized')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)

      // Get current gas price and add 50%
      const provider = contracts.dataDAOGovernance.provider
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice.mul(150).div(100)

      console.log('Voting on proposal:', {
        proposalId,
        support
      })

      // Estimate gas
      const gasEstimate = await contracts.dataDAOGovernance.estimateGas.vote(
        proposalId,
        support
      )

      // Cast vote
      const tx = await contracts.dataDAOGovernance.vote(
        proposalId,
        support,
        {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice
        }
      )

      console.log('Transaction sent:', tx.hash)

      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('Transaction mined:', receipt)

      setActionSuccess(`Your vote has been recorded. You voted ${support ? 'For' : 'Against'} the proposal.`)

      // Refresh proposal data
      window.location.reload()
    } catch (err) {
      console.error('Error voting on proposal:', err)
      setActionError(`Failed to vote: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle executing proposal
  const handleExecute = async () => {
    if (!isAuthenticated) {
      setActionError('Please connect your wallet first')
      return
    }

    if (!contracts.dataDAOGovernance) {
      setActionError('DAO Governance contract not initialized')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)

      // Get current gas price and add 50%
      const provider = contracts.dataDAOGovernance.provider
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice.mul(150).div(100)

      console.log('Executing proposal:', proposalId)

      // Estimate gas
      const gasEstimate = await contracts.dataDAOGovernance.estimateGas.executeProposal(
        proposalId
      )

      // Execute proposal
      const tx = await contracts.dataDAOGovernance.executeProposal(
        proposalId,
        {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice
        }
      )

      console.log('Transaction sent:', tx.hash)

      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('Transaction mined:', receipt)

      setActionSuccess('Proposal has been executed successfully.')

      // Refresh proposal data
      window.location.reload()
    } catch (err) {
      console.error('Error executing proposal:', err)
      setActionError(`Failed to execute proposal: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle canceling proposal
  const handleCancel = async () => {
    if (!isAuthenticated) {
      setActionError('Please connect your wallet first')
      return
    }

    if (!contracts.dataDAOGovernance) {
      setActionError('DAO Governance contract not initialized')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)

      // Get current gas price and add 50%
      const provider = contracts.dataDAOGovernance.provider
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice.mul(150).div(100)

      console.log('Canceling proposal:', proposalId)

      // Estimate gas
      const gasEstimate = await contracts.dataDAOGovernance.estimateGas.cancelProposal(
        proposalId
      )

      // Cancel proposal
      const tx = await contracts.dataDAOGovernance.cancelProposal(
        proposalId,
        {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice
        }
      )

      console.log('Transaction sent:', tx.hash)

      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('Transaction mined:', receipt)

      setActionSuccess('Proposal has been canceled successfully.')

      // Refresh proposal data
      window.location.reload()
    } catch (err) {
      console.error('Error canceling proposal:', err)
      setActionError(`Failed to cancel proposal: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-3">Loading proposal details...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button as={Link} to="/dao" variant="primary">
          Back to DAO
        </Button>
      </Container>
    )
  }

  if (!proposal) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Proposal not found</Alert>
        <Button as={Link} to="/dao" variant="primary">
          Back to DAO
        </Button>
      </Container>
    )
  }

  const { forPercentage, againstPercentage } = calculateProgress()
  const isActive = proposal.status === 'active'
  const isSucceeded = proposal.status === 'succeeded'
  const canExecute = isSucceeded && !proposal.executed
  const canCancel = isActive && user?.walletAddress === proposal.proposer
  const canVote = isActive && isAuthenticated && userVote === null

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Proposal #{proposal.id}</h2>
        <Button as={Link} to="/dao" variant="outline-primary">
          Back to DAO
        </Button>
      </div>

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">{proposal.title}</h4>
                <div>
                  {getStatusBadge(proposal.status)}
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <Card.Subtitle className="mb-3 text-muted">
                Proposed by {truncateAddress(proposal.proposer)}
                {' • '}
                {formatDate(proposal.startTime)}
              </Card.Subtitle>

              <Card.Text className="mb-4" style={{ whiteSpace: 'pre-line' }}>
                {proposal.description}
              </Card.Text>

              <div className="mb-4">
                <h5>Target Contract</h5>
                <p className="text-break">{proposal.targetContract}</p>

                <h5>Function Call</h5>
                <p className="text-break">{proposal.functionCall}</p>
              </div>

              <div className="mb-4">
                <h5>Voting Results</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>For: {proposal.forVotes}</span>
                  <span>Against: {proposal.againstVotes}</span>
                </div>
                <ProgressBar>
                  <ProgressBar variant="success" now={forPercentage} key={1} />
                  <ProgressBar variant="danger" now={againstPercentage} key={2} />
                </ProgressBar>
                <div className="d-flex justify-content-between mt-1">
                  <small>{forPercentage}%</small>
                  <small>{againstPercentage}%</small>
                </div>
              </div>

              <div className="mb-4">
                <h5>Voting Period</h5>
                <p>
                  Started: {formatDate(proposal.startTime)}<br />
                  Ends: {formatDate(proposal.endTime)}
                </p>
              </div>

              {actionError && (
                <Alert variant="danger" className="mb-4">
                  {actionError}
                </Alert>
              )}

              {actionSuccess && (
                <Alert variant="success" className="mb-4">
                  {actionSuccess}
                </Alert>
              )}

              {canVote && (
                <div className="d-flex gap-2 mb-4">
                  <Button
                    variant="success"
                    onClick={() => handleVote(true)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Voting...
                      </>
                    ) : (
                      'Vote For'
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleVote(false)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Voting...
                      </>
                    ) : (
                      'Vote Against'
                    )}
                  </Button>
                </div>
              )}

              {userVote !== null && (
                <Alert variant={userVote ? 'success' : 'danger'} className="mb-4">
                  You voted {userVote ? 'For' : 'Against'} this proposal.
                </Alert>
              )}

              {canExecute && (
                <Button
                  variant="primary"
                  onClick={handleExecute}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" />
                      Executing...
                    </>
                  ) : (
                    'Execute Proposal'
                  )}
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="outline-danger"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" />
                      Canceling...
                    </>
                  ) : (
                    'Cancel Proposal'
                  )}
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Voting Power</h4>
            </Card.Header>
            <Card.Body>
              {isAuthenticated ? (
                <>
                  <p>Your voting power is based on your DATA token balance.</p>
                  <h5>Your Balance: {userTokenBalance} DATA</h5>

                  {parseFloat(userTokenBalance) === 0 && (
                    <Alert variant="warning" className="mt-3">
                      You don't have any DATA tokens. You need tokens to vote on proposals.
                    </Alert>
                  )}
                </>
              ) : (
                <Alert variant="info">
                  Connect your wallet to see your voting power.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h4 className="mb-0">Proposal Status</h4>
            </Card.Header>
            <Card.Body>
              <p><strong>Current Status:</strong> {proposal.status}</p>

              {proposal.executed && (
                <Alert variant="success">
                  This proposal has been executed.
                </Alert>
              )}

              {proposal.canceled && (
                <Alert variant="secondary">
                  This proposal has been canceled.
                </Alert>
              )}

              {proposal.status === 'defeated' && (
                <Alert variant="danger">
                  This proposal was defeated in voting.
                </Alert>
              )}

              {proposal.status === 'succeeded' && !proposal.executed && (
                <Alert variant="info">
                  This proposal passed and is ready to be executed.
                </Alert>
              )}

              {proposal.status === 'active' && (
                <Alert variant="primary">
                  This proposal is currently active and open for voting.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default ProposalDetail
