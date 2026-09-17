import 'reflect-metadata'
import {type BackendConnectionListener, TextMessage, WireAppSdk} from '@wireapp/wire-apps-js-sdk'
import {BotHandler} from './BotHandler.js'
import {
  CRYPTOGRAPHY_STORAGE_KEY,
  PINS_FILE,
  REMINDERS_FILE,
  REMINDER_TIMEZONE,
  WIRE_API_HOST,
  WIRE_API_TOKEN
} from './config.js'
import {MessageCache} from './pins/MessageCache.js'
import {PinStore} from './pins/PinStore.js'
import {ReminderScheduler} from './reminders/ReminderScheduler.js'
import {ReminderStore} from './reminders/ReminderStore.js'

const reminderStore = new ReminderStore(REMINDERS_FILE)
const pinStore = new PinStore(PINS_FILE)
const messageCache = new MessageCache()

const sdk = await WireAppSdk.create(
  WIRE_API_TOKEN,
  WIRE_API_HOST,
  CRYPTOGRAPHY_STORAGE_KEY,
  new BotHandler(reminderStore, pinStore, messageCache)
)

const manager = sdk.getApplicationManager()

const scheduler = new ReminderScheduler(reminderStore, REMINDER_TIMEZONE, async (reminder) => {
  await manager.sendMessage(
    TextMessage.create({
      conversationId: reminder.conversationId,
      text: reminder.message
    })
  )
})

const backendConnectionListener: BackendConnectionListener = {
  onConnected: () => console.log('Connected to Wire backend'),
  onDisconnected: () => console.log('Disconnected from Wire backend')
}
sdk.setBackendConnectionListener(backendConnectionListener)

scheduler.start()
console.log(`Bot is running (timezone: ${REMINDER_TIMEZONE}). Press Ctrl+C to stop.`)
await sdk.startListening()
