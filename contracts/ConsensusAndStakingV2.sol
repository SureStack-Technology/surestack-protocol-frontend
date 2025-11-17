// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — ConsensusAndStakingV2 Smart Contract
/// @dev Enhanced consensus and staking with RewardPool integration, Oracle validation, and governance controls
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RewardPoolAndSlasher.sol";
import "./OracleReaderV2.sol";
import "./SureStackToken.sol";

/**
 * @title ConsensusAndStakingV2
 * @notice Enhanced consensus and staking contract with RewardPool integration, Oracle validation, and governance
 * Manages validator profiles, token staking, assessment submissions, and weighted median consensus settlement
 */
contract ConsensusAndStakingV2 is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // --- STRUCTS & TYPES ---

    /**
     * @dev Struct representing an active validator's profile and metrics
     */
    struct ValidatorProfile {
        uint256 stakedAmount;      // Total SST tokens locked as collateral
        uint16 accuracyScore;      // Rolling average accuracy (0-10000, for 4 decimal precision)
        uint256 totalRewards;      // Cumulative rewards earned
        bool isActive;             // True if currently participating in consensus rounds
        uint256 unstakeLockoutEnd; // Timestamp when staked funds can be fully withdrawn
        uint256 pendingUnstake;    // Amount pending unstake (after cooling period)
    }

    /**
     * @dev Struct storing data for a single assessment submission within a round
     */
    struct AssessmentSubmission {
        address validatorAddress;
        uint8 riskScore;           // The calculated risk score (0-100)
        uint256 stakingWeight;     // The weight of the validator's stake at the time of submission
    }

    /**
     * @dev Struct mirroring essential outputs from the Data Cleansing & Integrity Module (DCIM)
     */
    struct RoundData {
        uint64 epochTimestamp;             // Start time of the round
        bytes32 correlationMatrixHash;     // Hash of the full RSEInputObject
        uint256 submissionWindowEnd;       // Maximum timestamp for assessment submissions
        AssessmentSubmission[] submissions; // List of all valid assessments received
        bool isSettled;                    // Whether the round has been settled
        uint8 consensusScore;              // Final consensus score for this round
    }

    /**
     * @dev Struct for settlement results
     */
    struct SettlementResult {
        uint256 totalRewardsPaid;
        uint256 totalSlashed;
        uint256 validatorsRewarded;
        uint256 validatorsSlashed;
    }

    // --- IMMUTABLE & CONSTANTS ---

    IERC20 public immutable sureStackToken;
    RewardPoolAndSlasher public immutable rewardPool;
    OracleReaderV2 public immutable oracleReader;
    address public immutable governanceAddress;
    address public sequencerAddress;

    // --- STATE VARIABLES ---

    // Governance-controlled parameters
    uint256 public minStakeAmount;      // Minimum stake required to become a validator
    uint8 public slashingThreshold;     // Score deviation triggering a slash (0-100)
    uint256 public rewardPerRound;      // Base reward per round (in SST tokens)
    uint256 public roundDurationSeconds; // Duration of each round
    uint256 public submissionWindowSeconds; // Time allowed for validators to submit
    uint256 public coolingOffPeriod;     // Lockout period for unstaking funds

    // Validator and round data
    mapping(address => ValidatorProfile) public validatorProfiles;
    address[] private validatorList;
    mapping(address => bool) private validatorRegistered;
    uint256 public currentRoundId;
    RoundData public currentRound;
    
    // Round history
    mapping(uint256 => RoundData) public roundHistory;

    // --- EVENTS ---

    event RoundStarted(
        uint256 indexed roundId,
        uint64 epochTimestamp,
        bytes32 correlationMatrixHash,
        uint256 submissionWindowEnd
    );

    event RoundSettled(
        uint256 indexed roundId,
        uint8 consensusScore,
        uint256 totalRewardsPaid,
        uint256 totalSlashed,
        uint256 validatorsRewarded,
        uint256 validatorsSlashed
    );

    event ValidatorSlashed(
        address indexed validator,
        uint256 indexed roundId,
        uint256 slashedAmount,
        uint8 deviation,
        uint8 consensusScore,
        uint8 validatorScore
    );

    event RewardIssued(
        address indexed validator,
        uint256 indexed roundId,
        uint256 rewardAmount,
        uint8 deviation,
        uint256 newAccuracyScore
    );

    event ParamsUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue,
        address indexed executor
    );

    event Staked(address indexed validator, uint256 amount, uint256 totalStaked);
    event UnstakeRequested(address indexed validator, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed validator, uint256 amount);
    event AssessmentSubmitted(address indexed validator, uint256 indexed roundId, uint8 score);
    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);
    event ValidatorActivated(address indexed validator, uint256 amount);

    // --- MODIFIERS ---

    /**
     * @dev Restricts execution to governance address
     */
    modifier onlyGovernance() {
        require(
            msg.sender == governanceAddress || msg.sender == owner(),
            "CSCV2: Caller is not governance"
        );
        _;
    }

    /**
     * @dev Restricts execution to sequencer address
     */
    modifier onlySequencer() {
        require(msg.sender == sequencerAddress, "CSCV2: Only sequencer can call this function");
        _;
    }

    /**
     * @dev Validates that validator is active
     */
    modifier onlyActiveValidator() {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        require(profile.isActive, "CSCV2: Caller is not an active validator");
        require(profile.stakedAmount > 0, "CSCV2: Validator stake is zero");
        _;
    }

    // --- CONSTRUCTION ---

    /**
     * @notice Initializes ConsensusAndStakingV2 contract
     * @param _sureStackToken Address of SureStackToken (SST)
     * @param _rewardPool Address of RewardPoolAndSlasher
     * @param _oracleReader Address of OracleReaderV2
     * @param _governanceAddress Address of governance contract
     * @param _sequencerAddress Address of sequencer
     * @param _initialOwner Address of initial owner
     */
    constructor(
        address _sureStackToken,
        address _rewardPool,
        address _oracleReader,
        address _governanceAddress,
        address _sequencerAddress,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_sureStackToken != address(0), "CSCV2: Invalid token address");
        require(_rewardPool != address(0), "CSCV2: Invalid reward pool address");
        require(_oracleReader != address(0), "CSCV2: Invalid oracle address");
        require(_governanceAddress != address(0), "CSCV2: Invalid governance address");
        require(_sequencerAddress != address(0), "CSCV2: Invalid sequencer address");

        sureStackToken = IERC20(_sureStackToken);
        rewardPool = RewardPoolAndSlasher(_rewardPool);
        oracleReader = OracleReaderV2(_oracleReader);
        governanceAddress = _governanceAddress;
        sequencerAddress = _sequencerAddress;

        // Initialize default parameters
        minStakeAmount = 1000 * 1e18; // 1000 SST tokens
        slashingThreshold = 5; // 5 points deviation
        rewardPerRound = 100 * 1e18; // 100 SST tokens per round
        roundDurationSeconds = 30; // 30 seconds
        submissionWindowSeconds = 5; // 5 seconds
        coolingOffPeriod = 7 days; // 7 days

        // Initialize first round
        currentRoundId = 0;
        currentRound.epochTimestamp = uint64(block.timestamp);
        currentRound.submissionWindowEnd = block.timestamp + roundDurationSeconds + submissionWindowSeconds;
    }

    // --- STAKING AND UNSTAKING LOGIC ---

    /**
     * @notice Allows an address to stake SST tokens to become a validator
     * @param _amount The amount of SST tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount >= minStakeAmount, "CSCV2: Stake below minimum required amount");

        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        bool wasActive = profile.isActive;

        if (!validatorRegistered[msg.sender]) {
            validatorRegistered[msg.sender] = true;
            validatorList.push(msg.sender);
        }

        profile.stakedAmount += _amount;

        // Ensure total staked meets minimum requirement
        require(profile.stakedAmount >= minStakeAmount, "CSCV2: Total stake insufficient");

        // Transfer tokens from sender to this contract
        sureStackToken.safeTransferFrom(msg.sender, address(this), _amount);

        if (!wasActive) {
            profile.isActive = true;
            // First time staker: set initial accuracy high
            profile.accuracyScore = 10000;
            emit ValidatorActivated(msg.sender, _amount);
        }

        emit Staked(msg.sender, _amount, profile.stakedAmount);
    }

    /**
     * @notice Requests to unstake a portion of the collateral
     * @param _amount The amount of SST tokens to unstake
     */
    function requestUnstake(uint256 _amount) external nonReentrant whenNotPaused onlyActiveValidator {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        require(profile.stakedAmount >= _amount, "CSCV2: Insufficient staked amount");

        // Ensure remaining stake meets minimum or is zero
        require(
            profile.stakedAmount - _amount >= minStakeAmount || profile.stakedAmount - _amount == 0,
            "CSCV2: Remaining stake must meet minimum threshold"
        );

        profile.stakedAmount -= _amount;
        profile.pendingUnstake += _amount;
        profile.unstakeLockoutEnd = block.timestamp + coolingOffPeriod;

        emit UnstakeRequested(msg.sender, _amount, profile.unstakeLockoutEnd);
    }

    /**
     * @notice Finalizes the unstaking process after the cooling-off period expires
     */
    function withdrawUnstakedFunds() external nonReentrant whenNotPaused {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        require(block.timestamp > profile.unstakeLockoutEnd, "CSCV2: Cooling-off period not expired");
        require(profile.pendingUnstake > 0, "CSCV2: No pending unstake");

        uint256 amount = profile.pendingUnstake;
        profile.pendingUnstake = 0;

        // Deactivate if no stake remaining
        if (profile.stakedAmount == 0) {
            profile.isActive = false;
        }

        // Transfer tokens back to validator
        sureStackToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function getValidatorList() external view returns (address[] memory) {
        return validatorList;
    }

    /**
     * @notice Returns the total amount of SST currently staked across all validators
     */
    function getTotalStakedSST() external view returns (uint256 totalStaked) {
        uint256 length = validatorList.length;
        for (uint256 i = 0; i < length; i++) {
            totalStaked += validatorProfiles[validatorList[i]].stakedAmount;
        }
    }

    /**
     * @notice Returns a snapshot of validator counts (total vs active)
     */
    function getValidatorCounts() external view returns (uint256 totalValidators, uint256 activeValidators) {
        totalValidators = validatorList.length;
        for (uint256 i = 0; i < totalValidators; i++) {
            if (validatorProfiles[validatorList[i]].isActive) {
                unchecked {
                    activeValidators++;
                }
            }
        }
    }

    /**
     * @notice Returns the SST balance held by the staking contract (proxy for DAO treasury reserves)
     */
    function getDaoTreasurySST() external view returns (uint256) {
        return sureStackToken.balanceOf(address(this));
    }

    // --- ROUND MANAGEMENT ---

    /**
     * @notice Called by the Sequencer to publish round data and start a new round
     * @param _epochTimestamp The verified start time of the assessment window
     * @param _correlationMatrixHash The SHA-256 hash of the RSEInputObject (DCIM output)
     */
    function publishRoundData(uint64 _epochTimestamp, bytes32 _correlationMatrixHash) external onlySequencer whenNotPaused {
        // Ensure previous round is settled
        require(
            currentRound.isSettled || block.timestamp >= currentRound.submissionWindowEnd,
            "CSCV2: Previous round not yet settled"
        );

        // Validate oracle data before starting new round
        OracleReaderV2.FeedType primaryFeed = oracleReader.primaryFeed();
        (bool isValid, ) = oracleReader.validateData(primaryFeed);
        require(isValid, "CSCV2: Oracle data validation failed");

        // Save current round to history
        if (currentRoundId > 0) {
            roundHistory[currentRoundId] = currentRound;
        }

        // Increment round ID and reset for new round
        currentRoundId++;
        delete currentRound.submissions;

        currentRound.epochTimestamp = _epochTimestamp;
        currentRound.correlationMatrixHash = _correlationMatrixHash;
        currentRound.submissionWindowEnd = block.timestamp + roundDurationSeconds + submissionWindowSeconds;
        currentRound.isSettled = false;

        emit RoundStarted(currentRoundId, _epochTimestamp, _correlationMatrixHash, currentRound.submissionWindowEnd);
    }

    /**
     * @notice Allows a Validator to submit their calculated Risk Score
     * @param _riskScore The calculated risk score (0-100)
     * @param _correlationMatrixHash The RSEInputObject hash used for the calculation
     */
    function submitAssessment(uint8 _riskScore, bytes32 _correlationMatrixHash) external onlyActiveValidator whenNotPaused {
        ValidatorProfile storage profile = validatorProfiles[msg.sender];

        // Deterministic Input Check
        require(
            _correlationMatrixHash == currentRound.correlationMatrixHash,
            "CSCV2: Invalid input hash. Use latest DCIM data"
        );

        // Time Window Check
        require(
            block.timestamp > uint256(currentRound.epochTimestamp) + roundDurationSeconds,
            "CSCV2: Submission window not yet open"
        );
        require(block.timestamp <= currentRound.submissionWindowEnd, "CSCV2: Submission window closed");

        // Check if validator has already submitted
        for (uint256 i = 0; i < currentRound.submissions.length; i++) {
            require(
                currentRound.submissions[i].validatorAddress != msg.sender,
                "CSCV2: Already submitted for this round"
            );
        }

        // Store the submission
        currentRound.submissions.push(AssessmentSubmission({
            validatorAddress: msg.sender,
            riskScore: _riskScore,
            stakingWeight: profile.stakedAmount
        }));

        emit AssessmentSubmitted(msg.sender, currentRoundId, _riskScore);
    }

    // --- CONSENSUS AND SETTLEMENT ---

    /**
     * @notice Calculates weighted median consensus and settles the round
     * Distributes rewards and slashes based on deviation from consensus
     */
    function calculateAndSettleRound() external onlySequencer nonReentrant whenNotPaused {
        require(
            block.timestamp > currentRound.submissionWindowEnd,
            "CSCV2: Submission window is still open"
        );
        require(!currentRound.isSettled, "CSCV2: Round already settled");
        require(currentRound.submissions.length > 0, "CSCV2: No assessments submitted for settlement");

        // Validate oracle data before settlement
        OracleReaderV2.FeedType primaryFeed = oracleReader.primaryFeed();
        (bool isValid, ) = oracleReader.validateData(primaryFeed);
        require(isValid, "CSCV2: Oracle data validation failed before settlement");

        // Get volatility factor to adjust thresholds dynamically
        int256 volatilityFactor = oracleReader.getVolatilityFactor(primaryFeed);
        uint256 volatilityAdjustment = uint256(volatilityFactor > 0 ? volatilityFactor : -volatilityFactor);

        // Calculate weighted median consensus score
        uint8 consensusScore = calculateWeightedMedian();

        // Adjust slashing threshold based on volatility (higher volatility = more lenient threshold)
        uint8 adjustedSlashingThreshold = slashingThreshold;
        if (volatilityAdjustment > 5 * 1e6) { // If volatility > 5%
            adjustedSlashingThreshold = uint8(uint256(slashingThreshold) * 120 / 100); // Increase by 20%
        }

        // Process rewards and slashing
        SettlementResult memory result = processSettlements(
            consensusScore,
            adjustedSlashingThreshold
        );

        // Mark round as settled
        currentRound.isSettled = true;
        currentRound.consensusScore = consensusScore;

        emit RoundSettled(
            currentRoundId,
            consensusScore,
            result.totalRewardsPaid,
            result.totalSlashed,
            result.validatorsRewarded,
            result.validatorsSlashed
        );
    }

    /**
     * @notice Process settlements for all submissions
     * @param _consensusScore The consensus score for the round
     * @param _adjustedSlashingThreshold The adjusted slashing threshold based on volatility
     * @return result SettlementResult with all settlement statistics
     */
    function processSettlements(
        uint8 _consensusScore,
        uint8 _adjustedSlashingThreshold
    ) internal returns (SettlementResult memory result) {
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < currentRound.submissions.length; i++) {
            totalWeight += currentRound.submissions[i].stakingWeight;
        }

        for (uint256 i = 0; i < currentRound.submissions.length; i++) {
            AssessmentSubmission storage sub = currentRound.submissions[i];
            uint8 deviation = sub.riskScore > _consensusScore
                ? sub.riskScore - _consensusScore
                : _consensusScore - sub.riskScore;

            if (deviation <= _adjustedSlashingThreshold) {
                result = _processReward(sub, _consensusScore, deviation, totalWeight, result);
            } else {
                result = _processSlash(sub, deviation, result);
            }
        }

        return result;
    }

    /**
     * @notice Process reward for a validator
     */
    function _processReward(
        AssessmentSubmission storage _sub,
        uint8 /* _consensusScore */,
        uint8 _deviation,
        uint256 _totalWeight,
        SettlementResult memory _result
    ) internal returns (SettlementResult memory) {
        ValidatorProfile storage profile = validatorProfiles[_sub.validatorAddress];
        uint256 rewardAmount = (rewardPerRound * _sub.stakingWeight) / _totalWeight;
        
        if (rewardAmount > 0) {
            profile.totalRewards += rewardAmount;
            _result.totalRewardsPaid += rewardAmount;
            _result.validatorsRewarded++;

            // Update accuracy score
            profile.accuracyScore = profile.accuracyScore + ((10000 - profile.accuracyScore) / 100);

            // Distribute reward through RewardPool
            rewardPool.distributeReward(_sub.validatorAddress, rewardAmount);

            emit RewardIssued(
                _sub.validatorAddress,
                currentRoundId,
                rewardAmount,
                _deviation,
                profile.accuracyScore
            );
        }

        return _result;
    }

    /**
     * @notice Process slashing for a validator
     */
    function _processSlash(
        AssessmentSubmission storage _sub,
        uint8 _deviation,
        SettlementResult memory _result
    ) internal returns (SettlementResult memory) {
        ValidatorProfile storage profile = validatorProfiles[_sub.validatorAddress];
        uint256 slashPercentage = 5; // 5% slash on stake
        uint256 slashAmount = (profile.stakedAmount * slashPercentage) / 100;

        // Ensure we don't slash more than staked
        if (slashAmount > profile.stakedAmount) {
            slashAmount = profile.stakedAmount;
        }

        profile.stakedAmount -= slashAmount;
        _result.totalSlashed += slashAmount;
        _result.validatorsSlashed++;

        // Decrement accuracy score
        profile.accuracyScore = profile.accuracyScore - (profile.accuracyScore / 10);

        // Send slashed funds to RewardPool
        uint256 currentAllowance = sureStackToken.allowance(address(this), address(rewardPool));
        if (currentAllowance < slashAmount) {
            sureStackToken.safeIncreaseAllowance(address(rewardPool), slashAmount - currentAllowance);
        }
        sureStackToken.safeTransfer(address(rewardPool), slashAmount);
        rewardPool.receiveSlashedFunds(slashAmount, _sub.validatorAddress);

        emit ValidatorSlashed(
            _sub.validatorAddress,
            currentRoundId,
            slashAmount,
            _deviation,
            currentRound.consensusScore,
            _sub.riskScore
        );

        return _result;
    }

    /**
     * @notice Calculates weighted median of risk scores
     * @return Weighted median risk score (0-100)
     */
    function calculateWeightedMedian() internal view returns (uint8) {
        if (currentRound.submissions.length == 0) {
            return 0;
        }

        if (currentRound.submissions.length == 1) {
            return currentRound.submissions[0].riskScore;
        }

        // Calculate total weight
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < currentRound.submissions.length; i++) {
            totalWeight += currentRound.submissions[i].stakingWeight;
        }

        // Sort submissions by risk score (simple bubble sort for small arrays)
        AssessmentSubmission[] memory sorted = new AssessmentSubmission[](currentRound.submissions.length);
        for (uint256 i = 0; i < currentRound.submissions.length; i++) {
            sorted[i] = currentRound.submissions[i];
        }

        // Bubble sort by riskScore
        for (uint256 i = 0; i < sorted.length; i++) {
            for (uint256 j = 0; j < sorted.length - i - 1; j++) {
                if (sorted[j].riskScore > sorted[j + 1].riskScore) {
                    AssessmentSubmission memory temp = sorted[j];
                    sorted[j] = sorted[j + 1];
                    sorted[j + 1] = temp;
                }
            }
        }

        // Find weighted median
        uint256 cumulativeWeight = 0;
        uint256 medianWeight = totalWeight / 2;

        for (uint256 i = 0; i < sorted.length; i++) {
            cumulativeWeight += sorted[i].stakingWeight;
            if (cumulativeWeight >= medianWeight) {
                return sorted[i].riskScore;
            }
        }

        // Fallback to last element
        return sorted[sorted.length - 1].riskScore;
    }

    // --- GOVERNANCE FUNCTIONS ---

    /**
     * @notice Set minimum stake amount (governance only)
     * @param _newMinStake New minimum stake amount
     */
    function setMinStakeAmount(uint256 _newMinStake) external onlyGovernance {
        require(_newMinStake > 0, "CSCV2: Min stake must be greater than zero");
        uint256 oldValue = minStakeAmount;
        minStakeAmount = _newMinStake;
        emit ParamsUpdated("minStakeAmount", oldValue, _newMinStake, msg.sender);
    }

    /**
     * @notice Set slashing threshold (governance only)
     * @param _newThreshold New slashing threshold (0-100)
     */
    function setSlashingThreshold(uint8 _newThreshold) external onlyGovernance {
        require(_newThreshold <= 100, "CSCV2: Threshold exceeds 100");
        uint8 oldValue = slashingThreshold;
        slashingThreshold = _newThreshold;
        emit ParamsUpdated("slashingThreshold", oldValue, _newThreshold, msg.sender);
    }

    /**
     * @notice Set reward per round (governance only)
     * @param _newReward New reward per round (in SST tokens)
     */
    function setRewardPerRound(uint256 _newReward) external onlyGovernance {
        require(_newReward > 0, "CSCV2: Reward must be greater than zero");
        uint256 oldValue = rewardPerRound;
        rewardPerRound = _newReward;
        emit ParamsUpdated("rewardPerRound", oldValue, _newReward, msg.sender);
    }

    /**
     * @notice Set round duration (governance only)
     * @param _newDuration New round duration in seconds
     */
    function setRoundDuration(uint256 _newDuration) external onlyGovernance {
        require(_newDuration > 0, "CSCV2: Duration must be greater than zero");
        uint256 oldValue = roundDurationSeconds;
        roundDurationSeconds = _newDuration;
        emit ParamsUpdated("roundDurationSeconds", oldValue, _newDuration, msg.sender);
    }

    /**
     * @notice Set submission window duration (governance only)
     * @param _newWindow New submission window in seconds
     */
    function setSubmissionWindow(uint256 _newWindow) external onlyGovernance {
        require(_newWindow > 0, "CSCV2: Window must be greater than zero");
        uint256 oldValue = submissionWindowSeconds;
        submissionWindowSeconds = _newWindow;
        emit ParamsUpdated("submissionWindowSeconds", oldValue, _newWindow, msg.sender);
    }

    /**
     * @notice Set cooling-off period (governance only)
     * @param _newPeriod New cooling-off period in seconds
     */
    function setCoolingOffPeriod(uint256 _newPeriod) external onlyGovernance {
        require(_newPeriod > 0, "CSCV2: Period must be greater than zero");
        uint256 oldValue = coolingOffPeriod;
        coolingOffPeriod = _newPeriod;
        emit ParamsUpdated("coolingOffPeriod", oldValue, _newPeriod, msg.sender);
    }

    /**
     * @notice Set sequencer address (governance only)
     * @param _newSequencer New sequencer address
     */
    function setSequencerAddress(address _newSequencer) external onlyGovernance {
        require(_newSequencer != address(0), "CSCV2: Invalid sequencer address");
        address oldSequencer = sequencerAddress;
        sequencerAddress = _newSequencer;
        emit SequencerUpdated(oldSequencer, _newSequencer);
    }

    /**
     * @notice Pause contract (governance only)
     */
    function pause() external onlyGovernance {
        _pause();
    }

    /**
     * @notice Unpause contract (governance only)
     */
    function unpause() external onlyGovernance {
        _unpause();
    }

    // --- VIEW FUNCTIONS ---

    /**
     * @notice Get validator profile
     * @param _validator Address of validator
     * @return ValidatorProfile struct
     */
    function getValidatorProfile(address _validator) external view returns (ValidatorProfile memory) {
        return validatorProfiles[_validator];
    }

    /**
     * @notice Get current round data
     * @return RoundData struct
     */
    function getCurrentRound() external view returns (RoundData memory) {
        return currentRound;
    }

    /**
     * @notice Get round history
     * @param _roundId Round ID
     * @return RoundData struct
     */
    function getRoundHistory(uint256 _roundId) external view returns (RoundData memory) {
        return roundHistory[_roundId];
    }

    /**
     * @notice Get total number of active validators
     * @return count Number of active validators
     */
    function getActiveValidatorCount() public view returns (uint256 count) {
        address[] memory list = validatorList;
        for (uint256 i = 0; i < list.length; i++) {
            if (validatorProfiles[list[i]].isActive) {
                count++;
            }
        }
        return count;
    }
}

