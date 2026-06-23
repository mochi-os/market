// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { Tooltip, TooltipTrigger, TooltipContent, toast } from '@mochi/web'
import type { Listing } from '@/types'
import {
  isSaved,
  onSavedChange,
  toggleSaved,
} from '@/lib/saved'

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

  const base =
    variant === 'overlay'
      ? 'absolute right-2 bottom-2 z-10 inline-flex items-center justify-center rounded-full bg-background/85 shadow-sm ring-1 ring-border/60 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
      : 'inline-flex items-center justify-center rounded-full transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-label={active ? t`Unsave` : t`Save`}
          aria-pressed={active}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const nowOn = toggleSaved(listing)
            toast.success(nowOn ? t`Saved` : t`Removed from saved`)
          }}
          className={`${base} ${dims}`}
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
      <TooltipContent>{active ? t`Unsave` : t`Save`}</TooltipContent>
    </Tooltip>
  )
}
