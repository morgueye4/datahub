# DataHub Frontend

This is the frontend for the Decentralized Data Labeling Platform, built with React, Vite, and ethers.js.

## Features

- Connect wallet using MetaMask or other Ethereum providers
- Create data labeling tasks with file upload to Filecoin via Lighthouse
- View task details and listings
- Responsive UI built with React Bootstrap

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask or another Ethereum wallet extension

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on the example:

```
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Contract Addresses on Filecoin Calibration Testnet
VITE_TASK_MANAGER_ADDRESS=<deployed-contract-address>

# Blockchain Network Configuration
VITE_NETWORK_NAME="Filecoin Calibration Testnet"
VITE_NETWORK_RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
VITE_NETWORK_CHAIN_ID=314159
VITE_NETWORK_EXPLORER_URL="https://calibration.filfox.info"

# Lighthouse API Key for Filecoin Storage
VITE_LIGHTHOUSE_API_KEY=<your-lighthouse-api-key>
VITE_LIGHTHOUSE_NODE_URL="https://gateway.lighthouse.storage"

# CID Configuration
VITE_MAX_CID_LENGTH=64

# Error Handling Configuration
VITE_DETAILED_ERROR_LOGGING=true
VITE_ERROR_REPORTING=false
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:5173.

## Building for Production

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Connecting to the Blockchain

The application is configured to connect to the Filecoin Calibration testnet. Make sure your MetaMask or other wallet is configured to use this network.

## File Storage

Files are stored on Filecoin via the Lighthouse service. The application uses the Lighthouse SDK to upload files and get their CIDs.
