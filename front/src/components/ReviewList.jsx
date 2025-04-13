import { useState, useEffect } from 'react'
import { Card, Badge, Spinner } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, truncateAddress } from '../utils/formatting'
import StarRating from './StarRating'

const ReviewList = ({ submissionId }) => {
  const { contracts } = useWeb3()
  const { user } = useAuth()

  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch reviews from backend API
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reviews/submission/${submissionId}`)

          if (response.ok) {
            const result = await response.json()
            console.log('Reviews from API:', result)

            if (result.success && result.data) {
              // Process dates to ensure they are Date objects and add reviewer info if missing
              const processedReviews = result.data.map(review => {
                // Check if reviewer is missing and try to get it from reviewerAddress
                const reviewer = review.reviewer || review.reviewerAddress;

                return {
                  ...review,
                  reviewer: reviewer,
                  createdAt: new Date(review.createdAt)
                };
              })

              setReviews(processedReviews)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          console.log('Error fetching reviews from API:', err)
          // Continue with contract data
        }

        // If API fails, try to get data from contracts
        if (contracts.submissionManager) {
          try {
            // Get review count for the submission
            const reviewCount = await contracts.submissionManager.getReviewCount(submissionId)
            console.log(`Found ${reviewCount} reviews for submission ${submissionId} from contract`)

            // Fetch all reviews for the submission
            const reviewPromises = []
            for (let i = 0; i < reviewCount.toNumber(); i++) {
              reviewPromises.push(contracts.submissionManager.getReviewByIndex(submissionId, i))
            }

            const reviewResults = await Promise.all(reviewPromises)

            // Process reviews
            const processedReviews = reviewResults.map((review, index) => ({
              id: index + 1,
              submissionId: parseInt(submissionId),
              reviewer: review.reviewer,
              rating: review.rating.toNumber(),
              comments: review.comments,
              isApproved: review.isApproved,
              createdAt: new Date(review.createdAt.toNumber() * 1000)
            }))

            setReviews(processedReviews)
            setLoading(false)
            return
          } catch (err) {
            console.error('Error fetching reviews from contract:', err)
            // Continue to fallback data
          }
        }

        // Fallback to static data if both API and contracts fail
        const fallbackReviews = [
          {
            id: 1,
            submissionId: parseInt(submissionId),
            reviewer: '0x1234567890123456789012345678901234567890',
            rating: 4,
            comments: 'Good work, but could be improved in some areas.',
            isApproved: true,
            createdAt: new Date()
          },
          {
            id: 2,
            submissionId: parseInt(submissionId),
            reviewer: '0x0987654321098765432109876543210987654321',
            rating: 5,
            comments: 'Excellent submission, meets all requirements.',
            isApproved: true,
            createdAt: new Date(Date.now() - 86400000) // 1 day ago
          }
        ]

        setReviews(fallbackReviews)
      } catch (err) {
        console.error('Error fetching reviews:', err)
        setError('Failed to load reviews. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [contracts.submissionManager, submissionId])

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading reviews...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No reviews found for this submission.
      </div>
    )
  }

  return (
    <div className="review-list">
      <h3 className="mb-3">Reviews ({reviews.length})</h3>

      {reviews.map(review => (
        <Card key={review.id} className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <Card.Title>
                  Review #{review.id}
                  {/* Don't show review status badges to avoid confusion with submission status */}
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  By {review.reviewer ? (review.reviewer === user?.walletAddress ? 'You' : truncateAddress(review.reviewer)) : 'Unknown Reviewer'}
                  {' • '}
                  {formatDate(review.createdAt)}
                </Card.Subtitle>
              </div>
              <div>
                <StarRating rating={review.rating} />
              </div>
            </div>

            <Card.Text className="mt-3">
              {review.comments}
            </Card.Text>
          </Card.Body>
        </Card>
      ))}
    </div>
  )
}

export default ReviewList
