const { developmentChains } = require("../helper-hardhat-config");
module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const BASE_FEE = 100000000000000000n;
  const GAS_PRICE_LINK = 1000000000n;

  if (developmentChains.includes(network.name)) {
    log("Local network detected!. Deploying mock.....");
    const vrfMock = await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
    });
    log("Mock Deployed!");
    log("------------------------------------------------------");
  }
};
module.exports.tags = ["all", "mock"];
