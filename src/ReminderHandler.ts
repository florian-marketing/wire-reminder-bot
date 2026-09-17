import {
  type Conversation,
  type ConversationMember,
  QualifiedId,
  TextMessage,
  WireEventsHandler
} from '@wireapp/wire-apps-js-sdk'
import {parseCommand} from './reminders/CommandParser.js'
import {formatSchedule, USAGE} from './reminders/format.js'
import type {ReminderStore} from './reminders/ReminderStore.js'
import type {Reminder} from './reminders/types.js'

/** Handles the /remind command family and greets a conversation with usage info when added. */
export class ReminderHandler extends WireEventsHandler {
  constructor(private readonly store: ReminderStore) {
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
        text: `Hi! I can send scheduled reminders in this chat.\n\n${USAGE}`
      })
    )
  }

  public override async onTextMessageReceived(wireMessage: TextMessage): Promise<void> {
    const result = parseCommand(wireMessage.text)
    if (!result) {
      return
    }

    if (!result.ok) {
      await this.replyTo(wireMessage, `⚠️ ${result.error}`)
      return
    }

    const conversationId = wireMessage.conversationId
    const command = result.command

    switch (command.type) {
      case 'help':
        await this.replyTo(wireMessage, USAGE)
        return

      case 'list': {
        const reminders = this.store.listForConversation(conversationId)
        await this.replyTo(wireMessage, formatList(reminders))
        return
      }

      case 'add': {
        const reminder = this.store.add(conversationId, command.schedule, command.message)
        await this.replyTo(
          wireMessage,
          `✅ Reminder #${reminder.id} created: ${formatSchedule(reminder.schedule)} — "${reminder.message}"`
        )
        return
      }

      case 'edit': {
        const updated = this.store.edit(command.id, conversationId, command.schedule, command.message)
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
        const deleted = this.store.delete(command.id, conversationId)
        await this.replyTo(
          wireMessage,
          deleted ? `🗑️ Reminder #${command.id} deleted.` : `⚠️ No reminder #${command.id} found in this chat.`
        )
        return
      }
    }
  }

  private async replyTo(original: TextMessage, text: string): Promise<void> {
    await this.manager.sendMessage(TextMessage.createReply({originalMessage: original, text}))
  }
}

function formatList(reminders: Reminder[]): string {
  if (reminders.length === 0) {
    return 'No reminders are running in this chat yet. Send "/remind help" to create one.'
  }
  const lines = reminders.map((r) => `#${r.id} — ${formatSchedule(r.schedule)} — "${r.message}"`)
  return `**Reminders in this chat:**\n${lines.join('\n')}`
}
