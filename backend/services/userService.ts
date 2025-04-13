// User service with Deno KV operations
import { kv, User, formatDate } from "../database/kv.ts";

// Create or update a user
export async function createOrUpdateUser(userData: Omit<User, "createdAt">): Promise<User> {
  const existingUser = await getUserByAddress(userData.address);

  if (existingUser) {
    // Update existing user
    const updatedUser: User = {
      ...existingUser,
      ...userData,
    };

    await kv.set(["users", userData.address], updatedUser);
    return updatedUser;
  } else {
    // Create new user
    const newUser: User = {
      ...userData,
      createdAt: formatDate(),
    };

    await kv.set(["users", userData.address], newUser);
    await kv.set(["users_list", userData.address], { address: userData.address });
    return newUser;
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const users: User[] = [];
  const userEntries = kv.list<{ address: string }>({ prefix: ["users_list"] });

  for await (const entry of userEntries) {
    if (entry.value && typeof entry.value === 'object' && 'address' in entry.value) {
      const userAddress = entry.value.address;
      const userResult = await kv.get<User>(["users", userAddress]);
      if (userResult.value) {
        users.push(userResult.value);
      }
    }
  }

  return users;
}

// Get user by address
export async function getUserByAddress(address: string): Promise<User | null> {
  const result = await kv.get<User>(["users", address]);
  return result.value || null;
}

// Delete user
export async function deleteUser(address: string): Promise<boolean> {
  const existingUser = await getUserByAddress(address);

  if (!existingUser) {
    return false;
  }

  await kv.delete(["users", address]);
  await kv.delete(["users_list", address]);
  return true;
}

// Verify user
export async function verifyUser(address: string, txHash: string): Promise<User | null> {
  const existingUser = await getUserByAddress(address);

  if (!existingUser) {
    return null;
  }

  const updatedUser: User = {
    ...existingUser,
    isVerified: true,
    verificationTxHash: txHash,
  };

  await kv.set(["users", address], updatedUser);
  return updatedUser;
}
