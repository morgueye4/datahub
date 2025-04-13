import { Hono } from "@hono/hono";
import { 
  createSubmission, 
  getAllSubmissions, 
  getSubmissionById, 
  updateSubmission, 
  deleteSubmission, 
  getSubmissionsByTaskId, 
  getSubmissionsBySubmitter, 
  updateSubmissionStatus 
} from "../services/submissionService.ts";
import { getReviewsBySubmissionId, countReviewsForSubmission } from "../services/reviewService.ts";

const submissionsRouter = new Hono();

// Get all submissions
submissionsRouter.get("/", async (c) => {
  try {
    const submissions = await getAllSubmissions();
    
    // Add review count to each submission
    const submissionsWithReviewCount = await Promise.all(
      submissions.map(async (submission) => {
        const reviewCount = await countReviewsForSubmission(submission.id);
        return {
          ...submission,
          reviewCount,
          // For backward compatibility
          isApproved: submission.status === 'approved' ? true : 
                     submission.status === 'rejected' ? false : null,
          submittedAt: submission.createdAt
        };
      })
    );
    
    return c.json({ success: true, data: submissionsWithReviewCount });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return c.json({
      success: false,
      message: "Failed to fetch submissions",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get submission by ID
submissionsRouter.get("/:id", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const submission = await getSubmissionById(submissionId);
    
    if (!submission) {
      return c.json({ success: false, message: "Submission not found" }, 404);
    }
    
    // Get review count
    const reviewCount = await countReviewsForSubmission(submissionId);
    
    // Add review count and backward compatibility fields
    const processedSubmission = {
      ...submission,
      reviewCount,
      isApproved: submission.status === 'approved' ? true : 
                 submission.status === 'rejected' ? false : null,
      submittedAt: submission.createdAt
    };
    
    return c.json({ success: true, data: processedSubmission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return c.json({
      success: false,
      message: "Failed to fetch submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Create submission
submissionsRouter.post("/", async (c) => {
  try {
    const submissionData = await c.req.json();
    
    // Validate required fields
    const requiredFields = [
      'taskId',
      'submitterAddress',
      'submissionCid',
      'metadata'
    ];
    
    const missingFields = requiredFields.filter(field => !submissionData[field]);
    if (missingFields.length > 0) {
      return c.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }, 400);
    }
    
    const newSubmission = await createSubmission(submissionData);
    
    if (!newSubmission) {
      return c.json({ 
        success: false, 
        message: "Failed to create submission. Task may not exist or is not open." 
      }, 400);
    }
    
    // Add backward compatibility fields
    const processedSubmission = {
      ...newSubmission,
      reviewCount: 0,
      isApproved: null,
      submittedAt: newSubmission.createdAt
    };
    
    return c.json({ success: true, data: processedSubmission });
  } catch (error) {
    console.error("Error creating submission:", error);
    return c.json({
      success: false,
      message: "Failed to create submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Update submission
submissionsRouter.put("/:id", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const submissionData = await c.req.json();
    
    const updatedSubmission = await updateSubmission(submissionId, submissionData);
    
    if (!updatedSubmission) {
      return c.json({ success: false, message: "Submission not found" }, 404);
    }
    
    // Get review count
    const reviewCount = await countReviewsForSubmission(submissionId);
    
    // Add backward compatibility fields
    const processedSubmission = {
      ...updatedSubmission,
      reviewCount,
      isApproved: updatedSubmission.status === 'approved' ? true : 
                 updatedSubmission.status === 'rejected' ? false : null,
      submittedAt: updatedSubmission.createdAt
    };
    
    return c.json({ success: true, data: processedSubmission });
  } catch (error) {
    console.error("Error updating submission:", error);
    return c.json({
      success: false,
      message: "Failed to update submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Delete submission
submissionsRouter.delete("/:id", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const success = await deleteSubmission(submissionId);
    
    if (!success) {
      return c.json({ success: false, message: "Submission not found" }, 404);
    }
    
    return c.json({ success: true, message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return c.json({
      success: false,
      message: "Failed to delete submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get submissions by task ID
submissionsRouter.get("/task/:taskId", async (c) => {
  try {
    const taskId = c.req.param("taskId");
    const submissions = await getSubmissionsByTaskId(taskId);
    
    // Add review count to each submission
    const submissionsWithReviewCount = await Promise.all(
      submissions.map(async (submission) => {
        const reviewCount = await countReviewsForSubmission(submission.id);
        return {
          ...submission,
          reviewCount,
          // For backward compatibility
          isApproved: submission.status === 'approved' ? true : 
                     submission.status === 'rejected' ? false : null,
          submittedAt: submission.createdAt
        };
      })
    );
    
    return c.json({ success: true, data: submissionsWithReviewCount });
  } catch (error) {
    console.error("Error fetching submissions for task:", error);
    return c.json({
      success: false,
      message: "Failed to fetch submissions for task",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get submissions by submitter
submissionsRouter.get("/submitter/:address", async (c) => {
  try {
    const submitterAddress = c.req.param("address");
    const submissions = await getSubmissionsBySubmitter(submitterAddress);
    
    // Add review count to each submission
    const submissionsWithReviewCount = await Promise.all(
      submissions.map(async (submission) => {
        const reviewCount = await countReviewsForSubmission(submission.id);
        return {
          ...submission,
          reviewCount,
          // For backward compatibility
          isApproved: submission.status === 'approved' ? true : 
                     submission.status === 'rejected' ? false : null,
          submittedAt: submission.createdAt
        };
      })
    );
    
    return c.json({ success: true, data: submissionsWithReviewCount });
  } catch (error) {
    console.error("Error fetching submissions by submitter:", error);
    return c.json({
      success: false,
      message: "Failed to fetch submissions by submitter",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Approve submission
submissionsRouter.post("/:id/approve", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const updatedSubmission = await updateSubmissionStatus(submissionId, "approved");
    
    if (!updatedSubmission) {
      return c.json({ success: false, message: "Submission not found" }, 404);
    }
    
    // Get review count
    const reviewCount = await countReviewsForSubmission(submissionId);
    
    // Add backward compatibility fields
    const processedSubmission = {
      ...updatedSubmission,
      reviewCount,
      isApproved: true,
      submittedAt: updatedSubmission.createdAt
    };
    
    return c.json({ success: true, data: processedSubmission });
  } catch (error) {
    console.error("Error approving submission:", error);
    return c.json({
      success: false,
      message: "Failed to approve submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Reject submission
submissionsRouter.post("/:id/reject", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const updatedSubmission = await updateSubmissionStatus(submissionId, "rejected");
    
    if (!updatedSubmission) {
      return c.json({ success: false, message: "Submission not found" }, 404);
    }
    
    // Get review count
    const reviewCount = await countReviewsForSubmission(submissionId);
    
    // Add backward compatibility fields
    const processedSubmission = {
      ...updatedSubmission,
      reviewCount,
      isApproved: false,
      submittedAt: updatedSubmission.createdAt
    };
    
    return c.json({ success: true, data: processedSubmission });
  } catch (error) {
    console.error("Error rejecting submission:", error);
    return c.json({
      success: false,
      message: "Failed to reject submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get reviews for a submission
submissionsRouter.get("/:id/reviews", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const reviews = await getReviewsBySubmissionId(submissionId);
    
    return c.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error fetching reviews for submission:", error);
    return c.json({
      success: false,
      message: "Failed to fetch reviews for submission",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default submissionsRouter;
