const hre = require("hardhat");

const verify = async (contractAddress, args) => {
  console.log(`Verifying contract at ${contractAddress} ...`);
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!");
    } else {
      console.log(e);
    }
  }
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

module.exports = {verify};
