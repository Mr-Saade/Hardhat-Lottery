# Lottery Smart Contract

The **Lottery Smart Contract** is a decentralized application (DApp) built on Ethereum that enables users to participate in a tamper-proof and verifiably random lottery. The contract utilizes Chainlink VRF (Verifiable Random Function) and Keepers services to ensure a fair, secure and automated lottery process.

## Table of Contents

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Quickstart](#quickstart)
- [Usage](#usage)
  - [Deploying](#deploying)
  - [Testing](#testing)
  - [Test Coverage](#test-coverage)
  - [Deployment to Testnet or Mainnet](#deployment-to-testnet-or-mainnet)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Setup Chainlink VRF](#setup-chainlink-vrf)
  - [Register Chainlink Keepers Upkeep](#register-chainlink-keepers-upkeep)
- [Enter the Lottery](#enter-the-lottery)
- [Estimate Gas Cost in USD](#estimate-gas-cost-in-usd)
- [Verify on Etherscan](#verify-on-etherscan)
- [Linting](#linting)

## Getting Started

### Requirements

To set up and use the Lottery Smart Contract, you'll need the following:

- `git`
- `Node.js`
- `Yarn` (instead of npm)

Make sure you have these tools installed by running `git --version`, `node --version`, and `yarn --version`.

### Quickstart

1. Clone the repository:

   ```sh
   git clone https://github.com/Mr-Saade/Hardhat-Lottery
   cd Hardhat-Lottery
   ```

2. Install dependencies:

```sh
yarn
```

## Usage

### Deploying

Deploy the Lottery Smart Contract using the following command:

```sh
yarn hardhat deploy
```

### Testing

Run tests to ensure the contract's functionality:

```sh
yarn test
```

### Test Coverage

Generate a test coverage report:

```sh
yarn coverage
```

### Deployment to Testnet or Mainnet

1. Set up environment variables using `.env` file (see [Environment Variables](#environment-variables)).
2. Deploy the contract to the desired network:

```sh
yarn hardhat deploy --network yourNetwork
```

## Configuration

### Environment Variables

Create a `.env` file with the following environment variables:

- `PRIVATE_KEY`: Private key of your Ethereum account (from Metamask).
- `SEPOLIA_RPC_URL`: URL of the Sepolia testnet node.
- `COINMARKETCAP_API_KEY`: API key from CoinMarketCap for gas cost estimation.
- `ETHERSCAN_API_KEY`: API key from Etherscan for contract verification.

### Setup Chainlink VRF

1. Obtain a subscription ID from vrf.chain.link.
2. Fund your subscription with LINK.
3. Add the subscription ID to `helper-hardhat-config.js` (see [Register Chainlink Keepers Upkeep](#register-chainlink-keepers-upkeep)).

### Register Chainlink Keepers Upkeep

1. Set up Chainlink Keepers and register an upkeep.
2. Configure the trigger mechanism as "Custom logic".

## Enter the Lottery

To participate in the lottery, run the following command:

```sh
yarn hardhat run scripts/enterLottery.js --network sepolia
```

## Estimate Gas Cost in USD

For a USD estimation of gas cost, set up `COINMARKETCAP_API_KEY` environment variable (see [Environment Variables](#environment-variables)). Uncomment the line `coinmarketcap: COINMARKETCAP_API_KEY` in `hardhat.config.js`.

## Verify on Etherscan

To verify the contract on Etherscan manually, set up `ETHERSCAN_API_KEY` environment variable (see [Environment Variables](#environment-variables)). Use the following command:

```sh
yarn hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

## Linting

Check and fix code formatting using the following commands:

```sh
yarn lint
yarn lint:fix
```

## Note

This smart contract is intended for educational purposes and demonstrates the implementation of a lottery system using Chainlink VRF and Keepers. Before deploying the contract on a live network, thorough testing and security audits are recommended.

## THANK YOU.
