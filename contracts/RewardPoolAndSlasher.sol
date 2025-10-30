// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — Smart Contract Suite
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

/**
 * @title IRISKToken
 * @notice Interface for the native $RISK ERC-20 token.
 * Contains only the necessary functions for transfer/transferFrom.
 */
interface IRISKToken {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title ConsensusInterface
 * @notice Minimal interface required by the RewardPoolAndSlasher to interact with ConsensusAndStaking.
 * This ensures the RewardPool only accepts commands from the verified Consensus contract.
 */
interface ConsensusInterface {
    function sequencerAddress() external view returns (address);
    // Add any necessary functions here if the RewardPool needs to read state from Consensus.
}

/**
 * @title RewardPoolAndSlasher
 * @notice Manages the inflow and outflow of $RISK tokens for rewards, penalties, and treasury.
 * It strictly controls token movement, only allowing the verified Consensus contract to initiate transfers.
 */
contract RewardPoolAndSlasher {

    // --- IMMUTABLE & CONSTANTS ---

    IRISKToken public immutable riskToken;
    address public immutable consensusContractAddress;

    // --- STATE VARIABLES ---
    
    // The accumulated funds from penalties/slashing. Used to fund rewards.
    uint256 public penaltyPoolBalance; 
    
    // Funds designated for rewards, typically topped up by DAO or Sequencer transactions.
    uint256 public rewardPoolBalance; 

    // --- EVENTS ---

    event RewardPoolToppedUp(address indexed caller, uint256 amount);
    event PenaltyFundsReceived(uint256 amount);
    event RewardDistributed(address indexed validator, uint256 amount);
    event FundsBurned(uint256 amount);
    
    // --- MODIFIERS ---
    
    /**
     * @dev Restricts execution to the verified ConsensusAndStaking contract address.
     */
    modifier onlyConsensus() {
        require(msg.sender == consensusContractAddress, "RPS: Caller is not the authorized Consensus contract.");
        _;
    }

    // --- CONSTRUCTION ---

    /**
     * @notice Initializes the contract with the address of the RISK token and the core Consensus contract.
     */
    constructor(address _riskTokenAddress, address _consensusContractAddress) {
        require(_riskTokenAddress != address(0), "RPS: Invalid token address.");
        require(_consensusContractAddress != address(0), "RPS: Invalid consensus contract address.");
        
        riskToken = IRISKToken(_riskTokenAddress);
        consensusContractAddress = _consensusContractAddress;
    }

    // --- FUNDING MECHANISMS ---

    /**
     * @notice Allows an external entity (e.g., DAO Treasury or Sequencer) to deposit RISK tokens
     * specifically into the reward pool to fund future validator payments.
     * @param _amount The amount of $RISK tokens to transfer to the reward pool.
     */
    function topUpRewardPool(uint256 _amount) external {
        require(_amount > 0, "RPS: Amount must be greater than zero.");
        
        // Transfer tokens from the sender to this contract
        bool success = riskToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "RPS: Token transfer failed. Check allowance.");
        
        rewardPoolBalance += _amount;
        emit RewardPoolToppedUp(msg.sender, _amount);
    }
    
    // --- PENALTY AND SLASHING CONTROL ---

    /**
     * @notice Called *only* by the Consensus contract to finalize a slash event.
     * This function moves the slashed funds from the staking contract (or the Validator)
     * into this contract's penalty pool.
     * @param _slashedAmount The amount of tokens to move into the penalty pool.
     * @param _validatorAddress The address of the validator whose stake was slashed (for logging/auditing).
     *
     * Note: In a typical setup, the Consensus contract would already hold the staked tokens,
     * so this function simply updates the internal pool balance.
     */
    function receiveSlashedFunds(uint256 _slashedAmount, address _validatorAddress) external onlyConsensus {
        // Since the Consensus contract already holds the tokens, we only update the internal balance.
        // A direct transfer from the Consensus contract to this pool is the alternative model.
        penaltyPoolBalance += _slashedAmount;
        
        // Emit event for auditing purposes
        emit PenaltyFundsReceived(_slashedAmount);
        
        // Optional: Implement a mechanism to burn a portion of the penalty pool funds here
    }
    
    /**
     * @notice Allows the protocol owner or DAO to burn a portion of the accumulated penalty pool.
     * This deflationary mechanism removes tokens from circulation.
     * @param _amount The amount of tokens to burn (send to address(0xdead)).
     */
    function burnPenaltyFunds(uint256 _amount) external {
        // Access control: Could be onlySequencer, onlyDAO, or public depending on governance model
        // For simplicity, let's assume it's callable by the sequencer address defined in the Consensus contract
        ConsensusInterface consensus = ConsensusInterface(consensusContractAddress);
        require(msg.sender == consensus.sequencerAddress(), "RPS: Unauthorized burn caller.");
        
        require(_amount <= penaltyPoolBalance, "RPS: Insufficient funds in penalty pool.");
        
        // Deduction and accounting
        penaltyPoolBalance -= _amount;
        
        // Execute the actual burn: transfer to a dead address
        bool success = riskToken.transfer(address(0xdead), _amount);
        require(success, "RPS: Token burn transfer failed.");

        emit FundsBurned(_amount);
    }

    // --- REWARD DISTRIBUTION ---

    /**
     * @notice Called *only* by the Consensus contract to distribute earned rewards to a validator.
     * This function checks the reward pool balance and executes the transfer.
     * @param _recipient The validator's address.
     * @param _amount The calculated reward amount.
     */
    function distributeReward(address _recipient, uint256 _amount) external onlyConsensus {
        require(_amount > 0, "RPS: Reward amount must be positive.");
        
        // Prioritize rewards from the dedicated reward pool, then fall back to the penalty pool
        uint256 fundsAvailable = rewardPoolBalance + penaltyPoolBalance;
        require(fundsAvailable >= _amount, "RPS: Insufficient funds across all pools for reward distribution.");

        // Deduct from reward pool first
        if (rewardPoolBalance >= _amount) {
            rewardPoolBalance -= _amount;
        } else {
            // Deduct the remainder from the penalty pool
            uint256 remainder = _amount - rewardPoolBalance;
            rewardPoolBalance = 0; // The reward pool is now empty
            penaltyPoolBalance -= remainder;
        }

        // Execute the token transfer to the validator
        bool success = riskToken.transfer(_recipient, _amount);
        require(success, "RPS: Token reward transfer failed.");

        emit RewardDistributed(_recipient, _amount);
    }
}
