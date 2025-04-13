import React from 'react'

const StarRating = ({ rating, maxRating = 5 }) => {
  return (
    <div className="star-rating">
      {[...Array(maxRating)].map((_, i) => (
        <span key={i} className="star">
          {i < rating ? (
            <i className="bi bi-star-fill text-warning"></i>
          ) : (
            <i className="bi bi-star text-muted"></i>
          )}
        </span>
      ))}
      <span className="ms-1 text-muted">({rating}/{maxRating})</span>
    </div>
  )
}

export default StarRating
