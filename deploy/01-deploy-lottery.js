const {networkConfig} = require("../helper-hardhat-config");
const {network, ethers} = require("hardhat");
const {verify} = require("../utils/verify");
require("dotenv").config();
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = network.config.chainId.toString();
  let vrfcoordinatorAddress, subId, VRFCoordinatorV2Mock;

  if (chainId === "31337") {
    VRFCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
    V2MockContractFactory = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      VRFCoordinatorV2Mock.address
    );
    vrfcoordinatorAddress = VRFCoordinatorV2Mock.address;
    const transactionResponse =
      await V2MockContractFactory.createSubscription();
    const transanctionReceipt = await transactionResponse.wait(1);
    subId = transanctionReceipt.events[0].args.subId;
    await V2MockContractFactory.fundSubscription(
      subId,
      ethers.utils.parseEther("50")
    );
  } else {
    vrfcoordinatorAddress = networkConfig[chainId]["vrfcoordinatorAddress"];
    subId = networkConfig[chainId]["subId"];

    log("Deploying Lottery Contract and awaiting 6 block confirmations....");
  }
  entranceFee = networkConfig[chainId]["entrancefee"];
  keyHash = networkConfig[chainId]["keyhash"];
  Interval = networkConfig[chainId]["interval"];
  callbackGasLimit = networkConfig[chainId]["CALLBACK_GAS_LIMIT"];

  const Lottery = await deploy("Lottery", {
    from: deployer,
    args: [
      entranceFee,
      vrfcoordinatorAddress,
      keyHash,
      subId,
      callbackGasLimit,
      Interval,
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(deployer);
  log("---------------------------------------");
  if (chainId === "31337") {
    VRFCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
    V2MockContractFactory = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      VRFCoordinatorV2Mock.address
    );
    log("Adding consumer to subscription.........");
    await V2MockContractFactory.addConsumer(subId, Lottery.address);
  }

  if (chainId !== "31337" && process.env.ETHERSCAN_API_KEY) {
    log("Verifying Lottery contract.....");
    await verify(vrfcoordinatorAddress, [
      entranceFee,
      vrfcoordinatorAddress,
      keyHash,
      subId,
      callbackGasLimit,
      Interval,
    ]);
  }
};
module.exports.tags = ["all", "lottery"];
