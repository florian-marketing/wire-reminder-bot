import {
  type Conversation,
  type ConversationMember,
  QualifiedId,
  type Reaction,
  TextMessage,
  WireEventsHandler
} from '@wireapp/wire-apps-js-sdk'
import {parsePinCommand, type PinParseResult} from './pins/CommandParser.js'
import {formatPinList, PIN_EMOJI, PIN_USAGE} from './pins/format.js'
import type {MessageCache} from './pins/MessageCache.js'
import type {PinStore} from './pins/PinStore.js'
import {parseCommand as parseReminderCommand, type ParseResult as ReminderParseResult} from './reminders/CommandParser.js'
import {formatSchedule, USAGE as REMINDER_USAGE} from './reminders/format.js'
import type {ReminderStore} from './reminders/ReminderStore.js'
import type {Reminder} from './reminders/types.js'

/** Handles the /remind and /pin command families, plus 📌 reactions, for every conversation the app is in. */
export class BotHandler extends WireEventsHandler {
  constructor(
    private readonly reminders: ReminderStore,
    private readonly pins: PinStore,
    private readonly messageCache: MessageCache
  ) {
    super()
  }

  public override async onAppAddedToConversation(
    conversation: Conversation,
    _members: ConversationMember[]
  ): Promise<void> {
    const conversationId = new QualifiedId(conversation.id, conversation.domain)
    await this.manager.sendMessage(
      TextMessage.create({
        conversationId,
        text: `Hi! Here's what I can do in this chat.\n\n${REMINDER_USAGE}\n\n${PIN_USAGE}`
      })
    )
  }

  public override async onTextMessageReceived(wireMessage: TextMessage): Promise<void> {
    this.messageCache.remember({
      id: wireMessage.id,
      conversationId: wireMessage.conversationId,
      text: wireMessage.text,
      sender: wireMessage.sender
    })

    const reminderResult = parseReminderCommand(wireMessage.text)
    if (reminderResult) {
      await this.handleReminderCommand(wireMessage, reminderResult)
      return
    }

    const pinResult = parsePinCommand(wireMessage.text)
    if (pinResult) {
      await this.handlePinCommand(wireMessage, pinResult)
      return
    }
  }

  public override async onMessageReactionReceived(reaction: Reaction): Promise<void> {
    const conversationId = reaction.conversationId

    if (reaction.emojiSet.has(PIN_EMOJI)) {
      const cached = this.messageCache.get(reaction.messageId)
      if (!cached) {
        await this.manager.sendMessage(
          TextMessage.create({
            conversationId,
            text: `⚠️ Couldn't pin that message — it's too old or was sent before I last restarted.`
          })
        )
        return
      }
      const pin = this.pins.add(conversationId, reaction.messageId, cached.text, cached.sender)
      await this.manager.sendMessage(TextMessage.create({conversationId, text: `📌 Pinned #${pin.id}: "${pin.text}"`}))
      return
    }

    // Emoji set no longer includes the pin emoji: treat as an unpin. Note this is a single global
    // pinned/unpinned state per message, not a per-user tally — if two people pin the same message
    // and one of them removes their reaction, it unpins for everyone.
    const removed = this.pins.removeByMessageId(conversationId, reaction.messageId)
    if (removed) {
      await this.manager.sendMessage(TextMessage.create({conversationId, text: `📌 Unpinned.`}))
    }
  }

  private async handleReminderCommand(wireMessage: TextMessage, result: ReminderParseResult): Promise<void> {
    if (!result.ok) {
      await this.replyTo(wireMessage, `⚠️ ${result.error}`)
      return
    }

    const conversationId = wireMessage.conversationId
    const command = result.command

    switch (command.type) {
      case 'help':
        await this.replyTo(wireMessage, REMINDER_USAGE)
        return

      case 'list': {
        const reminders = this.reminders.listForConversation(conversationId)
        await this.replyTo(wireMessage, formatReminderList(reminders))
        return
      }

      case 'add': {
        const reminder = this.reminders.add(conversationId, command.schedule, command.message)
        await this.replyTo(
          wireMessage,
          `✅ Reminder #${reminder.id} created: ${formatSchedule(reminder.schedule)} — "${reminder.message}"`
        )
        return
      }

      case 'edit': {
        const updated = this.reminders.edit(command.id, conversationId, command.schedule, command.message)
        if (!updated) {
          await this.replyTo(wireMessage, `⚠️ No reminder #${command.id} found in this chat.`)
          return
        }
        await this.replyTo(
          wireMessage,
          `✅ Reminder #${updated.id} updated: ${formatSchedule(updated.schedule)} — "${updated.message}"`
        )
        return
      }

      case 'delete': {
        const deleted = this.reminders.delete(command.id, conversationId)
        await this.replyTo(
          wireMessage,
          deleted ? `🗑️ Reminder #${command.id} deleted.` : `⚠️ No reminder #${command.id} found in this chat.`
        )
        return
      }
    }
  }

  private async handlePinCommand(wireMessage: TextMessage, result: PinParseResult): Promise<void> {
    if (!result.ok) {
      await this.replyTo(wireMessage, `⚠️ ${result.error}`)
      return
    }

    const conversationId = wireMessage.conversationId
    const command = result.command

    switch (command.type) {
      case 'help':
        await this.replyTo(wireMessage, PIN_USAGE)
        return

      case 'list': {
        const pins = this.pins.listForConversation(conversationId)
        await this.replyTo(wireMessage, formatPinList(pins))
        return
      }

      case 'remove': {
        const removed = this.pins.removeById(command.id, conversationId)
        await this.replyTo(
          wireMessage,
          removed ? `🗑️ Unpinned #${command.id}.` : `⚠️ No pinned message #${command.id} in this chat.`
        )
        return
      }
    }
  }

  private async replyTo(original: TextMessage, text: string): Promise<void> {
    await this.manager.sendMessage(TextMessage.createReply({originalMessage: original, text}))
  }
}

function formatReminderList(reminders: Reminder[]): string {
  if (reminders.length === 0) {
    return 'No reminders are running in this chat yet. Send "/remind help" to create one.'
  }
  const lines = reminders.map((r) => `#${r.id} — ${formatSchedule(r.schedule)} — "${r.message}"`)
  return `**Reminders in this chat:**\n${lines.join('\n')}`
}
