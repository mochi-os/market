import { Star } from 'lucide-react'
import { formatRating } from '@/lib/format'

interface RatingStarsProps {
  rating: number
  reviews?: number
  // If true, rating is a 1-5 whole-star value (per-review); otherwise a 0-500
  // aggregate that gets divided by 100 with half-star support.
  whole?: boolean
  size?: 'sm' | 'md'
}

export function RatingStars({ rating, reviews, whole, size = 'sm' }: RatingStarsProps) {
  const value = whole ? rating : formatRating(rating)
  const fullStars = Math.floor(value)
  const hasHalf = !whole && value - fullStars >= 0.5
  const starClass = size === 'md' ? 'size-4' : 'size-3.5'

  return (
    <div className='flex items-center gap-1'>
      <div className='flex'>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`${starClass} ${
              i < fullStars
                ? 'fill-amber-400 text-amber-400'
                : i === fullStars && hasHalf
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      {reviews != null && (
        <span className='text-xs text-muted-foreground'>({reviews})</span>
      )}
    </div>
  )
}
