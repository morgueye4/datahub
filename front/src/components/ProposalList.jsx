import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button, Spinner, Alert } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { formatDate, truncateAddress } from '../utils/formatting'

const ProposalList = () => {
  const { contracts } = useWeb3()

  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch proposals from backend API
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/proposals`)

          if (response.ok) {
            const result = await response.json()
            console.log('Proposals from API:', result)

            if (result.success && result.data) {
              // Process dates to ensure they are Date objects
              const processedProposals = result.data.map(proposal => ({
                ...proposal,
                startTime: new Date(proposal.startTime),
                endTime: new Date(proposal.endTime)
              }))

              setProposals(processedProposals)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          console.log('Error fetching proposals from API:', err)
          // Continue with contract data
        }

        // If API fails, try to get data from contracts
        if (contracts.dataDAOGovernance) {
          try {
            // Get proposal count
            const proposalCount = await contracts.dataDAOGovernance.proposalCount()
            console.log(`Found ${proposalCount} proposals from contract`)

            // Fetch all proposals
            const proposalPromises = []
            for (let i = 1; i <= proposalCount.toNumber(); i++) {
              proposalPromises.push(contracts.dataDAOGovernance.proposals(i))
            }

            const proposalResults = await Promise.all(proposalPromises)

            // Process proposals with proper null checks
            const processedProposals = proposalResults.map((proposal, index) => {
              // Skip invalid proposals
              if (!proposal) {
                console.warn(`Proposal at index ${index} is null or undefined`)
                return null
              }

              // Determine status
              const now = Math.floor(Date.now() / 1000)
              let status = 'Pending'

              try {
                if (proposal.executed) {
                  status = 'Executed'
                } else if (proposal.canceled) {
                  status = 'Canceled'
                } else if (proposal.endTime && proposal.endTime.toNumber && proposal.endTime.toNumber() < now) {
                  status = 'Expired'
                } else if (proposal.startTime && proposal.startTime.toNumber &&
                           proposal.endTime && proposal.endTime.toNumber &&
                           proposal.startTime.toNumber() <= now && proposal.endTime.toNumber() > now) {
                  status = 'Active'
                }
              } catch (err) {
                console.error(`Error determining status for proposal ${index}:`, err)
                status = 'Unknown'
              }

              try {
                return {
                  id: index + 1,
                  title: proposal.title || `Proposal #${index + 1}`,
                  description: proposal.description || 'No description provided',
                  proposer: proposal.proposer || '0x0000000000000000000000000000000000000000',
                  targetContract: proposal.targetContract || '0x0000000000000000000000000000000000000000',
                  functionCall: proposal.functionSignature || 'Unknown function',
                  votingPeriod: proposal.endTime && proposal.startTime ?
                    (proposal.endTime.toNumber() - proposal.startTime.toNumber()) : 0,
                  startTime: proposal.startTime ?
                    new Date(proposal.startTime.toNumber() * 1000) : new Date(),
                  endTime: proposal.endTime ?
                    new Date(proposal.endTime.toNumber() * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  forVotes: proposal.forVotes ? proposal.forVotes.toNumber() : 0,
                  againstVotes: proposal.againstVotes ? proposal.againstVotes.toNumber() : 0,
                  executed: !!proposal.executed,
                  canceled: !!proposal.canceled,
                  status
                }
              } catch (err) {
                console.error(`Error processing proposal ${index}:`, err)
                return null
              }
            })

            // Filter out any null proposals
            const validProposals = processedProposals.filter(p => p !== null)
            setProposals(validProposals)
            setLoading(false)
            return
          } catch (err) {
            console.error('Error fetching proposals from contract:', err)
            // Continue to fallback data
          }
        }

        // Fallback to static data if both API and contracts fail
        const now = new Date()
        const fallbackProposals = [
          {
            id: 1,
            title: 'Add New Data Source',
            description: 'Proposal to add a new data source for AI training.',
            proposer: '0x1234567890123456789012345678901234567890',
            targetContract: '0x0987654321098765432109876543210987654321',
            functionCall: 'addDataSource(address,uint256)',
            votingPeriod: 7 * 24 * 60 * 60, // 7 days in seconds
            startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
            forVotes: 1500,
            againstVotes: 500,
            executed: false,
            canceled: false,
            status: 'Active'
          },
          {
            id: 2,
            title: 'Update Reward Distribution',
            description: 'Proposal to update the reward distribution mechanism.',
            proposer: '0x0987654321098765432109876543210987654321',
            targetContract: '0x1234567890123456789012345678901234567890',
            functionCall: 'updateRewardDistribution(uint256,uint256)',
            votingPeriod: 5 * 24 * 60 * 60, // 5 days in seconds
            startTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
            endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            forVotes: 2000,
            againstVotes: 1000,
            executed: true,
            canceled: false,
            status: 'Executed'
          }
        ]

        setProposals(fallbackProposals)
      } catch (err) {
        console.error('Error fetching proposals:', err)
        setError('Failed to load proposals. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [contracts.dataDAOGovernance])

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

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading proposals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <Alert variant="info">
        No proposals found. Be the first to create a proposal!
      </Alert>
    )
  }

  return (
    <div className="proposal-list">
      {proposals.map(proposal => (
        <Card key={proposal.id} className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <Card.Title>
                  <Link to={`/dao/proposals/${proposal.id}`} className="text-decoration-none">
                    {proposal.title}
                  </Link>
                  <span className="ms-2">
                    {getStatusBadge(proposal.status)}
                  </span>
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  Proposed by {truncateAddress(proposal.proposer)}
                  {' • '}
                  {formatDate(proposal.startTime)}
                </Card.Subtitle>
              </div>
              <div>
                <Badge bg="primary" className="me-2">
                  For: {proposal.forVotes}
                </Badge>
                <Badge bg="danger">
                  Against: {proposal.againstVotes}
                </Badge>
              </div>
            </div>

            <Card.Text className="mt-3">
              {proposal.description.length > 150
                ? `${proposal.description.substring(0, 150)}...`
                : proposal.description}
            </Card.Text>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <small className="text-muted">
                  Voting ends: {formatDate(proposal.endTime)}
                </small>
              </div>
              <div>
                <Button
                  as={Link}
                  to={`/dao/proposals/${proposal.id}`}
                  variant="outline-primary"
                  size="sm"
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  )
}

export default ProposalList
