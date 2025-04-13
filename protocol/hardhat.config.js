require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NETWORK_RPC_URL = process.env.NETWORK_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      }
    ]
  },
  defaultNetwork: "filecoinCalibration",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    filecoinCalibration: {
      chainId: 314159,
      url: NETWORK_RPC_URL,
      accounts: [PRIVATE_KEY],
      gas: 25000000,
      gasPrice: 1000000000,
      blockGasLimit: 100000000,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
