// Initialize Deno KV database
export const kv = await Deno.openKv();

// Task type definition
export interface Task {
  id: string;
  title: string;
  description: string;
  creatorAddress: string;
  taskType: string;
  rewardAmount: number;
  reviewReward: number;
  numReviewers: number;
  reviewers: string[];
  status: string;
  createdAt: string;
  deadline?: string;
  dataCID?: string;
  instructionsCID?: string;
  isEncrypted?: boolean;
  accessConditions?: string;
  lighthouseCID?: string;
}

// Helper function to generate a unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper function to format date
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

// Helper functions for working with KV store
export async function getValue(key: string | string[]): Promise<unknown> {
  const keyArray = Array.isArray(key) ? key : [key];
  const result = await kv.get(keyArray);
  return result.value;
}

export async function setValue(key: string | string[], value: unknown): Promise<void> {
  const keyArray = Array.isArray(key) ? key : [key];
  await kv.set(keyArray, value);
}

export async function deleteValue(key: string | string[]): Promise<void> {
  const keyArray = Array.isArray(key) ? key : [key];
  await kv.delete(keyArray);
}

export async function listValues(prefix: string | string[]): Promise<Array<{ key: readonly unknown[]; value: unknown }>> {
  const prefixArray = Array.isArray(prefix) ? prefix : [prefix];
  const results: Array<{ key: readonly unknown[]; value: unknown }> = [];

  for await (const entry of kv.list({ prefix: prefixArray })) {
    results.push({
      key: entry.key,
      value: entry.value
    });
  }

  return results;
}

// Atomic operations
export async function atomicOperation(
  key: string | string[],
  updateFn: (currentValue: unknown) => unknown
): Promise<boolean> {
  const keyArray = Array.isArray(key) ? key : [key];

  // Get the current value
  const currentEntry = await kv.get(keyArray);
  const currentValue = currentEntry.value;

  // Calculate the new value
  const newValue = updateFn(currentValue);

  // Perform atomic operation
  const result = await kv.atomic()
    .check(currentEntry)
    .set(keyArray, newValue)
    .commit();

  return result.ok;
}

// Specialized functions for faucet
export async function getFaucetRequests(address: string): Promise<{ count: number; lastRequest: number }> {
  const result = await getValue(['faucet', address]) as { count: number; lastRequest: number } | null;
  return result || { count: 0, lastRequest: 0 };
}

export function updateFaucetRequests(address: string): Promise<boolean> {
  return atomicOperation(['faucet', address], (currentValue) => {
    const current = currentValue as { count: number; lastRequest: number } | null;
    const now = Date.now();

    if (!current) {
      return { count: 1, lastRequest: now };
    }

    // Reset count if it's a new day
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    if (current.lastRequest < oneDayAgo) {
      return { count: 1, lastRequest: now };
    }

    // Increment count
    return { count: current.count + 1, lastRequest: now };
  });
}
