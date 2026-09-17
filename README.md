# wire-reminder-bot

A Wire App built on `@wireapp/wire-apps-js-sdk`. Add it to any conversation and
it lets people in that chat schedule recurring or one-off reminder messages —
e.g. a daily "good morning" or a weekly nudge to fill in a shared sheet.

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

# optional, both have defaults:
REMINDER_TIMEZONE=Europe/Berlin   # IANA timezone all /remind times are interpreted in
REMINDERS_FILE=./data/reminders.json
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

As a team admin, add the app to a conversation — it posts a greeting with the
command list. From then on, anyone in that chat can manage reminders there.

## Commands

Sent as plain text messages in the conversation, times are 24h `HH:MM`:

```
/remind add daily 09:00 <message>                     every day
/remind add weekly mon,wed 09:00 <message>             on specific weekdays
/remind add once 2026-09-20 14:00 <message>            a single reminder
/remind list                                           reminders running in this chat
/remind edit <id> <daily|weekly|once> ... <message>    replace reminder #id
/remind delete <id>                                    remove reminder #id
/remind help                                           show usage
```

Reminders are scoped to the conversation they were created in — `/remind list`
in one chat never shows reminders from another. Times are interpreted in
`REMINDER_TIMEZONE` (default `Europe/Berlin`) for everyone, since the bot has
no concept of individual members' timezones.

Known limitation: if the bot process is down at the exact minute a reminder
was due, that occurrence is simply skipped (no catch-up on restart).

## Where the logic lives

- [src/config.ts](src/config.ts) — loads and validates env vars
- [src/reminders/types.ts](src/reminders/types.ts) — `Reminder`/`Schedule` shapes
- [src/reminders/CommandParser.ts](src/reminders/CommandParser.ts) — parses `/remind ...` text into commands
- [src/reminders/TimeUtils.ts](src/reminders/TimeUtils.ts) — timezone-aware date/time helpers
- [src/reminders/ReminderStore.ts](src/reminders/ReminderStore.ts) — JSON-file persistence, keyed per conversation
- [src/reminders/ReminderScheduler.ts](src/reminders/ReminderScheduler.ts) — polls for due reminders and fires them
- [src/ReminderHandler.ts](src/ReminderHandler.ts) — the `WireEventsHandler` subclass wiring commands to replies
- [src/index.ts](src/index.ts) — wires up the SDK, store, and scheduler, and starts listening

## Docs

- https://dev.wire.com/ — main developer docs
- https://github.com/wireapp/wire-apps-js-sdk — SDK source and more examples
  (`sample/src/examples/callbacks`) for reactions, pings, location messages,
  asset downloads, etc.
