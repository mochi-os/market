import { useEffect, useRef, useState } from 'react'
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
import { formatTimestamp } from '@mochi/web'
import type { Message, Thread } from '@/types'
import { threadsApi, messagesApi } from '@/api/threads'

interface MessageSheetProps {
  listingId: number
  listingTitle: string
  threadId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessageSheet({ listingId, listingTitle, threadId, open, onOpenChange }: MessageSheetProps) {
  const { identity: entityId } = useAuthStore()
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

    loadThread.then((data) => {
      setThread(data.thread)
      setMessages(data.messages ?? [])
      messagesApi.read(data.thread.id)
    }).catch((err) => {
      toast.error(getErrorMessage(err, 'Failed to load messages'))
    }).finally(() => setLoading(false))
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
      <SheetContent className='w-full sm:max-w-lg p-0 gap-0 flex flex-col [&>button:last-child]:hidden'>
        <SheetHeader className='border-b p-4'>
          <SheetTitle className='flex items-center gap-2'>
            <MessageCircle className='size-4' />
            {listingTitle}
          </SheetTitle>
          <SheetDescription className='sr-only'>Messages about this listing</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          {loading ? (
            <p className='text-sm text-muted-foreground text-center py-8'>Loading...</p>
          ) : messages.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-8'>No messages yet</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === entityId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-[10px] p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className='text-sm whitespace-pre-wrap'>{msg.body}</p>
                    <p className={`mt-1 text-xs ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTimestamp(msg.created * 1000)}
                    </p>
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
