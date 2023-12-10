const {ethers} = require("hardhat");

const networkConfig = {
  11155111: {
    name: "Sepolia",
    vrfcoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entrancefee: ethers.utils.parseEther("0.05"),
    keyhash:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    interval: "30",
    subId: "4469",
    CALLBACK_GAS_LIMIT: "100000",
  },
  31337: {
    name: "hardhat",
    entrancefee: ethers.utils.parseEther("0.001"),
    interval: "30",
    CALLBACK_GAS_LIMIT: "50000",
    keyhash:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
  },
};
const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
