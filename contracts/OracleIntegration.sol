// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — Smart Contract Suite
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

/**
 * @title OracleIntegration
 * @notice Simplified Chainlink oracle integration for RISK Protocol
 * Provides ETH/USD price feed functionality
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title OracleReader
 * @notice Helper contract to read Chainlink price feeds
 */
contract OracleReader {
    AggregatorV3Interface public immutable priceFeed;

    constructor(address _oracleAddress) {
        require(_oracleAddress != address(0), "Oracle address cannot be zero");
        priceFeed = AggregatorV3Interface(_oracleAddress);
    }

    /**
     * @notice Get the latest price from Chainlink oracle
     * @return price The current price of ETH in USD (scaled by 10^decimals)
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
        (uint80 _roundId, int256 _answer, , uint256 _updatedAt, ) = priceFeed.latestRoundData();
        
        // Data validation
        require(_updatedAt > 0, "Oracle data incomplete");
        require(_answer > 0, "Oracle returned invalid price");
        
        decimals = priceFeed.decimals();
        price = _answer;
        roundId = _roundId;
        updatedAt = _updatedAt;
    }

    /**
     * @notice Get human-readable price in USD
     * @return usdPrice The price formatted with proper decimals
     */
    function getLatestPriceUSD() public view returns (uint256) {
        (int256 price, uint8 decimals, , ) = getLatestPrice();
        return uint256(price) / (10 ** decimals);
    }

    /**
     * @notice Get price feed metadata
     * @return description The description of the price feed
     * @return version The version of the aggregator
     */
    function getPriceFeedInfo() public view returns (string memory description, uint256 version) {
        description = priceFeed.description();
        version = priceFeed.version();
    }
}


