const { deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", function () {
      let Lottery, vrfMock, deployer, player;
      const INTERVAL = 30;
      beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];

        await deployments.fixture(["all"]);
        Lottery = await ethers.getContractAt(
          "Lottery",
          "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", //  copy address from deployments
          deployer
        );
        vrfMock = await ethers.getContractAt(
          "VRFCoordinatorV2Mock",
          "0x5FbDB2315678afecb367f032d93F642f64180aa3", //  copy address from deployments
          deployer
        );
      });

      describe("constructor", function () {
        it("should initialize the contract correctly", async () => {
          const lotteryState = await Lottery.getLotteryState();
          assert.equal(
            (await vrfMock.getAddress()).toString(),
            (await Lottery.s_vrfCoordinator()).toString()
          );
          assert.equal(lotteryState.toString(), "0");
        });
      });
      describe("enterLottery", function () {
        it("should revert if Eth is less than required", async () => {
          await expect(
            Lottery.enterLottery({ value: ethers.parseEther("0.00001") })
          ).to.be.reverted;
        });
        it("should add entered players to participants", async () => {
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          const playerAddress = await Lottery.getPlayer(0);
          assert.equal(playerAddress.toString(), deployer.address.toString());
        });
        it("should emit event on a new added participant", async () => {
          await expect(
            Lottery.enterLottery({ value: ethers.parseEther("0.1") })
          ).to.emit(Lottery, "LotteryEntered");
        });
        it("should prevent entry to lottery when lottery's state is closed", async () => {
          const playerLottery = await Lottery.connect(player);
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          await playerLottery.enterLottery({ value: ethers.parseEther("0.1") });
          //we fastfoward the block timestamp and simulate the Chainlink Keepers performing upkeep.
          await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
          await network.provider.send("evm_mine", []);
          await Lottery.performUpkeep("0x");
          await expect(
            Lottery.enterLottery({ value: ethers.parseEther("0.1") })
          ).to.be.reverted;
        });
      });
      describe("checkUpkeep", function () {
        it("should return false if any of the pre-conditions set for upkeep doesn't pass", async () => {
          //In this scneario, sufficient time has passed but the lottery doesn't have enough players/ETH.
          await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Lottery.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("should return true if all the pre-conditions set for upkeep passes", async () => {
          const playerLottery = await Lottery.connect(player);
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          await playerLottery.enterLottery({ value: ethers.parseEther("0.1") });
          //we fastfoward the block timestamp and simulate the Chainlink Keepers performing upkeep.
          await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Lottery.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("performUpkeep should revert if checkupKeep returns false", async () => {
          const playerLottery = await Lottery.connect(player);
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          await playerLottery.enterLottery({ value: ethers.parseEther("0.1") });
          await expect(Lottery.performUpkeep("0x")).to.be.reverted;
        });
        it("if checkupkeep is true, performUpkeep should update the lottery state, and call into the vrf coordinator", async () => {
          const playerLottery = await Lottery.connect(player);
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          await playerLottery.enterLottery({ value: ethers.parseEther("0.1") });
          await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
          await network.provider.send("evm_mine", []);
          const txResponse = await Lottery.performUpkeep("0x");
          const lotteryState = await Lottery.getLotteryState();
          assert.equal(lotteryState.toString(), "1");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.logs[1].args[0];
          assert(requestId.toString() > "0");
        });
      });
      describe("FulfillRandomWords", function () {
        beforeEach(async () => {
          const playerLottery = await Lottery.connect(player);
          await Lottery.enterLottery({ value: ethers.parseEther("0.1") });
          await playerLottery.enterLottery({ value: ethers.parseEther("0.1") });
          await network.provider.send("evm_increaseTime", [INTERVAL + 1]);
          await network.provider.send("evm_mine", []);
        });
        it("fulfill can only be called after performUpKeep", async () => {
          //before calling performUpKeep
          await expect(
            vrfMock.fulfillRandomWords("0", await Lottery.getAddress())
          ).to.be.reverted;
          await expect(
            vrfMock.fulfillRandomWords("1", await Lottery.getAddress())
          ).to.be.reverted;

          //After calling performUpKeep successfully

          const txResponse = await Lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.logs[1].args[0];
          const txfulfillResponse = await vrfMock.fulfillRandomWords(
            requestId,
            await Lottery.getAddress()
          );
          const txfulfillReceipt = await txfulfillResponse.wait(1);
          const isSuccess = txfulfillReceipt.logs[1].args[3];
          assert(isSuccess);
        });
        it("winner should receive all the funds, players array should be reset, state should be opened, timestamp should be reset", async () => {
          const innitialContractBalance = await ethers.provider.getBalance(
            await Lottery.getAddress()
          );
          const preTimeStamp = await Lottery.getLastTimeStamp();
          const txResponse = await Lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.logs[1].args[0];
          await vrfMock.fulfillRandomWords(
            requestId,
            await Lottery.getAddress()
          );

          const endingContractBalance = await ethers.provider.getBalance(
            await Lottery.getAddress()
          );
          const postTimeStamp = await Lottery.getLastTimeStamp();
          assert((await Lottery.getNumberOfPlayers()) == 0);
          assert((await Lottery.getLotteryState()) == "0");
          assert(
            innitialContractBalance.toString() >
              endingContractBalance.toString()
          );
          assert(postTimeStamp.toString() > preTimeStamp.toString());
          /*We can also get the winner from our lottery with our getWinner 
          funtion to confirm if the funds were succesfully sent to the winner
          */
        });
      });
    });
