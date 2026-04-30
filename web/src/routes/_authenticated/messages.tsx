import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { threadsApi } from '@/api/threads'
import { MessagesPage } from '@/features/messages/messages-page'

export const Route = createFileRoute('/_authenticated/messages')({
  loader: async () => {
    try {
      const data = await threadsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, "Failed to load messages"),
      }
    }
  },
  component: MessagesPage,
})
