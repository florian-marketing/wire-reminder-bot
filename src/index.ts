import 'reflect-metadata'
import {type BackendConnectionListener, TextMessage, WireAppSdk} from '@wireapp/wire-apps-js-sdk'
import {CRYPTOGRAPHY_STORAGE_KEY, REMINDERS_FILE, REMINDER_TIMEZONE, WIRE_API_HOST, WIRE_API_TOKEN} from './config.js'
import {ReminderHandler} from './ReminderHandler.js'
import {ReminderScheduler} from './reminders/ReminderScheduler.js'
import {ReminderStore} from './reminders/ReminderStore.js'

const store = new ReminderStore(REMINDERS_FILE)

const sdk = await WireAppSdk.create(WIRE_API_TOKEN, WIRE_API_HOST, CRYPTOGRAPHY_STORAGE_KEY, new ReminderHandler(store))

const manager = sdk.getApplicationManager()

const scheduler = new ReminderScheduler(store, REMINDER_TIMEZONE, async (reminder) => {
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
console.log(`Reminder bot is running (timezone: ${REMINDER_TIMEZONE}). Press Ctrl+C to stop.`)
await sdk.startListening()
