// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPolicyManagerView {
    struct Policy {
        address owner;
        uint256 coverageLimitUSD;
        uint8 coveragePercent;
        uint256 premiumUSD;
        uint256 startTime;
        bool active;
        uint256 premiumPaidInSST;
    }

    struct RiskLineStats {
        uint256 coverageUSD;
        uint256 premiumBps;
        uint256 activeValidators;
        uint256 totalRewardsSST;
        uint256 policyCount;
    }

    function getTotalPolicies() external view returns (uint256);
    function getActivePoliciesCount() external view returns (uint256);
    function getTotalCoverageUSD() external view returns (uint256);
    function getTotalPremiumsSST() external view returns (uint256);
    function getAveragePremiumBps() external view returns (uint256);
    function getRiskLineStats(uint8 riskType) external view returns (RiskLineStats memory);
    function policies(uint256 policyId) external view returns (Policy memory);
}

interface IConsensusAndStakingView {
    function getTotalStakedSST() external view returns (uint256);
    function getDaoTreasurySST() external view returns (uint256);
    function getValidatorCounts() external view returns (uint256 totalValidators, uint256 activeValidators);
}

interface IRewardPoolView {
    function getTotalDistributedRewards() external view returns (uint256);
    function getRewardsByRisk(uint8 riskType) external view returns (uint256);
    function getRewardPoolBalance() external view returns (uint256);
    function getPenaltyPoolBalance() external view returns (uint256);
}

interface IOracleReaderView {
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

    function getLatestEthUsd() external view returns (OracleSnapshot memory);
    function getEthUsdWindow(uint256 maxPoints) external view returns (OracleSeries memory);
}

interface IGovernanceView {
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    struct ProposalSummary {
        uint256 id;
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
    }

    function getProposalCount() external view returns (uint256);
    function getProposalSummary(uint256 proposalId) external view returns (ProposalSummary memory);
    function getLatestProposals(uint256 maxCount) external view returns (ProposalSummary[] memory);
    function quorum(uint256 timepoint) external view returns (uint256);
}

