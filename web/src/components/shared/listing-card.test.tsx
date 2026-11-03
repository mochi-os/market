// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import type { Listing, Photo } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListingCardFromSearch } from './listing-card'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const listing = {
  id: 'l1',
  seller: '',
  title: 'Blue teapot',
  description: '',
  category: '',
  tags: '',
  condition: 'new',
  type: 'physical',
  pricing: 'fixed',
  price: 2500,
  currency: 'gbp',
  status: 'active',
} as unknown as Listing

const photo: Photo = {
  id: 'p1',
  object: 'listing/l1',
  name: 'teapot.png',
  size: 1048576,
  content_type: 'image/png',
  rank: 1,
  created: 1,
  image: true,
}

describe('ListingCard', () => {
  it('shows the card-sized medium variant of its photo, not the preview', () => {
    render(
      <I18nProvider i18n={i18n}>
        <ListingCardFromSearch listing={{ ...listing, photo }} />
      </I18nProvider>
    )
    const image = screen.getByAltText('Blue teapot')
    expect(image.getAttribute('src')).toMatch(/\/-\/photo\/p1\/medium$/)
  })
})
