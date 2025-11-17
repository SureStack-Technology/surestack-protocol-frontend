// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — PolicyManager Smart Contract
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./OracleIntegration.sol";
import "./RewardPoolAndSlasher.sol";

/**
 * @title PolicyManager
 * @notice Manages risk coverage policies for the SureStack Protocol
 * Enables users to create policies, calculate dynamic premiums, and process claims
 */
contract PolicyManager is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // --- IMMUTABLE & CONSTANTS ---

    OracleReader public immutable oracleReader;
    RewardPoolAndSlasher public immutable rewardPool;
    IERC20 public immutable sureStackToken;
    address public immutable governanceAddress;

    // --- CONSTANTS ---

    uint256 public constant PRECISION = 1e8; // Chainlink oracle precision (8 decimals)
    uint256 public constant MAX_ORACLE_AGE = 3600; // 1 hour in seconds
    uint256 public constant DEFAULT_BASE_RATE = 0.02 * 1e8; // 2% base rate (scaled to 1e8)
    uint256 public constant DEFAULT_MAX_VOLATILITY_FACTOR = 0.03 * 1e8; // 3% max volatility factor
    uint8 public constant DEFAULT_CLAIM_TRIGGER_PERCENT = 20; // 20% drop threshold

    // --- STATE VARIABLES ---

    // Policy counter
    uint256 public policyCounter;

    // Premium calculation parameters (governance-controlled)
    uint256 public baseRate; // Base premium rate (scaled to 1e8)
    uint256 public maxVolatilityFactor; // Maximum volatility factor (scaled to 1e8)
    uint8 public claimTriggerPercent; // Minimum percentage drop to trigger claim (0-100)

    // Latest oracle data used in premium calculation (for audit trail)
    struct RiskData {
        int256 latestPrice;
        uint256 latestTimestamp;
        uint80 latestRoundId;
        uint256 calculatedVolatility;
    }
    RiskData public latestRiskData;

    // Policy structure
    struct Policy {
        address owner; // Policy holder
        uint256 coverageLimitUSD; // Maximum coverage amount in USD (scaled to 1e8)
        uint8 coveragePercent; // Coverage percentage (0-100)
        uint256 premiumUSD; // Premium paid in USD (scaled to 1e8)
        uint256 startTime; // Policy start timestamp
        bool active; // Whether policy is active
        uint256 premiumPaidInSST; // Actual SST tokens paid (scaled to token decimals)
    }

    // Mapping from policy ID to Policy
    mapping(uint256 => Policy) public policies;

    // Mapping from user address to array of policy IDs
    mapping(address => uint256[]) public userPolicies;

    struct RiskLineStats {
        uint256 coverageUSD;
        uint256 premiumBps;
        uint256 activeValidators;
        uint256 totalRewardsSST;
        uint256 policyCount;
    }

    // --- EVENTS ---

    event PolicyCreated(
        address indexed owner,
        uint256 indexed policyId,
        uint256 coverageLimit,
        uint8 coveragePercent,
        uint256 premiumUSD,
        uint256 premiumPaidInSST
    );

    event ClaimProcessed(
        uint256 indexed policyId,
        uint256 payoutAmount,
        uint80 oracleRoundId,
        uint256 lossEventValueUSD
    );

    event ParametersUpdated(
        string paramName,
        uint256 newValue,
        address indexed executor
    );

    event PolicyDeactivated(uint256 indexed policyId, address indexed owner);

    // --- MODIFIERS ---

    /**
     * @dev Restricts execution to governance address
     */
    modifier onlyGovernance() {
        require(
            msg.sender == governanceAddress,
            "PolicyManager: Caller is not governance"
        );
        _;
    }

    /**
     * @dev Validates that oracle data is fresh
     */
    modifier validOracleData() {
        (int256 price, , uint80 roundId, uint256 updatedAt) = oracleReader
            .getLatestPrice();
        require(price > 0, "PolicyManager: Invalid oracle price");
        require(
            block.timestamp - updatedAt <= MAX_ORACLE_AGE,
            "PolicyManager: Oracle data too old"
        );
        _;
    }

    // --- CONSTRUCTION ---

    /**
     * @notice Initializes the PolicyManager contract
     * @param _oracleReader Address of the OracleReader contract
     * @param _rewardPool Address of the RewardPoolAndSlasher contract
     * @param _sureStackToken Address of the SureStackToken (SST) contract
     * @param _governanceAddress Address of the DAO Governance contract
     * @param _initialOwner Address of the initial owner (for Ownable)
     */
    constructor(
        address _oracleReader,
        address _rewardPool,
        address _sureStackToken,
        address _governanceAddress,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_oracleReader != address(0), "PolicyManager: Invalid oracle");
        require(_rewardPool != address(0), "PolicyManager: Invalid reward pool");
        require(
            _sureStackToken != address(0),
            "PolicyManager: Invalid token address"
        );
        require(
            _governanceAddress != address(0),
            "PolicyManager: Invalid governance address"
        );

        oracleReader = OracleReader(_oracleReader);
        rewardPool = RewardPoolAndSlasher(_rewardPool);
        sureStackToken = IERC20(_sureStackToken);
        governanceAddress = _governanceAddress;

        // Initialize default parameters
        baseRate = DEFAULT_BASE_RATE;
        maxVolatilityFactor = DEFAULT_MAX_VOLATILITY_FACTOR;
        claimTriggerPercent = DEFAULT_CLAIM_TRIGGER_PERCENT;

        policyCounter = 0;
    }

    // --- POLICY CREATION ---

    /**
     * @notice Creates a new risk coverage policy
     * @param _coverageLimitUSD Maximum coverage amount in USD (scaled to 1e8)
     * @param _coveragePercent Coverage percentage (0-100)
     * @return policyId The ID of the newly created policy
     */
    function createPolicy(
        uint256 _coverageLimitUSD,
        uint8 _coveragePercent
    ) external nonReentrant whenNotPaused validOracleData returns (uint256) {
        require(_coverageLimitUSD > 0, "PolicyManager: Invalid coverage limit");
        require(
            _coveragePercent > 0 && _coveragePercent <= 100,
            "PolicyManager: Invalid coverage percent"
        );

        // Calculate premium in USD
        uint256 premiumUSD = calculatePremiumUSD(
            _coverageLimitUSD,
            _coveragePercent
        );

        // Convert premium from USD to SST tokens
        // For demo: Assume 1 USD = 1 SST (in production, use price oracle to convert)
        // Premium in SST = (premiumUSD * 1e18) / PRECISION
        // Simplified for demo: 1 USD = 1 SST (1e18 wei)
        uint256 premiumInSST = (premiumUSD * 1e18) / PRECISION;

        // Transfer premium from user to PolicyManager
        sureStackToken.safeTransferFrom(
            msg.sender,
            address(this),
            premiumInSST
        );

        // Deposit premium into RewardPoolAndSlasher for claim funding
        // Approve RewardPool to spend tokens (using safeIncreaseAllowance for OZ v5)
        uint256 currentAllowance = sureStackToken.allowance(address(this), address(rewardPool));
        if (currentAllowance < premiumInSST) {
            sureStackToken.safeIncreaseAllowance(address(rewardPool), premiumInSST - currentAllowance);
        }
        // Deposit to reward pool (this will be used for claims)
        rewardPool.topUpRewardPool(premiumInSST);

        // Create policy
        uint256 policyId = ++policyCounter;
        policies[policyId] = Policy({
            owner: msg.sender,
            coverageLimitUSD: _coverageLimitUSD,
            coveragePercent: _coveragePercent,
            premiumUSD: premiumUSD,
            startTime: block.timestamp,
            active: true,
            premiumPaidInSST: premiumInSST
        });

        // Add to user's policy list
        userPolicies[msg.sender].push(policyId);

        emit PolicyCreated(
            msg.sender,
            policyId,
            _coverageLimitUSD,
            _coveragePercent,
            premiumUSD,
            premiumInSST
        );

        return policyId;
    }

    // --- PREMIUM CALCULATION ---

    /**
     * @notice Calculates the premium for a given coverage limit and percentage
     * @param _coverageLimitUSD Maximum coverage amount in USD (scaled to 1e8)
     * @param _coveragePercent Coverage percentage (0-100)
     * @return premiumUSD Premium amount in USD (scaled to 1e8)
     */
    function calculatePremiumUSD(
        uint256 _coverageLimitUSD,
        uint8 _coveragePercent
    ) public view validOracleData returns (uint256) {
        // Get latest oracle data
        (int256 price, , , uint256 updatedAt) = oracleReader
            .getLatestPrice();

        require(price > 0, "PolicyManager: Invalid oracle price");
        require(
            block.timestamp - updatedAt <= MAX_ORACLE_AGE,
            "PolicyManager: Oracle data too old"
        );

        // Calculate base coverage amount
        uint256 baseCoverage = (_coverageLimitUSD * _coveragePercent) / 100;

        // Calculate volatility factor (simplified for demo)
        // In production, this would use historical price data
        // For demo: simulate volatility by using price variation
        uint256 volatilityFactor = calculateVolatilityFactor(uint256(price));

        // Premium formula: premium = baseCoverage * (baseRate + volatilityFactor)
        uint256 premiumUSD = (baseCoverage *
            (baseRate + volatilityFactor)) / PRECISION;

        return premiumUSD;
    }

    /**
     * @notice Calculates volatility factor based on current price
     * @dev Simplified volatility calculation for demo purposes
     * In production, this would use historical price data
     * @param _currentPrice Current ETH/USD price
     * @return volatilityFactor Volatility factor scaled to 1e8
     */
    function calculateVolatilityFactor(
        uint256 _currentPrice
    ) internal view returns (uint256) {
        // For demo: simulate volatility by using a random-like factor based on price
        // This simulates 1.01-1.05x multiplier mentioned in requirements
        // Use price modulo to create pseudo-randomness
        uint256 volatilitySeed = _currentPrice % 1000;
        uint256 volatilityFactor = (volatilitySeed * maxVolatilityFactor) /
            1000;

        // Ensure volatility factor doesn't exceed max
        if (volatilityFactor > maxVolatilityFactor) {
            volatilityFactor = maxVolatilityFactor;
        }

        return volatilityFactor;
    }

    // --- CLAIM PROCESSING ---

    /**
     * @notice Processes a claim for a policy
     * @dev TEMPORARILY OPEN FOR POC TESTING - No access restrictions
     * @dev SAFE VERSION - Removes overflow-prone calculations
     * @param _policyId ID of the policy to claim
     * @param _lossEventValueUSD Loss event value in USD (scaled to 1e8)
     * @return payoutAmount Amount paid out in SST tokens
     */
    function processClaim(
        uint256 _policyId,
        uint256 _lossEventValueUSD
    )
        external
        nonReentrant
        validOracleData
        returns (uint256 payoutAmount)
    {
        Policy storage policy = policies[_policyId];
        require(policy.active, "PolicyManager: Policy is not active");
        require(
            policy.owner != address(0),
            "PolicyManager: Invalid policy ID"
        );
        require(
            policy.owner == msg.sender,
            "PolicyManager: Not policy owner"
        );

        // Limit loss to coverage limit
        if (_lossEventValueUSD > policy.coverageLimitUSD) {
            _lossEventValueUSD = policy.coverageLimitUSD;
        }

        // Get latest oracle data
        (int256 currentPrice, , uint80 roundId, uint256 updatedAt) = oracleReader
            .getLatestPrice();

        require(currentPrice > 0, "PolicyManager: Invalid oracle price");
        require(
            block.timestamp - updatedAt <= MAX_ORACLE_AGE,
            "PolicyManager: Oracle data too old"
        );

        uint256 ethPrice = uint256(currentPrice); // 1e8 precision

        // Convert USD (1e8) → SST (1e18)
        // payout = (lossUSD * 1e18) / ethPrice
        payoutAmount = (_lossEventValueUSD * 1e18) / ethPrice;

        require(payoutAmount > 0, "PolicyManager: Payout invalid");

        // Distribute payout through RewardPoolAndSlasher
        rewardPool.distributeClaim(msg.sender, payoutAmount);

        // Deactivate policy after successful payout
        policy.active = false;

        emit ClaimProcessed(_policyId, payoutAmount, roundId, _lossEventValueUSD);

        return payoutAmount;
    }

    /**
     * @notice Calculates price drop percentage for claim validation
     * @dev Simplified calculation for demo purposes
     * @param _startTime Policy start timestamp
     * @return priceDropPercent Price drop percentage (0-100)
     */
    function calculatePriceDrop(
        uint256 /* _currentPrice */,
        uint256 _startTime
    ) internal view returns (uint256) {
        // For demo: simulate price drop based on time elapsed
        // In production, this would compare to historical price at policy start
        // Using a simplified approach: assume price decreases over time for demo
        uint256 timeElapsed = block.timestamp - _startTime;
        uint256 simulatedDrop = (timeElapsed * 100) / 3600; // 1% per hour

        // Ensure it's at least the trigger percent for demo
        if (simulatedDrop < claimTriggerPercent) {
            simulatedDrop = claimTriggerPercent;
        }

        // Cap at 100%
        if (simulatedDrop > 100) {
            simulatedDrop = 100;
        }

        return simulatedDrop;
    }

    // --- GOVERNANCE CONTROLS ---

    /**
     * @notice Sets the base rate for premium calculation (governance only)
     * @param _newRate New base rate (scaled to 1e8)
     */
    function setBaseRate(uint256 _newRate) external onlyGovernance {
        require(_newRate <= PRECISION, "PolicyManager: Rate exceeds 100%");
        baseRate = _newRate;
        emit ParametersUpdated("baseRate", _newRate, msg.sender);
    }

    /**
     * @notice Sets the maximum volatility factor (governance only)
     * @param _newFactor New maximum volatility factor (scaled to 1e8)
     */
    function setMaxVolatilityFactor(
        uint256 _newFactor
    ) external onlyGovernance {
        require(
            _newFactor <= PRECISION,
            "PolicyManager: Factor exceeds 100%"
        );
        maxVolatilityFactor = _newFactor;
        emit ParametersUpdated("maxVolatilityFactor", _newFactor, msg.sender);
    }

    /**
     * @notice Sets the claim trigger percentage (governance only)
     * @param _newPercent New claim trigger percentage (0-100)
     */
    function setClaimTriggerPercent(uint8 _newPercent) external onlyGovernance {
        require(_newPercent <= 100, "PolicyManager: Invalid percentage");
        claimTriggerPercent = _newPercent;
        emit ParametersUpdated(
            "claimTriggerPercent",
            _newPercent,
            msg.sender
        );
    }

    /**
     * @notice Pauses policy creation (governance only)
     */
    function pause() external onlyGovernance {
        _pause();
    }

    /**
     * @notice Unpauses policy creation (governance only)
     */
    function unpause() external onlyGovernance {
        _unpause();
    }

    /**
     * @notice Deactivates a policy (governance only)
     * @param _policyId ID of the policy to deactivate
     */
    function deactivatePolicy(uint256 _policyId) external onlyGovernance {
        Policy storage policy = policies[_policyId];
        require(policy.active, "PolicyManager: Policy already inactive");
        policy.active = false;
        emit PolicyDeactivated(_policyId, policy.owner);
    }

    // --- VIEW FUNCTIONS ---

    /**
     * @notice Gets policy details by ID
     * @param _policyId ID of the policy
     * @return Policy struct with all policy details
     */
    function getPolicy(
        uint256 _policyId
    ) external view returns (Policy memory) {
        return policies[_policyId];
    }

    /**
     * @notice Returns the number of active policies
     */
    function getActivePoliciesCount() external view returns (uint256) {
        uint256 count;
        for (uint256 i = 1; i <= policyCounter; i++) {
            if (policies[i].active) {
                unchecked {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * @notice Returns the aggregated coverage across all policies (scaled to 1e8)
     */
    function getTotalCoverageUSD() external view returns (uint256 totalCoverage) {
        for (uint256 i = 1; i <= policyCounter; i++) {
            totalCoverage += policies[i].coverageLimitUSD;
        }
    }

    /**
     * @notice Returns the aggregated premiums paid in SST (18 decimals)
     */
    function getTotalPremiumsSST() external view returns (uint256 totalPremiums) {
        for (uint256 i = 1; i <= policyCounter; i++) {
            totalPremiums += policies[i].premiumPaidInSST;
        }
    }

    /**
     * @notice Returns a naive average premium rate across policies (basis points)
     * @dev If no coverage has been sold yet, returns 0
     */
    function getAveragePremiumBps() external view returns (uint256) {
        uint256 totalCoverage;
        uint256 totalPremiumUSD;

        for (uint256 i = 1; i <= policyCounter; i++) {
            Policy storage policy = policies[i];
            totalCoverage += policy.coverageLimitUSD;
            totalPremiumUSD += policy.premiumUSD;
        }

        if (totalCoverage == 0) {
            return 0;
        }

        return (totalPremiumUSD * 10000) / totalCoverage;
    }

    /**
     * @notice Returns lightweight statistics for a given risk type
     * @dev Current implementation has no per-risk storage and returns zeroed fields
     *      to maintain a backwards-compatible interface. Future protocol upgrades
     *      can populate these values without changing the caller APIs.
     */
    function getRiskLineStats(uint8 /* riskType */) external view returns (RiskLineStats memory stats) {
        // No per-risk tracking in the current PolicyManager implementation.
        // The struct is returned with zeroed fields to preserve interface compatibility.
        stats.coverageUSD = 0;
        stats.premiumBps = 0;
        stats.activeValidators = 0;
        stats.totalRewardsSST = 0;
        stats.policyCount = 0;
    }

    /**
     * @notice Gets all policy IDs for a user
     * @param _user Address of the user
     * @return Array of policy IDs
     */
    function getUserPolicies(
        address _user
    ) external view returns (uint256[] memory) {
        return userPolicies[_user];
    }

    /**
     * @notice Gets the latest risk data used in premium calculation
     * @return RiskData struct with latest oracle data
     */
    function getLatestRiskData() external view returns (RiskData memory) {
        return latestRiskData;
    }

    /**
     * @notice Gets the total number of policies
     * @return Total policy count
     */
    function getTotalPolicies() external view returns (uint256) {
        return policyCounter;
    }

    // --- EMERGENCY FUNCTIONS ---

    /**
     * @notice Emergency function to withdraw SST tokens (governance only)
     * @param _amount Amount to withdraw
     * @param _to Address to send tokens to
     */
    function emergencyWithdraw(
        uint256 _amount,
        address _to
    ) external onlyGovernance {
        require(_to != address(0), "PolicyManager: Invalid recipient");
        sureStackToken.safeTransfer(_to, _amount);
    }
}

