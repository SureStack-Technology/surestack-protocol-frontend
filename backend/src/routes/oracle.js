import express from 'express';
import {
  getOracleData,
  getPriceWithRefresh,
} from '../services/oracleService.js';

const router = express.Router();

/**
 * @route   GET /api/oracle
 * @desc    Get latest Chainlink ETH/USD price feed data
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await getPriceWithRefresh()

    if (result.success) {
      res.json(result)
      return
    }
    // Degraded oracle must not surface as 500 — clients keep dashboards usable.
    res.status(200).json(result)
  } catch (error) {
    res.status(200).json({
      success: false,
      error: error.message,
      data: null,
    })
  }
})

/**
 * @route   GET /api/oracle/price
 * @desc    Get just the price value (simplified response)
 * @access  Public
 */
router.get('/price', async (req, res) => {
  try {
    const result = await getOracleData()

    if (result.success && result.data) {
      res.json({
        success: true,
        price: result.data.price,
        currency: 'USD',
        updatedAt: result.data.updatedAt,
        cached: Boolean(result.cached),
        stale: Boolean(result.stale),
      })
      return
    }
    res.status(200).json({
      success: false,
      error: result.error || 'oracle_unavailable',
      price: null,
      cached: Boolean(result.cached),
      stale: Boolean(result.stale),
    })
  } catch (error) {
    res.status(200).json({
      success: false,
      error: error.message,
      price: null,
    })
  }
})

export default router;

