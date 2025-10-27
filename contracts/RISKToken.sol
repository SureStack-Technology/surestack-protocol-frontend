// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title RISKToken
 * @dev ERC20Votes token for RISK Protocol with voting capabilities
 * Used for governance, staking, and as the native token of the protocol
 */
contract RISKToken is ERC20Votes, Ownable {
    
    uint256 private constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    /**
     * @dev Constructor that mints initial supply to deployer
     */
    constructor(address initialOwner) 
        ERC20("RISK Protocol Token", "RISK") 
        ERC20Votes()
        EIP712("RISK Protocol Token", "1")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Batch transfer tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to transfer (must match recipients length)
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        returns (bool) 
    {
        require(recipients.length == amounts.length, "RISKToken: array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            transfer(recipients[i], amounts[i]);
        }
        
        return true;
    }
    
    /**
     * @dev Mint tokens (only owner can call)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

