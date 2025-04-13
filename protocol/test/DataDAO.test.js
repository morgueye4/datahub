const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DataDAO Contracts", function () {
  let dataToken;
  let contractRegistry;
  let dataDAOCore;
  let membershipManager;
  let taskManager;
  let datasetRegistry;
  let dealClient;
  let governanceModule;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy DataToken
    const DataToken = await ethers.getContractFactory("DataToken");
    dataToken = await DataToken.deploy(
      "DataFIL Token", 
      "dataFIL", 
      ethers.utils.parseEther("10000000"), // 10 million initial supply
      owner.address
    );
    await dataToken.deployed();

    // Deploy ContractRegistry
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    contractRegistry = await ContractRegistry.deploy();
    await contractRegistry.deployed();

    // Deploy DataDAOCore
    const DataDAOCore = await ethers.getContractFactory("DataDAOCore");
    dataDAOCore = await DataDAOCore.deploy(
      "DataDAO", 
      "Decentralized Data Collection and Labeling DAO", 
      contractRegistry.address
    );
    await dataDAOCore.deployed();

    // Deploy MembershipManager
    const MembershipManager = await ethers.getContractFactory("MembershipManager");
    membershipManager = await MembershipManager.deploy(dataToken.address);
    await membershipManager.deployed();

    // Deploy TaskManager
    const TaskManager = await ethers.getContractFactory("TaskManager");
    taskManager = await TaskManager.deploy(dataToken.address);
    await taskManager.deployed();

    // Deploy DatasetRegistry
    const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
    datasetRegistry = await DatasetRegistry.deploy(dataToken.address);
    await datasetRegistry.deployed();

    // Deploy DealClient
    const DealClient = await ethers.getContractFactory("DealClient");
    dealClient = await DealClient.deploy();
    await dealClient.deployed();

    // Deploy GovernanceModule
    const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
    governanceModule = await GovernanceModule.deploy(dataToken.address);
    await governanceModule.deployed();

    // Register contracts in ContractRegistry
    await contractRegistry.setContractAddress("DataDAOCore", dataDAOCore.address);
    await contractRegistry.setContractAddress("MembershipManager", membershipManager.address);
    await contractRegistry.setContractAddress("TaskManager", taskManager.address);
    await contractRegistry.setContractAddress("DatasetRegistry", datasetRegistry.address);
    await contractRegistry.setContractAddress("DealClient", dealClient.address);
    await contractRegistry.setContractAddress("DataToken", dataToken.address);
    await contractRegistry.setContractAddress("GovernanceModule", governanceModule.address);

    // Set contract references
    await membershipManager.setDAOContract(dataDAOCore.address);
    await taskManager.setDAOContract(dataDAOCore.address);
    await datasetRegistry.setDAOContract(dataDAOCore.address);
    await datasetRegistry.setDealClientContract(dealClient.address);
    await governanceModule.setDAOContract(dataDAOCore.address);
    await dealClient.setDAOContract(dataDAOCore.address);

    // Grant minter role to TaskManager and DataDAOCore
    const MINTER_ROLE = await dataToken.MINTER_ROLE();
    await dataToken.addMinter(taskManager.address);
    await dataToken.addMinter(dataDAOCore.address);

    // Transfer some tokens to users for testing
    await dataToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    await dataToken.transfer(user2.address, ethers.utils.parseEther("10000"));
    await dataToken.transfer(user3.address, ethers.utils.parseEther("10000"));
  });

  describe("DataToken", function () {
    it("Should have the correct name and symbol", async function () {
      expect(await dataToken.name()).to.equal("DataFIL Token");
      expect(await dataToken.symbol()).to.equal("dataFIL");
    });

    it("Should allow users to claim from faucet", async function () {
      const initialBalance = await dataToken.balanceOf(user1.address);
      await dataToken.connect(user1).claimFromFaucet();
      const newBalance = await dataToken.balanceOf(user1.address);
      expect(newBalance).to.be.gt(initialBalance);
    });
  });

  describe("MembershipManager", function () {
    it("Should allow users to join the DAO", async function () {
      // Approve token transfer
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("100"));
      
      // Join DAO
      await membershipManager.connect(user1).joinDAO(ethers.utils.parseEther("100"));
      
      // Check membership
      const isMember = await dataDAOCore.isMember(user1.address);
      expect(isMember).to.be.true;
    });

    it("Should assign the correct tier based on staked amount", async function () {
      // Approve token transfer for basic tier
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("100"));
      
      // Join DAO with basic tier
      await membershipManager.connect(user1).joinDAO(ethers.utils.parseEther("100"));
      
      // Check tier
      const tier = await dataDAOCore.getMemberTier(user1.address);
      expect(tier).to.equal(1); // Basic tier
      
      // Approve more tokens for advanced tier
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("900"));
      
      // Stake more to upgrade to advanced tier
      await membershipManager.connect(user1).stakeMore(ethers.utils.parseEther("900"));
      
      // Check new tier
      const newTier = await dataDAOCore.getMemberTier(user1.address);
      expect(newTier).to.equal(2); // Advanced tier
    });
  });

  describe("TaskManager", function () {
    beforeEach(async function () {
      // Join DAO
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("100"));
      await membershipManager.connect(user1).joinDAO(ethers.utils.parseEther("100"));
      
      await dataToken.connect(user2).approve(membershipManager.address, ethers.utils.parseEther("100"));
      await membershipManager.connect(user2).joinDAO(ethers.utils.parseEther("100"));
    });

    it("Should allow users to create tasks", async function () {
      // Approve tokens for task creation
      await dataToken.connect(user1).approve(taskManager.address, ethers.utils.parseEther("100"));
      
      // Create task
      await taskManager.connect(user1).createTask(
        "Test Task",
        "This is a test task",
        0, // DataCollection
        ethers.utils.parseEther("10"), // 10 tokens reward
        ethers.utils.parseEther("2"), // 2 tokens review reward
        5, // 5 required submissions
        2, // 2 required validations
        Math.floor(Date.now() / 1000) + 86400, // 1 day from now
        0, // Public
        "", // No access conditions
        "" // No instructions
      );
      
      // Check task count
      const taskCount = await taskManager.getTaskCount();
      expect(taskCount).to.equal(1);
    });

    it("Should allow users to submit to tasks", async function () {
      // Create task
      await dataToken.connect(user1).approve(taskManager.address, ethers.utils.parseEther("100"));
      await taskManager.connect(user1).createTask(
        "Test Task",
        "This is a test task",
        0, // DataCollection
        ethers.utils.parseEther("10"), // 10 tokens reward
        ethers.utils.parseEther("2"), // 2 tokens review reward
        5, // 5 required submissions
        2, // 2 required validations
        Math.floor(Date.now() / 1000) + 86400, // 1 day from now
        0, // Public
        "", // No access conditions
        "" // No instructions
      );
      
      // Submit to task
      await taskManager.connect(user2).submitToTask(
        0, // Task ID
        "QmTestCID", // Test CID
        false // Not encrypted
      );
      
      // Check submission count
      const task = await taskManager.getTask(0);
      expect(task.submissionCount).to.equal(1);
    });
  });

  describe("DatasetRegistry", function () {
    it("Should allow users to create datasets", async function () {
      // Create dataset
      await datasetRegistry.connect(user1).createDataset(
        "Test Dataset",
        "This is a test dataset",
        "QmMetadataCID",
        "QmDataCID",
        false, // Not encrypted
        "", // No access conditions
        0, // Public
        0, // Free
        [] // No task IDs
      );
      
      // Check dataset count
      const datasetCount = await datasetRegistry.getDatasetCount();
      expect(datasetCount).to.equal(1);
    });

    it("Should allow dataset owners to validate datasets", async function () {
      // Create dataset
      await datasetRegistry.connect(owner).createDataset(
        "Test Dataset",
        "This is a test dataset",
        "QmMetadataCID",
        "QmDataCID",
        false, // Not encrypted
        "", // No access conditions
        0, // Public
        0, // Free
        [] // No task IDs
      );
      
      // Validate dataset
      await datasetRegistry.connect(owner).validateDataset(0);
      
      // Check validation status
      const dataset = await datasetRegistry.getDataset(0);
      expect(dataset.validated).to.be.true;
    });
  });

  describe("GovernanceModule", function () {
    beforeEach(async function () {
      // Join DAO with enough tokens for proposals
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("1000"));
      await membershipManager.connect(user1).joinDAO(ethers.utils.parseEther("1000"));
    });

    it("Should allow users to create proposals", async function () {
      // Create proposal
      await governanceModule.connect(user1).propose(
        "Test Proposal",
        "This is a test proposal",
        0, // General
        [dataToken.address], // Target
        [0], // Value
        ["0x"], // Calldata
        [""] // Signature
      );
      
      // Check proposal count
      const proposalCount = await governanceModule.getProposalCount();
      expect(proposalCount).to.equal(1);
    });

    it("Should allow users to vote on proposals", async function () {
      // Create proposal
      await governanceModule.connect(user1).propose(
        "Test Proposal",
        "This is a test proposal",
        0, // General
        [dataToken.address], // Target
        [0], // Value
        ["0x"], // Calldata
        [""] // Signature
      );
      
      // Fast forward time to start voting
      await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
      await ethers.provider.send("evm_mine");
      
      // Vote on proposal
      await governanceModule.connect(user1).castVote(0, 1); // Vote For
      
      // Check vote
      const voteType = await governanceModule.getVoteType(0, user1.address);
      expect(voteType).to.equal(1); // For
    });
  });

  describe("Integration", function () {
    beforeEach(async function () {
      // Join DAO
      await dataToken.connect(user1).approve(membershipManager.address, ethers.utils.parseEther("1000"));
      await membershipManager.connect(user1).joinDAO(ethers.utils.parseEther("1000"));
      
      await dataToken.connect(user2).approve(membershipManager.address, ethers.utils.parseEther("100"));
      await membershipManager.connect(user2).joinDAO(ethers.utils.parseEther("100"));
      
      await dataToken.connect(user3).approve(membershipManager.address, ethers.utils.parseEther("100"));
      await membershipManager.connect(user3).joinDAO(ethers.utils.parseEther("100"));
    });

    it("Should allow full task and dataset workflow", async function () {
      // Create task
      await dataToken.connect(user1).approve(taskManager.address, ethers.utils.parseEther("100"));
      await taskManager.connect(user1).createTask(
        "Test Task",
        "This is a test task",
        0, // DataCollection
        ethers.utils.parseEther("10"), // 10 tokens reward
        ethers.utils.parseEther("2"), // 2 tokens review reward
        1, // 1 required submission
        1, // 1 required validation
        Math.floor(Date.now() / 1000) + 86400, // 1 day from now
        0, // Public
        "", // No access conditions
        "" // No instructions
      );
      
      // Add reviewer
      await taskManager.connect(user1).addReviewer(0, user3.address);
      
      // Submit to task
      await taskManager.connect(user2).submitToTask(
        0, // Task ID
        "QmTestCID", // Test CID
        false // Not encrypted
      );
      
      // Get submission ID
      const submissionIds = await taskManager.getTaskSubmissions(0);
      const submissionId = submissionIds[0];
      
      // Validate submission
      await taskManager.connect(user3).validateSubmission(submissionId, true);
      
      // Check task status
      const task = await taskManager.getTask(0);
      expect(task.status).to.equal(2); // Completed
      
      // Create dataset from task
      await datasetRegistry.connect(user1).createDataset(
        "Test Dataset",
        "This is a test dataset from the completed task",
        "QmMetadataCID",
        "QmDataCID",
        false, // Not encrypted
        "", // No access conditions
        0, // Public
        0, // Free
        [0] // Task ID
      );
      
      // Validate dataset
      await datasetRegistry.connect(owner).validateDataset(0);
      
      // Check dataset
      const dataset = await datasetRegistry.getDataset(0);
      expect(dataset.validated).to.be.true;
    });
  });
});
