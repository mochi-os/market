import { useState } from 'react'
import { Star } from 'lucide-react'
import { formatRating } from '@/lib/format'

interface RatingStarsProps {
  rating: number
  reviews?: number
  // If true, rating is a 1-5 whole-star value (per-review); otherwise a 0-500
  // aggregate that gets divided by 100 with half-star support.
  whole?: boolean
  size?: 'sm' | 'md'
  onRatingChange?: (rating: number) => void
}

export function RatingStars({ rating, reviews, whole, size = 'sm', onRatingChange }: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const interactive = !!onRatingChange
  const starClass = size === 'md' ? 'size-4' : 'size-3.5'

  const displayValue = interactive
    ? (hovered ?? rating)
    : whole ? rating : formatRating(rating)

  const fullStars = Math.floor(displayValue)
  const hasHalf = !interactive && !whole && displayValue - fullStars >= 0.5

  return (
    <div className='flex items-center gap-1'>
      <div className='flex'>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < fullStars
          const half = !interactive && hasHalf && i === fullStars
          const starEl = (
            <Star
              className={`${starClass} transition-colors ${
                filled || (interactive && hovered !== null && i < hovered)
                  ? 'fill-amber-400 text-amber-400'
                  : half
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-muted-foreground/30'
              }`}
            />
          )

          if (!interactive) return <span key={i}>{starEl}</span>

          return (
            <button
              key={i}
              type='button'
              aria-label={`${i + 1} star${i !== 0 ? 's' : ''}`}
              onClick={() => onRatingChange(i + 1)}
              onMouseEnter={() => setHovered(i + 1)}
              onMouseLeave={() => setHovered(null)}
              className='cursor-pointer p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm'
            >
              {starEl}
            </button>
          )
        })}
      </div>
      {reviews != null && (
        <span className='text-xs text-muted-foreground'>({reviews})</span>
      )}
    </div>
  )
}
