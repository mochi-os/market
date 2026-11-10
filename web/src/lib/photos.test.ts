// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Photo } from '@/types'
import { describe, expect, it } from 'vitest'
import { galleryAddresses } from './photos'

const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}` }) as Photo)

// The address's last two parts: the photo and its variant, or the photo
// alone for the original.
const tail = (address: string) =>
  address.split('/-/photo/')[1] ?? `not a photo address: ${address}`

describe('galleryAddresses', () => {
  // The main photo sits in a box at most 26rem tall: a camera photo's
  // original is 1.45 MB where its preview is 72 KB, and the page fetched
  // every photo's original again in a hidden preloader.
  it('draws the preview, never the original', () => {
    const gallery = galleryAddresses(photos(5), 2)!
    expect(tail(gallery.main)).toBe('p2/preview')
    expect(tail(gallery.underlay)).toBe('p2/thumbnail')
    const all = [gallery.main, gallery.underlay, ...gallery.ahead]
    expect(all.filter((a) => !/\/(preview|thumbnail)$/.test(a))).toEqual([])
  })

  it('fetches ahead only the previous and next previews', () => {
    expect(galleryAddresses(photos(5), 2)!.ahead.map(tail)).toEqual([
      'p1/preview',
      'p3/preview',
    ])
    expect(galleryAddresses(photos(5), 0)!.ahead.map(tail)).toEqual([
      'p4/preview',
      'p1/preview',
    ])
    expect(galleryAddresses(photos(2), 0)!.ahead.map(tail)).toEqual([
      'p1/preview',
    ])
    expect(galleryAddresses(photos(1), 0)!.ahead).toEqual([])
  })

  it('falls back to the first photo, and to nothing with no photos', () => {
    expect(tail(galleryAddresses(photos(3), 9)!.main)).toBe('p0/preview')
    expect(galleryAddresses([], 0)).toBeNull()
  })
})
