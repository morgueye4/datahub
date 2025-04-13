/**
 * Service for interacting with Lighthouse for decentralized storage
 */

import axios from 'axios'

// Lighthouse API key from environment variables
const LIGHTHOUSE_API_KEY = import.meta.env.VITE_LIGHTHOUSE_API_KEY
const LIGHTHOUSE_NODE_URL = import.meta.env.VITE_LIGHTHOUSE_NODE_URL || 'https://gateway.lighthouse.storage'

/**
 * Upload a file to Lighthouse
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The CID of the uploaded file
 */
export const uploadToLighthouse = async (file) => {
  try {
    if (!LIGHTHOUSE_API_KEY) {
      throw new Error('Lighthouse API key not found in environment variables')
    }

    console.log('Uploading file to Lighthouse:', file.name)

    // Create form data
    const formData = new FormData()
    formData.append('file', file)

    // Upload file to Lighthouse
    const response = await axios.post(
      'https://node.lighthouse.storage/api/v0/add',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${LIGHTHOUSE_API_KEY}`
        }
      }
    )

    console.log('Lighthouse upload response:', response.data)

    if (!response.data || !response.data.cid) {
      throw new Error('Failed to upload file to Lighthouse')
    }

    return response.data.cid
  } catch (error) {
    console.error('Error uploading to Lighthouse:', error)
    throw new Error(`Failed to upload to Lighthouse: ${error.message}`)
  }
}

/**
 * Get the URL for a file stored on Lighthouse
 * @param {string} cid - The CID of the file
 * @returns {string} - The URL to access the file
 */
export const getLighthouseUrl = (cid) => {
  if (!cid) return null
  return `${LIGHTHOUSE_NODE_URL}/ipfs/${cid}`
}

/**
 * Make a deal for a file on Filecoin through Lighthouse
 * @param {string} cid - The CID of the file
 * @returns {Promise<object>} - The deal information
 */
export const makeFilecoinDeal = async (cid) => {
  try {
    if (!LIGHTHOUSE_API_KEY) {
      throw new Error('Lighthouse API key not found in environment variables')
    }

    if (!cid) {
      throw new Error('CID is required')
    }

    console.log('Making Filecoin deal for CID:', cid)

    // Make Filecoin deal through Lighthouse
    const response = await axios.post(
      'https://node.lighthouse.storage/api/v0/filecoin/make-deal',
      {
        cid,
        miner: ['t017840'],  // Example miner, can be configured
        network: 'calibration',
        deal_duration: 180  // 180 days
      },
      {
        headers: {
          'Authorization': `Bearer ${LIGHTHOUSE_API_KEY}`
        }
      }
    )

    console.log('Filecoin deal response:', response.data)

    if (!response.data || response.data.error) {
      throw new Error(response.data?.error || 'Failed to make Filecoin deal')
    }

    return response.data
  } catch (error) {
    console.error('Error making Filecoin deal:', error)
    throw new Error(`Failed to make Filecoin deal: ${error.message}`)
  }
}

export default {
  uploadToLighthouse,
  getLighthouseUrl,
  makeFilecoinDeal
}
