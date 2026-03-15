export interface Thread {
  id: number
  listing: number
  order: number
  buyer: string
  seller: string
  created: number
  updated: number
  title?: string
  last_message?: string
  last_message_time?: number
  unread?: number
}

export interface Message {
  id: number
  thread: number
  sender: string
  body: string
  read: number
  created: number
}
