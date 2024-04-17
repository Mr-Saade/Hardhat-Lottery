const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const { ethers } = require("hardhat");
module.exports = async ({ deployments, network }) => {
  const { deploy, log } = deployments;
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const chainId = network.config.chainId;

  const LINK_TOKENS_AMOUNT = ethers.parseEther("10");
  let vrfCoordinatorAddress, subId, vrfCoordinator;

  if (developmentChains.includes(network.name)) {
    const vrfMock = await deployments.get("VRFCoordinatorV2Mock");

    vrfCoordinatorAddress = await vrfMock.address;
    vrfCoordinator = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      vrfCoordinatorAddress,
      deployer
    );

    //subId = networkConfig[chainId]["subId"];
    const txResponse = await vrfCoordinator.createSubscription();
    const txReceipt = await txResponse.wait(1);

    subId = await txReceipt.logs[0].args[0];
    console.log(`subId: ${subId.toString()}`);

    await vrfCoordinator.fundSubscription(subId, LINK_TOKENS_AMOUNT);
  } else {
    vrfCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorAddress"];

    subId = networkConfig[chainId]["subId"];
  }
  const entranceFee = networkConfig[chainId]["entranceFee"];

  const keyHash = networkConfig[chainId]["keyHash"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

  const argss = [
    entranceFee,
    vrfCoordinatorAddress,
    subId,
    keyHash,
    callbackGasLimit,
  ];

  const Lottery = await deploy("Lottery", {
    from: deployer.address,
    args: argss,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name)) {
    await verify(Lottery.address, argss);
  }
  //Programmatically adding consumer contract to subscription on local network
  if (developmentChains.includes(network.name)) {
    console.log("Adding local lottery contract to subscription....");
    await vrfCoordinator.addConsumer(subId, Lottery.address);
  }

  log("----------------------------------------");
};
module.exports.tags = ["all", "Lottery"];
