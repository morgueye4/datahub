/**
 * Utility functions for handling dates consistently across the application
 */

/**
 * Converts a JavaScript Date object to a Unix timestamp (seconds since epoch)
 * @param {Date} date - JavaScript Date object
 * @returns {number} Unix timestamp (seconds since epoch)
 */
export const dateToUnixTimestamp = (date) => {
  if (!date) return null
  return Math.floor(date.getTime() / 1000)
}

/**
 * Converts a Unix timestamp (seconds since epoch) to a JavaScript Date object
 * @param {number} timestamp - Unix timestamp (seconds since epoch)
 * @returns {Date} JavaScript Date object
 */
export const unixTimestampToDate = (timestamp) => {
  if (!timestamp) return null
  
  // If it's already in milliseconds (> year 2286), use as is
  if (timestamp > 10000000000) {
    return new Date(timestamp)
  }
  
  // Otherwise, convert from seconds to milliseconds
  return new Date(timestamp * 1000)
}

/**
 * Formats a date for display in the UI
 * @param {Date|number|string} date - Date to format (can be Date object, Unix timestamp, or ISO string)
 * @param {string} format - Format to use (default: 'full')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'full') => {
  if (!date) return 'N/A'
  
  let dateObj
  
  // Convert to Date object if it's not already
  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'number') {
    dateObj = unixTimestampToDate(date)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    return 'Invalid date'
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  // Format based on the requested format
  switch (format) {
    case 'date':
      return dateObj.toLocaleDateString()
    case 'time':
      return dateObj.toLocaleTimeString()
    case 'short':
      return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    case 'iso':
      return dateObj.toISOString()
    case 'unix':
      return dateToUnixTimestamp(dateObj).toString()
    case 'full':
    default:
      return dateObj.toLocaleString()
  }
}

/**
 * Checks if a deadline has passed
 * @param {Date|number|string} deadline - Deadline to check
 * @returns {boolean} True if the deadline has passed, false otherwise
 */
export const isDeadlinePassed = (deadline) => {
  if (!deadline) return false
  
  let deadlineDate
  
  // Convert to Date object if it's not already
  if (deadline instanceof Date) {
    deadlineDate = deadline
  } else if (typeof deadline === 'number') {
    deadlineDate = unixTimestampToDate(deadline)
  } else if (typeof deadline === 'string') {
    deadlineDate = new Date(deadline)
  } else {
    return false
  }
  
  // Check if the deadline is valid
  if (isNaN(deadlineDate.getTime())) {
    return false
  }
  
  // Compare with current date
  return deadlineDate < new Date()
}
