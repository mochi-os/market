// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect, useState, type MouseEvent } from 'react'
import type { Listing } from '@/types'
import { useLingui } from '@lingui/react/macro'
import { Button, Tooltip, TooltipTrigger, TooltipContent } from '@mochi/web'
import { Bookmark } from 'lucide-react'
import { isSaved, onSavedChange, toggleSaved } from '@/lib/saved'

interface SavedButtonProps {
  listing: Listing
  size?: 'sm' | 'md'
  variant?: 'overlay' | 'inline'
}

export function SavedButton({
  listing,
  size = 'sm',
  variant = 'overlay',
}: SavedButtonProps) {
  const { t } = useLingui()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(isSaved(listing.id))
    return onSavedChange(() => setActive(isSaved(listing.id)))
  }, [listing.id])

  const dims = size === 'md' ? 'size-8' : 'size-7'
  const icon = size === 'md' ? 'size-4' : 'size-3.5'

  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSaved(listing)
  }

  if (variant === 'inline') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label={
              active ? t`Unsave` : t({ message: 'Save', context: 'bookmark' })
            }
            aria-pressed={active}
            onClick={handleClick}
          >
            <Bookmark className={active ? 'size-4 fill-current' : 'size-4'} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {active ? t`Unsave` : t({ message: 'Save', context: 'bookmark' })}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-label={
            active ? t`Unsave` : t({ message: 'Save', context: 'bookmark' })
          }
          aria-pressed={active}
          onClick={handleClick}
          className={`bg-background/85 ring-border/60 hover:bg-background focus-visible:ring-ring/40 absolute right-2 bottom-2 z-10 inline-flex items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${dims}`}
        >
          <Bookmark
            className={`${icon} transition-colors ${
              active
                ? 'fill-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {active ? t`Unsave` : t({ message: 'Save', context: 'bookmark' })}
      </TooltipContent>
    </Tooltip>
  )
}
