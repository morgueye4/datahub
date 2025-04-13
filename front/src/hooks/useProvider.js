import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export const useProvider = () => {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    // Initialize provider
    const initProvider = async () => {
      try {
        // Check if window.ethereum is available
        if (window.ethereum) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);
        } else {
          // Fallback to a public RPC provider
          const rpcUrl = import.meta.env.VITE_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          setProvider(provider);
        }
      } catch (error) {
        console.error('Error initializing provider:', error);
      }
    };

    initProvider();
  }, []);

  return provider;
};
