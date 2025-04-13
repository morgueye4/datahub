import { useState, useEffect } from 'react'
import { Card, Alert } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'
import TokenFaucet from './TokenFaucet'

const TokenBalance = () => {
  const { isAuthenticated, user } = useAuth()
  const { contracts } = useWeb3()
  const [tokenBalance, setTokenBalance] = useState('0')

  // Fetch token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (isAuthenticated && user?.walletAddress && contracts?.rewardToken) {
        try {
          const balance = await contracts.rewardToken.balanceOf(user.walletAddress)
          setTokenBalance(ethers.utils.formatEther(balance))
        } catch (error) {
          console.error('Error fetching token balance:', error)
        }
      }
    }
    
    fetchTokenBalance()
    
    // Set up an interval to refresh the balance every 10 seconds
    const intervalId = setInterval(fetchTokenBalance, 10000)
    
    return () => clearInterval(intervalId)
  }, [isAuthenticated, user, contracts])

  return (
    <div>
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Your Token Balance</h4>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center mb-3">
            <div>
              <h3 className="mb-0">{tokenBalance} <span className="text-muted">dataFIL</span></h3>
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
        </Card.Body>
      </Card>
      
      <TokenFaucet />
    </div>
  )
}

export default TokenBalance
