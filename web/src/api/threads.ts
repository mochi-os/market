import type { Listing, Message, Thread } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const threadsApi = {
  create: (listing: string, buyer?: string) =>
    client
      .post<{ data: Thread }>(endpoints.threads.create, { listing, buyer })
      .then((r) => r.data),

  mine: (params: { role?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { threads: Thread[]; total: number } }>(
        endpoints.threads.mine,
        params
      )
      .then((r) => r.data),

  get: (id: string) =>
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
  send: (params: { thread: string; body: string }) =>
    client
      .post<{ data: Message }>(endpoints.messages.send, params)
      .then((r) => r.data),

  read: (thread: string) =>
    client.post<unknown>(endpoints.messages.read, { thread }),
}
