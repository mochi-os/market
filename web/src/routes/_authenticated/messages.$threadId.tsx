import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { threadsApi } from '@/api/threads'
import { messagesApi } from '@/api/threads'
import { ThreadPage } from '@/features/messages/thread-page'

export const Route = createFileRoute('/_authenticated/messages/$threadId')({
  loader: async ({ params }) => {
    const id = Number(params.threadId)
    try {
      const [data] = await Promise.all([
        threadsApi.get(id),
        messagesApi.read(id),
      ])
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load thread'),
      }
    }
  },
  component: ThreadPage,
  errorComponent: GeneralError,
})
