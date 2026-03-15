import type { Listing, Message, Thread } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const threadsApi = {
  create: (listing: number) =>
    client
      .post<{ data: Thread }>(endpoints.threads.create, { listing })
      .then((r) => r.data),

  mine: (params: { role?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { threads: Thread[]; total: number } }>(
        endpoints.threads.mine,
        params
      )
      .then((r) => r.data),

  get: (id: number) =>
    client
      .post<{
        data: {
          thread: Thread
          messages: Message[]
          listing: Pick<
            Listing,
            'id' | 'title' | 'price' | 'currency' | 'pricing' | 'status'
          >
        }
      }>(endpoints.threads.get, { id })
      .then((r) => r.data),
}

export const messagesApi = {
  send: (params: { thread: number; body: string }) =>
    client
      .post<{ data: Message }>(endpoints.messages.send, params)
      .then((r) => r.data),

  read: (thread: number) =>
    client.post<unknown>(endpoints.messages.read, { thread }),
}
