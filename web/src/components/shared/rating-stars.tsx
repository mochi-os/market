import { Star } from 'lucide-react'
import { formatRating } from '@/lib/format'

interface RatingStarsProps {
  rating: number
  reviews?: number
}

export function RatingStars({ rating, reviews }: RatingStarsProps) {
  const value = formatRating(rating)
  const fullStars = Math.floor(value)
  const hasHalf = value - fullStars >= 0.5

  return (
    <div className='flex items-center gap-1'>
      <div className='flex'>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`size-3.5 ${
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
