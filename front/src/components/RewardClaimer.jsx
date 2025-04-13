import { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useProvider } from '../hooks/useProvider';
import { ethers } from 'ethers';

// Helper function to safely check if a BigNumber is zero
const isBigNumberZero = (value) => {
  try {
    // Check if it's a BigNumber
    if (value && typeof value.eq === 'function') {
      return value.eq(ethers.BigNumber.from(0));
    }
    // If it's a string or number, convert to BigNumber first
    if (typeof value === 'string' || typeof value === 'number') {
      return ethers.BigNumber.from(value).eq(ethers.BigNumber.from(0));
    }
    // Fallback: treat as zero if it's falsy
    return !value;
  } catch (e) {
    console.error('Error checking if BigNumber is zero:', e);
    return true; // Assume zero on error
  }
};

const RewardClaimer = () => {
  const { contracts } = useWeb3();
  const { isAuthenticated, user } = useAuth();
  const provider = useProvider();

  const [pendingRewards, setPendingRewards] = useState(ethers.BigNumber.from(0));
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchPendingRewards = async () => {
      if (!isAuthenticated || !user?.walletAddress || !contracts.rewardDistributor) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if we have the rewardDistributor contract
        if (!contracts.rewardDistributor) {
          console.error('RewardDistributor contract not available');
          setError('Reward distributor contract not available. Please check your connection.');
          setPendingRewards(ethers.BigNumber.from(0));
          return;
        }

        try {
          // Get the user's pending rewards
          console.log('Fetching pending rewards for address:', user.walletAddress);
          const rewards = await contracts.rewardDistributor.pendingRewards(user.walletAddress);
          console.log('Pending rewards from contract:', rewards.toString());
          setPendingRewards(rewards);
        } catch (e) {
          console.error('Error accessing pendingRewards:', e);

          // Try alternative method if the first one fails
          try {
            // Some contracts might use a different function name or pattern
            console.log('Trying alternative method to get rewards...');
            const rewards = await contracts.rewardDistributor.getRewards(user.walletAddress);
            console.log('Pending rewards from alternative method:', rewards.toString());
            setPendingRewards(rewards);
          } catch (altError) {
            console.error('Alternative method also failed:', altError);

            // As a last resort, check if the rewardToken contract is available
            if (contracts.rewardToken) {
              try {
                // Check the user's token balance as a fallback
                const balance = await contracts.rewardToken.balanceOf(user.walletAddress);
                console.log('User token balance:', balance.toString());
                setPendingRewards(balance);
              } catch (tokenError) {
                console.error('Error getting token balance:', tokenError);
                setPendingRewards(ethers.BigNumber.from(0));
              }
            } else {
              setPendingRewards(ethers.BigNumber.from(0));
            }
          }
        }

        console.log('Pending rewards:', ethers.utils.formatEther(pendingRewards), 'dataFIL');
      } catch (err) {
        console.error('Error fetching pending rewards:', err);
        setError('Failed to fetch pending rewards. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRewards();

    // Set up an interval to refresh the pending rewards every 30 seconds
    const interval = setInterval(fetchPendingRewards, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, contracts.rewardDistributor]);

  const handleClaimRewards = async () => {
    if (!isAuthenticated || !user?.walletAddress || !contracts.rewardDistributor) {
      setError('Please connect your wallet first');
      return;
    }

    if (isBigNumberZero(pendingRewards)) {
      setError('No rewards to claim');
      return;
    }

    try {
      setClaiming(true);
      setError(null);
      setSuccess(null);

      // Check if we have the rewardDistributor contract
      if (!contracts.rewardDistributor) {
        throw new Error('Reward distributor contract not available. Please check your connection.');
      }

      console.log('Calling claimRewards function on contract...');

      // Get gas price and increase it by 50% to ensure transaction goes through
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice.mul(150).div(100);
      console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');

      // Call the claimRewards function on the contract
      const tx = await contracts.rewardDistributor.claimRewards({
        gasPrice
      });

      console.log('Transaction sent:', tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      console.log('Transaction mined:', receipt);

      // Check if the transaction was successful
      if (receipt.status === 1) {
        setSuccess('Rewards claimed successfully!');
        setPendingRewards(ethers.BigNumber.from(0));
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError(`Failed to claim rewards: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Claim Your Rewards</h5>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center my-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading your rewards...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h6>Pending Rewards</h6>
              <p className="display-6">
                {ethers.utils.formatEther(pendingRewards || 0)} dataFIL
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleClaimRewards}
              disabled={claiming || isBigNumberZero(pendingRewards)}
              className="w-100"
            >
              {claiming ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Claiming...
                </>
              ) : (
                'Claim Rewards'
              )}
            </Button>

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="mt-3">
                {success}
              </Alert>
            )}

            <div className="mt-3 text-muted small">
              <p className="mb-1">
                <strong>How it works:</strong>
              </p>
              <ul className="ps-3">
                <li>Rewards are earned for creating tasks, submitting work, and reviewing submissions</li>
                <li>Rewards are automatically calculated when submissions are approved</li>
                <li>You can claim your rewards at any time</li>
                <li>Claimed rewards will be sent to your connected wallet</li>
              </ul>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default RewardClaimer;
