import {nowInZone, type ZonedNow} from './TimeUtils.js'
import type {ReminderStore} from './ReminderStore.js'
import type {Reminder} from './types.js'

function isDue(reminder: Reminder, now: ZonedNow): boolean {
  const {schedule} = reminder
  if (schedule.type === 'daily') {
    return schedule.time === now.time
  }
  if (schedule.type === 'weekly') {
    return schedule.time === now.time && schedule.days.includes(now.weekday)
  }
  return schedule.date === now.date && schedule.time === now.time
}

/** Polls reminders once per interval and fires the ones due in the current minute. */
export class ReminderScheduler {
  private timer?: NodeJS.Timeout

  constructor(
    private readonly store: ReminderStore,
    private readonly timeZone: string,
    private readonly onDue: (reminder: Reminder) => Promise<void>
  ) {}

  start(intervalMs = 20_000): void {
    this.timer = setInterval(() => {
      this.tick().catch((error: unknown) => console.error('[ReminderScheduler] tick failed', error))
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  private async tick(): Promise<void> {
    const now = nowInZone(this.timeZone)
    const stamp = `${now.date} ${now.time}`

    for (const reminder of this.store.all()) {
      if (reminder.lastFiredAt === stamp || !isDue(reminder, now)) {
        continue
      }

      try {
        await this.onDue(reminder)
      } catch (error) {
        console.error(`[ReminderScheduler] failed to send reminder #${reminder.id}`, error)
        continue
      }

      if (reminder.schedule.type === 'once') {
        this.store.removeById(reminder.id)
      } else {
        this.store.markFired(reminder.id, stamp)
      }
    }
  }
}
