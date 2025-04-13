# DataHub: Decentralized Data Collection and Labeling Platform

A decentralized platform for AI data collection, labeling, and monetization built on Filecoin Virtual Machine (FEVM) and FIlecoin as the storage layer using lighthouse sdk.

## Project Overview

DataHub is a decentralized platform focused on creating high-quality datasets for AI training. It enables:

1. **Decentralized Data Collection**: Anyone can contribute data to the platform
2. **Quality Control**: Multi-reviewer consensus ensures high-quality datasets
3. **Fair Compensation**: Contributors are rewarded with dataFIL tokens
4. **Data Monetization**: Dataset owners earn when their data is used
5. **Community Governance**: Community members vote on dataset validation and platform decisions

## System Architecture

The platform consists of three main components:

1. **Smart Contracts (Blockchain Layer)**
   - TaskManager: Manages data collection and labeling tasks
   - HubToken: ERC20 token for rewards and governance
   - ContractRegistry: Central registry for all contract addresses
   - DatasetRegistry: Tracks validated datasets
   - DealClient: Integrates with Filecoin storage
   - DataHubCore: Core platform functionality
   - MembershipManager: Handles community membership
   - GovernanceModule: Manages proposals and voting

2. **Frontend (User Interface)**
   - Task creation and submission interface
   - Community governance portal
   - Dataset browsing and access
   - Wallet integration
   - Token management

3. **Backend (Server Layer)**
- RESTful API for contract interactions
- Filecoin storage integration
- Token faucet for testing
- Task, submission, and review management

4. **Python Library (Data Access)**
   - Easy integration for AI developers
   - Dataset access and usage tracking
   - Monetization handling

## Current Status

### What's Working

- ✅ Smart contracts deployed on Filecoin Calibration testnet (see [protocol](protocol) directory) deployment.json file for contract addresses
- ✅ frontend pages impelemented
- ✅ backend server impelemented and connected to frontend
- ✅ metamask wallet conencted

### What Needs Completion

- 🔄 Filecoin storage integration (partially implemented)
- 🔄 Multi-reviewer consensus mechanism (partially implemented)
- 🔄 Dataset monetization (partially implemented)
- 🔄 Python library for dataset access (basic implementation)
- 🔄 Advanced DAO governance features (basic implementation)
- 🔄 End-to-end workflow




## Completion Plan

- Ensure end to end integration front-back, front-contracts, front-contracts, back-contracts
- finish the python library impelmentation
- Refernecing Validated Dataset through the DAO in the python library
- Monetization features of Datasets

## Getting Started 

### Prerequisites
- Node.js 
- npm or yarn
- Deno
- MetaMask wallet
- Access to Filecoin Calibration testnet
- have some faucet tokens from Filecoin Calibration testnet and also once running the Dapp from the token faucet the DApp

### Installation

1. Clone the repository

2. Install dependencies

3. Set up environment variables
```bash
# Copy example .env files
cp protocol/.env.example protocol/.env
cp front/.env.example front/.env
cp backend/.env.example backend/.env
```

4. Start the development servers
```bash
# Start frontend
cd front
npm run dev

# Start backend
cd ../backend
deno run --allow-net --allow-read --allow-env --allow-write --unstable-kv main.ts
```

5. Access the application
Open your browser and navigate to `http://localhost:5173`


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.