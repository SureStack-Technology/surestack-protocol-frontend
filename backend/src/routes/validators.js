import express from 'express';
import {
  getAllValidators,
  getValidatorDetails,
  getValidatorStats,
} from '../services/validatorService.js';

const router = express.Router();

/**
 * @route   GET /api/validators
 * @desc    Get all validators
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await getAllValidators();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/validators/stats
 * @desc    Get validator statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await getValidatorStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/validators/:address
 * @desc    Get specific validator details
 * @access  Public
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await getValidatorDetails(address);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

