// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// serverNow(skew) -> seconds: The server's clock now, from this one and how
// far the server's was ahead of it when the page was read.
export function serverNow(skew = 0): number {
  return Math.floor(Date.now() / 1000) + skew
}
