// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ConsensusAndStaking.sol";
import "../contracts/RISKToken.sol";

contract ConsensusAndStakingTest is Test {
    ConsensusAndStaking public consensus;
    IRISKToken public riskToken;
    
    address public validator1 = address(0x1);
    address public validator2 = address(0x2);
    address public sequencer = address(0x3);
    
    uint256 constant MIN_STAKE = 1000 ether;
    
    function setUp() public {
        // Deploy RISKToken
        riskToken = IRISKToken(address(new RISKToken(address(this))));
        
        // Mint tokens to validators
        riskToken.transfer(validator1, 100000 ether);
        riskToken.transfer(validator2, 100000 ether);
        
        // Deploy ConsensusAndStaking
        consensus = new ConsensusAndStaking(
            address(riskToken),
            sequencer
        );
    }
    
    function testMinimumStake() public {
        vm.startPrank(validator1);
        
        // Approve and stake
        riskToken.approve(address(consensus), MIN_STAKE);
        consensus.stake(MIN_STAKE);
        
        // Check validator profile
        ConsensusAndStaking.ValidatorProfile memory profile = consensus.validatorProfiles(validator1);
        assertEq(profile.stakedAmount, MIN_STAKE);
        assertTrue(profile.isActive);
        
        vm.stopPrank();
    }
    
    function testFuzzStakeAmount(uint256 amount) public {
        vm.assume(amount >= MIN_STAKE);
        vm.assume(amount < 100000 ether);
        
        vm.startPrank(validator1);
        
        riskToken.approve(address(consensus), amount);
        consensus.stake(amount);
        
        ConsensusAndStaking.ValidatorProfile memory profile = consensus.validatorProfiles(validator1);
        assertEq(profile.stakedAmount, amount);
        
        vm.stopPrank();
    }
    
    function testStakeBelowMinimum() public {
        vm.startPrank(validator1);
        
        uint256 smallAmount = MIN_STAKE - 1;
        riskToken.approve(address(consensus), smallAmount);
        
        vm.expectRevert();
        consensus.stake(smallAmount);
        
        vm.stopPrank();
    }
    
    function testSubmitAssessment() public {
        // Setup validator
        vm.startPrank(validator1);
        riskToken.approve(address(consensus), MIN_STAKE);
        consensus.stake(MIN_STAKE);
        vm.stopPrank();
        
        // Submit assessment
        vm.startPrank(validator1);
        uint8 riskScore = 75;
        bytes32 correlationHash = keccak256("test-correlation");
        
        consensus.submitAssessment(riskScore, correlationHash);
        
        vm.stopPrank();
    }
    
    function testFuzzSubmitAssessment(uint8 score) public {
        vm.assume(score <= 100);
        
        // Setup validator
        vm.startPrank(validator1);
        riskToken.approve(address(consensus), MIN_STAKE);
        consensus.stake(MIN_STAKE);
        vm.stopPrank();
        
        // Submit assessment
        vm.startPrank(validator1);
        bytes32 correlationHash = keccak256("test");
        consensus.submitAssessment(score, correlationHash);
        vm.stopPrank();
    }
    
    function testSettleRound() public {
        // Setup validators
        vm.startPrank(validator1);
        riskToken.approve(address(consensus), MIN_STAKE);
        consensus.stake(MIN_STAKE);
        vm.stopPrank();
        
        vm.startPrank(validator2);
        riskToken.approve(address(consensus), MIN_STAKE);
        consensus.stake(MIN_STAKE);
        vm.stopPrank();
        
        // Sequencer settles
        vm.prank(sequencer);
        consensus.calculateAndSettleRound();
    }
    
    function testOnlySequencerCanSettle() public {
        vm.startPrank(validator1);
        
        vm.expectRevert();
        consensus.calculateAndSettleRound();
        
        vm.stopPrank();
    }
}


