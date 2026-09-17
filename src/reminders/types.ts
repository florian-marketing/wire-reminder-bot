import type {StoredConversationId} from '../common/ConversationId.js'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type Schedule =
  | {type: 'once'; date: string; time: string}
  | {type: 'daily'; time: string}
  | {type: 'weekly'; days: Weekday[]; time: string}

export type {StoredConversationId}

export interface Reminder {
  id: number
  conversationId: StoredConversationId
  message: string
  schedule: Schedule
  createdAt: string
  /** "YYYY-MM-DD HH:mm" stamp of the last time this reminder fired, used to avoid double-firing. */
  lastFiredAt?: string
}
