// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { Check } from 'lucide-react'

export { Step as SellerSetupStep }

function Step({
  number,
  done,
  active,
  title,
  description,
}: {
  number: number
  done: boolean
  active: boolean
  title: string
  description: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        done
          ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
          : active
            ? 'border-primary/30 bg-primary/5'
            : 'border-border opacity-40'
      }`}
    >
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? 'bg-green-500 text-white'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? <Check className='size-3.5' /> : number}
      </div>
      <div className='min-w-0'>
        <p className={`text-sm font-medium ${done ? 'text-green-700 dark:text-green-400' : ''}`}>
          {title}
        </p>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
    </div>
  )
}
