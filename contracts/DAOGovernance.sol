// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — Smart Contract Suite
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "./SureStackToken.sol";

/**
 * @title DAOGovernance
 * @dev DAO governance contract for SureStack Protocol
 * Handles proposals, voting, and execution with timelock
 */
contract DAOGovernance is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{

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
    
    constructor(
        SureStackToken _token,
        TimelockController _timelock
    )
        Governor("SureStack Protocol DAO")
        GovernorSettings(
            1, // 1 block voting delay
            45818, // ~1 week voting period (12 sec blocks)
            100_000e18 // 100k SST proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {}
    
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    /**
     * @notice Returns lightweight metadata about a proposal
     */
    function getProposalSummary(uint256 proposalId) external view returns (ProposalSummary memory summary) {
        summary.id = proposalId;
        summary.proposer = proposalProposer(proposalId);
        summary.startBlock = proposalSnapshot(proposalId);
        summary.endBlock = proposalDeadline(proposalId);

        (summary.againstVotes, summary.forVotes, summary.abstainVotes) = proposalVotes(proposalId);

        ProposalState proposalState = state(proposalId);
        summary.executed = proposalState == ProposalState.Executed;
        summary.canceled = proposalState == ProposalState.Canceled;
    }

    /**
     * @notice Returns the total number of proposals created by this governor
     * @dev The current implementation does not retain a running total and returns 0 as a placeholder.
     */
    function getProposalCount() external pure returns (uint256) {
        return 0;
    }

    /**
     * @notice Returns a window of the latest proposals (not tracked in current implementation)
     */
    function getLatestProposals(uint256 /* maxCount */) external pure returns (ProposalSummary[] memory) {
        return new ProposalSummary[](0);
    }
}

