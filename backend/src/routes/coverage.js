import express from 'express';
import {
  getAllCoveragePools,
  getCoveragePoolDetails,
  getCoverageStats,
} from '../services/coverageService.js';

const router = express.Router();

/**
 * @route   GET /api/coverage
 * @desc    Get all coverage pools
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await getAllCoveragePools();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/coverage/stats
 * @desc    Get coverage statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await getCoverageStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/coverage/:poolId
 * @desc    Get specific coverage pool details
 * @access  Public
 */
router.get('/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    const result = await getCoveragePoolDetails(poolId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

