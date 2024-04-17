const { ethers, deployments } = require("hardhat");

async function enterLottery() {
  console.log("Entering Lottery....");
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const LotteryFactory = await deployments.get("Lottery");
  const Lottery = await ethers.getContractAt(
    "Lottery",
    LotteryFactory.address,
    deployer
  );
  const entrance_fee = await Lottery.getEntranceFee();
  await Lottery.enterLottery({ value: entrance_fee });
  console.log("Lottery Entered!");
  console.log(entrance_fee.toString());
}
enterLottery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
