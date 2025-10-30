import express from 'express';
import {
  getAllProposals,
  getProposalDetails,
  getGovernanceStats,
} from '../services/governanceService.js';

const router = express.Router();

/**
 * @route   GET /api/governance
 * @desc    Get all proposals
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await getAllProposals();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/governance/stats
 * @desc    Get governance statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await getGovernanceStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/governance/:proposalId
 * @desc    Get specific proposal details
 * @access  Public
 */
router.get('/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await getProposalDetails(proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

