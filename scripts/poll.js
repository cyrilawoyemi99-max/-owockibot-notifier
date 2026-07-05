// scripts/poll.js
// Runs once per invocation. The GitHub Action calls this on a schedule -
// there's no long-running process here.

const { fetchBounties } = require('./bountyClient');
const store = require('./store');
const { dispatchEvent } = require('./notifier');
const { writeAllFeeds } = require('./rss');
const { MAX_FEED_ITEMS } = require('./config');

function diff(oldBounties, newBounties) {
  const events = [];
  const now = new Date().toISOString();

  for (const bounty of newBounties) {
    const prev = oldBounties[bounty.id];

    if (!prev) {
      events.push({ type: 'new_bounty', bounty, timestamp: now });
      continue;
    }

    if (prev.status !== bounty.status && ['claimed', 'submitted', 'completed'].includes(bounty.status)) {
      events.push({ type: bounty.status, bounty, timestamp: now });
    }

    if ((bounty.submissionsCount || 0) > (prev.submissionsCount || 0)) {
      events.push({ type: 'new_submission', bounty, timestamp: now });
    }
  }

  return events;
}

async function poll() {
  const state = store.getState();

  let bounties;
  try {
    bounties = await fetchBounties();
  } catch (err) {
    console.error('[poll] failed to fetch bounties:', err.message);
    process.exitCode = 1;
    return;
  }

  const events = diff(state.bounties, bounties);
  console.log(`[poll] fetched ${bounties.length} bounties, ${events.length} new event(s)`);

  const allItems = events.length ? store.addFeedItems(events, MAX_FEED_ITEMS) : store.getFeedItems();

  // Always (re)write feeds so docs/ reflects current data even with 0 new events.
  writeAllFeeds(allItems);

  if (events.length) {
    const subscribers = store.getSubscribers();
    for (const event of events) {
      try {
        const results = await dispatchEvent(event, subscribers);
        if (results.length) {
          console.log(`[poll] ${event.type} on ${event.bounty.id}: notified ${results.length} subscriber(s)`);
        }
      } catch (err) {
        console.error('[poll] dispatch failed for', event.type, event.bounty.id, err.message);
      }
    }
  }

  store.saveState({
    bounties: Object.fromEntries(bounties.map((b) => [b.id, b])),
    lastPolledAt: new Date().toISOString()
  });
}

poll();
