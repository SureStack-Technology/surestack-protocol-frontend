// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — Smart Contract Suite
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

/**
 * @title IRISKToken
 * @notice Interface for the native $RISK ERC-20 token, used for staking, rewards, and slashing.
 * The ConsensusAndStaking contract requires functions to transfer, check balances, and potentially burn/lock tokens.
 */
interface IRISKToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    // Note: In a production system, a separate burn/slash function may be required here.
}

/**
 * @title ConsensusAndStaking
 * @notice Manages validator profiles, token staking, assessment submissions, and the final round settlement process.
 * This contract is the core economic security layer of the RISK Protocol.
 */
contract ConsensusAndStaking {

    // --- STRUCTS & TYPES ---

    /**
     * @dev Struct representing an active validator's profile and metrics.
     * Stored in persistent storage.
     */
    struct ValidatorProfile {
        uint256 stakedAmount;      // Total $RISK tokens locked as collateral.
        uint16 accuracyScore;      // Rolling average accuracy (0-10000, for 4 decimal precision).
        uint256 totalRewards;      // Cumulative rewards earned.
        bool isActive;             // True if currently participating in consensus rounds.
        uint256 unstakeLockoutEnd; // Timestamp when staked funds can be fully withdrawn.
    }

    /**
     * @dev Struct storing data for a single assessment submission within a round.
     */
    struct AssessmentSubmission {
        address validatorAddress;
        uint8 riskScore;           // The calculated risk score (0-100).
        uint256 stakingWeight;     // The weight of the validator's stake at the time of submission.
    }

    /**
     * @dev Struct mirroring essential outputs from the Data Cleansing & Integrity Module (DCIM).
     * This data is published on-chain to ensure deterministic assessment calculation by Validators.
     */
    struct RoundData {
        uint64 epochTimestamp;             // Start time of the 30-second round.
        bytes32 correlationMatrixHash;      // Hash of the full RSEInputObject, guaranteeing RSE determinism.
        uint256 submissionWindowEnd;        // The maximum timestamp for assessment submissions (epochTimestamp + 35s).
        AssessmentSubmission[] submissions; // List of all valid assessments received in this round.
    }

    // --- IMMUTABLE & CONSTANTS ---

    IRISKToken public immutable riskToken;
    uint256 public constant MIN_STAKE_AMOUNT = 1000 ether; // Example minimum stake of 1000 RISK tokens.
    uint256 public constant COOLING_OFF_PERIOD = 7 days;  // Lockout period for unstaking funds.
    uint256 public constant ROUND_DURATION_SECONDS = 30;  // The base assessment cycle length.
    uint256 public constant SUBMISSION_WINDOW_SECONDS = 5; // Time allowed for validators to submit (after T+30s).
    uint8 public immutable SLASHING_THRESHOLD = 5; // Score deviation (e.g., 5 points) triggering a slash.

    // --- STATE VARIABLES ---

    mapping(address => ValidatorProfile) public validatorProfiles;
    uint256 public currentRoundId;
    RoundData public currentRound;
    address public sequencerAddress; // Address authorized to initiate the round settlement.

    // --- EVENTS ---

    event Staked(address indexed validator, uint256 amount);
    event UnstakeRequested(address indexed validator, uint256 amount, uint256 unlockTime);
    event AssessmentSubmitted(address indexed validator, uint256 roundId, uint8 score);
    event RoundSettled(uint256 indexed roundId, uint8 finalScore, uint256 totalRewardsPaid);
    event ValidatorSlashed(address indexed validator, uint256 slashedAmount);
    event RoundDataPublished(uint256 roundId, uint64 epochTimestamp, bytes32 inputHash);

    // --- MODIFIERS ---

    modifier onlySequencer() {
        require(msg.sender == sequencerAddress, "CSC: Only sequencer can call this function.");
        _;
    }

    // --- CONSTRUCTION ---

    constructor(address _riskTokenAddress, address _sequencerAddress) {
        riskToken = IRISKToken(_riskTokenAddress);
        sequencerAddress = _sequencerAddress;
        // Initialize the first round data structure
        currentRound.epochTimestamp = uint64(block.timestamp);
        currentRound.submissionWindowEnd = uint256(currentRound.epochTimestamp) + ROUND_DURATION_SECONDS + SUBMISSION_WINDOW_SECONDS;
    }

    // --- STAKING AND UNSTAKING LOGIC ---

    /**
     * @notice Allows an address to stake RISK tokens to become a validator.
     * @param _amount The amount of $RISK tokens to stake.
     */
    function stake(uint256 _amount) external {
        require(_amount >= MIN_STAKE_AMOUNT, "CSC: Stake below minimum required amount.");

        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        profile.stakedAmount += _amount;

        // Ensure the total staked amount meets the minimum requirement after the addition
        require(profile.stakedAmount >= MIN_STAKE_AMOUNT, "CSC: Total stake is insufficient.");

        // Lock the tokens from the sender's wallet to this contract
        bool success = riskToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "CSC: Token transfer failed. Check approval.");

        if (!profile.isActive) {
            profile.isActive = true;
            // First time staker: set initial accuracy high to give them a start
            profile.accuracyScore = 10000;
        }

        emit Staked(msg.sender, _amount);
    }

    /**
     * @notice Requests to unstake a portion of the collateral. Funds are locked during the cooling-off period.
     * @param _amount The amount of $RISK tokens to unstake.
     */
    function requestUnstake(uint256 _amount) external {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        require(profile.isActive, "CSC: Validator is not active.");
        require(profile.stakedAmount >= _amount, "CSC: Insufficient staked amount.");

        // Ensure the remaining stake is sufficient to cover MIN_STAKE_AMOUNT
        require(profile.stakedAmount - _amount >= MIN_STAKE_AMOUNT || profile.stakedAmount - _amount == 0,
            "CSC: Remaining stake must meet the minimum threshold."
        );

        profile.stakedAmount -= _amount;
        profile.unstakeLockoutEnd = block.timestamp + COOLING_OFF_PERIOD;

        emit UnstakeRequested(msg.sender, _amount, profile.unstakeLockoutEnd);
    }

    /**
     * @notice Finalizes the unstaking process after the cooling-off period expires.
     */
    function withdrawUnstakedFunds() external {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        // Note: This simplified draft assumes the requestUnstake logic handles the amount;
        // a production contract would track pending withdrawal amounts.
        require(block.timestamp > profile.unstakeLockoutEnd, "CSC: Cooling-off period not expired.");
        
        // Example: Transfer all remaining staked tokens if the profile is being fully deactivated
        if (profile.stakedAmount == 0) {
            profile.isActive = false;
            // Transfer back the entire balance held by the contract for this validator (simplified)
            // In a real system, tracking specific withdrawal amounts is necessary.
            uint256 contractBalance = riskToken.balanceOf(address(this));
            require(riskToken.transfer(msg.sender, contractBalance), "CSC: Withdrawal failed.");
        }
    }


    // --- ROUND MANAGEMENT ---

    /**
     * @notice Called by the Sequencer to publish the finalized DCIM output hash for the current round.
     * This marks the start of the Validator assessment period (T+30s).
     * @param _epochTimestamp The verified start time of the assessment window.
     * @param _correlationMatrixHash The SHA-256 hash of the RSEInputObject (DCIM output).
     */
    function publishRoundData(uint64 _epochTimestamp, bytes32 _correlationMatrixHash) external onlySequencer {
        // Ensure no data is published for an un-settled round
        require(block.timestamp >= currentRound.submissionWindowEnd, "CSC: Previous round not yet settled.");
        
        // Increment round ID and reset storage for the new round
        currentRoundId++;
        delete currentRound; // Clears the submissions array

        currentRound.epochTimestamp = _epochTimestamp;
        currentRound.correlationMatrixHash = _correlationMatrixHash;
        currentRound.submissionWindowEnd = block.timestamp + SUBMISSION_WINDOW_SECONDS; // Only 5 seconds to submit

        emit RoundDataPublished(currentRoundId, _epochTimestamp, _correlationMatrixHash);
    }


    /**
     * @notice Allows a Validator to submit their calculated Risk Score.
     * The submission must be based on the latest published round data and adhere to the time window.
     * @param _riskScore The calculated risk score (0-100).
     * @param _correlationMatrixHash The RSEInputObject hash used for the calculation.
     */
    function submitAssessment(uint8 _riskScore, bytes32 _correlationMatrixHash) external {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        require(profile.isActive, "CSC: Caller is not an active validator.");
        require(profile.stakedAmount > 0, "CSC: Validator stake is zero.");
        
        // 1. Deterministic Input Check: Ensure the Validator used the correct RSE input
        require(_correlationMatrixHash == currentRound.correlationMatrixHash, "CSC: Invalid input hash. Use latest DCIM data.");

        // 2. Time Window Check: Must submit during the open 5-second window
        require(block.timestamp > uint256(currentRound.epochTimestamp) + ROUND_DURATION_SECONDS, "CSC: Submission window not yet open.");
        require(block.timestamp <= currentRound.submissionWindowEnd, "CSC: Submission window closed.");
        
        // Check if the validator has already submitted
        for (uint i = 0; i < currentRound.submissions.length; i++) {
            require(currentRound.submissions[i].validatorAddress != msg.sender, "CSC: Already submitted for this round.");
        }

        // Store the submission
        currentRound.submissions.push(AssessmentSubmission({
            validatorAddress: msg.sender,
            riskScore: _riskScore,
            stakingWeight: profile.stakedAmount // Weight based on current stake
        }));

        emit AssessmentSubmitted(msg.sender, currentRoundId, _riskScore);
    }

    // --- CONSENSUS AND SETTLEMENT ---

    /**
     * @notice Initiates the final consensus calculation, reward distribution, and slashing.
     * This function is computationally heavy and must be called by the Sequencer.
     * NOTE: Complex weighted median sorting/calculation is mocked here due to gas limits.
     * A production environment would use a verifiable off-chain computation or a decentralized solver.
     */
    function calculateAndSettleRound() external onlySequencer {
        require(block.timestamp > currentRound.submissionWindowEnd, "CSC: Submission window is still open.");
        require(currentRound.submissions.length > 0, "CSC: No assessments submitted for settlement.");

        // --- PHASE 1: Determine Consensus Score (Mocked for Gas Efficiency) ---
        
        // In reality, this would require:
        // 1. Sorting the submissions array by riskScore.
        // 2. Calculating the cumulative weighted stake.
        // 3. Finding the riskScore that corresponds to the 50th percentile of the total weighted stake (Weighted Median).
        
        uint8 consensusScore;
        // Mock: For demonstration, assume the consensus score is the median of the first 3 submissions
        if (currentRound.submissions.length >= 3) {
            consensusScore = (currentRound.submissions[0].riskScore + currentRound.submissions[1].riskScore + currentRound.submissions[2].riskScore) / 3;
        } else {
            consensusScore = currentRound.submissions[0].riskScore;
        }

        // --- PHASE 2: Reward and Slashing Enforcement ---

        uint256 totalRewardsPaid = 0;
        // Note: The reward pool would need to be funded externally or via transaction fees.
        uint256 REWARD_PER_ROUND = 100 ether; 

        for (uint i = 0; i < currentRound.submissions.length; i++) {
            AssessmentSubmission storage sub = currentRound.submissions[i];
            ValidatorProfile storage profile = validatorProfiles[sub.validatorAddress];
            
            // Check for deviation from consensus
            uint256 deviation = (sub.riskScore > consensusScore) ? 
                                sub.riskScore - consensusScore : 
                                consensusScore - sub.riskScore;

            if (deviation <= SLASHING_THRESHOLD) {
                // Reward: Submission is within the acceptable threshold.
                // Rewards are weighted by the stake
                uint256 rewardAmount = (REWARD_PER_ROUND * sub.stakingWeight) / (profile.stakedAmount); 
                profile.totalRewards += rewardAmount;
                totalRewardsPaid += rewardAmount;
                // Note: The actual token transfer occurs later or is managed by a separate distributor.
                
                // Update Accuracy Score (e.g., increase by 1%)
                profile.accuracyScore = profile.accuracyScore + ((10000 - profile.accuracyScore) / 100); 

            } else {
                // Slashing: Submission deviates significantly.
                uint256 slashPercentage = 5; // Example: 5% slash on stake for significant deviation.
                uint256 slashAmount = (profile.stakedAmount * slashPercentage) / 100;
                
                profile.stakedAmount -= slashAmount;
                // Decrement Accuracy Score (e.g., decrease by 10%)
                profile.accuracyScore = profile.accuracyScore - (profile.accuracyScore / 10);
                
                // Note: The slashAmount tokens remain locked in the contract or are burned/transferred to a penalty pool.
                emit ValidatorSlashed(sub.validatorAddress, slashAmount);
            }
        }

        // --- PHASE 3: Finalization ---
        // Transfer rewards (assuming rewards are pre-funded in the contract)
        // Omitted for simplicity; a transfer loop would be placed here.

        // Prepare for the next round by clearing the old submission data
        delete currentRound.submissions;
        
        emit RoundSettled(currentRoundId, consensusScore, totalRewardsPaid);
    }
}
