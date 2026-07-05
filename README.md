# owockibot Bounty Notifier (free / no server)

RSS feeds + webhook notifications for the owockibot bounty board, running
entirely on **GitHub Actions + GitHub Pages** — no hosting, no bill, ever.

Notifies on: **new_bounty**, **claimed**, **submitted**, **completed**, **new_submission**.

## How it works

- A scheduled GitHub Action polls the bounty board every 15 minutes, diffs
  it against the last known state (stored in `data/state.json`), writes any
  changes to `docs/feed.xml` / `docs/feed.json`, and POSTs webhooks to
  subscribers — then commits the updated files back to the repo.
- `docs/` is served free by **GitHub Pages** — that's your RSS feed and
  config page.
- "Subscribing" = opening a GitHub Issue from a pre-filled form on the
  config page. A second Action parses it, adds you to `data/subscribers.json`,
  comments back with your subscription ID, and closes the issue automatically.
  Unsubscribing works the same way.

No server process runs anywhere. Everything happens in short-lived Action
runs, which are free for public repos.

## One-time setup (all via the GitHub website — no terminal needed)

1. **Create a repo** and upload every file/folder in this project, keeping
   the folder structure (`.github/`, `scripts/`, `data/`, `docs/`).

2. **Turn on write permissions for Actions** (needed so the bot can commit
   feed updates and subscribers back to the repo):
   Repo → Settings → Actions → General → "Workflow permissions" →
   select **"Read and write permissions"** → Save.

3. **Turn on GitHub Pages**:
   Repo → Settings → Pages → Source → **Deploy from a branch** → Branch:
   `main`, folder: **`/docs`** → Save. GitHub gives you a URL like
   `https://yourname.github.io/your-repo/`.

4. **Set repo variables** (Settings → Secrets and variables → Actions →
   Variables tab → "New repository variable"):
   - `BOUNTY_BOARD_API_URL` = the real owockibot bounties API endpoint
   - `PUBLIC_BASE_URL` = the Pages URL from step 3 (no trailing slash)

5. **Edit `docs/index.html`**: near the bottom, set
   ```js
   const REPO_OWNER = "REPLACE_ME_OWNER";
   const REPO_NAME = "REPLACE_ME_REPO";
   ```
   to your actual GitHub username/org and repo name (this is what makes the
   "subscribe" button open the right issue form). Easiest done right in the
   GitHub web editor.

6. **Run the poller once manually** to confirm it works:
   Repo → Actions → "Poll bounty board" → Run workflow. Check the run logs,
   then check `docs/feed.xml` got created/updated in the repo.

That's it — it now runs itself every 15 minutes.

## ⚠️ Adapting to the real API

This was built against an assumed owockibot API response shape. If the
field names differ, open **`scripts/bountyClient.js`** (only this file
needs edits) and adjust:
- `unwrapList()` — how the bounty array is nested in the response
- `normalize()` — field name mapping to `{ id, title, category, reward, status, submissionsCount, url, createdAt }`

Everything else (diffing, webhooks, feeds) only depends on that normalized
shape. After editing, commit and run the poller workflow manually to check
`docs/feed.xml` looks right.

## Using it

- **RSS/JSON feeds**: linked on the config page (`docs/index.html`, i.e.
  your Pages URL). Main feed plus one feed per category and per reward
  tier are generated automatically, e.g. `feed-category-development.xml`,
  `feed-tier-large.xml`.
- **Subscribe**: click "subscribe via GitHub issue" on the config page,
  fill in your webhook URL and check the categories/tiers/events you want
  (leave a group unchecked to get everything in that group). Submit — a
  bot processes it and comments your subscription ID within about a
  minute, then closes the issue.
- **Unsubscribe**: click "unsubscribe", provide the subscription ID (or
  your webhook URL to remove all subscriptions using it).

### Webhook payload

```json
{
  "event": "new_bounty",
  "bounty": {
    "id": "123",
    "title": "Build analytics dashboard",
    "category": "development",
    "reward": 150,
    "status": "open",
    "submissionsCount": 0,
    "url": "https://owockibot.xyz/bounties/123"
  },
  "timestamp": "2026-07-05T15:05:36.778Z"
}
```

## Reward tiers & categories

Defined in `scripts/config.js`: reward tiers `small` (≤50), `medium`
(51-200), `large` (201-1000), `xlarge` (1000+); categories default to
`development, content, design, research, community, other` plus whatever
categories are actually seen in polled data. Edit `REWARD_TIERS` /
`DEFAULT_CATEGORIES` there if real amounts/labels differ — and update the
matching option labels in `.github/ISSUE_TEMPLATE/subscribe.yml` to match,
since subscription parsing matches by label text.

## Project layout

```
.github/
  workflows/
    poll.yml         scheduled poller (every 15 min)
    subscribe.yml     handles "subscribe" labeled issues
    unsubscribe.yml    handles "unsubscribe" labeled issues
  ISSUE_TEMPLATE/
    subscribe.yml      the subscribe form
    unsubscribe.yml     the unsubscribe form
scripts/
  poll.js               fetch + diff + write feeds + send webhooks
  bountyClient.js        fetch/normalize the bounty board API (EDIT THIS if needed)
  store.js               reads/writes the JSON files in data/
  notifier.js             subscriber matching + webhook sending
  rss.js                  builds docs/feed*.xml and docs/feed*.json
  parseIssueForm.js        parses GitHub issue-form markdown into fields
  handle-subscribe-issue.js
  handle-unsubscribe-issue.js
  config.js                categories, reward tiers, event types
data/
  subscribers.json, state.json, feed-items.json — committed to the repo,
  updated automatically by the workflows
docs/
  index.html + generated feed*.xml/json — served by GitHub Pages
```

## Local testing (optional)

If you do want to try it on your own machine first:

```bash
npm install
BOUNTY_BOARD_API_URL=https://owockibot.xyz/api/bounties PUBLIC_BASE_URL=http://localhost node scripts/poll.js
```

Check `data/state.json` and `docs/feed.xml` afterward. To test a
subscription without opening a real issue, simulate the issue body:

```bash
ISSUE_BODY='### Webhook URL

https://example.com/hook

### Categories

- [X] development

### Reward Tiers

### Event Types

- [X] New bounty posted' node scripts/handle-subscribe-issue.js
cat subscribe-result.json
cat data/subscribers.json
```

## Limitations

- Polling-based — detection latency is bounded by the 15-minute schedule
  (edit the cron in `.github/workflows/poll.yml` for a different interval;
  GitHub's minimum practical interval is about 5 minutes).
- No auth on the subscribe/unsubscribe issue forms — anyone who can open
  an issue on the repo can subscribe or unsubscribe any webhook. Fine for
  a small community tool; make the repo private or add a review step if
  that's a concern.
- Webhook URLs are only checked for being valid http(s) URLs — there's no
  protection against someone pointing a webhook at an internal address.
- All data lives as JSON files in the repo. Fine at small-to-medium
  subscriber counts; if it gets busy, the commit-on-every-poll pattern
  will get noisy and you may want to move to a real database + host.
