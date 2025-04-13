# Decentralized Data Labeling Platform - Smart Contracts

This directory contains the smart contracts for the DataHUB :Decentralized Data Labeling Platform.

## Contracts
- `TaskManager.sol`: Manages data collection and labeling tasks
- `HubToken.sol`: ERC20 token for rewards and governance
- `ContractRegistry.sol`: Central registry for all contract addresses
- `DatasetRegistry.sol`: Tracks validated datasets
- `DealClient.sol`: Integrates with Filecoin storage
- `DataHubCore.sol`: Core platform functionality
- `MembershipManager.sol`: Handles community membership
- `GovernanceModule.sol`: Manages proposals and voting

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Hardhat

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on the example:

```
# Development Private Key (DO NOT USE IN PRODUCTION)
PRIVATE_KEY="<your-private-key>"

# Blockchain Network Configuration
NETWORK_NAME="Filecoin Calibration Testnet"
NETWORK_RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
NETWORK_CHAIN_ID=314159

# Lighthouse Configuration
LIGHTHOUSE_API_KEY=<your-lighthouse-api-key>
LIGHTHOUSE_NODE_URL="https://gateway.lighthouse.storage"

# CID Configuration
MAX_CID_LENGTH=64
```

## Compiling Contracts

Compile the contracts:

```bash
npx hardhat compile
```

## Deploying Contracts

### Filecoin Calibration Testnet

Deploy to the Filecoin Calibration testnet:

```bash
npx hardhat run scripts/deploy.js --network filecoinCalibration
```

