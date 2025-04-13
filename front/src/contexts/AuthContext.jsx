import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if ethereum is available
        if (window.ethereum) {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          
          // Check if any accounts are already connected
          const accounts = await provider.listAccounts()
          
          if (accounts.length > 0) {
            const signer = provider.getSigner()
            const address = await signer.getAddress()
            
            setProvider(provider)
            setSigner(signer)
            setUser({ walletAddress: address })
            setIsAuthenticated(true)
            
            console.log('Wallet already connected:', address)
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
    
    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        console.log('Accounts changed:', accounts)
        
        if (accounts.length === 0) {
          // User disconnected their wallet
          setIsAuthenticated(false)
          setUser(null)
          setSigner(null)
        } else {
          // User switched accounts
          try {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const signer = provider.getSigner()
            const address = await signer.getAddress()
            
            setProvider(provider)
            setSigner(signer)
            setUser({ walletAddress: address })
            setIsAuthenticated(true)
          } catch (error) {
            console.error('Error handling account change:', error)
          }
        }
      }
      
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      
      // Cleanup listener
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const connectWallet = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet detected. Please install MetaMask or another wallet.')
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      // Request account access
      await provider.send('eth_requestAccounts', [])
      
      const signer = provider.getSigner()
      const address = await signer.getAddress()
      
      setProvider(provider)
      setSigner(signer)
      setUser({ walletAddress: address })
      setIsAuthenticated(true)
      
      console.log('Wallet connected:', address)
      
      return { provider, signer, address }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setError(error.message || 'Failed to connect wallet')
      return null
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    setIsAuthenticated(false)
    setUser(null)
    setSigner(null)
    console.log('Wallet disconnected')
  }

  const value = {
    isAuthenticated,
    user,
    provider,
    signer,
    error,
    loading,
    connectWallet,
    disconnectWallet
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
