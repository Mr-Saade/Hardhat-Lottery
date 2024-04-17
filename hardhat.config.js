require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  // defaultNetwork: "localhost",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [
        process.env.SEPOLIA_PRIVATE_KEY,
        process.env.SEPOLIA_USER_PRIVATE_KEY,
      ],
      blockConfirmations: 6,
      chainId: 11155111,
      saveDeployments: true,
    },
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas_reporter.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    token: "ETH", //To get a gas report on the ethereum network.
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    user: {
      default: 1,
    },
  },
  mocha: {
    setTimeout: 120000,
  },
};
