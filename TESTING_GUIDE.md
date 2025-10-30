# SureStack Protocol - Testing Guide

## Overview

This guide covers the complete testing infrastructure for SureStack Protocol smart contracts, including Hardhat tests, Foundry tests, gas reporting, and coverage analysis.

## Test Structure

```
/test/                           # Hardhat tests
  ├── SureStackToken.test.js      # Token contract tests
  ├── ConsensusAndStaking.test.js # Consensus & staking tests
  ├── RewardPoolAndSlasher.test.js # Reward pool tests
  └── DAOGovernance.test.js      # DAO governance tests

/foundry-test/                   # Foundry tests
  └── ConsensusAndStaking.t.sol  # Fuzz tests with Forge

/scripts/
  └── validate-sepolia.js        # Sepolia deployment validator

/reports/                        # Generated reports
  ├── получают/                    # Gas reports
  └── coverage/                  # Coverage reports
```

## Running Tests

### Hardhat Tests

```bash
# Run all tests on localhost network
npm test

# Run all tests (any network)
npm run test:all

# Run specific test file
npx hardhat test test/core/SureStackToken.test.js

# Run tests with gas reporting
npm run gas

# Generate coverage report
npm run coverage

# Validate Sepolia deployment
npm run validate
```

### Foundry Tests

First, ensure Foundry is installed:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Then run Forge tests:
```bash
# Install dependencies
forge install

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Run specific test contract
forge test --match-contract ConsensusAndStakingTest

# Run with verbosity
forge test -vvv
```

## Test Coverage

### SureStackToken Tests
- ✅ Deployment and initialization
- ✅ Token transfers
- ✅ Batch transfers
- ✅ Approval and transferFrom
- ✅ Minting (owner only)
- ✅ Edge cases (zero amounts, self-transfers)

### ConsensusAndStaking Tests
- ✅ Deployment configuration
- ✅ Staking functionality (minimum stake, additional stake)
- ✅ Assessment submission
- ✅ Round settlement (sequencer only)
- ✅ Unstaking requests
- ✅ Edge cases and access control

### RewardPoolAndSlasher Tests
- ✅ Reward pool topping up
- ✅ Reward distribution
- ✅ Slashed funds receiving
- ✅ Penalty fund burning
- ✅ Balance tracking

### DAOGovernance Tests
- ✅ Deployment setup
- ✅ Proposal creation
- ✅ Voting mechanism
- ✅ Vote counting
- ✅ Timelock integration

## Gas Reporting

After running tests with `npm run gas`, check the report:

```bash
cat reports/gas-report.txt
```

For Foundry gas reports, run:
```bash
forge test --gas-report > reports/forge-gas-report.txt
```

## Coverage Reports

Generate coverage report:
```bash
npm run coverage
```

The report will be generated in `reports/coverage/`. Open the HTML file:
```bash
open reports/coverage/index.html
```

## Sepolia Validation

After deploying to Sepolia, validate the deployment:

1. Update `deployment-info.json` with Sepolia addresses
2. Set `INFURA_API_URL` in `.env`
3. Run validation:

```bash
npm run validate
```

The script will check:
- ✅ Contract addresses are valid
- ✅ Token total supply is correct
- ✅ Minimum stake requirements
- ✅ Validator count
- ✅ Pool balances

## Writing New Tests

### Hardhat Test Template

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContractName", function () {
  let contract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const ContractFactory = await ethers.getContractFactory("ContractName");
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
  });

  describe("FunctionName", function () {
    it("Should do something", async function () {
      // Arrange
      const expectedResult = 100;
      
      // Act
      const result = await contract.functionName();
      
      // Assert
      expect(result).to.equal(expectedResult);
    });

    it("Should revert with correct message", async function () {
      await expect(contract.functionName())
        .to.be.revertedWith("Expected error message");
    });
  });
});
```

### Foundry Test Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/YourContract.sol";

contract YourContractTest is Test {
    YourContract public contract;
    
    function setUp() public {
        contract = new YourContract();
    }
    
    function testBasicFunctionality() public {
        // Test basic functionality
        assertEq(contract.someValue(), expectedValue);
    }
    
    function testFuzz(uint256 input) public {
        // Fuzz testing
        vm.assume(input < type(uint256).max);
        // Test with various inputs
    }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Generate coverage
        run: npm run coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests failing with "network error"
- Make sure Hardhat node is running: `npx hardhat node`
- Check network configuration in `hardhat.config.js`

### Coverage report not generating
- Ensure `solidity-coverage` is installed
- Try deleting `coverage/` folder and running again

### Foundry compilation errors
- Run `forge clean` to clear cache
- Check Solidity version matches contract version (0.8.20)

### Gas report shows 0 gas
- Make sure you're running tests on a network (not just compiling)
- Check that contracts are being deployed in tests

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Edge Cases**: Test boundary conditions
4. **Gas Optimization**: Use gas reports to optimize
5. **Coverage Goals**: Aim for >80% coverage
6. **Fuzz Testing**: Use Foundry for random input testing
7. **Integration Tests**: Test contract interactions
8. **Documentation**: Document test purpose and expected behavior

## Reports Directory

The `reports/` directory contains:
- `gas-report.txt` - Gas usage per function
- `coverage/` - HTML coverage report
- `forge-gas-report.txt` - Foundry gas report

Add `reports/` to `.gitignore` to avoid committing generated reports.

## Next Steps

1. ✅ Run all tests: `npm test`
2. ✅ Generate coverage: `npm run coverage`
3. ✅ Review gas reports for optimization
4. ✅ Write integration tests for contract interactions
5. ✅ Add invariant tests with Foundry
6. ✅ Set up CI/CD pipeline
7. ✅ Test on Sepolia before mainnet deployment

## Resources

- [Hardhat Testing Guide](https://hardhat.org/docs/guides/writing-tests)
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZepparatus Test Helpers](https://docs.openzeppelin.com/test-helpers)
- [Solidity Coverage](https://github.com/sc-forks/solidity-coverage)

