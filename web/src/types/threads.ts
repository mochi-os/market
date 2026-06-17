export interface Thread {
  id: string
  listing: string
  order: string
  buyer: string
  seller: string
  created: number
  updated: number
  title?: string
  last_message?: string
  last_message_time?: number
  unread?: number
  other_name?: string
}

export interface Message {
  id: string
  thread: string
  sender: string
  sender_name: string
  body: string
  read: number
  created: number
}
