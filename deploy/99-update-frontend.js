/*This script dynamically updates our frontend by modifying the constants file in our frontend. It ensures that the contract address and
ABI associated with each chain ID are automatically adjusted whenever a new contract is deployed, maintaining synchronization between 
our smart contract and frontend interface.*/

require("dotenv").config();
const fs = require("fs");
const { network } = require("hardhat");

const FRONTEND_CONTRACTADDRESSES =
  "../nextjs-smartcontract-lottery/constants/contractAddresses.json";
const FRONTEND_ABI = "../nextjs-smartcontract-lottery/constants/abi.json";
const chainId = network.config.chainId;
let lottery;
module.exports = async ({ deployments }) => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...");
    lottery = await deployments.get("Lottery");
    updateContractAddresses();
    updateAbi();
    console.log(`Front end updated at ContractAddress: ${lottery.address}`);
  }
};

const updateContractAddresses = () => {
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_CONTRACTADDRESSES, "utf8")
  );
  if (
    chainId in currentAddresses &&
    currentAddresses[chainId] != lottery.address.toString()
  ) {
    currentAddresses[chainId] = lottery.address.toString();
  } else if (!(chainId in currentAddresses)) {
    currentAddresses[chainId] = lottery.address.toString();
  }
  fs.writeFileSync(
    FRONTEND_CONTRACTADDRESSES,
    JSON.stringify(currentAddresses)
  );
};

const updateAbi = () => {
  fs.writeFileSync(FRONTEND_ABI, JSON.stringify(lottery.abi));
};
module.exports.tags = ["all", "frontend"];
