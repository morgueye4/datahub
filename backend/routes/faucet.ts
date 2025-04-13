import { Hono } from "https://deno.land/x/hono@v3.11.11/mod.ts";
import { ethers } from "npm:ethers@5.7.2";
import { kv } from "../database/kv.ts";
import { getABI } from "../contracts/index.ts";
import "jsr:@std/dotenv/load";


const faucetRouter = new Hono();

// Environment variables
const DATA_TOKEN_ADDRESS = Deno.env.get("REWARD_TOKEN_ADDRESS") || "0x2d7Ab834F2FF40bb8C93aa093a13Fc78b580954f";
const FAUCET_PRIVATE_KEY = Deno.env.get("FAUCET_PRIVATE_KEY");
const RPC_URL = Deno.env.get("RPC_URL") || "https://api.calibration.node.glif.io/rpc/v1";

// Faucet settings
const TOKENS_PER_REQUEST = ethers.utils.parseEther("100"); // 100 DATA tokens
const MAX_REQUESTS_PER_DAY = 1000; // Increased for testing
const COOLDOWN_PERIOD = 0; // Removed cooldown for testing

// Get faucet status
faucetRouter.get("/status", async (c) => {
  try {
    // Check if faucet is configured
    if (!FAUCET_PRIVATE_KEY) {
      return c.json({
        success: false,
        message: "Faucet is not configured. Please set FAUCET_PRIVATE_KEY environment variable.",
        data: {
          isConfigured: false,
          tokenAddress: DATA_TOKEN_ADDRESS,
          tokensPerRequest: ethers.utils.formatEther(TOKENS_PER_REQUEST),
          maxRequestsPerDay: MAX_REQUESTS_PER_DAY,
          cooldownPeriod: COOLDOWN_PERIOD / (60 * 60 * 1000) // in hours
        }
      });
    }

    // Connect to provider and contract
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const dataToken = new ethers.Contract(DATA_TOKEN_ADDRESS, getABI("RewardToken"), wallet);

    // Get faucet balance
    const faucetBalance = await dataToken.balanceOf(wallet.address);

    // We can't check if the wallet is the owner without the owner() function in the ABI
    // Just assume we can mint if we have the private key

    return c.json({
      success: true,
      data: {
        isConfigured: true,
        faucetAddress: wallet.address,
        faucetBalance: ethers.utils.formatEther(faucetBalance),
        tokenAddress: DATA_TOKEN_ADDRESS,
        tokensPerRequest: ethers.utils.formatEther(TOKENS_PER_REQUEST),
        maxRequestsPerDay: MAX_REQUESTS_PER_DAY,
        cooldownPeriod: COOLDOWN_PERIOD / (60 * 60 * 1000), // in hours
        canMint: true, // Assume we can mint if we have the private key
        testMode: true // Indicates we're in test mode with no cooldown
      }
    });
  } catch (error) {
    console.error("Error getting faucet status:", error);
    return c.json({
      success: false,
      message: "Failed to get faucet status",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Request tokens
faucetRouter.post("/request", async (c) => {
  try {
    // Check if faucet is configured
    if (!FAUCET_PRIVATE_KEY) {
      return c.json({
        success: false,
        message: "Faucet is not configured. Please contact the administrator."
      }, 500);
    }

    // Get request data
    const { address } = await c.req.json();

    if (!address) {
      return c.json({
        success: false,
        message: "Missing required field: address"
      }, 400);
    }

    // Validate Ethereum address
    if (!ethers.utils.isAddress(address)) {
      return c.json({
        success: false,
        message: "Invalid Ethereum address"
      }, 400);
    }

    // Check rate limiting
    const now = Date.now();
    const userKey = ["faucet_requests", address.toLowerCase()];
    const userRequests = await kv.get<{ requests: number, lastRequest: number }>(userKey);

    if (userRequests.value) {
      // Check if user has reached daily limit
      if (userRequests.value.requests >= MAX_REQUESTS_PER_DAY &&
          now - userRequests.value.lastRequest < 24 * 60 * 60 * 1000) {
        return c.json({
          success: false,
          message: `You have reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again tomorrow.`
        }, 429);
      }

      // Check cooldown period
      if (now - userRequests.value.lastRequest < COOLDOWN_PERIOD) {
        const remainingTime = Math.ceil((COOLDOWN_PERIOD - (now - userRequests.value.lastRequest)) / (60 * 1000));
        return c.json({
          success: false,
          message: `Please wait ${remainingTime} minutes before requesting tokens again.`
        }, 429);
      }
    }

    // Connect to provider and contract
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const dataToken = new ethers.Contract(DATA_TOKEN_ADDRESS, getABI("RewardToken"), wallet);

    // Try to mint tokens directly first, then fall back to transfer if needed
    let tx;
    try {
      // Try to mint tokens directly
      console.log("Attempting to mint tokens directly");
      tx = await dataToken.mint(address, TOKENS_PER_REQUEST);
    } catch (error) {
      console.error("Error minting tokens:", error);

      // Fallback to transfer if mint fails
      console.log("Mint failed, falling back to transfer");

      // Check faucet balance
      const faucetBalance = await dataToken.balanceOf(wallet.address);
      if (faucetBalance.lt(TOKENS_PER_REQUEST)) {
        return c.json({
          success: false,
          message: "Faucet is out of tokens. Please contact the administrator."
        }, 500);
      }

      // Use transfer as fallback
      tx = await dataToken.transfer(address, TOKENS_PER_REQUEST);
    }
    const receipt = await tx.wait();

    // Update user request record
    const newRequestCount = userRequests.value ? userRequests.value.requests + 1 : 1;
    await kv.set(userKey, { requests: newRequestCount, lastRequest: now });

    return c.json({
      success: true,
      message: `Successfully sent ${ethers.utils.formatEther(TOKENS_PER_REQUEST)} DATA tokens to ${address}`,
      data: {
        txHash: receipt.transactionHash,
        amount: ethers.utils.formatEther(TOKENS_PER_REQUEST),
        remainingRequests: MAX_REQUESTS_PER_DAY - newRequestCount
      }
    });
  } catch (error) {
    console.error("Error requesting tokens:", error);
    return c.json({
      success: false,
      message: "Failed to send tokens",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default faucetRouter;
