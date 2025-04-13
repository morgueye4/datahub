import { ethers } from 'ethers';
import { FilecoinDealClient } from '../contracts/FilecoinDealClient';
import { db } from '../database/db';
import { storageDeals } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export class StorageService {
  private filecoinDealClient: FilecoinDealClient;
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.FILECOIN_RPC_URL);
    this.initializeContract();
  }

  private initializeContract() {
    const signer = this.provider.getSigner();
    this.filecoinDealClient = new ethers.Contract(
      process.env.FILECOIN_DEAL_CLIENT_ADDRESS,
      FilecoinDealClient.abi,
      signer
    ) as FilecoinDealClient;
  }

  public async proposeDeal(
    dataCid: string,
    size: number,
    duration: number,
    price: string
  ): Promise<{ dealId: string; txHash: string }> {
    try {
      const tx = await this.filecoinDealClient.proposeDeal(
        dataCid,
        ethers.BigNumber.from(size),
        ethers.BigNumber.from(duration),
        ethers.utils.parseEther(price)
      );

      const receipt = await tx.wait();
      const dealId = receipt.events?.find(e => e.event === 'DealProposed')?.args?.dealId;

      if (!dealId) {
        throw new Error('Deal ID not found in transaction receipt');
      }

      return {
        dealId: dealId.toString(),
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error proposing storage deal:', error);
      throw error;
    }
  }

  public async getDealStatus(dealId: string): Promise<string> {
    try {
      const deal = await this.filecoinDealClient.getDeal(ethers.BigNumber.from(dealId));
      return deal.status === 1 ? 'active' : 'pending';
    } catch (error) {
      console.error('Error getting deal status:', error);
      throw error;
    }
  }

  public async trackDeal(dealId: string): Promise<void> {
    try {
      const deal = await this.filecoinDealClient.getDeal(ethers.BigNumber.from(dealId));
      
      await db.update(storageDeals)
        .set({
          status: deal.status === 1 ? 'active' : 'pending',
          provider: deal.provider,
          updatedAt: new Date()
        })
        .where(eq(storageDeals.contractDealId, dealId));
    } catch (error) {
      console.error('Error tracking deal:', error);
      throw error;
    }
  }

  public async getActiveDeals(): Promise<any[]> {
    try {
      return await db.select()
        .from(storageDeals)
        .where(eq(storageDeals.status, 'active'));
    } catch (error) {
      console.error('Error getting active deals:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService(); 