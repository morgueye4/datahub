# DataHub: Decentralized Data Labeling Platform

A decentralized platform for AI data collection, labeling, and monetization built on Filecoin Virtual Machine (FEVM).

## Project Overview

DataHub is a decentralized platform focused on creating high-quality datasets for AI training. It enables:

1. **Decentralized Data Collection**: Anyone can contribute data to the platform
2. **Quality Control**: Multi-reviewer consensus ensures high-quality datasets
3. **Fair Compensation**: Contributors are rewarded with hubFIL tokens
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

3. **Python Library (Data Access)**
   - Easy integration for AI developers
   - Dataset access and usage tracking
   - Monetization handling

## Current Status

### What's Working

- ✅ Smart contract deployment on Filecoin Calibration testnet
- ✅ Task creation and management
- ✅ Token-based reward system
- ✅ Basic frontend for task creation and submission
- ✅ Wallet integration (MetaMask)
- ✅ Token faucet for testing
- ✅ Basic DAO functionality

### What Needs Completion

- 🔄 Filecoin storage integration (partially implemented)
- 🔄 Multi-reviewer consensus mechanism (partially implemented)
- 🔄 Dataset monetization (partially implemented)
- 🔄 Python library for dataset access (basic implementation)
- ❌ Advanced DAO governance features
- ❌ Comprehensive testing and security audits
- ❌ Documentation and tutorials

## Completion Plan

### Short-term (1-2 weeks)
1. Complete Filecoin storage integration
2. Finalize multi-reviewer consensus mechanism
3. Improve dataset monetization flow
4. Enhance Python library functionality
5. Add comprehensive documentation

### Medium-term (3-4 weeks)
1. Implement advanced DAO governance features
2. Conduct thorough testing and security audits
3. Create user tutorials and guides
4. Optimize gas usage and performance
5. Add analytics dashboard

### Long-term (2-3 months)
1. Launch on Filecoin mainnet
2. Implement cross-chain functionality
3. Develop partnerships with AI companies
4. Create a marketplace for specialized datasets
5. Implement advanced privacy features

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MetaMask wallet
- Access to Filecoin Calibration testnet

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/decentralized-data-labeling.git
cd decentralized-data-labeling
```

2. Install dependencies
```bash
# Install protocol dependencies
cd protocol
npm install

# Install frontend dependencies
cd ../front
npm install

# Install backend dependencies
cd ../backend
npm install
```

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

## Using the Python Library

```python
from datahub import DataHub

# Initialize the library
datahub = DataHub(api_key="your_api_key")

# Get available datasets
datasets = datahub.list_datasets()

# Load a dataset
dataset = datahub.load_dataset("dataset_id")

# Use the dataset for training
X_train = dataset.features
y_train = dataset.labels

# Train your model
model.fit(X_train, y_train)
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Filecoin Foundation for the Decentralized Web
- Protocol Labs
- AI Blueprints Hackathon organizers and mentors