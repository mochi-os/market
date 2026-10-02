// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { createAppClient } from '@mochi/web'

export const client = createAppClient({ appName: 'market' })

// Sends a request as the client builds it - its base URL, its Authorization
// header, its JSON body - but through fetch with keepalive, which the browser
// completes after the page that sent it has gone. The response goes back
// through the client's own handling, for a page still there to read it.
const adapter: AxiosAdapter = async (config) => {
  const response = await fetch(client.instance.getUri(config), {
    method: (config.method ?? 'post').toUpperCase(),
    headers: config.headers.toJSON(true) as Record<string, string>,
    body: config.data as BodyInit,
    credentials: config.withCredentials ? 'include' : 'same-origin',
    keepalive: true,
  })
  const text = await response.text()
  let data: unknown = text
  try {
    data = JSON.parse(text)
  } catch {
    // Not JSON: the client's handling reads the text as it is.
  }
  const result: AxiosResponse = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    config,
  }
  if (response.ok) return result
  throw new AxiosError(
    // axios's own wording for a refused request; never shown, since a send
    // that fails is caught and left to the next save.
    // eslint-disable-next-line lingui/no-unlocalized-strings
    `Request failed with status code ${response.status}`,
    response.status >= 500
      ? AxiosError.ERR_BAD_RESPONSE
      : AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    result
  )
}

/** The request options of a POST that outlives the page. */
export const keepalive = { adapter }
