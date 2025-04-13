// Task service with Deno KV operations
import { kv, Task, generateId, formatDate } from "../database/kv.ts";

// Create a new task
export async function createTask(taskData: Omit<Task, "id" | "createdAt" | "status">): Promise<Task> {
  const id = generateId();
  const task: Task = {
    ...taskData,
    id,
    status: "open",
    createdAt: formatDate(),
    // Set default values for new fields if not provided
    isEncrypted: taskData.isEncrypted || false,
    accessConditions: taskData.accessConditions || '',
    lighthouseCID: taskData.lighthouseCID || '',
  };

  // Store the task in KV store
  await kv.set(["tasks", id], task);

  // Also store in a list for efficient retrieval
  await kv.set(["tasks_list", id], { id });

  return task;
}

// Get all tasks
export async function getAllTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  const taskEntries = kv.list<{ id: string }>({ prefix: ["tasks_list"] });

  for await (const entry of taskEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const taskId = entry.value.id;
      const taskResult = await kv.get<Task>(["tasks", taskId]);
      if (taskResult.value) {
        tasks.push(taskResult.value);
      }
    }
  }

  return tasks;
}

// Get task by ID
export async function getTaskById(id: string): Promise<Task | null> {
  const result = await kv.get<Task>(["tasks", id]);
  return result.value || null;
}

// Update task
export async function updateTask(id: string, taskData: Partial<Task>): Promise<Task | null> {
  const existingTask = await getTaskById(id);

  if (!existingTask) {
    return null;
  }

  const updatedTask: Task = {
    ...existingTask,
    ...taskData,
  };

  await kv.set(["tasks", id], updatedTask);
  return updatedTask;
}

// Delete task
export async function deleteTask(id: string): Promise<boolean> {
  const existingTask = await getTaskById(id);

  if (!existingTask) {
    return false;
  }

  await kv.delete(["tasks", id]);
  await kv.delete(["tasks_list", id]);
  return true;
}

// Get tasks by creator address
export async function getTasksByCreator(creatorAddress: string): Promise<Task[]> {
  const allTasks = await getAllTasks();
  return allTasks.filter(task => task.creatorAddress === creatorAddress);
}

// Close a task
export function closeTask(id: string): Promise<Task | null> {
  return updateTask(id, { status: "closed" });
}
