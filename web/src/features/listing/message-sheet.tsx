import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { MessageCircle, Send } from 'lucide-react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
  getErrorMessage,
  useAuthStore,
} from '@mochi/web'
import type { Message, Thread } from '@/types'
import { threadsApi, messagesApi } from '@/api/threads'
import { useAccountStore } from '@/stores/account-store'

interface MessageSheetProps {
  listingId: number
  listingTitle: string
  threadId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessageSheet({ listingId, listingTitle, threadId, open, onOpenChange }: MessageSheetProps) {
  const { account } = useAccountStore()
  const token = useAuthStore((s) => s.token)
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
      : threadsApi.create(listingId).then((t) => threadsApi.get(t.id))

    let ws: WebSocket | null = null

    loadThread.then((data) => {
      setThread(data.thread)
      setMessages(data.messages ?? [])
      messagesApi.read(data.thread.id)

      // Connect websocket for real-time updates
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const jwt = token?.replace('Bearer ', '') ?? ''
      const url = `${proto}//${location.host}/_/websocket?key=market-thread-${data.thread.id}${jwt ? '&token=' + jwt : ''}`
      ws = new WebSocket(url)
      ws.onmessage = () => {
        threadsApi.get(data.thread.id).then((fresh) => {
          setMessages(fresh.messages ?? [])
          messagesApi.read(data.thread.id)
        }).catch(() => {})
      }
    }).catch((err) => {
      toast.error(getErrorMessage(err, 'Failed to load messages'))
    }).finally(() => setLoading(false))

    return () => { ws?.close() }
  }, [open, listingId, threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      toast.error(getErrorMessage(err, 'Failed to send'))
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
          <SheetDescription className='sr-only'>Messages about this listing</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <p className='text-sm text-muted-foreground text-center py-8'>Loading...</p>
          ) : messages.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-8'>No messages yet</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === account?.id
              return (
                <div
                  key={msg.id}
                  className={`group mb-3 flex w-full flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && msg.sender_name && (
                    <span className='text-muted-foreground px-1 text-xs font-medium'>
                      {msg.sender_name}
                    </span>
                  )}
                  <div className='flex items-end gap-2'>
                    {isMe && (
                      <span className='text-muted-foreground/70 text-[10px] opacity-0 transition-opacity group-hover:opacity-100'>
                        {format(new Date(msg.created * 1000), 'HH:mm:ss')}
                      </span>
                    )}
                    <div
                      className={`relative max-w-[70%] px-3.5 py-2 ${
                        isMe
                          ? 'rounded-[14px] rounded-br-[4px] bg-primary text-primary-foreground'
                          : 'rounded-[14px] rounded-bl-[4px] bg-muted text-foreground'
                      }`}
                    >
                      <p className='text-sm leading-relaxed whitespace-pre-wrap'>{msg.body}</p>
                    </div>
                    {!isMe && (
                      <span className='text-muted-foreground/70 text-[10px] opacity-0 transition-opacity group-hover:opacity-100'>
                        {format(new Date(msg.created * 1000), 'HH:mm:ss')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
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
