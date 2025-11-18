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

// ⚠️ DEPRECATED CONTRACT — DO NOT USE
// This contract is outdated and replaced by ConsensusAndStakingV2.sol.
// It remains in the repository ONLY for audit, documentation, and historical reference.
// The frontend, backend, ABIs, and deployment scripts MUST NOT import or compile this contract.
// SureStack System uses only ConsensusAndStakingV2.

error DEPRECATED_ConsensusAndStaking();

contract ConsensusAndStaking {
    constructor() {
        revert DEPRECATED_ConsensusAndStaking();
    }
}
