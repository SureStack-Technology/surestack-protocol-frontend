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
    const result = await getPriceWithRefresh();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: null,
    });
  }
});

/**
 * @route   GET /api/oracle/price
 * @desc    Get just the price value (simplified response)
 * @access  Public
 */
router.get('/price', async (req, res) => {
  try {
    const result = await getOracleData();
    
    if (result.success && result.data) {
      res.json({
        success: true,
        price: result.data.price,
        currency: 'USD',
        updatedAt: result.data.updatedAt,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

