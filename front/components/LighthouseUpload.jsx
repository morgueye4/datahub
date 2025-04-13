import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import lighthouse from '@lighthouse-web3/sdk';

const LighthouseUpload = ({ onUploadSuccess, initialIsEncrypted = false }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedCID, setUploadedCID] = useState('');
  const [encryptedCID, setEncryptedCID] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(initialIsEncrypted);
  const [accessConditions, setAccessConditions] = useState('');
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [cidToDecrypt, setCidToDecrypt] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [apiKey, setApiKey] = useState('6f600731.21f696ed13594bb6b2d33c5c5f9690d3'); // Default API key from the project requirements

  // Fetch API key from backend and sync with initialIsEncrypted
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('http://localhost:8000/lighthouse/api-key');
        const data = await response.json();
        if (data.success && data.data.apiKey) {
          setApiKey(data.data.apiKey);
        } else {
          console.error('Failed to fetch API key');
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };

    fetchApiKey();

    // Sync with initialIsEncrypted prop
    setIsEncrypted(initialIsEncrypted);
  }, [initialIsEncrypted]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setWalletConnected(true);
      } else {
        alert('Please install MetaMask to use this feature');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  // Handle encryption toggle
  const handleEncryptionToggle = (e) => {
    setIsEncrypted(e.target.checked);
  };

  // Handle access conditions change
  const handleAccessConditionsChange = (e) => {
    setAccessConditions(e.target.value);
  };

  // Sign authentication message for Lighthouse
  const signAuthMessage = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this feature');
      return null;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
      const signedMessage = await signer.signMessage(messageRequested);

      return { signedMessage, address };
    } catch (error) {
      console.error('Error signing auth message:', error);
      return null;
    }
  };

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);

  // Function to update upload progress
  const updateProgress = (loaded, total) => {
    const percentageDone = (loaded / total) * 100;
    console.log('Upload progress:', percentageDone);
    setUploadProgress(percentageDone);
  };

  // Upload file to Lighthouse
  const uploadFile = async () => {
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    if (isEncrypted && !accessConditions.trim()) {
      alert('Please specify access conditions for encrypted upload');
      return;
    }

    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('file', file);

      if (isEncrypted) {
        // Get signed message for authentication
        const authData = await signAuthMessage();
        if (!authData) {
          setUploading(false);
          return;
        }

        // Parse access conditions
        try {
          JSON.parse(accessConditions); // Just validate the JSON format
        } catch (error) {
          alert('Invalid JSON format for access conditions');
          setUploading(false);
          return;
        }

        // Upload encrypted file using fetch directly
        const url = `https://node.lighthouse.storage/api/v0/add_encrypted`;

        // For encrypted uploads, we need to use the JWT token
        // We'll use the signed message directly as the JWT token
        // In a production environment, you would want to use the proper JWT token
        const jwt = authData.signedMessage;

        // Use XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60000; // 60 seconds timeout

        // Create a promise to handle the response
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
          xhr.setRequestHeader('lighthouse-auth', jwt);

          // Set up progress tracking
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              updateProgress(event.loaded, event.total);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log('Raw response:', xhr.responseText);
                resolve(response);
              } catch (error) {
                console.error('Error parsing response:', error);
                console.log('Raw response text:', xhr.responseText);
                // If we can't parse as JSON, try to extract the CID directly
                const cidMatch = xhr.responseText.match(/"Hash":"([^"]+)"/);
                if (cidMatch && cidMatch[1]) {
                  resolve({ Hash: cidMatch[1] });
                } else {
                  reject(new Error('Invalid response format'));
                }
              }
            } else {
              reject(new Error(`HTTP Error: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network Error'));
          xhr.ontimeout = () => reject(new Error('Request timed out'));

          // Send the request
          xhr.send(formData);
        });

        const responseData = await uploadPromise;
        console.log('Encrypted upload response:', responseData);

        // Handle different response formats
        let cid = '';
        if (responseData.data && responseData.data.Hash) {
          cid = responseData.data.Hash;
          setEncryptedCID(cid);
        } else if (responseData.Hash) {
          // Direct hash in response
          cid = responseData.Hash;
          setEncryptedCID(cid);
        } else if (typeof responseData === 'string') {
          // Sometimes the API returns just the CID as a string
          cid = responseData;
          setEncryptedCID(cid);
        } else {
          console.error('Unexpected response format:', responseData);
          throw new Error('Invalid response format from server');
        }

        // Call the onUploadSuccess callback if provided
        if (onUploadSuccess && typeof onUploadSuccess === 'function') {
          onUploadSuccess(cid, true, accessConditions);
        }
      } else {
        // Upload regular file using XMLHttpRequest to track progress
        const url = `https://node.lighthouse.storage/api/v0/add`;

        // Use XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60000; // 60 seconds timeout

        // Create a promise to handle the response
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

          // Set up progress tracking
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              updateProgress(event.loaded, event.total);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log('Raw response:', xhr.responseText);
                resolve(response);
              } catch (error) {
                console.error('Error parsing response:', error);
                console.log('Raw response text:', xhr.responseText);
                // If we can't parse as JSON, try to extract the CID directly
                const cidMatch = xhr.responseText.match(/"Hash":"([^"]+)"/);
                if (cidMatch && cidMatch[1]) {
                  resolve({ Hash: cidMatch[1] });
                } else {
                  reject(new Error('Invalid response format'));
                }
              }
            } else {
              reject(new Error(`HTTP Error: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network Error'));
          xhr.ontimeout = () => reject(new Error('Request timed out'));

          // Send the request
          xhr.send(formData);
        });

        const responseData = await uploadPromise;
        console.log('Regular upload response:', responseData);

        // Handle different response formats
        let cid = '';
        if (responseData.data && responseData.data.Hash) {
          cid = responseData.data.Hash;
          setUploadedCID(cid);
        } else if (responseData.Hash) {
          // Direct hash in response
          cid = responseData.Hash;
          setUploadedCID(cid);
        } else if (typeof responseData === 'string') {
          // Sometimes the API returns just the CID as a string
          cid = responseData;
          setUploadedCID(cid);
        } else {
          console.error('Unexpected response format:', responseData);
          throw new Error('Invalid response format from server');
        }

        // Call the onUploadSuccess callback if provided
        if (onUploadSuccess && typeof onUploadSuccess === 'function') {
          onUploadSuccess(cid, false, '');
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Example access conditions
  const getExampleAccessConditions = () => {
    const conditions = [
      {
        id: 1,
        chain: 'Calibration',
        method: 'getBlockNumber',
        standardContractType: '',
        returnValueTest: {
          comparator: '>=',
          value: '1'
        }
      },
      {
        id: 2,
        chain: 'Calibration',
        method: 'balanceOf',
        standardContractType: 'ERC20',
        contractAddress: '0xFA72FC2139510d056bE14570c8073eF8a05Cc85B', // Example token address
        returnValueTest: {
          comparator: '>=',
          value: '1000000000000000000' // 1 token in wei
        },
        parameters: [':userAddress']
      }
    ];

    setAccessConditions(JSON.stringify(conditions, null, 2));
  };

  // Decrypt file
  const decryptFile = async () => {
    if (!cidToDecrypt) {
      alert('Please enter a CID to decrypt');
      return;
    }

    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setDecrypting(true);

    try {
      // Get signed message for authentication
      const authData = await signAuthMessage();
      if (!authData) {
        setDecrypting(false);
        return;
      }

      // Fetch the file from Lighthouse
      const keyObject = await lighthouse.fetchEncryptionKey(
        cidToDecrypt,
        authData.address,
        authData.signedMessage
      );

      if (!keyObject.data || !keyObject.data.key) {
        throw new Error('Failed to fetch encryption key');
      }

      // Decrypt the file
      const fileUrl = `https://gateway.lighthouse.storage/ipfs/${cidToDecrypt}`;
      const response = await fetch(fileUrl);
      const encryptedData = await response.arrayBuffer();

      const decrypted = await lighthouse.decryptFile(
        encryptedData,
        keyObject.data.key
      );

      // Handle the decrypted content based on file type
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);

      setDecryptedContent({
        url,
        type: blob.type || 'application/octet-stream'
      });

      console.log('File decrypted successfully');
    } catch (error) {
      console.error('Error decrypting file:', error);
      alert(`Decryption failed: ${error.message}`);
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Lighthouse File Upload</h2>

      {/* Wallet Connection */}
      <div className="mb-6">
        {!walletConnected ? (
          <button
            onClick={connectWallet}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="text-green-600 font-semibold">
            Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Lighthouse API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>

      {/* File Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Select File
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">Selected: {fileName}</p>
        )}
      </div>

      {/* Encryption Toggle */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isEncrypted}
            onChange={handleEncryptionToggle}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-gray-700">Encrypt File</span>
        </label>
      </div>

      {/* Access Conditions (for encrypted uploads) */}
      {isEncrypted && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 text-sm font-bold">
              Access Conditions (JSON)
            </label>
            <button
              onClick={getExampleAccessConditions}
              className="text-blue-500 text-sm hover:text-blue-700"
            >
              Load Example
            </button>
          </div>
          <textarea
            value={accessConditions}
            onChange={handleAccessConditionsChange}
            rows={6}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder='[{"id":1,"chain":"Calibration","method":"getBlockNumber",...}]'
          />
          <p className="mt-1 text-xs text-gray-500">
            Specify conditions that must be met to access the encrypted file
          </p>
        </div>
      )}

      {/* Upload Button */}
      <div className="mb-6">
        <button
          onClick={uploadFile}
          disabled={uploading || !file || (isEncrypted && !walletConnected)}
          className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full ${
            (uploading || !file || (isEncrypted && !walletConnected)) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload to Lighthouse'}
        </button>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{Math.round(uploadProgress)}% Uploaded</p>
          </div>
        )}
      </div>

      {/* Decryption Section */}
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Decrypt Encrypted File</h3>
        <div className="mb-4">
          <label htmlFor="cidToDecrypt" className="block text-sm font-medium text-gray-700 mb-1">
            CID of Encrypted File
          </label>
          <input
            type="text"
            id="cidToDecrypt"
            value={cidToDecrypt}
            onChange={(e) => setCidToDecrypt(e.target.value)}
            placeholder="Enter CID of encrypted file"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={decryptFile}
          disabled={decrypting || !cidToDecrypt || !walletConnected}
          className={`bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full ${
            (decrypting || !cidToDecrypt || !walletConnected) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {decrypting ? 'Decrypting...' : 'Decrypt File'}
        </button>
      </div>

      {/* Results */}
      {(uploadedCID || encryptedCID) && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold mb-2">Upload Results</h3>

          {uploadedCID && (
            <div className="mb-2">
              <p className="font-medium">Regular Upload CID:</p>
              <p className="text-sm break-all">{uploadedCID}</p>
              <a
                href={`https://gateway.lighthouse.storage/ipfs/${uploadedCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                View File
              </a>
            </div>
          )}

          {encryptedCID && (
            <div>
              <p className="font-medium">Encrypted Upload CID:</p>
              <p className="text-sm break-all">{encryptedCID}</p>
              <p className="text-xs mt-1 text-gray-600">
                Encrypted files can only be accessed by users who meet the access conditions
              </p>
              <button
                onClick={() => setCidToDecrypt(encryptedCID)}
                className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
              >
                Decrypt This File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Decryption Results */}
      {decryptedContent && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold mb-2">Decrypted File</h3>
          {decryptedContent.type.startsWith('image/') ? (
            <div>
              <img
                src={decryptedContent.url}
                alt="Decrypted content"
                className="max-w-full h-auto rounded"
              />
              <a
                href={decryptedContent.url}
                download="decrypted-file"
                className="mt-2 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
              >
                Download Image
              </a>
            </div>
          ) : decryptedContent.type.startsWith('text/') ? (
            <div>
              <iframe
                src={decryptedContent.url}
                title="Decrypted text content"
                className="w-full h-64 border border-gray-300 rounded"
              ></iframe>
              <a
                href={decryptedContent.url}
                download="decrypted-file"
                className="mt-2 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
              >
                Download Text
              </a>
            </div>
          ) : (
            <div>
              <p>File decrypted successfully. Click below to download:</p>
              <a
                href={decryptedContent.url}
                download="decrypted-file"
                className="mt-2 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LighthouseUpload;
