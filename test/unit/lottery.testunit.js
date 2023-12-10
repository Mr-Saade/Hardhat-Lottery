const {assert, expect} = require("chai");
const {ethers, deployments, network} = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function () {
      console.log("Local network detected...");
      let Lottery;
      let deployer;
      let VRFCoordinatorV2Mock;
      let entrance_fee;
      let interval;
      let LotteryContract;
      let accounts;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture("all");
        const LotteryFactory = await deployments.get("Lottery");
        const MockFactory = await deployments.get("VRFCoordinatorV2Mock");

        LotteryContract = await ethers.getContractAt(
          "Lottery",
          LotteryFactory.address
        );
        const VRFCoordinatorV2MockContract = await ethers.getContractAt(
          "VRFCoordinatorV2Mock",
          MockFactory.address
        );
        Lottery = LotteryContract.connect(deployer);
        VRFCoordinatorV2Mock = VRFCoordinatorV2MockContract.connect(deployer);

        entrance_fee = await Lottery.getEntrancefee();
        interval = await Lottery.getInterval();
      });
      describe("constructor", function () {
        it("Initializes lottery correctly", async () => {
          const lotterystate = await Lottery.getState();
          assert.equal(lotterystate.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });
      describe("enterLottery", function () {
        it("Reverts when you dont have enough Eth to enter lottery", async () => {
          await expect(Lottery.enterLottery()).to.be.revertedWith(
            "'Lottery__NotEnoughEth"
          );
        });
        it("Records players when they enter", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          const player1 = await Lottery.getPlayers(0);
          assert.equal(player1, deployer.address);
        });
        it("Emit an event when a player enters", async () => {
          await expect(Lottery.enterLottery({value: entrance_fee})).to.emit(
            Lottery,
            "LotteryEnter"
          );
        });
        it("It doesnt allow new players to enter lottery when state is closed.", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await Lottery.performUpkeep([]);

          await expect(
            Lottery.enterLottery({value: entrance_fee})
          ).to.be.revertedWith("Lottery__NotOpened");
        });
      });
      describe("checkUpKeep", function () {
        it("Returns false when lottery has no Eth", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const {upkeepNeeded} = await Lottery.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });
        it("Returns false if lottery is closed", async () => {
          await Lottery.enterLottery({value: entrance_fee});

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await Lottery.performUpkeep([]);
          lotterystate = await Lottery.getState();
          const {upkeepNeeded} = await Lottery.callStatic.checkUpkeep([]);
          assert.equal(lotterystate.toString(), "1");
          assert(!upkeepNeeded);
        });
        it("returns false if enough time hasn't passed", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 5,
          ]); // use a higher number here if this test fails
          await network.provider.request({method: "evm_mine", params: []});
          const {upkeepNeeded} = await Lottery.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({method: "evm_mine", params: []});
          const {upkeepNeeded} = await Lottery.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("Only performs Upkeep if our checkUpKeep function returns true", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({method: "evm_mine", params: []});
          const tx = await Lottery.performUpkeep([]);
          assert(tx);
        });
        it("Revert with an error if checkUpkeep is false", async () => {
          await expect(Lottery.performUpkeep([])).to.be.revertedWith(
            "Lottery__UpKeepNotNeeded"
          );
        });
        it("Updates the raffle state, calls the VRFCoordinator and emit an event", async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({method: "evm_mine", params: []});
          const txResponse = await Lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          const lotteryState = await Lottery.getState();
          assert(requestId.toNumber() > 0);
          assert(lotteryState == 1);
        });
      });
      describe("fulfillRandomWords", function () {
        let winner_initial_balance;
        beforeEach(async () => {
          await Lottery.enterLottery({value: entrance_fee});
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          winner_initial_balance = await accounts[1].getBalance();
        });
        it("Should only fulfillRandomWords when peformUpkeep has been executed.", async () => {
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(0, Lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });
        it("Picks a winner, sends the money and resets the lottery", async () => {
          const additional_players = 3;
          const startingIndex = 1;
          for (
            let i = startingIndex;
            i < additional_players + startingIndex;
            i++
          ) {
            const Lottery = LotteryContract.connect(accounts[i]);
            await Lottery.enterLottery({value: entrance_fee});
          }
          const starting_timestamp = await Lottery.getLatestTimeStamp();
          await new Promise(async (resolve, reject) => {
            Lottery.once("WinnerPicked", async () => {
              console.log("YEP, HEARD THE EVENT!!!");
              try {
                const recent_Winner = await Lottery.getWinner();
                const ending_timestamp = await Lottery.getLatestTimeStamp();
                const lottery_state = await Lottery.getState();
                const players_numbers = await Lottery.getNumOfPlayers();
                const winner_ending_balance = await accounts[1].getBalance();

                assert(ending_timestamp > starting_timestamp);
                assert.equal(lottery_state, 0);
                assert(players_numbers == 0);
                /*assert.equal(
                  winner_initial_balance.toString(),
                  winner_ending_balance // winnner_ending_balance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(
                      entrance_fee
                        .mul(additional_players)
                        .add(entrance_fee)
                        .toString()
                    )
                );*/ //To compare exact values of the winnerstartingbalance to the winnersendingbalance after having received the money
                assert(
                  winner_ending_balance.toString() >
                    winner_initial_balance.toString()
                );
                console.log(`Winner address: ${recent_Winner}`);
                console.log(accounts[1].address);
                console.log(accounts[2].address);
                console.log(accounts[3].address);
              } catch (e) {
                reject(e);
              }
              resolve();
            });
            try {
              const tx = await Lottery.performUpkeep([]);
              const txReceipt = await tx.wait(1);

              await VRFCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args.requestId,
                Lottery.address
              );
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
