/**
 * Utility functions for handling CIDs (Content Identifiers) consistently across the application
 */

import { ethers } from 'ethers'
import { Buffer } from 'buffer'

// Browser-compatible buffer implementation as fallback
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Maximum CID length in bytes when converting between formats
const MAX_CID_LENGTH = parseInt(import.meta.env.VITE_MAX_CID_LENGTH || '64')

/**
 * Converts a CID string to bytes32 format for smart contract storage
 * This improved version handles different CID formats more robustly
 *
 * @param {string} cid - The CID string to convert
 * @returns {string} - The bytes32 representation of the CID
 */
export const cidToBytes32 = (cid) => {
  try {
    if (!cid) return ethers.constants.HashZero

    // Normalize the CID by handling different formats
    let normalizedCid = cid;

    // Handle CIDs with prefixes (ipfs://, bafy, etc.)
    if (normalizedCid.startsWith('ipfs://')) {
      normalizedCid = normalizedCid.substring(7);
    } else if (normalizedCid.startsWith('bafy')) {
      // Keep the bafy prefix as it's part of the CID
    } else if (normalizedCid.startsWith('Qm')) {
      // Keep the Qm prefix as it's part of the CID
    }

    // For CIDs that are already in hex format (starting with 0x)
    if (normalizedCid.startsWith('0x')) {
      // If it's already a hex string and 32 bytes (66 chars including 0x), return as is
      if (normalizedCid.length === 66) {
        return normalizedCid;
      }
      // Otherwise, remove the 0x prefix and continue with conversion
      normalizedCid = normalizedCid.substring(2);
    }

    // Convert the CID to bytes
    let bytes;
    try {
      // Try to convert as hex first if it looks like hex
      if (/^[0-9a-fA-F]+$/.test(normalizedCid)) {
        bytes = Buffer.from(normalizedCid, 'hex');
      } else {
        // Otherwise convert as UTF-8
        bytes = Buffer.from(normalizedCid);
      }
    } catch (e) {
      // Fallback to UTF-8 encoding
      bytes = Buffer.from(normalizedCid);
    }

    // Pad or truncate to 32 bytes
    const paddedBytes = Buffer.alloc(32);
    bytes.copy(paddedBytes, 0, 0, Math.min(bytes.length, 32));

    // Convert to hex string
    const hexString = '0x' + paddedBytes.toString('hex');

    console.log('CID conversion:', {
      original: cid,
      normalized: normalizedCid,
      bytes32: hexString
    });

    return hexString;
  } catch (error) {
    console.error('Error converting CID to bytes32:', error);
    return ethers.constants.HashZero;
  }
}

/**
 * Converts a bytes32 value from a smart contract back to a CID string
 * This improved version handles the conversion more robustly
 *
 * @param {string} bytes32 - The bytes32 hex string from the smart contract
 * @returns {string} - The CID string
 */
export const bytes32ToCid = (bytes32) => {
  try {
    if (!bytes32 || bytes32 === ethers.constants.HashZero) return ''

    // Remove '0x' prefix and trailing zeros
    const hex = bytes32.startsWith('0x') ? bytes32.substring(2) : bytes32
    const cleanHex = hex.replace(/0+$/, '')

    // Convert hex to bytes
    const bytes = Buffer.from(cleanHex, 'hex')

    // Try to detect the CID format
    let cid = '';

    // First try to interpret as UTF-8 string
    try {
      cid = bytes.toString('utf8').trim().replace(/\u0000/g, '');
    } catch (e) {
      // If that fails, keep the hex representation
      cid = cleanHex;
    }

    // If the result doesn't look like a valid CID, try to detect common prefixes in the bytes
    if (!cid.startsWith('bafy') && !cid.startsWith('Qm')) {
      // Check if the bytes contain a recognizable CID prefix
      const hexString = bytes.toString('hex');

      // Look for 'bafy' in hex (62616679)
      const bafyIndex = hexString.indexOf('62616679');
      if (bafyIndex >= 0) {
        const bafyBytes = Buffer.from(hexString.substring(bafyIndex), 'hex');
        cid = bafyBytes.toString('utf8');
      }
      // Look for 'Qm' in hex (516d)
      else {
        const qmIndex = hexString.indexOf('516d');
        if (qmIndex >= 0) {
          const qmBytes = Buffer.from(hexString.substring(qmIndex), 'hex');
          cid = qmBytes.toString('utf8');
        }
      }
    }

    // If we still don't have a valid-looking CID, use the original bytes
    if (!cid || cid.length < 5) {
      // Just use the hex as is, but add a prefix to indicate it's a raw conversion
      cid = 'raw-' + cleanHex.substring(0, 40); // Limit length for display
    }

    console.log('Bytes32 conversion:', {
      original: bytes32,
      cleanHex: cleanHex,
      cid: cid
    })

    return cid
  } catch (error) {
    console.error('Error converting bytes32 to CID:', error)
    return ''
  }
}

/**
 * Validates if a string is a valid CID
 * This improved version handles different CID formats
 *
 * @param {string} cid - The CID string to validate
 * @returns {boolean} - True if the CID is valid, false otherwise
 */
export const isValidCid = (cid) => {
  console.log('Validating CID:', cid);

  if (!cid || typeof cid !== 'string') {
    console.log('CID is empty or not a string');
    return false;
  }

  // Handle CIDs with protocol prefixes
  let normalizedCid = cid;
  if (normalizedCid.startsWith('ipfs://')) {
    normalizedCid = normalizedCid.substring(7);
  }

  // Handle hex format CIDs
  if (normalizedCid.startsWith('0x')) {
    // If it's a hex string with reasonable length, consider it valid
    const hexPattern = /^0x[0-9a-fA-F]{10,}$/;
    if (hexPattern.test(normalizedCid)) {
      console.log('Valid hex format CID');
      return true;
    }
  }

  // Check for common CID prefixes
  const hasValidPrefix = (
    normalizedCid.startsWith('bafy') || // Filecoin/IPFS v1 CID prefix
    normalizedCid.startsWith('Qm') ||   // IPFS v0 CID prefix
    normalizedCid.startsWith('raw-')    // Our custom prefix for raw bytes
  );

  // Check if it's a reasonable length for a CID
  const hasValidLength = normalizedCid.length >= 10;

  // Check if it contains only valid CID characters
  // More permissive than before to handle different encodings
  const validChars = /^[a-zA-Z0-9\-_=+\/]+$/;
  const hasValidChars = validChars.test(normalizedCid);

  // For our purposes, we'll accept CIDs that have a valid length and valid characters
  // For production, you would want to use a proper CID validation library
  const isValid = hasValidLength && hasValidChars;

  console.log('CID validation result:', {
    normalizedCid,
    hasValidPrefix,
    hasValidLength,
    hasValidChars,
    isValid
  });

  return isValid;
}

/**
 * Creates a CID URL for viewing the content
 *
 * @param {string} cid - The CID of the content
 * @returns {string} - The URL to view the content
 */
export const getCidUrl = (cid) => {
  if (!isValidCid(cid)) return ''

  // Use Lighthouse gateway for viewing content
  const gatewayUrl = import.meta.env.VITE_LIGHTHOUSE_NODE_URL || 'https://gateway.lighthouse.storage'
  return `${gatewayUrl}/ipfs/${cid}`
}

export default {
  cidToBytes32,
  bytes32ToCid,
  isValidCid,
  getCidUrl,
  MAX_CID_LENGTH
}
