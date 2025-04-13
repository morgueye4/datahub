import { Hono } from "@hono/hono";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksByCreator,
  closeTask
} from "../services/taskService.ts";

const tasksRouter = new Hono();

// Get all tasks
tasksRouter.get("/", async (c) => {
  try {
    const tasks = await getAllTasks();
    return c.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return c.json({
      success: false,
      message: "Failed to fetch tasks",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get task by ID
tasksRouter.get("/:id", async (c) => {
  try {
    const taskId = c.req.param("id");
    const task = await getTaskById(taskId);

    if (!task) {
      return c.json({ success: false, message: "Task not found" }, 404);
    }

    return c.json({ success: true, data: task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return c.json({
      success: false,
      message: "Failed to fetch task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Create task
tasksRouter.post("/", async (c) => {
  try {
    const taskData = await c.req.json();

    // Validate required fields
    const requiredFields = [
      'title',
      'description',
      'creatorAddress'
    ];

    const missingFields = requiredFields.filter(field => !taskData[field]);
    if (missingFields.length > 0) {
      return c.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }, 400);
    }

    // Handle Lighthouse integration fields
    if (taskData.isEncrypted && !taskData.accessConditions) {
      return c.json({
        success: false,
        message: 'Access conditions are required for encrypted files'
      }, 400);
    }

    const newTask = await createTask(taskData);
    return c.json({ success: true, data: newTask });
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({
      success: false,
      message: "Failed to create task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Update task
tasksRouter.put("/:id", async (c) => {
  try {
    const taskId = c.req.param("id");
    const taskData = await c.req.json();

    const updatedTask = await updateTask(taskId, taskData);

    if (!updatedTask) {
      return c.json({ success: false, message: "Task not found" }, 404);
    }

    return c.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return c.json({
      success: false,
      message: "Failed to update task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Delete task
tasksRouter.delete("/:id", async (c) => {
  try {
    const taskId = c.req.param("id");
    const success = await deleteTask(taskId);

    if (!success) {
      return c.json({ success: false, message: "Task not found" }, 404);
    }

    return c.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return c.json({
      success: false,
      message: "Failed to delete task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get tasks by creator
tasksRouter.get("/creator/:address", async (c) => {
  try {
    const creatorAddress = c.req.param("address");
    const tasks = await getTasksByCreator(creatorAddress);

    return c.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks by creator:", error);
    return c.json({
      success: false,
      message: "Failed to fetch tasks by creator",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Close task
tasksRouter.post("/:id/close", async (c) => {
  try {
    const taskId = c.req.param("id");
    const closedTask = await closeTask(taskId);

    if (!closedTask) {
      return c.json({ success: false, message: "Task not found" }, 404);
    }

    return c.json({ success: true, data: closedTask });
  } catch (error) {
    console.error("Error closing task:", error);
    return c.json({
      success: false,
      message: "Failed to close task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default tasksRouter;
