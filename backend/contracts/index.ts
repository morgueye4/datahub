import { ethers } from "npm:ethers@5.7.2";

// Import ABIs
import RewardTokenABI from "../../protocol/artifacts/contracts/RewardToken.sol/RewardToken.json" with { type: "json" };
import TaskManagerABI from "../../protocol/artifacts/contracts/TaskManager.sol/TaskManager.json" with { type: "json" };
import DatasetRegistryABI from "../../protocol/artifacts/contracts/DatasetRegistry.sol/DatasetRegistry.json" with { type: "json" };
import DealClientABI from "../../protocol/artifacts/contracts/DealClient.sol/DealClient.json" with { type: "json" };
import DataDAOCoreABI from "../../protocol/artifacts/contracts/DataDAOCore.sol/DataDAOCore.json" with { type: "json" };
import MembershipManagerABI from "../../protocol/artifacts/contracts/MembershipManager.sol/MembershipManager.json" with { type: "json" };
import GovernanceModuleABI from "../../protocol/artifacts/contracts/GovernanceModule.sol/GovernanceModule.json" with { type: "json" };
import ContractRegistryABI from "../../protocol/artifacts/contracts/ContractRegistry.sol/ContractRegistry.json" with { type: "json" };

// Import deployments
import deployments from "../../protocol/deployments.json" with { type: "json" };

// Export ABIs
export {
  RewardTokenABI,
  TaskManagerABI,
  DatasetRegistryABI,
  DealClientABI,
  DataDAOCoreABI,
  MembershipManagerABI,
  GovernanceModuleABI,
  ContractRegistryABI,
  deployments
};

// Export DataToken ABI as alias for RewardToken
export const DataTokenABI = RewardTokenABI;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  RewardToken: deployments.contracts.RewardToken,
  TaskManager: deployments.contracts.TaskManager,
  DatasetRegistry: deployments.contracts.DatasetRegistry,
  DealClient: deployments.contracts.DealClient,
  DataDAOCore: deployments.contracts.DataDAOCore,
  MembershipManager: deployments.contracts.MembershipManager,
  GovernanceModule: deployments.contracts.GovernanceModule,
  ContractRegistry: deployments.contracts.ContractRegistry
};

// Helper function to get ABI
export function getABI(contractName: string) {
  switch (contractName) {
    case "RewardToken":
    case "DataToken":
      return RewardTokenABI.abi;
    case "TaskManager":
      return TaskManagerABI.abi;
    case "DatasetRegistry":
      return DatasetRegistryABI.abi;
    case "DealClient":
      return DealClientABI.abi;
    case "DataDAOCore":
      return DataDAOCoreABI.abi;
    case "MembershipManager":
      return MembershipManagerABI.abi;
    case "GovernanceModule":
      return GovernanceModuleABI.abi;
    case "ContractRegistry":
      return ContractRegistryABI.abi;
    default:
      throw new Error(`Unknown contract name: ${contractName}`);
  }
}

// Helper function to get contract instance
export function getContract(contractName: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
  const address = CONTRACT_ADDRESSES[contractName as keyof typeof CONTRACT_ADDRESSES];
  const abi = getABI(contractName);

  if (!address) {
    throw new Error(`Contract address not found for ${contractName}`);
  }

  return new ethers.Contract(address, abi, signerOrProvider);
}
