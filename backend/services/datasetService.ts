// Dataset service with Deno KV operations
import { kv, Dataset, generateId, formatDate } from "../database/kv.ts";

// Create a new dataset
export async function createDataset(datasetData: Omit<Dataset, "id" | "createdAt" | "updatedAt" | "isActive">): Promise<Dataset> {
  const id = generateId();
  const now = formatDate();
  
  const dataset: Dataset = {
    ...datasetData,
    id,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  // Store the dataset in KV store
  await kv.set(["datasets", id], dataset);

  // Also store in a list for efficient retrieval
  await kv.set(["datasets_list", id], { id });

  // Store in owner's datasets list
  await kv.set(["user_datasets", datasetData.owner, id], { id });

  // Store in categories lists
  if (datasetData.categories) {
    for (const category of datasetData.categories) {
      await kv.set(["datasets_by_category", category, id], { id });
    }
  }

  return dataset;
}

// Get all datasets
export async function getAllDatasets(): Promise<Dataset[]> {
  const datasets: Dataset[] = [];
  const datasetEntries = kv.list<{ id: string }>({ prefix: ["datasets_list"] });

  for await (const entry of datasetEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const datasetId = entry.value.id;
      const datasetResult = await kv.get<Dataset>(["datasets", datasetId]);
      if (datasetResult.value) {
        datasets.push(datasetResult.value);
      }
    }
  }

  return datasets;
}

// Get dataset by ID
export async function getDatasetById(id: string): Promise<Dataset | null> {
  const result = await kv.get<Dataset>(["datasets", id]);
  return result.value || null;
}

// Update dataset
export async function updateDataset(id: string, datasetData: Partial<Dataset>): Promise<Dataset | null> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return null;
  }

  const updatedDataset: Dataset = {
    ...existingDataset,
    ...datasetData,
    updatedAt: formatDate(),
  };

  await kv.set(["datasets", id], updatedDataset);
  return updatedDataset;
}

// Delete dataset
export async function deleteDataset(id: string): Promise<boolean> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return false;
  }

  // Remove from main storage
  await kv.delete(["datasets", id]);
  await kv.delete(["datasets_list", id]);

  // Remove from owner's datasets list
  await kv.delete(["user_datasets", existingDataset.owner, id]);

  // Remove from categories lists
  if (existingDataset.categories) {
    for (const category of existingDataset.categories) {
      await kv.delete(["datasets_by_category", category, id]);
    }
  }

  return true;
}

// Get datasets by owner
export async function getDatasetsByOwner(owner: string): Promise<Dataset[]> {
  const datasets: Dataset[] = [];
  const datasetEntries = kv.list<{ id: string }>({ prefix: ["user_datasets", owner] });

  for await (const entry of datasetEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const datasetId = entry.value.id;
      const datasetResult = await kv.get<Dataset>(["datasets", datasetId]);
      if (datasetResult.value) {
        datasets.push(datasetResult.value);
      }
    }
  }

  return datasets;
}

// Get datasets by category
export async function getDatasetsByCategory(category: string): Promise<Dataset[]> {
  const datasets: Dataset[] = [];
  const datasetEntries = kv.list<{ id: string }>({ prefix: ["datasets_by_category", category] });

  for await (const entry of datasetEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const datasetId = entry.value.id;
      const datasetResult = await kv.get<Dataset>(["datasets", datasetId]);
      if (datasetResult.value) {
        datasets.push(datasetResult.value);
      }
    }
  }

  return datasets;
}

// Grant access to a dataset
export async function grantDatasetAccess(id: string, userAddress: string): Promise<Dataset | null> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return null;
  }

  const authorizedUsers = existingDataset.authorizedUsers || [];
  
  // Check if user already has access
  if (authorizedUsers.includes(userAddress)) {
    return existingDataset;
  }

  // Add user to authorized users
  authorizedUsers.push(userAddress);

  // Update dataset
  return updateDataset(id, { authorizedUsers });
}

// Revoke access to a dataset
export async function revokeDatasetAccess(id: string, userAddress: string): Promise<Dataset | null> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return null;
  }

  const authorizedUsers = existingDataset.authorizedUsers || [];
  
  // Check if user has access
  const userIndex = authorizedUsers.indexOf(userAddress);
  if (userIndex === -1) {
    return existingDataset;
  }

  // Remove user from authorized users
  authorizedUsers.splice(userIndex, 1);

  // Update dataset
  return updateDataset(id, { authorizedUsers });
}

// Check if a user has access to a dataset
export async function hasDatasetAccess(id: string, userAddress: string): Promise<boolean> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return false;
  }

  // Owner always has access
  if (existingDataset.owner === userAddress) {
    return true;
  }

  // Public datasets are accessible to everyone
  if (existingDataset.accessLevel === "public") {
    return true;
  }

  // Check if user is in authorized users
  const authorizedUsers = existingDataset.authorizedUsers || [];
  return authorizedUsers.includes(userAddress);
}

// Add a reward recipient to a dataset
export async function addDatasetRewardRecipient(id: string, recipientAddress: string, sharePercentage: number): Promise<Dataset | null> {
  const existingDataset = await getDatasetById(id);

  if (!existingDataset) {
    return null;
  }

  const rewardRecipients = existingDataset.rewardRecipients || [];
  
  // Check if recipient already exists
  const existingRecipientIndex = rewardRecipients.findIndex(r => r.address === recipientAddress);
  
  if (existingRecipientIndex !== -1) {
    // Update existing recipient
    rewardRecipients[existingRecipientIndex].sharePercentage = sharePercentage;
  } else {
    // Add new recipient
    rewardRecipients.push({
      address: recipientAddress,
      sharePercentage
    });
  }

  // Update dataset
  return updateDataset(id, { rewardRecipients });
}
