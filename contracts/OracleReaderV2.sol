// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — OracleReaderV2 Smart Contract
/// @dev Enhanced oracle reader with multi-oracle support, volatility calculation, and governance controls
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./OracleIntegration.sol";

/**
 * @title OracleReaderV2
 * @notice Enhanced oracle reader with multi-oracle support, data validation, and volatility calculation
 * Compatible with PolicyManager and existing OracleReader interface
 */
contract OracleReaderV2 is ReentrancyGuard, Ownable {
    // --- CONSTANTS ---
    
    uint256 public constant PRECISION = 1e8; // Scaling factor for calculations
    uint256 public constant DEFAULT_MAX_AGE = 21600; // 6 hours in seconds
    uint256 public constant DEFAULT_DEVIATION_THRESHOLD = 5 * 1e6; // 5% scaled to 1e8
    
    // --- ENUMS ---
    
    /**
     * @dev Enum for oracle feed types
     */
    enum FeedType {
        ETH_USD,
        BTC_USD,
        VOLATILITY
    }
    
    // --- STRUCTS ---
    
    /**
     * @dev Struct storing oracle feed information
     */
    struct OracleFeed {
        address aggregatorAddress;
        bool isActive;
        string description;
    }
    
    /**
     * @dev Struct storing price data with metadata
     */
    struct PriceData {
        int256 price;
        uint8 decimals;
        uint80 roundId;
        uint256 updatedAt;
        bool isValid;
    }
    
    /**
     * @dev Struct storing round data for volatility calculation
     */
    struct RoundData {
        int256 price;
        uint80 roundId;
        uint256 timestamp;
    }

    struct OracleSnapshot {
        int256 price;
        uint80 roundId;
        uint256 updatedAt;
        uint8 decimals;
        bool isValid;
    }

    struct OracleSeries {
        int256[] prices;
        uint80[] roundIds;
        uint256[] timestamps;
    }
    
    // --- STATE VARIABLES ---
    
    // Mapping from feed type to oracle feed
    mapping(FeedType => OracleFeed) public feeds;
    
    // Mapping from feed type to current round data
    mapping(FeedType => RoundData) public currentRound;
    
    // Mapping from feed type to previous round data (for volatility calculation)
    mapping(FeedType => RoundData) public previousRound;
    
    // Maximum age for oracle data (in seconds)
    uint256 public maxAge;
    
    // Deviation threshold for price validation (scaled to 1e8)
    uint256 public deviationThreshold;
    
    // Governance address (can be set to DAO contract)
    address public governanceAddress;
    
    // Primary feed type used for getLatestPrice() (defaults to ETH_USD)
    FeedType public primaryFeed;
    
    // --- EVENTS ---
    
    event OracleUpdated(
        FeedType indexed feedType,
        address indexed oldAggregator,
        address indexed newAggregator,
        address executor
    );
    
    event VolatilityComputed(
        FeedType indexed feedType,
        uint256 volatilityFactor,
        int256 currentPrice,
        int256 previousPrice,
        uint80 currentRoundId,
        uint80 previousRoundId
    );
    
    event DataValidated(
        FeedType indexed feedType,
        bool isValid,
        string reason,
        uint256 deviationPercent
    );
    
    event ParametersUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue,
        address indexed executor
    );
    
    event FeedActivated(FeedType indexed feedType, bool isActive);
    
    // --- MODIFIERS ---
    
    /**
     * @dev Restricts execution to governance address
     */
    modifier onlyGovernance() {
        require(
            msg.sender == governanceAddress || msg.sender == owner(),
            "OracleReaderV2: Caller is not governance"
        );
        _;
    }
    
    /**
     * @dev Validates that a feed type is active
     */
    modifier validFeed(FeedType _feedType) {
        require(
            feeds[_feedType].isActive,
            "OracleReaderV2: Feed not active"
        );
        _;
    }
    
    // --- CONSTRUCTION ---
    
    /**
     * @notice Initializes OracleReaderV2 contract
     * @param _ethUsdAggregator Address of ETH/USD Chainlink aggregator
     * @param _btcUsdAggregator Address of BTC/USD Chainlink aggregator (optional, can be zero)
     * @param _volatilityAggregator Address of volatility feed aggregator (optional, can be zero)
     * @param _governanceAddress Address of governance contract
     * @param _initialOwner Address of initial owner
     */
    constructor(
        address _ethUsdAggregator,
        address _btcUsdAggregator,
        address _volatilityAggregator,
        address _governanceAddress,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_ethUsdAggregator != address(0), "OracleReaderV2: ETH/USD aggregator cannot be zero");
        require(_governanceAddress != address(0), "OracleReaderV2: Governance address cannot be zero");
        
        // Initialize ETH/USD feed (required)
        feeds[FeedType.ETH_USD] = OracleFeed({
            aggregatorAddress: _ethUsdAggregator,
            isActive: true,
            description: "ETH/USD"
        });
        
        // Initialize BTC/USD feed (optional)
        if (_btcUsdAggregator != address(0)) {
            feeds[FeedType.BTC_USD] = OracleFeed({
                aggregatorAddress: _btcUsdAggregator,
                isActive: true,
                description: "BTC/USD"
            });
        }
        
        // Initialize Volatility feed (optional)
        if (_volatilityAggregator != address(0)) {
            feeds[FeedType.VOLATILITY] = OracleFeed({
                aggregatorAddress: _volatilityAggregator,
                isActive: true,
                description: "Volatility"
            });
        }
        
        governanceAddress = _governanceAddress;
        maxAge = DEFAULT_MAX_AGE;
        deviationThreshold = DEFAULT_DEVIATION_THRESHOLD;
        primaryFeed = FeedType.ETH_USD;
    }
    
    // --- VIEW FUNCTIONS ---
    
    /**
     * @notice Get the latest price from the primary feed (ETH/USD by default)
     * @dev Compatible with PolicyManager interface
     * @return price The current price (scaled by 10^decimals)
     * @return decimals The number of decimals used in the price
     * @return roundId The round ID of the latest price update
     * @return updatedAt The timestamp of the latest update
     */
    function getLatestPrice() public view returns (
        int256 price,
        uint8 decimals,
        uint80 roundId,
        uint256 updatedAt
    ) {
        return getLatestPriceForFeed(primaryFeed);
    }
    
    /**
     * @notice Get the latest price for a specific feed type
     * @param _feedType The feed type to query
     * @return price The current price (scaled by 10^decimals)
     * @return decimals The number of decimals used in the price
     * @return roundId The round ID of the latest price update
     * @return updatedAt The timestamp of the latest update
     */
    function getLatestPriceForFeed(FeedType _feedType) public view validFeed(_feedType) returns (
        int256 price,
        uint8 decimals,
        uint80 roundId,
        uint256 updatedAt
    ) {
        OracleFeed storage feed = feeds[_feedType];
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed.aggregatorAddress);
        
        (uint80 _roundId, int256 _answer, , uint256 _updatedAt, ) = aggregator.latestRoundData();
        
        require(_updatedAt > 0, "OracleReaderV2: Oracle data incomplete");
        require(_answer > 0, "OracleReaderV2: Oracle returned invalid price");
        
        decimals = aggregator.decimals();
        price = _answer;
        roundId = _roundId;
        updatedAt = _updatedAt;
    }
    
    /**
     * @notice Get volatility factor for a specific feed (percentage change over 2 rounds)
     * @param _feedType The feed type to calculate volatility for
     * @return volatilityFactor Volatility factor scaled to 1e8 (positive = increase, negative = decrease)
     */
    function getVolatilityFactor(FeedType _feedType) public view validFeed(_feedType) returns (int256 volatilityFactor) {
        RoundData memory current = currentRound[_feedType];
        RoundData memory previous = previousRound[_feedType];
        
        // Check if we have both rounds
        require(current.roundId > 0, "OracleReaderV2: No current round data");
        require(previous.roundId > 0, "OracleReaderV2: No previous round data");
        require(current.price > 0 && previous.price > 0, "OracleReaderV2: Invalid price data");
        
        // Calculate percentage change: ((current - previous) / previous) * 1e8
        int256 priceChange = current.price - previous.price;
        volatilityFactor = (priceChange * int256(PRECISION)) / previous.price;
        
        return volatilityFactor;
    }
    
    /**
     * @notice Check if data for a feed is fresh
     * @param _feedType The feed type to check
     * @return isFresh True if data is within maxAge threshold
     * @return age The age of the data in seconds
     */
    function isDataFresh(FeedType _feedType) public view validFeed(_feedType) returns (bool isFresh, uint256 age) {
        ( , , , uint256 updatedAt) = getLatestPriceForFeed(_feedType);
        
        if (block.timestamp < updatedAt) {
            // Data is from the future (shouldn't happen, but handle gracefully)
            return (false, 0);
        }
        
        age = block.timestamp - updatedAt;
        isFresh = age <= maxAge;
        
        return (isFresh, age);
    }
    
    /**
     * @notice Validate oracle data for staleness and deviation
     * @param _feedType The feed type to validate
     * @return isValid True if data passes all validation checks
     * @return deviationPercent Deviation percentage if validation fails (scaled to 1e8)
     */
    function validateData(FeedType _feedType) public validFeed(_feedType) returns (
        bool isValid,
        uint256 deviationPercent
    ) {
        // Check staleness
        (bool isFresh, ) = isDataFresh(_feedType);
        if (!isFresh) {
            emit DataValidated(_feedType, false, "Data stale", 0);
            return (false, 0);
        }
        
        // Get current price data
        (int256 currentPrice, , , ) = getLatestPriceForFeed(_feedType);
        
        // Check if we have previous round for deviation detection
        RoundData memory previous = previousRound[_feedType];
        if (previous.roundId > 0 && previous.price > 0) {
            // Calculate deviation
            int256 priceChange = currentPrice > previous.price 
                ? currentPrice - previous.price 
                : previous.price - currentPrice;
            
            uint256 priceChangeAbs = uint256(priceChange > 0 ? priceChange : -priceChange);
            deviationPercent = (priceChangeAbs * PRECISION) / uint256(previous.price);
            
            // Check if deviation exceeds threshold
            if (deviationPercent > deviationThreshold) {
                emit DataValidated(_feedType, false, "Deviation too high", deviationPercent);
                return (false, deviationPercent);
            }
        }
        
        isValid = true;
        emit DataValidated(_feedType, true, "Valid", 0);
        return (isValid, 0);
    }
    
    /**
     * @notice Update round data for volatility calculation
     * @param _feedType The feed type to update
     * @dev This should be called periodically to track price changes
     */
    function updateRoundData(FeedType _feedType) external validFeed(_feedType) {
        (int256 price, , uint80 roundId, uint256 updatedAt) = getLatestPriceForFeed(_feedType);
        
        // Move current to previous
        previousRound[_feedType] = currentRound[_feedType];
        
        // Update current
        currentRound[_feedType] = RoundData({
            price: price,
            roundId: roundId,
            timestamp: updatedAt
        });
        
        // Calculate and emit volatility if we have both rounds
        if (previousRound[_feedType].roundId > 0) {
            int256 volatilityFactor = getVolatilityFactor(_feedType);
            emit VolatilityComputed(
                _feedType,
                uint256(volatilityFactor > 0 ? volatilityFactor : -volatilityFactor),
                price,
                previousRound[_feedType].price,
                roundId,
                previousRound[_feedType].roundId
            );
        }
    }
    
    /**
     * @notice Get human-readable price in USD for primary feed
     * @return usdPrice The price formatted with proper decimals
     */
    function getLatestPriceUSD() public view returns (uint256) {
        (int256 price, uint8 decimals, , ) = getLatestPrice();
        return uint256(price) / (10 ** decimals);
    }

    /**
     * @notice Returns a lightweight snapshot of the current ETH/USD oracle reading
     */
    function getLatestEthUsd() external view returns (OracleSnapshot memory snapshot) {
        (int256 price, uint8 decimals, uint80 roundId, uint256 updatedAt) = getLatestPriceForFeed(FeedType.ETH_USD);
        snapshot.price = price;
        snapshot.decimals = decimals;
        snapshot.roundId = roundId;
        snapshot.updatedAt = updatedAt;
        snapshot.isValid = feeds[FeedType.ETH_USD].isActive;
    }

    /**
     * @notice Returns up to `maxPoints` historical ETH/USD observations (current + previous)
     * @dev Current implementation stores only the latest two rounds for volatility calculations.
     */
    function getEthUsdWindow(uint256 maxPoints) external view returns (OracleSeries memory series) {
        if (maxPoints == 0) {
            series.prices = new int256[](0);
            series.roundIds = new uint80[](0);
            series.timestamps = new uint256[](0);
            return series;
        }

        RoundData memory current = currentRound[FeedType.ETH_USD];
        RoundData memory previous = previousRound[FeedType.ETH_USD];

        uint256 available;
        if (current.roundId > 0) {
            available++;
        }
        if (previous.roundId > 0) {
            available++;
        }

        if (available == 0) {
            series.prices = new int256[](0);
            series.roundIds = new uint80[](0);
            series.timestamps = new uint256[](0);
            return series;
        }

        if (available > maxPoints) {
            available = maxPoints;
        }

        series.prices = new int256[](available);
        series.roundIds = new uint80[](available);
        series.timestamps = new uint256[](available);

        uint256 index;
        if (current.roundId > 0 && index < available) {
            series.prices[index] = current.price;
            series.roundIds[index] = current.roundId;
            series.timestamps[index] = current.timestamp;
            index++;
        }

        if (previous.roundId > 0 && index < available) {
            series.prices[index] = previous.price;
            series.roundIds[index] = previous.roundId;
            series.timestamps[index] = previous.timestamp;
        }
    }
    
    /**
     * @notice Get price feed metadata
     * @param _feedType The feed type to query
     * @return description The description of the price feed
     * @return version The version of the aggregator
     */
    function getPriceFeedInfo(FeedType _feedType) public view validFeed(_feedType) returns (
        string memory description,
        uint256 version
    ) {
        OracleFeed storage feed = feeds[_feedType];
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed.aggregatorAddress);
        description = aggregator.description();
        version = aggregator.version();
    }
    
    // --- GOVERNANCE FUNCTIONS ---
    
    /**
     * @notice Set the maximum age for oracle data
     * @param _newMaxAge New maximum age in seconds
     */
    function setMaxAge(uint256 _newMaxAge) external onlyGovernance {
        require(_newMaxAge > 0, "OracleReaderV2: Max age must be greater than zero");
        uint256 oldMaxAge = maxAge;
        maxAge = _newMaxAge;
        emit ParametersUpdated("maxAge", oldMaxAge, _newMaxAge, msg.sender);
    }
    
    /**
     * @notice Set the deviation threshold for price validation
     * @param _newThreshold New deviation threshold (scaled to 1e8)
     */
    function setDeviationThreshold(uint256 _newThreshold) external onlyGovernance {
        require(_newThreshold <= PRECISION, "OracleReaderV2: Threshold exceeds 100%");
        uint256 oldThreshold = deviationThreshold;
        deviationThreshold = _newThreshold;
        emit ParametersUpdated("deviationThreshold", oldThreshold, _newThreshold, msg.sender);
    }
    
    /**
     * @notice Set or update an oracle aggregator address
     * @param _feedType The feed type to update
     * @param _newAggregator Address of the new Chainlink aggregator
     */
    function setOracle(FeedType _feedType, address _newAggregator) external onlyGovernance {
        require(_newAggregator != address(0), "OracleReaderV2: Aggregator address cannot be zero");
        
        address oldAggregator = feeds[_feedType].aggregatorAddress;
        feeds[_feedType].aggregatorAddress = _newAggregator;
        feeds[_feedType].isActive = true;
        
        // Reset round data for this feed
        delete currentRound[_feedType];
        delete previousRound[_feedType];
        
        emit OracleUpdated(_feedType, oldAggregator, _newAggregator, msg.sender);
    }
    
    /**
     * @notice Set the governance address
     * @param _newGovernanceAddress New governance address
     */
    function setGovernanceAddress(address _newGovernanceAddress) external onlyOwner {
        require(_newGovernanceAddress != address(0), "OracleReaderV2: Governance address cannot be zero");
        governanceAddress = _newGovernanceAddress;
        emit ParametersUpdated("governanceAddress", 0, uint256(uint160(_newGovernanceAddress)), msg.sender);
    }
    
    /**
     * @notice Set the primary feed type (used for getLatestPrice())
     * @param _feedType The feed type to set as primary
     */
    function setPrimaryFeed(FeedType _feedType) external onlyGovernance {
        require(feeds[_feedType].isActive, "OracleReaderV2: Feed not active");
        primaryFeed = _feedType;
        emit ParametersUpdated("primaryFeed", uint256(uint8(primaryFeed)), uint256(uint8(_feedType)), msg.sender);
    }
    
    /**
     * @notice Activate or deactivate a feed
     * @param _feedType The feed type to update
     * @param _isActive True to activate, false to deactivate
     */
    function setFeedActive(FeedType _feedType, bool _isActive) external onlyGovernance {
        require(
            feeds[_feedType].aggregatorAddress != address(0),
            "OracleReaderV2: Feed not initialized"
        );
        feeds[_feedType].isActive = _isActive;
        emit FeedActivated(_feedType, _isActive);
    }
    
    /**
     * @notice Get all feed information
     * @param _feedType The feed type to query
     * @return aggregatorAddress Address of the aggregator
     * @return isActive Whether the feed is active
     * @return description Feed description
     */
    function getFeedInfo(FeedType _feedType) external view returns (
        address aggregatorAddress,
        bool isActive,
        string memory description
    ) {
        OracleFeed storage feed = feeds[_feedType];
        return (feed.aggregatorAddress, feed.isActive, feed.description);
    }
}

