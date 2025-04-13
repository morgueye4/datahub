const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment process...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Deploy RewardToken (DataToken)
  console.log("Deploying RewardToken...");
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.deployed();
  console.log(`RewardToken deployed to: ${rewardToken.address}`);

  // Deploy ContractRegistry
  console.log("Deploying ContractRegistry...");
  const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
  const contractRegistry = await ContractRegistry.deploy();
  await contractRegistry.deployed();
  console.log(`ContractRegistry deployed to: ${contractRegistry.address}`);

  // Deploy TaskManager
  console.log("Deploying TaskManager...");
  const TaskManager = await hre.ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy(rewardToken.address);
  await taskManager.deployed();
  console.log(`TaskManager deployed to: ${taskManager.address}`);

  // Deploy DatasetRegistry
  console.log("Deploying DatasetRegistry...");
  const DatasetRegistry = await hre.ethers.getContractFactory("DatasetRegistry");
  const datasetRegistry = await DatasetRegistry.deploy(rewardToken.address);
  await datasetRegistry.deployed();
  console.log(`DatasetRegistry deployed to: ${datasetRegistry.address}`);

  // Deploy DealClient
  console.log("Deploying DealClient...");
  const DealClient = await hre.ethers.getContractFactory("DealClient");
  const dealClient = await DealClient.deploy();
  await dealClient.deployed();
  console.log(`DealClient deployed to: ${dealClient.address}`);

  // Deploy DataDAOCore
  console.log("Deploying DataDAOCore...");
  const DataDAOCore = await hre.ethers.getContractFactory("DataDAOCore");
  const dataDAOCore = await DataDAOCore.deploy(rewardToken.address);
  await dataDAOCore.deployed();
  console.log(`DataDAOCore deployed to: ${dataDAOCore.address}`);

  // Deploy MembershipManager
  console.log("Deploying MembershipManager...");
  const MembershipManager = await hre.ethers.getContractFactory("MembershipManager");
  const membershipManager = await MembershipManager.deploy(rewardToken.address);
  await membershipManager.deployed();
  console.log(`MembershipManager deployed to: ${membershipManager.address}`);

  // Deploy GovernanceModule
  console.log("Deploying GovernanceModule...");
  const GovernanceModule = await hre.ethers.getContractFactory("GovernanceModule");
  const governanceModule = await GovernanceModule.deploy(rewardToken.address);
  await governanceModule.deployed();
  console.log(`GovernanceModule deployed to: ${governanceModule.address}`);

  // Register contracts in the registry
  console.log("Registering contracts in the registry...");
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("RewardToken"), rewardToken.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("TaskManager"), taskManager.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("DatasetRegistry"), datasetRegistry.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("DealClient"), dealClient.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("DataDAOCore"), dataDAOCore.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("MembershipManager"), membershipManager.address);
  await contractRegistry.registerContract(hre.ethers.utils.formatBytes32String("GovernanceModule"), governanceModule.address);
  console.log("All contracts registered successfully");

  // Mint some tokens to the deployer for testing
  console.log("Minting tokens to deployer for testing...");
  await rewardToken.mint(deployer.address, hre.ethers.utils.parseEther("1000000"));
  console.log(`Minted 1,000,000 tokens to ${deployer.address}`);

  // Save deployment information to a file
  const deploymentInfo = {
    network: hre.network.name,
    contracts: {
      RewardToken: rewardToken.address,
      ContractRegistry: contractRegistry.address,
      TaskManager: taskManager.address,
      DatasetRegistry: datasetRegistry.address,
      DealClient: dealClient.address,
      DataDAOCore: dataDAOCore.address,
      MembershipManager: membershipManager.address,
      GovernanceModule: governanceModule.address
    }
  };

  // Save to protocol folder
  const protocolDeploymentPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(protocolDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${protocolDeploymentPath}`);

  // Save to frontend folder
  const frontendDeploymentPath = path.join(__dirname, "../../front/src/abis/deployments.json");
  fs.writeFileSync(frontendDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${frontendDeploymentPath}`);

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
