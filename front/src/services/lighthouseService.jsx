// Lighthouse Service for Filecoin storage
import lighthouse from '@lighthouse-web3/sdk'
import cidUtils from '../utils/cidUtils'

// Get the Lighthouse API key from environment variables
const LIGHTHOUSE_API_KEY = import.meta.env.VITE_LIGHTHOUSE_API_KEY
const LIGHTHOUSE_NODE_URL = import.meta.env.VITE_LIGHTHOUSE_NODE_URL || 'https://gateway.lighthouse.storage'

/**
 * Lighthouse service for Filecoin storage
 */
const lighthouseService = {
  /**
   * Upload a file to Lighthouse
   * @param {File} file - File to upload
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<Object>} Upload response
   */
  uploadFile: async (file, progressCallback) => {
    try {
      if (!LIGHTHOUSE_API_KEY) {
        throw new Error('Lighthouse API key not found')
      }

      // Upload file to Lighthouse using the upload method
      // For browser environments, we need to pass the file directly
      // Third parameter is for multiple files (false in our case)
      const response = await lighthouse.upload(
        file,
        LIGHTHOUSE_API_KEY,
        false,
        progressCallback
      )

      console.log('Lighthouse upload response:', response)

      return response
    } catch (error) {
      console.error('Error uploading file to Lighthouse:', error)
      throw error
    }
  },

  /**
   * Upload a buffer to Lighthouse
   * @param {ArrayBuffer} buffer - Buffer to upload
   * @param {string} name - File name
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<Object>} Upload response
   */
  uploadBuffer: async (buffer, name, progressCallback) => {
    try {
      if (!LIGHTHOUSE_API_KEY) {
        throw new Error('Lighthouse API key not found')
      }

      // Create a File object from the buffer
      const file = new File([buffer], name)

      // Upload file to Lighthouse
      const response = await lighthouse.upload(
        file,
        LIGHTHOUSE_API_KEY,
        progressCallback
      )

      console.log('Lighthouse upload response:', response)

      return response
    } catch (error) {
      console.error('Error uploading buffer to Lighthouse:', error)
      throw error
    }
  },

  /**
   * Upload text to Lighthouse
   * @param {string} text - Text to upload
   * @param {string} name - File name
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<Object>} Upload response
   */
  uploadText: async (text, name, progressCallback) => {
    try {
      if (!LIGHTHOUSE_API_KEY) {
        throw new Error('Lighthouse API key not found')
      }

      // Create a File object from the text
      const file = new File([text], name, { type: 'text/plain' })

      // Upload file to Lighthouse
      const response = await lighthouse.upload(
        file,
        LIGHTHOUSE_API_KEY,
        progressCallback
      )

      console.log('Lighthouse upload response:', response)

      return response
    } catch (error) {
      console.error('Error uploading text to Lighthouse:', error)
      throw error
    }
  },

  /**
   * Get URL for Lighthouse content
   * @param {string} cid - Content ID
   * @returns {string} URL for the content
   */
  getLighthouseUrl: (cid) => {
    if (!cid) return ''
    return `${LIGHTHOUSE_NODE_URL}/ipfs/${cid}`
  },

  /**
   * Convert bytes32 CID to regular CID
   * @param {string} bytes32Cid - bytes32 CID
   * @returns {string} Regular CID
   */
  bytes32ToCid: (bytes32Cid) => {
    return cidUtils.bytes32ToCid(bytes32Cid)
  },

  /**
   * Convert regular CID to bytes32
   * @param {string} cid - Regular CID
   * @returns {string} bytes32 CID
   */
  cidToBytes32: (cid) => {
    return cidUtils.cidToBytes32(cid)
  },

  /**
   * Validate CID
   * @param {string} cid - CID to validate
   * @returns {boolean} Whether the CID is valid
   */
  isValidCid: (cid) => {
    return cidUtils.isValidCid(cid)
  }
}

export default lighthouseService
