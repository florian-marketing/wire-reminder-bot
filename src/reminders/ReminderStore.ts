import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
import type {Reminder, Schedule, StoredConversationId} from './types.js'

interface ReminderFile {
  nextId: number
  reminders: Reminder[]
}

function sameConversation(a: StoredConversationId, b: StoredConversationId): boolean {
  return a.id === b.id && a.domain === b.domain
}

/** JSON-file-backed store for reminders. Reminder volume is tiny (per-team, per-chat), so a flat file is enough. */
export class ReminderStore {
  private reminders: Reminder[]
  private nextId: number

  constructor(private readonly filePath: string) {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, {recursive: true})
    }

    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as ReminderFile
      this.reminders = parsed.reminders
      this.nextId = parsed.nextId
    } else {
      this.reminders = []
      this.nextId = 1
      this.persist()
    }
  }

  private persist(): void {
    const payload: ReminderFile = {nextId: this.nextId, reminders: this.reminders}
    writeFileSync(this.filePath, JSON.stringify(payload, null, 2))
  }

  add(conversationId: StoredConversationId, schedule: Schedule, message: string): Reminder {
    const reminder: Reminder = {
      id: this.nextId++,
      conversationId,
      schedule,
      message,
      createdAt: new Date().toISOString()
    }
    this.reminders.push(reminder)
    this.persist()
    return reminder
  }

  listForConversation(conversationId: StoredConversationId): Reminder[] {
    return this.reminders
      .filter((r) => sameConversation(r.conversationId, conversationId))
      .sort((a, b) => a.id - b.id)
  }

  edit(id: number, conversationId: StoredConversationId, schedule: Schedule, message: string): Reminder | undefined {
    const reminder = this.reminders.find((r) => r.id === id && sameConversation(r.conversationId, conversationId))
    if (!reminder) {
      return undefined
    }
    reminder.schedule = schedule
    reminder.message = message
    delete reminder.lastFiredAt
    this.persist()
    return reminder
  }

  delete(id: number, conversationId: StoredConversationId): boolean {
    const index = this.reminders.findIndex((r) => r.id === id && sameConversation(r.conversationId, conversationId))
    if (index === -1) {
      return false
    }
    this.reminders.splice(index, 1)
    this.persist()
    return true
  }

  /** All reminders across all conversations, for the scheduler to scan. */
  all(): Reminder[] {
    return this.reminders
  }

  markFired(id: number, stamp: string): void {
    const reminder = this.reminders.find((r) => r.id === id)
    if (reminder) {
      reminder.lastFiredAt = stamp
      this.persist()
    }
  }

  removeById(id: number): void {
    const index = this.reminders.findIndex((r) => r.id === id)
    if (index !== -1) {
      this.reminders.splice(index, 1)
      this.persist()
    }
  }
}
