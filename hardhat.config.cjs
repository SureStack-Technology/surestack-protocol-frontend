require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-abi-exporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.26",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun",   // <— REQUIRED FOR mcopy
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "paris",
        },
      },
    ],

    overrides: {
      // All OpenZeppelin governance MUST use Cancun compiler
      "@openzeppelin/contracts/governance/Governor.sol": {
        version: "0.8.26",
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
      },
      "@openzeppelin/contracts/utils/Bytes.sol": {
        version: "0.8.26",
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
      },
      "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol": {
        version: "0.8.26",
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
      },
    },
  },

  networks: {
    sepolia: {
      url: process.env.INFURA_API_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },

  abiExporter: {
    path: "./src/shared/abi",
    clear: false,
    flat: true,
    only: [
      "ConsensusAndStakingV2",
      "RewardPoolAndSlasher",
      "OracleReaderV2",
      "SureStackToken",
    ],
  },
};