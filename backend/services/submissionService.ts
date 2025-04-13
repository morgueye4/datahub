// Submission service with Deno KV operations
import { kv, Submission, generateId, formatDate } from "../database/kv.ts";
import { getTaskById } from "./taskService.ts";

// Create a new submission
export async function createSubmission(submissionData: Omit<Submission, "id" | "createdAt" | "status">): Promise<Submission | null> {
  // Check if task exists
  const task = await getTaskById(submissionData.taskId);
  if (!task) {
    return null;
  }

  // Check if task is open
  if (task.status !== "open") {
    return null;
  }

  const id = generateId();
  const submission: Submission = {
    ...submissionData,
    id,
    status: "pending",
    createdAt: formatDate(),
  };

  // Store the submission in KV store
  await kv.set(["submissions", id], submission);

  // Also store in a list for efficient retrieval
  await kv.set(["submissions_list", id], { id });

  // Store in task-specific list for efficient retrieval by task
  await kv.set(["task_submissions", submissionData.taskId, id], { id });

  return submission;
}

// Get all submissions
export async function getAllSubmissions(): Promise<Submission[]> {
  const submissions: Submission[] = [];
  const submissionEntries = kv.list<{ id: string }>({ prefix: ["submissions_list"] });

  for await (const entry of submissionEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const submissionId = entry.value.id;
      const submissionResult = await kv.get<Submission>(["submissions", submissionId]);
      if (submissionResult.value) {
        submissions.push(submissionResult.value);
      }
    }
  }

  return submissions;
}

// Get submission by ID
export async function getSubmissionById(id: string): Promise<Submission | null> {
  const result = await kv.get<Submission>(["submissions", id]);
  return result.value || null;
}

// Update submission
export async function updateSubmission(id: string, submissionData: Partial<Submission>): Promise<Submission | null> {
  const existingSubmission = await getSubmissionById(id);

  if (!existingSubmission) {
    return null;
  }

  const updatedSubmission: Submission = {
    ...existingSubmission,
    ...submissionData,
  };

  await kv.set(["submissions", id], updatedSubmission);
  return updatedSubmission;
}

// Delete submission
export async function deleteSubmission(id: string): Promise<boolean> {
  const existingSubmission = await getSubmissionById(id);

  if (!existingSubmission) {
    return false;
  }

  await kv.delete(["submissions", id]);
  await kv.delete(["submissions_list", id]);
  await kv.delete(["task_submissions", existingSubmission.taskId, id]);
  return true;
}

// Get submissions by task ID
export async function getSubmissionsByTaskId(taskId: string): Promise<Submission[]> {
  const submissions: Submission[] = [];
  const submissionEntries = kv.list<{ id: string }>({ prefix: ["task_submissions", taskId] });

  for await (const entry of submissionEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const submissionId = entry.value.id;
      const submissionResult = await kv.get<Submission>(["submissions", submissionId]);
      if (submissionResult.value) {
        submissions.push(submissionResult.value);
      }
    }
  }

  return submissions;
}

// Get submissions by submitter address
export async function getSubmissionsBySubmitter(submitterAddress: string): Promise<Submission[]> {
  const allSubmissions = await getAllSubmissions();
  return allSubmissions.filter(submission => submission.submitterAddress === submitterAddress);
}

// Approve or reject a submission
export function updateSubmissionStatus(id: string, status: "approved" | "rejected"): Promise<Submission | null> {
  return updateSubmission(id, { status });
}
