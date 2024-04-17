const { ethers } = require("hardhat");

async function main() {
  console.log("Picking a random winner...");
  //get a random winner
  //call the checkupkeep and performupKeep on contract
  //mock the vrf coordinator fulfullrandomWords
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const data = ethers.keccak256(ethers.toUtf8Bytes(""));
  const Lottery = await ethers.getContractAt(
    "Lottery",
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    deployer
  );

  const vrfMock = await ethers.getContractAt(
    "VRFCoordinatorV2Mock",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    deployer
  );
  const { upkeepNeeded } = await Lottery.checkUpkeep(data);

  if (upkeepNeeded) {
    console.log("Upkeep Needed!");
    const txResponse = await Lottery.performUpkeep(data);
    const txReceipt = await txResponse.wait(1);
    const requestId = txReceipt.logs[1].args[0];
    const txfulfillResponse = await vrfMock.fulfillRandomWords(
      requestId,
      await Lottery.getAddress()
    );
    const txfulfillReceipt = await txfulfillResponse.wait(1);
    const isSuccess = txfulfillReceipt.logs[1].args[3];
    console.log(isSuccess);
    const winner = await Lottery.getWinner();
    console.log(`Winner: ${winner.toString()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
