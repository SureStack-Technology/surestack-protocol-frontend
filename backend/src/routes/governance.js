import express from 'express';
import {
  getAllProposals,
  getProposalDetails,
  getGovernanceStats,
  createProposal,
  castVote,
  queueProposal,
  executeProposal,
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

/**
 * @route   POST /api/governance/propose
 * @desc    Create a new proposal
 * @access  Public (requires wallet signature)
 */
router.post('/propose', async (req, res) => {
  try {
    const { targets, values, calldatas, description, signature } = req.body;
    
    if (!targets || !values || !calldatas || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targets, values, calldatas, description',
      });
    }
    
    const result = await createProposal(targets, values, calldatas, description, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/governance/vote
 * @desc    Cast a vote on a proposal
 * @access  Public (requires wallet signature)
 */
router.post('/vote', async (req, res) => {
  try {
    const { proposalId, support, reason, signature } = req.body;
    
    if (proposalId === undefined || support === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, support',
      });
    }
    
    const result = await castVote(proposalId, support, reason, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/governance/queue
 * @desc    Queue a proposal for timelock execution
 * @access  Public (requires wallet signature)
 */
router.post('/queue', async (req, res) => {
  try {
    const { proposalId, signature } = req.body;
    
    if (proposalId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: proposalId',
      });
    }
    
    const result = await queueProposal(proposalId, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/governance/execute
 * @desc    Execute a queued proposal after timelock
 * @access  Public (requires wallet signature)
 */
router.post('/execute', async (req, res) => {
  try {
    const { proposalId, signature } = req.body;
    
    if (proposalId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: proposalId',
      });
    }
    
    const result = await executeProposal(proposalId, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

