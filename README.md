# wire-reminder-bot

A Wire App built on `@wireapp/wire-apps-js-sdk`. Add it to any conversation and
it gives people in that chat two things: scheduled reminder messages (daily,
weekly, or one-off) and the ability to pin messages by reacting to them.

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
command list. From then on, anyone in that chat can manage reminders and pins there.

## 5. Keep it running (macOS, via launchd)

Once `.env` has real credentials, run it as a background service that survives
crashes and reboots instead of a foreground `npm run dev`:

```bash
npm run build
cp deploy/com.florianfrese.wire-reminder-bot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.florianfrese.wire-reminder-bot.plist
```

Logs land in `~/Library/Logs/wire-reminder-bot/`. Useful commands:

```bash
launchctl unload ~/Library/LaunchAgents/com.florianfrese.wire-reminder-bot.plist   # stop
launchctl load ~/Library/LaunchAgents/com.florianfrese.wire-reminder-bot.plist     # start
tail -f ~/Library/Logs/wire-reminder-bot/out.log                                  # watch logs
```

After changing code, re-run `npm run build` then unload/load to pick it up.

Caveats of running this on a personal Mac rather than a server: it only stays
connected while the machine is powered on, awake, and you're logged in — if
the laptop sleeps (e.g. lid closed), the connection drops until it wakes.
Disable sleep (System Settings → Lock Screen / Battery) if you need this to
be reliably always-on, or move it to a real server/VM later.

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

Pinning: react to any message with 📌 to pin it.

```
/pin                    same as /pin list
/pin list               show pinned messages in this chat
/pin remove <id>        unpin #id
/pin help               show usage
```

Known limitations:
- Only messages sent while the bot process has been running can be pinned —
  it looks up the message text from a short-lived in-memory cache, not from
  Wire's history, so a restart clears what's pinnable (already-pinned
  messages stay pinned; only the "react to pin" lookup is affected).
- Pinned/unpinned is a single state per message, not tracked per user — if
  two people pin the same message and one of them removes their own
  reaction, it unpins for everyone.

## Where the logic lives

- [src/config.ts](src/config.ts) — loads and validates env vars
- [src/common/tokenize.ts](src/common/tokenize.ts) — shared command-text tokenizer
- [src/common/ConversationId.ts](src/common/ConversationId.ts) — shared conversation id shape
- [src/reminders/](src/reminders/) — schedule parsing, storage, and the polling scheduler
- [src/pins/](src/pins/) — pin command parsing, storage, and the recent-message cache
- [src/BotHandler.ts](src/BotHandler.ts) — the `WireEventsHandler` subclass wiring commands/reactions to replies
- [src/index.ts](src/index.ts) — wires up the SDK, stores, cache, and scheduler, and starts listening

## Docs

- https://dev.wire.com/ — main developer docs
- https://github.com/wireapp/wire-apps-js-sdk — SDK source and more examples
  (`sample/src/examples/callbacks`) for reactions, pings, location messages,
  asset downloads, etc.
