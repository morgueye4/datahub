import { Hono } from "@hono/hono";
import { 
  createReview, 
  getAllReviews, 
  getReviewById, 
  updateReview, 
  deleteReview, 
  getReviewsBySubmissionId, 
  getReviewsByReviewer 
} from "../services/reviewService.ts";

const reviewsRouter = new Hono();

// Get all reviews
reviewsRouter.get("/", async (c) => {
  try {
    const reviews = await getAllReviews();
    return c.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return c.json({
      success: false,
      message: "Failed to fetch reviews",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get review by ID
reviewsRouter.get("/:id", async (c) => {
  try {
    const reviewId = c.req.param("id");
    const review = await getReviewById(reviewId);
    
    if (!review) {
      return c.json({ success: false, message: "Review not found" }, 404);
    }
    
    return c.json({ success: true, data: review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return c.json({
      success: false,
      message: "Failed to fetch review",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Create review
reviewsRouter.post("/", async (c) => {
  try {
    const reviewData = await c.req.json();
    
    // Validate required fields
    const requiredFields = [
      'submissionId',
      'reviewerAddress',
      'approved',
      'feedback'
    ];
    
    const missingFields = requiredFields.filter(field => !reviewData[field] && reviewData[field] !== false);
    if (missingFields.length > 0) {
      return c.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }, 400);
    }
    
    const newReview = await createReview(reviewData);
    
    if (!newReview) {
      return c.json({ 
        success: false, 
        message: "Failed to create review. Submission may not exist or is not pending." 
      }, 400);
    }
    
    return c.json({ success: true, data: newReview });
  } catch (error) {
    console.error("Error creating review:", error);
    return c.json({
      success: false,
      message: "Failed to create review",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Update review
reviewsRouter.put("/:id", async (c) => {
  try {
    const reviewId = c.req.param("id");
    const reviewData = await c.req.json();
    
    const updatedReview = await updateReview(reviewId, reviewData);
    
    if (!updatedReview) {
      return c.json({ success: false, message: "Review not found" }, 404);
    }
    
    return c.json({ success: true, data: updatedReview });
  } catch (error) {
    console.error("Error updating review:", error);
    return c.json({
      success: false,
      message: "Failed to update review",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Delete review
reviewsRouter.delete("/:id", async (c) => {
  try {
    const reviewId = c.req.param("id");
    const success = await deleteReview(reviewId);
    
    if (!success) {
      return c.json({ success: false, message: "Review not found" }, 404);
    }
    
    return c.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return c.json({
      success: false,
      message: "Failed to delete review",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get reviews by submission ID
reviewsRouter.get("/submission/:submissionId", async (c) => {
  try {
    const submissionId = c.req.param("submissionId");
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

// Get reviews by reviewer
reviewsRouter.get("/reviewer/:address", async (c) => {
  try {
    const reviewerAddress = c.req.param("address");
    const reviews = await getReviewsByReviewer(reviewerAddress);
    
    return c.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error fetching reviews by reviewer:", error);
    return c.json({
      success: false,
      message: "Failed to fetch reviews by reviewer",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default reviewsRouter;
