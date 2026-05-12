import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { toast } from '@mochi/web'
import type { Listing } from '@/types'
import {
  isFavorite,
  onFavoritesChange,
  toggleFavorite,
} from '@/lib/favorites'

interface FavoriteButtonProps {
  listing: Listing
  size?: 'sm' | 'md'
  variant?: 'overlay' | 'inline'
}

export function FavoriteButton({
  listing,
  size = 'sm',
  variant = 'overlay',
}: FavoriteButtonProps) {
  const { t } = useLingui()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(isFavorite(listing.id))
    return onFavoritesChange(() => setActive(isFavorite(listing.id)))
  }, [listing.id])

  const dims = size === 'md' ? 'size-8' : 'size-7'
  const icon = size === 'md' ? 'size-4' : 'size-3.5'

  const base =
    variant === 'overlay'
      ? 'absolute right-2 bottom-2 z-10 inline-flex items-center justify-center rounded-full bg-background/85 shadow-sm ring-1 ring-border/60 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
      : 'inline-flex items-center justify-center rounded-full transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

  return (
    <button
      type='button'
      aria-label={active ? t`Unsave` : t`Save`}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const nowOn = toggleFavorite(listing)
        toast.success(nowOn ? t`Saved` : t`Removed from saved`)
      }}
      className={`${base} ${dims}`}
    >
      <Heart
        className={`${icon} transition-colors ${
          active
            ? 'fill-red-500 text-red-500'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      />
    </button>
  )
}