contract RiskAnalyticsView {
    IPolicyManagerView public immutable policyManager;
    IConsensusAndStakingView public immutable staking;
    IRewardPoolView public immutable rewardPool;
    IOracleReaderView public immutable oracleReader;
    IGovernanceView public immutable governance;
    IERC20 public immutable sstToken;

    constructor(
        address _policyManager,
        address _staking,
        address _rewardPool,
        address _oracleReader,
        address _governance,
        address _sstToken
    ) {
        require(_policyManager != address(0), "RiskAnalyticsView: PolicyManager required");
        require(_staking != address(0), "RiskAnalyticsView: Staking required");
        require(_rewardPool != address(0), "RiskAnalyticsView: RewardPool required");
        require(_oracleReader != address(0), "RiskAnalyticsView: OracleReader required");
        require(_governance != address(0), "RiskAnalyticsView: Governance required");
        require(_sstToken != address(0), "RiskAnalyticsView: SST token required");

        policyManager = IPolicyManagerView(_policyManager);
        staking = IConsensusAndStakingView(_staking);
        rewardPool = IRewardPoolView(_rewardPool);
        oracleReader = IOracleReaderView(_oracleReader);
        governance = IGovernanceView(_governance);
        sstToken = IERC20(_sstToken);
    }

    struct GlobalSummary {
        uint256 totalCoverageUSD;
        uint256 totalPremiumsSST;
        uint256 totalStakedSST;
        uint256 daoTreasurySST;
        uint256 activePolicies;
        uint256 totalPolicies;
        uint256 averagePremiumBps;
        int256 latestEthPrice;
        uint256 latestEthUpdatedAt;
        bool oracleValid;
    }

    function getGlobalSummary() external view returns (GlobalSummary memory summary) {
        summary.totalCoverageUSD = policyManager.getTotalCoverageUSD();
        summary.totalPremiumsSST = policyManager.getTotalPremiumsSST();
        summary.totalStakedSST = staking.getTotalStakedSST();
        summary.daoTreasurySST = staking.getDaoTreasurySST();
        summary.activePolicies = policyManager.getActivePoliciesCount();
        summary.totalPolicies = policyManager.getTotalPolicies();
        summary.averagePremiumBps = policyManager.getAveragePremiumBps();

        IOracleReaderView.OracleSnapshot memory snap = oracleReader.getLatestEthUsd();
        summary.latestEthPrice = snap.price;
        summary.latestEthUpdatedAt = snap.updatedAt;
        summary.oracleValid = snap.isValid;
    }

    struct RiskLineSummary {
        uint8 riskType;
        uint256 coverageUSD;
        uint256 premiumBps;
        uint256 activeValidators;
        uint256 totalRewardsSST;
        uint256 policyCount;
    }

    function getRiskLineSummary(uint8 riskType) public view returns (RiskLineSummary memory summary) {
        IPolicyManagerView.RiskLineStats memory stats = policyManager.getRiskLineStats(riskType);
        summary.riskType = riskType;
        summary.coverageUSD = stats.coverageUSD;
        summary.premiumBps = stats.premiumBps;
        summary.activeValidators = stats.activeValidators;
        summary.totalRewardsSST = stats.totalRewardsSST > 0
            ? stats.totalRewardsSST
            : rewardPool.getRewardsByRisk(riskType);
        summary.policyCount = stats.policyCount;
    }

    function getRiskLineSummaries(uint8[] calldata riskTypes) external view returns (RiskLineSummary[] memory summaries) {
        summaries = new RiskLineSummary[](riskTypes.length);
        for (uint256 i = 0; i < riskTypes.length; i++) {
            summaries[i] = getRiskLineSummary(riskTypes[i]);
        }
    }

    struct PolicyRecord {
        uint256 id;
        address owner;
        uint256 coverageUSD;
        uint256 premiumSST;
        uint8 coveragePercent;
        uint256 createdAt;
        bool active;
    }

    function getPolicyRecord(uint256 policyId) public view returns (PolicyRecord memory record) {
        IPolicyManagerView.Policy memory stored = policyManager.policies(policyId);
        record.id = policyId;
        record.owner = stored.owner;
        record.coverageUSD = stored.coverageLimitUSD;
        record.premiumSST = stored.premiumPaidInSST;
        record.coveragePercent = stored.coveragePercent;
        record.createdAt = stored.startTime;
        record.active = stored.active;
    }

    function getAllPolicies() external view returns (PolicyRecord[] memory records) {
        uint256 total = policyManager.getTotalPolicies();
        records = new PolicyRecord[](total);
        for (uint256 i = 0; i < total; i++) {
            records[i] = getPolicyRecord(i + 1);
        }
    }

    struct ValidatorSummary {
        uint256 totalValidators;
        uint256 activeValidators;
        uint256 totalStakedSST;
        uint256 rewardPoolBalance;
        uint256 penaltyPoolBalance;
    }

    function getValidatorSummary() external view returns (ValidatorSummary memory summary) {
        (summary.totalValidators, summary.activeValidators) = staking.getValidatorCounts();
        summary.totalStakedSST = staking.getTotalStakedSST();
        summary.rewardPoolBalance = rewardPool.getRewardPoolBalance();
        summary.penaltyPoolBalance = rewardPool.getPenaltyPoolBalance();
    }

    struct GovernanceSummary {
        uint256 proposalCount;
        uint256 quorumRequirement;
        uint256 totalVotingPower;
        IGovernanceView.ProposalSummary[] latestProposals;
    }

    function getGovernanceSummary(uint256 maxProposals) external view returns (GovernanceSummary memory summary) {
        summary.proposalCount = governance.getProposalCount();
        summary.quorumRequirement = governance.quorum(block.number);
        summary.totalVotingPower = sstToken.totalSupply();

        if (summary.proposalCount == 0 || maxProposals == 0) {
            summary.latestProposals = new IGovernanceView.ProposalSummary[](0);
        } else {
            summary.latestProposals = governance.getLatestProposals(maxProposals);
        }
    }

    struct VolatilityImpact {
        uint256 sigma30;
        uint256 effectiveVolatility;
        int256 latestPrice;
        uint256 latestTimestamp;
    }

    function computeVolatilityImpact() external view returns (VolatilityImpact memory impact) {
        IOracleReaderView.OracleSnapshot memory latest = oracleReader.getLatestEthUsd();
        impact.latestPrice = latest.price;
        impact.latestTimestamp = latest.updatedAt;

        IOracleReaderView.OracleSeries memory series = oracleReader.getEthUsdWindow(2);
        if (series.prices.length >= 2 && series.prices[1] != 0) {
            int256 currentPrice = series.prices[0];
            int256 previousPrice = series.prices[1];
            int256 diff = currentPrice - previousPrice;
            if (diff < 0) {
                diff = -diff;
            }
            uint256 basePrice = uint256(previousPrice > 0 ? previousPrice : -previousPrice);
            if (basePrice > 0) {
                uint256 scaledDiff = (uint256(diff) * 1e8) / basePrice;
                impact.effectiveVolatility = scaledDiff;
                impact.sigma30 = scaledDiff;
            }
        }
    }
}

