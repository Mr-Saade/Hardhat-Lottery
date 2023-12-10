require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-verify");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: {
    compilers: [{version: "0.8.0"}, {version: "0.8.19"}],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    Sepolia: {
      url: process.env.Sepolia_Rpc_Url,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
      blockConfirmations: 6,
      timeout: 120000, //thus, 100000ms = 120 seconds
    },
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas_reporter.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH", //To get a gas report on the ethereum network.
  },
  contractSizer: {
    runOnCompile: false,
    only: ["Lottery"],
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    player: {
      default: 1,
    },
  },
  mocha: {
    setTimeout: 700000, //700 seconds timeout for test
  },
};
