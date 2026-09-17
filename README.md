# wire-echo-bot

A minimal Wire App built on `@wireapp/wire-apps-js-sdk`. It joins a conversation,
sends a greeting when added, and echoes back any text message it receives.

## 1. Prerequisites (do this before the code will run)

An "App" here is a Wire API client, not a regular user — it needs to be registered
by a team admin:

- A Wire team on a **paid plan**
- **MLS** set as the default protocol for the team
- The **Apps** feature flag enabled for the team
- **Team owner or admin** access

If any of those aren't in place yet, that has to be sorted with whoever manages
the Wire team/tenant before you can get credentials.

## 2. Register the app and get credentials

1. In Wire, go to Settings → Manage team (or teams.wire.com)
2. Open the **Integrations** tab → **Create App**
3. Fill in the app details and save
4. Copy the **auth token** immediately — it's shown once and can't be retrieved again
5. Note the **App ID**, **host**, and **domain** shown after creation

## 3. Configure

```bash
cp .env.example .env
npm run gen-key   # generates a random 32-byte hex key, paste into WIRE_SDK_STORAGE_KEY
```

Fill in `.env`:

```
WIRE_SDK_API_TOKEN=<the auth token from step 2>
WIRE_SDK_API_HOST=<the host from step 2>
WIRE_SDK_STORAGE_KEY=<output of npm run gen-key>
```

`WIRE_SDK_STORAGE_KEY` encrypts the local key material store (`./storage`,
SQLite + crypto keys) — keep it secret, never reuse it across apps, never commit it.

## 4. Run

```bash
npm install
npm run dev      # runs directly with tsx
# or
npm run build && npm start
```

Then, as a team admin, add the app to a conversation. It should post a greeting,
and from then on echo back any text message sent in that conversation.

## Where the logic lives

- [src/config.ts](src/config.ts) — loads and validates env vars
- [src/EchoHandler.ts](src/EchoHandler.ts) — the actual bot behavior (`WireEventsHandler` subclass)
- [src/index.ts](src/index.ts) — wires up the SDK and starts listening

## Docs

- https://dev.wire.com/ — main developer docs
- https://github.com/wireapp/wire-apps-js-sdk — SDK source and more examples
  (`sample/src/examples/callbacks`) for replies, reactions, pings, location
  messages, asset downloads, etc.
