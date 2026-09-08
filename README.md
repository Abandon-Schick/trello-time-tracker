# Time Tracker — a personal Trello Power-Up

Four features, nothing else:
1. **Set Estimate** — a number field per card, in hours.
2. **Time Report** — a board button showing total estimated/spent hours by list, by label, and by due date.
3. **Log Time** — quick +5m/+15m/+30m/+1h/+2h/+4h buttons, a custom-amount field, and a running total per card.
4. **Timer** — start/stop stopwatch that adds the elapsed time to the card's running total when you stop it.

All data lives on the card itself (Trello's own per-card storage for Power-Ups), so it stays with your board — nothing is stored on a third-party server, because there is no server. This is a static site: five HTML files and two JS files, hosted for free, that Trello loads directly.

## 1. Host the files

Simplest free option is GitHub Pages:

1. Create a new **public** GitHub repo (e.g. `trello-time-tracker`).
2. Upload all the files in this folder to the repo root (`index.html`, `config.js`, `client.js`, `popup-estimate.html`, `popup-logtime.html`, `popup-timer.html`, `popup-report.html`).
3. In the repo, go to **Settings → Pages**, set source to the `main` branch, root folder. Save.
4. Wait a minute, then confirm `https://YOUR-USERNAME.github.io/trello-time-tracker/` loads (it'll show a blank page — that's correct, it's meant to run inside Trello, not standalone).

## 2. Register the Power-Up

1. Go to **trello.com/power-ups/admin**.
2. Click **New**.
3. Fill in:
   - **Power-Up or Plugin name:** Time Tracker (or whatever you like)
   - **Workspace:** the workspace your Admin board lives in
   - **Iframe connector URL:** `https://YOUR-USERNAME.github.io/trello-time-tracker/index.html`
   - **Email / support contact:** your own email (required field, only you'll ever see it)
4. Save.

## 3. Get your App Key and paste it in

1. On the Power-Up's admin page you just created, find the **API Key** section and generate/copy the key.
2. Open `config.js` in your repo and replace `PASTE_YOUR_APP_KEY_HERE` with that key.
3. Commit the change. GitHub Pages will redeploy automatically within a minute or two.

This key is only needed for the **Time Report** button — it's what lets that one popup ask Trello for read-only access to every card's data instead of just the one card you're on. Estimate, Log Time, and Timer never need it.

## 4. Turn on capabilities

Still on the Power-Up's admin page, under **Capabilities**, enable:
- `card-badges`
- `card-detail-badges`
- `card-buttons`
- `board-buttons`

(These match exactly what's implemented in `client.js` — enabling others would just do nothing.)

## 5. Enable it on your board

1. Open your "0. Admin" board.
2. Menu → **Power-Ups** → **Custom** tab → find "Time Tracker" → **Enable**.
3. Open any card — you should see **Set Estimate**, **Log Time**, and **Timer** buttons on the card back, and a **Time Report** button at the top of the board.

## 6. One-time authorization for the report

The first time you click **Time Report**, it'll ask you to authorize read-only access — this is Trello's standard, sanctioned way for a Power-Up to read data across cards (rather than one card at a time), and it only needs to happen once. Click **Authorize read access**, approve it, and the report loads. Every time after that it just works.

## Logging time from your phone (no custom Power-Up needed on mobile)

Trello's mobile apps don't support custom Power-Ups at all — only a handful Trello builds itself. But comments work fine on mobile, so that's the bridge: run your phone's native stopwatch, and when you're done, add a comment on the card from the Trello app using one of these formats:

- `#time 45m`
- `#time 1.5h`
- `#time 1:30` (1 hour 30 minutes)

Next time you open **Log Time** on that card from a browser (or the trello.com Home Screen shortcut), it automatically scans for any new `#time` comments since the last check, adds them to the running total, and tells you what it found. You don't have to do anything extra — it also runs a manual "Check comments now" button if you want to trigger it without waiting.

The same works for estimates — comment `#estimate 2h`, `#estimate 1.5`, or `#estimate 1:30` and open **Set Estimate** to pick it up. One difference: time-spent comments *add up* (each one is more work logged), but an estimate comment *replaces* the current value rather than stacking — so if you post two `#estimate` comments on the same card, only the most recent one wins. If you've hand-edited the number in the popup more recently than any comment, that edit sticks until a newer comment arrives.

**This isn't instant.** Trello doesn't notify a Power-Up the moment a comment is posted — the code only runs when you actually open that popup in a browser session. So the comment sits there until you're next at a computer (or the phone's Home Screen shortcut) and open Log Time — which fits naturally with the weekly triage rhythm, just not a live sync.

**One-time setup:** this reuses the same read-only authorization as the Time Report button. If you haven't clicked **Authorize read access** there yet, do that first — Log Time's comment sync will tell you if it's still needed.

## How the numbers work

- **Fractions of an hour work everywhere** — the Estimate field, Log Time's manual entry, and both comment formats all accept decimals (`1.5`) and `h:mm` (`1:30`). The quick-add buttons are themselves stored as fractions under the hood (5m = 0.083h), so nothing gets rounded to whole hours.
- **Estimate** and **Log Time** both store a single number per card, in hours (so 90 minutes is `1.5`, not `1:30` — though `1:30` is accepted as input and converted for you).
- **Log Time**'s quick buttons *add* to the running total — they don't overwrite it. Click +1h three times in a day and the card shows 3h spent.
- **Timer** does the same thing automatically: stop the stopwatch and it adds the elapsed time to that same running total, so Log Time and Timer always agree with each other on one card.
- **Time Report** only counts cards that have an estimate or spent value set — untouched cards (like anything still sitting in Ideas without a number on it) don't show up and don't skew the totals.

## If something breaks

Trello's Power-Up platform changes occasionally. If a button stops working:
- Open the card, then your browser's dev console (Trello runs Power-Ups as regular iframes, so normal browser dev tools work) — errors there usually point straight at the problem.
- The two most likely culprits: the App Key in `config.js` is wrong or missing, or a capability got unchecked in the admin portal.
- Trello's own Power-Up docs are at developer.atlassian.com/cloud/trello/power-ups/ if you want to extend this later.
