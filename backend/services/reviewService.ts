// Review service with Deno KV operations
import { kv, Review, generateId, formatDate } from "../database/kv.ts";
import { getSubmissionById, updateSubmissionStatus } from "./submissionService.ts";

// Create a new review
export async function createReview(reviewData: Omit<Review, "id" | "createdAt">): Promise<Review | null> {
  // Check if submission exists
  const submission = await getSubmissionById(reviewData.submissionId);
  if (!submission) {
    return null;
  }

  // Check if submission is still pending
  if (submission.status !== "pending") {
    return null;
  }

  const id = generateId();
  const review: Review = {
    ...reviewData,
    id,
    createdAt: formatDate(),
  };

  // Store the review in KV store
  await kv.set(["reviews", id], review);

  // Also store in a list for efficient retrieval
  await kv.set(["reviews_list", id], { id });

  // Store in submission-specific list for efficient retrieval by submission
  await kv.set(["submission_reviews", reviewData.submissionId, id], { id });

  // Update submission status based on review
  await updateSubmissionStatus(reviewData.submissionId, reviewData.approved ? "approved" : "rejected");

  return review;
}

// Get all reviews
export async function getAllReviews(): Promise<Review[]> {
  const reviews: Review[] = [];
  const reviewEntries = kv.list<{ id: string }>({ prefix: ["reviews_list"] });

  for await (const entry of reviewEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const reviewId = entry.value.id;
      const reviewResult = await kv.get<Review>(["reviews", reviewId]);
      if (reviewResult.value) {
        reviews.push(reviewResult.value);
      }
    }
  }

  return reviews;
}

// Get review by ID
export async function getReviewById(id: string): Promise<Review | null> {
  const result = await kv.get<Review>(["reviews", id]);
  return result.value || null;
}

// Update review
export async function updateReview(id: string, reviewData: Partial<Review>): Promise<Review | null> {
  const existingReview = await getReviewById(id);

  if (!existingReview) {
    return null;
  }

  const updatedReview: Review = {
    ...existingReview,
    ...reviewData,
  };

  await kv.set(["reviews", id], updatedReview);
  return updatedReview;
}

// Delete review
export async function deleteReview(id: string): Promise<boolean> {
  const existingReview = await getReviewById(id);

  if (!existingReview) {
    return false;
  }

  await kv.delete(["reviews", id]);
  await kv.delete(["reviews_list", id]);
  await kv.delete(["submission_reviews", existingReview.submissionId, id]);
  return true;
}

// Get reviews by submission ID
export async function getReviewsBySubmissionId(submissionId: string): Promise<Review[]> {
  const reviews: Review[] = [];
  const reviewEntries = kv.list<{ id: string }>({ prefix: ["submission_reviews", submissionId] });

  for await (const entry of reviewEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const reviewId = entry.value.id;
      const reviewResult = await kv.get<Review>(["reviews", reviewId]);
      if (reviewResult.value) {
        reviews.push(reviewResult.value);
      }
    }
  }

  return reviews;
}

// Get reviews by reviewer address
export async function getReviewsByReviewer(reviewerAddress: string): Promise<Review[]> {
  const allReviews = await getAllReviews();
  return allReviews.filter(review => review.reviewerAddress === reviewerAddress);
}

// Count reviews for a submission
export async function countReviewsForSubmission(submissionId: string): Promise<number> {
  const reviews = await getReviewsBySubmissionId(submissionId);
  return reviews.length;
}
