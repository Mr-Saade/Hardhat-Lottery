const {network, ethers} = require("hardhat");
const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_LINK = 1e9;
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  chainId = await network.config.chainId.toString();
  if (chainId === "31337") {
    log("Local network detected, Deploying mock...");
    await deploy("VRFCoordinatorV2Mock", {
      contract: "VRFCoordinatorV2Mock",
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_LINK],
    });
    log("Mock Deployed!.");
    log("----------------------------------------");
  }
};
module.exports.tags = ["all", "mock"];
