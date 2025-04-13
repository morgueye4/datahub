import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAuth } from './AuthContext'

// Contract ABIs
import {
  ContractRegistryABI,
  TaskManagerABI,
  UnifiedTaskManagerABI,
  DataTokenABI,
  RewardTokenABI,
  DatasetRegistryABI,
  DealClientABI,
  DataDAOCoreABI,
  MembershipManagerABI,
  GovernanceModuleABI,
  deployments,
  getABI
} from '../contracts'

const Web3Context = createContext()

export const useWeb3 = () => useContext(Web3Context)

export const Web3Provider = ({ children }) => {
  const { isAuthenticated, provider, signer } = useAuth()

  const [contracts, setContracts] = useState({
    // Current contracts
    contractRegistry: null,
    taskManager: null,
    dataToken: null,
    rewardToken: null,
    unifiedTaskManager: null,

    // DAO contracts
    dataDAOCore: null,
    membershipManager: null,
    datasetRegistry: null,
    dealClient: null,
    governanceModule: null
  })

  const [networkInfo, setNetworkInfo] = useState({
    chainId: null,
    name: null,
    isSupported: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Contract addresses from environment variables and deployments.json
  const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_CONTRACT_REGISTRY_ADDRESS
  const TASK_MANAGER_ADDRESS = import.meta.env.VITE_TASK_MANAGER_ADDRESS || deployments.contracts.TaskManager
  const DATA_TOKEN_ADDRESS = import.meta.env.VITE_DATA_TOKEN_ADDRESS || deployments.contracts.DataToken
  const UNIFIED_TASK_MANAGER_ADDRESS = import.meta.env.VITE_UNIFIED_TASK_MANAGER_ADDRESS
  const REWARD_TOKEN_ADDRESS = deployments.contracts.RewardToken
  const SUPPORTED_CHAIN_ID = parseInt(import.meta.env.VITE_NETWORK_CHAIN_ID || '314159')
  const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || 'Filecoin Calibration Testnet'

  // Helper function to extract ABI from ABI objects
  const getABI = (abiObject) => {
    if (Array.isArray(abiObject)) {
      return abiObject; // Already an array
    } else if (abiObject && abiObject.abi) {
      return abiObject.abi; // Extract ABI array from object
    } else {
      console.error('Invalid ABI format:', abiObject);
      return []; // Empty ABI as fallback
    }
  };

  // Initialize contracts when provider/signer changes
  useEffect(() => {
    if (signer) {
      initializeContracts(signer)
    }
  }, [signer])

  // Check network when provider changes
  useEffect(() => {
    if (provider) {
      checkNetwork()
    }
  }, [provider])

  // Check if the current network is supported
  const checkNetwork = async () => {
    try {
      const network = await provider.getNetwork()
      setNetworkInfo({
        chainId: network.chainId,
        name: network.name,
        isSupported: network.chainId === SUPPORTED_CHAIN_ID
      })

      if (network.chainId !== SUPPORTED_CHAIN_ID) {
        setError(`Please switch to ${NETWORK_NAME}`)
      } else {
        setError(null)
      }
    } catch (error) {
      console.error('Error checking network:', error)
    }
  }

  // Switch to the supported network
  const switchNetwork = async () => {
    try {
      setLoading(true)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SUPPORTED_CHAIN_ID.toString(16)}` }]
      })
      setLoading(false)
    } catch (error) {
      console.error('Error switching network:', error)
      setError(`Failed to switch network: ${error.message}`)
      setLoading(false)
    }
  }

  // Initialize contracts with the provided signer
  const initializeContracts = async (newSigner) => {
    if (!newSigner) return false

    try {
      // Initialize contract registry first
      const contractRegistry = new ethers.Contract(
        CONTRACT_REGISTRY_ADDRESS,
        getABI(ContractRegistryABI),
        newSigner
      )
      console.log('ContractRegistry initialized at:', CONTRACT_REGISTRY_ADDRESS)

      // Initialize current contracts
      const taskManager = new ethers.Contract(
        TASK_MANAGER_ADDRESS,
        getABI(TaskManagerABI),
        newSigner
      )
      console.log('TaskManager initialized at:', TASK_MANAGER_ADDRESS)

      // Initialize DataToken contract
      const dataToken = new ethers.Contract(
        DATA_TOKEN_ADDRESS,
        getABI(DataTokenABI),
        newSigner
      )
      console.log('DataToken initialized at:', DATA_TOKEN_ADDRESS)

      // Initialize RewardToken contract
      const rewardToken = new ethers.Contract(
        REWARD_TOKEN_ADDRESS,
        getABI(DataTokenABI),
        newSigner
      )
      console.log('RewardToken initialized at:', REWARD_TOKEN_ADDRESS)

      // Initialize UnifiedTaskManager if available
      let unifiedTaskManager = null
      if (UNIFIED_TASK_MANAGER_ADDRESS) {
        unifiedTaskManager = new ethers.Contract(
          UNIFIED_TASK_MANAGER_ADDRESS,
          getABI(UnifiedTaskManagerABI),
          newSigner
        )
        console.log('UnifiedTaskManager initialized at:', UNIFIED_TASK_MANAGER_ADDRESS)
      }

      // Set initial contracts
      setContracts({
        // Current contracts
        contractRegistry,
        taskManager,
        dataToken,
        rewardToken,
        unifiedTaskManager,

        // DAO contracts (will be initialized later if needed)
        dataDAOCore: null,
        membershipManager: null,
        datasetRegistry: null,
        dealClient: null,
        governanceModule: null
      })

      // Success message
      console.log('Contracts initialized successfully')
      return true
    } catch (error) {
      console.error('Error initializing contracts:', error)
      setError('Failed to initialize contracts: ' + error.message)
      return false
    }
  }

  // Reinitialize contracts with a new signer
  const reinitializeContractsWithSigner = async (newSigner) => {
    if (!newSigner) {
      console.error('No signer provided for reinitialization')
      return false
    }

    try {
      setLoading(true)
      const success = await initializeContracts(newSigner)
      setLoading(false)
      return success
    } catch (error) {
      console.error('Error reinitializing contracts:', error)
      setError('Failed to reinitialize contracts: ' + error.message)
      setLoading(false)
      return false
    }
  }

  const value = {
    contracts,
    networkInfo,
    loading,
    error,
    switchNetwork,
    reinitializeContractsWithSigner
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

export default Web3Context
