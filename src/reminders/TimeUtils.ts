import type {Weekday} from './types.js'

const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false
  }
  const d = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date)
}

export function parseWeekdays(input: string): Weekday[] | null {
  const parts = input
    .toLowerCase()
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) {
    return null
  }

  const days: Weekday[] = []
  for (const part of parts) {
    if (!(WEEKDAYS as string[]).includes(part)) {
      return null
    }
    days.push(part as Weekday)
  }

  return Array.from(new Set(days))
}

export interface ZonedNow {
  date: string
  time: string
  weekday: Weekday
}

/** Reads the current wall-clock date/time/weekday in the given IANA timezone. */
export function nowInZone(timeZone: string): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? ''

  let hour = get('hour')
  if (hour === '24') {
    hour = '00'
  }

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
    weekday: get('weekday').toLowerCase().slice(0, 3) as Weekday
  }
}
