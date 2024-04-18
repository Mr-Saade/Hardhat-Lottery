const { deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");
developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Test", function () {
      let Lottery, deployer, player, sendValue;
      beforeEach(async () => {
        sendValue = await ethers.parseEther("0.001");
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];
        Lottery = await ethers.getContractAt(
          "Lottery",
          "0x454e88Eb5D0736C799Fd6AC846e6708F0B53c59d", // copy address from deployments
          deployer
        );
      });
      describe("fulfillRandomWords", function () {
        this.timeout(200000);
        it("should work with live Chainlink VRF and Keepers services for random number generation and automation, pick a random winner and send the funds to the winner", async () => {
          const preTimeStamp = await Lottery.getLastTimeStamp();
          await new Promise(async (resolve, reject) => {
            Lottery.once("RequestFulfilled", async () => {
              console.log("Winner Picked!");
              try {
                const lotteryState = await Lottery.getLotteryState();
                const postTimeStamp = await Lottery.getLastTimeStamp();
                const winner = await Lottery.getWinner();

                const endingContractBalance = BigInt(
                  await ethers.provider.getBalance(await Lottery.getAddress())
                );

                assert((await Lottery.getNumberOfPlayers()) == 0);
                assert(lotteryState == "0");
                assert(postTimeStamp.toString() > preTimeStamp.toString());
                assert(endingContractBalance.toString() == "0");

                if (winner == player.address) {
                  console.log("Player was the winner!");
                  const winnerEndingBalance = await ethers.provider.getBalance(
                    player.address
                  );
                  const gasCost =
                    BigInt(playerGasUsed.toString()) *
                    BigInt(playerGasPrice.toString());

                  assert.equal(
                    winnerEndingBalance + gasCost,
                    initPlayerBalance + initContractBalance + gasCost
                  );
                } else if (winner == deployer.address) {
                  console.log("Deployer was the winner!");
                  const winnerEndingBalance = await ethers.provider.getBalance(
                    deployer.address
                  );
                  const gasCost =
                    BigInt(deployerGasUsed.toString()) *
                    BigInt(deployerGasPrice.toString());

                  assert.equal(
                    winnerEndingBalance + gasCost,
                    initDeployerBalance + initContractBalance + gasCost
                  );
                }
                resolve();
              } catch (err) {
                console.error(err);
                reject(err);
              }
            });

            const playerConnect = await Lottery.connect(player);
            const playerTx = await playerConnect.enterLottery({
              value: sendValue,
            });
            console.log("Player Entered!");
            const playerTxReceipt = await playerTx.wait(1);
            const { gasUsed: playerGasUsed, gasPrice: playerGasPrice } =
              playerTxReceipt;

            const deployerTx = await Lottery.enterLottery({ value: sendValue });
            console.log("Deployer Entered!");
            const deployerTxReceipt = await deployerTx.wait(1);
            const { gasUsed: deployerGasUsed, gasPrice: deployerGasPrice } =
              deployerTxReceipt;

            const initPlayerBalance = BigInt(
              await ethers.provider.getBalance(player.address)
            );

            const initDeployerBalance = BigInt(
              await ethers.provider.getBalance(deployer.address)
            );

            const initContractBalance = BigInt(
              await ethers.provider.getBalance(await Lottery.getAddress())
            );

            console.log("Waiting for event listener...");
          });
        });
      });
    });
