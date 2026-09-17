import {
  type Conversation,
  type ConversationMember,
  QualifiedId,
  TextMessage,
  WireEventsHandler
} from '@wireapp/wire-apps-js-sdk'

/**
 * Greets a conversation when the app is added, and echoes back any text
 * message it receives as a reply.
 */
export class EchoHandler extends WireEventsHandler {
  public override async onAppAddedToConversation(
    conversation: Conversation,
    _members: ConversationMember[]
  ): Promise<void> {
    const conversationId = new QualifiedId(conversation.id, conversation.domain)
    const greeting = TextMessage.create({
      conversationId,
      text: "Hi! I'm your echo bot 🙂 Send me a message and I'll repeat it back."
    })
    await this.manager.sendMessage(greeting)
  }

  public override async onTextMessageReceived(wireMessage: TextMessage): Promise<void> {
    const echo = TextMessage.createReply({
      originalMessage: wireMessage,
      text: `Echo: ${wireMessage.text}`
    })
    await this.manager.sendMessage(echo)
  }
}
