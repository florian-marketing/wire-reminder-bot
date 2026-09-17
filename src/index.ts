import 'reflect-metadata'
import {type BackendConnectionListener, WireAppSdk} from '@wireapp/wire-apps-js-sdk'
import {CRYPTOGRAPHY_STORAGE_KEY, WIRE_API_HOST, WIRE_API_TOKEN} from './config.js'
import {EchoHandler} from './EchoHandler.js'

const sdk = await WireAppSdk.create(WIRE_API_TOKEN, WIRE_API_HOST, CRYPTOGRAPHY_STORAGE_KEY, new EchoHandler())

const backendConnectionListener: BackendConnectionListener = {
  onConnected: () => console.log('Connected to Wire backend'),
  onDisconnected: () => console.log('Disconnected from Wire backend')
}
sdk.setBackendConnectionListener(backendConnectionListener)

console.log('Echo bot is running. Press Ctrl+C to stop.')
await sdk.startListening()
