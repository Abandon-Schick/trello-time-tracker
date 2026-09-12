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

Heads up: Trello's mobile app renders a leading `#` as a big heading, so these comments will look oversized in the comment thread — that's cosmetic only, the underlying text is unchanged and the sync still matches it fine.

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

## Automatic weekly report (optional)

A GitHub Actions workflow (`.github/workflows/weekly-report.yml`) runs every Saturday at 11pm Eastern and **creates a new Trello card** — titled like "9/13 Weekly Time Management," due the following Monday at 9am, in a list you designate. The card's description holds three stats (time spent this week, total time remaining across everything, and time remaining for what's due in the next week including overdue), with the full per-card CSV attached. Nothing is stored anywhere except that Trello card.

**How "time spent this week" is calculated:** each report card embeds its cumulative spent-hours total in an invisible marker in its own description. Next week's run finds the most recent prior report card in the list, reads that marker, and subtracts it from the current cumulative total — giving a true weekly delta regardless of whether time was logged via a comment, the quick-add buttons, or the stopwatch. The first run ever has nothing to diff against, so it'll say so rather than guess.

**Setup:**

1. **Create a dedicated list** for reports to land in (e.g. "📊 Reports"). Open your board, find that list, and get its ID — easiest way: click into any card in that list, and the ID is in the URL, OR use Trello's `.json` trick: visit `https://trello.com/b/YOUR_BOARD_SHORTLINK.json` in your browser and search the page for the list's name to find its `id`.
2. **Get a personal Trello token with write access** — visit this URL in your browser (with your real App Key from `config.js` substituted in), log in, and approve it. This needs **read AND write** scope, unlike the read-only token the in-app Time Report button uses — this script creates cards, posts comments, and uploads attachments, not just reads:
   ```
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_APP_KEY
   ```
   Trello will show you a long token string — copy it.
3. **Get your board ID** — the short code in your board's URL: `trello.com/b/XXXXXXXX/your-board-name`.
4. **Add four repo secrets** — in your GitHub repo, go to Settings → Secrets and variables → Actions → New repository secret, and add:
   - `TRELLO_KEY` — your App Key (same one in `config.js`)
   - `TRELLO_TOKEN` — the read+write token from step 2
   - `TRELLO_BOARD` — the board ID from step 3
   - `TRELLO_REPORT_LIST` — the list ID from step 1
5. That's it — no repo permission changes needed, since nothing gets committed to GitHub. To test it immediately rather than waiting for Saturday, go to the Actions tab → "Weekly Time Report" → **Run workflow**.

**On the estimate:** the card's 0.5h estimate is set via a `#estimate 0.5h` comment the script posts right after creating the card — not a direct write, since (as covered above) Trello's REST API can't write `pluginData` at all. It'll show correctly the moment you or the Report popup next looks at that card, using the same comment-sync logic already built.

**Changing the day/time or title convention:** the `cron` line in the workflow controls timing (see the file for the UTC/Eastern conversion note). The title currently uses the date of the day *after* the Saturday-night run (so a Saturday-night run titles itself with Sunday's date) — if you want it to use the due-Monday's date or the run date instead, that's the `titleDate` line near the bottom of `scripts/weekly-report.js`.

**Why this token needs broader access than the Power-Up itself:** the in-app Time Report button intentionally only ever asks for read-only access, since it only displays data. This script actually creates and modifies things in Trello on your behalf, so it needs write access too — it's a separate token, used only by this script, not by anything running in front of you in the browser.

## Privacy policy

`privacy.html` is a short, honest privacy policy for this Power-Up (there's no backend, so there's not much to say). Trello only requires one if you submit a Power-Up to their public directory — since this one only runs on your own board, it's optional, but the admin portal's Privacy Policy field can point to `https://YOUR-USERNAME.github.io/trello-time-tracker/privacy.html` if you'd like every field filled in.

## If something breaks

Trello's Power-Up platform changes occasionally. If a button stops working:
- Open the card, then your browser's dev console (Trello runs Power-Ups as regular iframes, so normal browser dev tools work) — errors there usually point straight at the problem.
- The two most likely culprits: the App Key in `config.js` is wrong or missing, or a capability got unchecked in the admin portal.
- Trello's own Power-Up docs are at developer.atlassian.com/cloud/trello/power-ups/ if you want to extend this later.
