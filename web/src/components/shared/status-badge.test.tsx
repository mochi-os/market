// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

function show(status: string) {
  return render(
    <I18nProvider i18n={i18n}>
      <StatusBadge status={status} />
    </I18nProvider>
  )
}

describe('StatusBadge', () => {
  it('labels a past-due subscription', () => {
    show('past_due')
    expect(screen.getByText('Past due')).toBeInTheDocument()
  })

  it('never shows a status it does not know as its raw token', () => {
    show('awaiting_review')
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting/i)).toBeNull()
  })
})
