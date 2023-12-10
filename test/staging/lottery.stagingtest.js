/*first of all crate a subscription for our VRF service and fund it
deploy our contract with our funded subscription ID
Register our deployed contract as a consumer with chainlink VRF with subID and KEEPERS
Run staging tests*/
const {assert, expect} = require("chai");
const {ethers, deployments, network} = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function () {
      console.log("Testnet network detected.....");

      let Lottery;
      let deployer;
      let entrance_fee;
      let interval;
      let LotteryContract;

      beforeEach(async function () {
        console.log("Setting up beforeEach.....");

        accounts = await ethers.getSigners();
        deployer = await accounts[0];

        const LotteryFactory = await deployments.get("Lottery");
        LotteryContract = await ethers.getContractAt(
          "Lottery",
          LotteryFactory.address
        );

        Lottery = LotteryContract.connect(deployer);

        entrance_fee = await Lottery.getEntrancefee();
        interval = await Lottery.getInterval();
      });
      describe("fulfill random words", function () {
        this.timeout(200000);
        it("Picks a winner, sends the money to the winner and resets the lottery, using Chainlink VRF and KEEPERS service", async () => {
          console.log("Setting up test.....");
          const starting_timestamp = await Lottery.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          const winner_starting_balance = await accounts[0].getBalance();
          console.log("Setting up listener for event in a promise......");

          await new Promise(async (resolve, reject) => {
            console.log("Promise initialized.");
            Lottery.once("WinnerPicked", async () => {
              console.log("Listened for the WinnerPicked event!");
              try {
                //A winner should be picked randomly and verifyably and automatically using Chainlinks VRF and Keepers service
                //All the funds in the lottery should be sent to the winner
                //Lottery should be reset thus, players should be empty and state should be back to OPEN, blocktimestamp should be reset as well
                //Winners balance should be icnreamented.
                const recent_Winner = await Lottery.getWinner();
                const winner_ending_balance = await accounts[0].getBalance();
                const lottery_state = await Lottery.getState();
                const ending_timestamp = await Lottery.getLatestTimeStamp();
                assert(recent_Winner == accounts[0].address);
                expect(
                  Number(winner_starting_balance.add(entrance_fee))
                ).to.be.greaterThan(Number(winner_ending_balance));

                await expect(Lottery.getPlayers(0)).to.be.reverted;
                assert.equal(lottery_state, 0);
                assert(ending_timestamp > starting_timestamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            console.log("Entering Lottery.....");

            await Lottery.enterLottery({value: entrance_fee});
            console.log("Lottery entered.");
            console.log("Waiting for event to get fired.....");
          });
        });
      });
    });
