import { ethers } from 'ethers'

/**
 * Format wei to ether
 * Handles BigInt, string, and number inputs safely
 */
export const formatEther = (value) => {
  if (!value && value !== 0n) return '0'
  try {
    // Handle BigInt
    if (typeof value === 'bigint') {
      return ethers.formatEther(value)
    }
    // Handle string or number
    return ethers.formatEther(String(value))
  } catch (error) {
    console.error('Error formatting ether:', error)
    return '0'
  }
}

/**
 * Parse ether to wei
 */
export const parseEther = (value) => {
  try {
    return ethers.parseEther(value.toString())
  } catch {
    return BigInt(0)
  }
}

/**
 * Format address (show first 6 and last 4 chars)
 */
export const formatAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format number with commas
 * Handles BigInt, string, and number inputs safely
 */
export const formatNumber = (num, decimals = 2) => {
  if (!num && num !== 0 && num !== 0n) return '0'
  try {
    // Handle BigInt
    if (typeof num === 'bigint') {
      return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    }
    // Handle string or number
    const numValue = typeof num === 'string' ? parseFloat(num) : Number(num)
    if (isNaN(numValue)) return '0'
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  } catch (error) {
    console.error('Error formatting number:', error)
    return '0'
  }
}

/**
 * Format USD value
 */
export const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString()
}

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 2) => {
  if (!value && value !== 0) return '0%'
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Convert from 1e8 precision to readable number
 * Handles BigInt, string, and number inputs safely
 */
export const fromPrecision8 = (value) => {
  if (!value && value !== 0n) return '0'
  try {
    // Handle BigInt
    if (typeof value === 'bigint') {
      return (Number(value) / 1e8).toFixed(2)
    }
    // Handle string or number
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value)
    if (isNaN(numValue)) return '0'
    return (numValue / 1e8).toFixed(2)
  } catch (error) {
    console.error('Error converting from precision 8:', error)
    return '0'
  }
}

