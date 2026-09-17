import type {Schedule} from './types.js'

export function formatSchedule(schedule: Schedule): string {
  if (schedule.type === 'daily') {
    return `daily at ${schedule.time}`
  }
  if (schedule.type === 'weekly') {
    return `weekly on ${schedule.days.join(',')} at ${schedule.time}`
  }
  return `once on ${schedule.date} at ${schedule.time}`
}

export const USAGE = `**Reminder commands** (times are 24h, \`HH:MM\`):
- \`/remind add daily 09:00 <message>\` — every day
- \`/remind add weekly mon,wed 09:00 <message>\` — on specific weekdays (mon,tue,wed,thu,fri,sat,sun)
- \`/remind add once 2026-09-20 14:00 <message>\` — a single reminder
- \`/remind list\` — show reminders running in this chat
- \`/remind edit <id> <daily|weekly|once> ... <message>\` — replace reminder #id
- \`/remind delete <id>\` — remove reminder #id
- \`/remind help\` — show this message`
