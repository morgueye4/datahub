// Import deployments
import deployments from '../abis/deployments.json';

// Define ABIs
const RewardTokenABI = { abi: [] };
const TaskManagerABI = { abi: [] };
const UnifiedTaskManagerABI = { abi: [] };
const DataTokenABI = { abi: [] };
const ContractRegistryABI = { abi: [] };
const DatasetRegistryABI = { abi: [] };
const DealClientABI = { abi: [] };
const DataDAOCoreABI = { abi: [] };
const MembershipManagerABI = { abi: [] };
const GovernanceModuleABI = { abi: [] };

// Export ABIs
export {
  RewardTokenABI,
  TaskManagerABI,
  UnifiedTaskManagerABI,
  DataTokenABI,
  ContractRegistryABI,
  DatasetRegistryABI,
  DealClientABI,
  DataDAOCoreABI,
  MembershipManagerABI,
  GovernanceModuleABI,
  deployments
};

// Helper function to get ABI
export function getABI(contractName) {
  switch (contractName) {
    case 'RewardToken':
    case 'DataToken':
      return RewardTokenABI.abi;
    case 'TaskManager':
      return TaskManagerABI.abi;
    case 'UnifiedTaskManager':
      return UnifiedTaskManagerABI.abi;
    case 'ContractRegistry':
      return ContractRegistryABI.abi;
    case 'DatasetRegistry':
      return DatasetRegistryABI.abi;
    case 'DealClient':
      return DealClientABI.abi;
    case 'DataDAOCore':
      return DataDAOCoreABI.abi;
    case 'MembershipManager':
      return MembershipManagerABI.abi;
    case 'GovernanceModule':
      return GovernanceModuleABI.abi;
    default:
      console.error(`Unknown contract name: ${contractName}`);
      return [];
  }
}
