import { ethers } from 'ethers';
import { TaskManager } from '../contracts/TaskManager';
import { SubmissionManager } from '../contracts/SubmissionManager';
import { RewardDistributor } from '../contracts/RewardDistributor';
import { DataDAOGovernance } from '../contracts/DataDAOGovernance';
import { FilecoinDealClient } from '../contracts/FilecoinDealClient';
import { db } from '../database/db';
import { tasks, submissions, reviews, storageDeals } from '../drizzle/schema';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private taskManager: TaskManager;
  private submissionManager: SubmissionManager;
  private rewardDistributor: RewardDistributor;
  private dataDAOGovernance: DataDAOGovernance;
  private filecoinDealClient: FilecoinDealClient;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    this.initializeContracts();
    this.setupEventListeners();
  }

  private initializeContracts() {
    const signer = this.provider.getSigner();
    
    this.taskManager = new ethers.Contract(
      process.env.TASK_MANAGER_ADDRESS,
      TaskManager.abi,
      signer
    ) as TaskManager;

    this.submissionManager = new ethers.Contract(
      process.env.SUBMISSION_MANAGER_ADDRESS,
      SubmissionManager.abi,
      signer
    ) as SubmissionManager;

    this.rewardDistributor = new ethers.Contract(
      process.env.REWARD_DISTRIBUTOR_ADDRESS,
      RewardDistributor.abi,
      signer
    ) as RewardDistributor;

    this.dataDAOGovernance = new ethers.Contract(
      process.env.DATA_DAO_GOVERNANCE_ADDRESS,
      DataDAOGovernance.abi,
      signer
    ) as DataDAOGovernance;

    this.filecoinDealClient = new ethers.Contract(
      process.env.FILECOIN_DEAL_CLIENT_ADDRESS,
      FilecoinDealClient.abi,
      signer
    ) as FilecoinDealClient;
  }

  private setupEventListeners() {
    // Task Events
    this.taskManager.on('TaskCreated', async (taskId, creator, title, reward, deadline) => {
      try {
        await db.update(tasks)
          .set({
            contractTaskId: taskId.toString(),
            status: 'open',
            updatedAt: new Date()
          })
          .where(eq(tasks.id, taskId));
      } catch (error) {
        console.error('Error handling TaskCreated event:', error);
      }
    });

    this.taskManager.on('TaskClosed', async (taskId) => {
      try {
        await db.update(tasks)
          .set({
            status: 'closed',
            updatedAt: new Date()
          })
          .where(eq(tasks.contractTaskId, taskId.toString()));
      } catch (error) {
        console.error('Error handling TaskClosed event:', error);
      }
    });

    // Submission Events
    this.submissionManager.on('SubmissionCreated', async (submissionId, taskId, submitter, dataCid) => {
      try {
        await db.update(submissions)
          .set({
            contractSubmissionId: submissionId.toString(),
            status: 'pending',
            dataCid,
            updatedAt: new Date()
          })
          .where(eq(submissions.taskId, taskId));
      } catch (error) {
        console.error('Error handling SubmissionCreated event:', error);
      }
    });

    // Review Events
    this.submissionManager.on('ReviewCreated', async (reviewId, submissionId, reviewer, approved) => {
      try {
        await db.update(reviews)
          .set({
            contractReviewId: reviewId.toString(),
            approved,
            updatedAt: new Date()
          })
          .where(eq(reviews.submissionId, submissionId));
      } catch (error) {
        console.error('Error handling ReviewCreated event:', error);
      }
    });

    // Storage Deal Events
    this.filecoinDealClient.on('DealProposed', async (dealId, dataCid, size, duration) => {
      try {
        await db.insert(storageDeals)
          .values({
            contractDealId: dealId.toString(),
            dataCid,
            size: size.toString(),
            duration: duration.toString(),
            status: 'proposed',
            createdAt: new Date(),
            updatedAt: new Date()
          });
      } catch (error) {
        console.error('Error handling DealProposed event:', error);
      }
    });

    this.filecoinDealClient.on('DealActivated', async (dealId) => {
      try {
        await db.update(storageDeals)
          .set({
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(storageDeals.contractDealId, dealId.toString()));
      } catch (error) {
        console.error('Error handling DealActivated event:', error);
      }
    });
  }

  public async trackTransaction(txHash: string): Promise<ethers.providers.TransactionReceipt> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash);
      return receipt;
    } catch (error) {
      console.error('Error tracking transaction:', error);
      throw error;
    }
  }

  public async getTransactionStatus(txHash: string): Promise<string> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return 'pending';
      return receipt.status === 1 ? 'success' : 'failed';
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService(); 