import { Hono } from "@hono/hono";
import { 
  createOrUpdateUser, 
  getAllUsers, 
  getUserByAddress, 
  deleteUser, 
  verifyUser 
} from "../services/userService.ts";

const usersRouter = new Hono();

// Get all users
usersRouter.get("/", async (c) => {
  try {
    const users = await getAllUsers();
    return c.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({
      success: false,
      message: "Failed to fetch users",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get user by address
usersRouter.get("/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const user = await getUserByAddress(address);
    
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }
    
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({
      success: false,
      message: "Failed to fetch user",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Create or update user
usersRouter.post("/", async (c) => {
  try {
    const userData = await c.req.json();
    
    // Validate required fields
    if (!userData.address) {
      return c.json({
        success: false,
        message: "Missing required field: address"
      }, 400);
    }
    
    const user = await createOrUpdateUser(userData);
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return c.json({
      success: false,
      message: "Failed to create/update user",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Delete user
usersRouter.delete("/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const success = await deleteUser(address);
    
    if (!success) {
      return c.json({ success: false, message: "User not found" }, 404);
    }
    
    return c.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({
      success: false,
      message: "Failed to delete user",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Verify user
usersRouter.post("/:address/verify", async (c) => {
  try {
    const address = c.req.param("address");
    const { txHash } = await c.req.json();
    
    if (!txHash) {
      return c.json({
        success: false,
        message: "Missing required field: txHash"
      }, 400);
    }
    
    const verifiedUser = await verifyUser(address, txHash);
    
    if (!verifiedUser) {
      return c.json({ success: false, message: "User not found" }, 404);
    }
    
    return c.json({ success: true, data: verifiedUser });
  } catch (error) {
    console.error("Error verifying user:", error);
    return c.json({
      success: false,
      message: "Failed to verify user",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default usersRouter;
