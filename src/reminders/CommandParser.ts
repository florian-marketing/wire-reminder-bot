import {takeTokens} from '../common/tokenize.js'
import {isValidDate, isValidTime, parseWeekdays} from './TimeUtils.js'
import type {Schedule} from './types.js'

export type ParsedCommand =
  | {type: 'help'}
  | {type: 'list'}
  | {type: 'add'; schedule: Schedule; message: string}
  | {type: 'edit'; id: number; schedule: Schedule; message: string}
  | {type: 'delete'; id: number}

export type ParseResult = {ok: true; command: ParsedCommand} | {ok: false; error: string}

type ScheduleAndMessage = {schedule: Schedule; message: string} | {error: string}

function parseScheduleAndMessage(input: string): ScheduleAndMessage {
  const typeSplit = takeTokens(input, 1)
  if (!typeSplit) {
    return {error: 'Missing schedule type. Use daily, weekly, or once.'}
  }
  const type = typeSplit.tokens[0]!.toLowerCase()

  if (type === 'daily') {
    const t = takeTokens(typeSplit.rest, 1)
    if (!t) {
      return {error: 'Usage: /remind add daily <HH:MM> <message>'}
    }
    const time = t.tokens[0]!
    if (!isValidTime(time)) {
      return {error: `Invalid time "${time}". Use 24h HH:MM, e.g. 09:00.`}
    }
    if (!t.rest) {
      return {error: 'Reminder message cannot be empty.'}
    }
    return {schedule: {type: 'daily', time}, message: t.rest}
  }

  if (type === 'weekly') {
    const d = takeTokens(typeSplit.rest, 1)
    if (!d) {
      return {error: 'Usage: /remind add weekly <mon,wed,...> <HH:MM> <message>'}
    }
    const days = parseWeekdays(d.tokens[0]!)
    if (!days) {
      return {
        error: `Invalid day list "${d.tokens[0]}". Use comma-separated values from mon,tue,wed,thu,fri,sat,sun.`
      }
    }
    const t = takeTokens(d.rest, 1)
    if (!t) {
      return {error: 'Usage: /remind add weekly <mon,wed,...> <HH:MM> <message>'}
    }
    const time = t.tokens[0]!
    if (!isValidTime(time)) {
      return {error: `Invalid time "${time}". Use 24h HH:MM, e.g. 09:00.`}
    }
    if (!t.rest) {
      return {error: 'Reminder message cannot be empty.'}
    }
    return {schedule: {type: 'weekly', days, time}, message: t.rest}
  }

  if (type === 'once') {
    const d = takeTokens(typeSplit.rest, 1)
    if (!d) {
      return {error: 'Usage: /remind add once <YYYY-MM-DD> <HH:MM> <message>'}
    }
    const date = d.tokens[0]!
    if (!isValidDate(date)) {
      return {error: `Invalid date "${date}". Use YYYY-MM-DD.`}
    }
    const t = takeTokens(d.rest, 1)
    if (!t) {
      return {error: 'Usage: /remind add once <YYYY-MM-DD> <HH:MM> <message>'}
    }
    const time = t.tokens[0]!
    if (!isValidTime(time)) {
      return {error: `Invalid time "${time}". Use 24h HH:MM, e.g. 09:00.`}
    }
    if (!t.rest) {
      return {error: 'Reminder message cannot be empty.'}
    }
    return {schedule: {type: 'once', date, time}, message: t.rest}
  }

  return {error: `Unknown schedule type "${type}". Use daily, weekly, or once.`}
}

/** Returns null if the text isn't a /remind command at all (so the handler can ignore it silently). */
export function parseCommand(rawText: string): ParseResult | null {
  const text = rawText.trim()
  if (!/^\/remind(\s|$)/i.test(text)) {
    return null
  }

  const afterCommand = text.replace(/^\/remind\s*/i, '')
  const subSplit = takeTokens(afterCommand, 1)
  const sub = subSplit?.tokens[0]?.toLowerCase()

  if (!sub || sub === 'help') {
    return {ok: true, command: {type: 'help'}}
  }

  if (sub === 'list') {
    return {ok: true, command: {type: 'list'}}
  }

  if (sub === 'add') {
    const result = parseScheduleAndMessage(subSplit!.rest)
    if ('error' in result) {
      return {ok: false, error: result.error}
    }
    return {ok: true, command: {type: 'add', schedule: result.schedule, message: result.message}}
  }

  if (sub === 'edit') {
    const idSplit = takeTokens(subSplit!.rest, 1)
    if (!idSplit) {
      return {ok: false, error: 'Usage: /remind edit <id> <daily|weekly|once> ... <message>'}
    }
    const id = Number(idSplit.tokens[0])
    if (!Number.isInteger(id)) {
      return {ok: false, error: `Invalid reminder id "${idSplit.tokens[0]}".`}
    }
    const result = parseScheduleAndMessage(idSplit.rest)
    if ('error' in result) {
      return {ok: false, error: result.error}
    }
    return {ok: true, command: {type: 'edit', id, schedule: result.schedule, message: result.message}}
  }

  if (sub === 'delete' || sub === 'remove') {
    const idSplit = takeTokens(subSplit!.rest, 1)
    if (!idSplit) {
      return {ok: false, error: 'Usage: /remind delete <id>'}
    }
    const id = Number(idSplit.tokens[0])
    if (!Number.isInteger(id)) {
      return {ok: false, error: `Invalid reminder id "${idSplit.tokens[0]}".`}
    }
    return {ok: true, command: {type: 'delete', id}}
  }

  return {ok: false, error: `Unknown command "${sub}". Send "/remind help" for usage.`}
}
