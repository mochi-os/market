import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useFormat } from '@mochi/web'
import { MessageCircle, Send } from 'lucide-react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  cn,
  getChatBubbleToneClass,
  toast,
  getErrorMessage,
  useAuthStore,
} from '@mochi/web'
import type { Message, Thread } from '@/types'
import { formatFingerprint } from '@/lib/format'
import { threadsApi, messagesApi } from '@/api/threads'
import { useAccountStore } from '@/stores/account-store'

interface MessageSheetProps {
  listingId: number
  listingTitle: string
  threadId?: number
  buyer?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessageSheet({ listingId, listingTitle, threadId, buyer, open, onOpenChange }: MessageSheetProps) {
  const { t } = useLingui()
  const { account } = useAccountStore()
  const token = useAuthStore((s) => s.token)
  const { formatDate, formatTime } = useFormat()
  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setThread(null)
      setMessages([])
      return
    }
    setLoading(true)

    const loadThread = threadId
      ? threadsApi.get(threadId).then((data) => data)
      : threadsApi.create(listingId, buyer).then((t) => threadsApi.get(t.id))

    let cancelled = false
    let ws: WebSocket | null = null

    loadThread.then((data) => {
      if (cancelled) return
      setThread(data.thread)
      setMessages(data.messages ?? [])
      messagesApi.read(data.thread.id)

      // Connect websocket for real-time updates
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const jwt = token?.replace('Bearer ', '') ?? ''
      const url = `${proto}//${location.host}/_/websocket?key=market-thread-${data.thread.id}${jwt ? '&token=' + jwt : ''}`
      ws = new WebSocket(url)
      if (cancelled) { ws.close(); return }
      ws.onmessage = () => {
        if (cancelled) return
        threadsApi.get(data.thread.id).then((fresh) => {
          if (cancelled) return
          setMessages(fresh.messages ?? [])
          messagesApi.read(data.thread.id)
        }).catch(() => undefined)
      }
    }).catch((err) => {
      if (cancelled) return
      toast.error(getErrorMessage(err, t`Failed to load messages`))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      ws?.close()
    }
  }, [open, listingId, threadId, buyer])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {}
    messages.forEach((msg) => {
      const d = new Date(msg.created * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(msg)
    })
    return groups
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !thread) return
    setSending(true)
    try {
      const msg = await messagesApi.send({ thread: thread.id, body: body.trim() })
      setMessages((prev) => [...prev, msg])
      setBody('')
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to send`))
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-lg p-0 gap-0 flex flex-col' onInteractOutside={() => onOpenChange(false)}>
        <SheetHeader className='border-b p-4'>
          <SheetTitle className='flex items-center gap-2'>
            <MessageCircle className='size-4' />
            {listingTitle}
          </SheetTitle>
          <SheetDescription className='sr-only'><Trans>Messages about this listing</Trans></SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <p className='text-sm text-muted-foreground text-center py-8'><Trans>Loading...</Trans></p>
          ) : messages.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-8'><Trans>No messages yet</Trans></p>
          ) : (
            Object.keys(groupedMessages).map((key) => (
              <Fragment key={key}>
                <div className='my-4 flex items-center justify-center'>
                  <div className='text-muted-foreground text-xs'>
                    {formatDate(new Date(key + 'T00:00:00'))}
                  </div>
                </div>
                {groupedMessages[key].map((msg) => {
                  const isMe = msg.sender === account?.id
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'group mb-3 flex w-full flex-col gap-1',
                        isMe ? 'items-end' : 'items-start',
                      )}
                    >
                      {!isMe && msg.sender && (
                        <span className='text-muted-foreground px-1 text-xs font-medium'>
                          {msg.sender_name || formatFingerprint(msg.sender)}
                        </span>
                      )}
                      <div className='flex items-end gap-2'>
                        {isMe && (
                          <span className='text-muted-foreground/70 text-[10px] opacity-0 transition-opacity group-hover:opacity-100'>
                            {formatTime(new Date(msg.created * 1000))}
                          </span>
                        )}
                        <div
                          className={cn(
                            'relative max-w-[70%] px-3.5 py-2 wrap-break-word',
                            getChatBubbleToneClass(isMe),
                          )}
                        >
                          <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                            {msg.body}
                          </p>
                        </div>
                        {!isMe && (
                          <span className='text-muted-foreground/70 text-[10px] opacity-0 transition-opacity group-hover:opacity-100'>
                            {formatTime(new Date(msg.created * 1000))}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </Fragment>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className='flex gap-2 border-t p-4'>
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
      </SheetContent>
    </Sheet>
  )
}
