import { useEffect, useRef, useState } from 'react'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { MessageCircle, Send } from 'lucide-react'
import {
  Button,
  EmptyState,
  GeneralError,
  Main,
  PageHeader,
  Textarea,
  toast,
  getErrorMessage,
  useAuthStore,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import type { Message } from '@/types'
import { messagesApi } from '@/api/threads'
import { APP_ROUTES } from '@/config/routes'

export function ThreadPage() {
  const { data, error } = useLoaderData({
    from: '/_authenticated/messages/$threadId',
  })
  const navigate = useNavigate()
  const { identity: entityId } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>(data?.messages ?? [])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages)
    }
  }, [data?.messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (error) {
    return (
      <>
        <PageHeader icon={<MessageCircle className='size-4 md:size-5' />} title='Thread' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<MessageCircle className='size-4 md:size-5' />} title='Thread' />
        <Main>
          <EmptyState icon={MessageCircle} title='Thread not found' />
        </Main>
      </>
    )
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !data?.thread) return
    setSending(true)
    try {
      const msg = await messagesApi.send({
        thread: data.thread.id,
        body: body.trim(),
      })
      setMessages((prev) => [...prev, msg])
      setBody('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send'))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<MessageCircle className='size-4 md:size-5' />}
        title={data.listing?.title || `Thread #${data.thread.id}`}
        back={{ label: 'Messages', onFallback: () => navigate({ to: APP_ROUTES.MESSAGES }) }}
      />
      <Main fixed>
        <div className='flex h-full flex-col'>
          <div className='flex-1 overflow-y-auto space-y-3 pb-4'>
            {messages.map((msg) => {
              const isMe = msg.sender === entityId
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-[10px] p-3 ${
                      isMe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className='text-sm whitespace-pre-wrap'>{msg.body}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isMe
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTimestamp(msg.created * 1000)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className='flex gap-2 border-t pt-3'>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              className='flex-1 resize-none'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
            <Button type='submit' size='icon' disabled={sending || !body.trim()}>
              <Send className='size-4' />
            </Button>
          </form>
        </div>
      </Main>
    </>
  )
}
