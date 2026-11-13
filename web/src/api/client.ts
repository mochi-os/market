// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createAppClient, toast } from '@mochi/web'

export const client = createAppClient({ appName: 'market' })

// What a listing's copies on other networks went without, a line each,
// worded by the server in the user's language, said beside an answer that
// carries it. The change is made either way.
export function sayUnsent<T>(answer: T): T {
  const unsent = (answer as { unsent?: unknown } | null)?.unsent
  if (Array.isArray(unsent)) {
    for (const line of unsent) {
      if (typeof line === 'string') toast.warning(line)
    }
  }
  return answer
}

// A POST that outlives the page: sent as the client builds it - its base
// URL, its Authorization header, its JSON body - but by fetch with keepalive,
// which the browser completes after the page that sent it has gone. The
// response goes back through the client's own handling, for a page still
// there to read it. No timeout, as before: the client's 30 s would abort a
// save the browser is still finishing while the page stays open.
export const keepalive = { keepalive: true, timeout: 0 }
