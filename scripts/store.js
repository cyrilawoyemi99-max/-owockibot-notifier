// scripts/store.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const FEED_ITEMS_FILE = path.join(DATA_DIR, 'feed-items.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[store] failed to read ${file}:`, err.message);
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function getSubscribers() {
  return readJson(SUBSCRIBERS_FILE, []);
}

function saveSubscribers(subs) {
  writeJson(SUBSCRIBERS_FILE, subs);
}

function addSubscriber({ webhookUrl, categories, rewardTiers, events }) {
  const subs = getSubscribers();
  const sub = {
    id: crypto.randomUUID(),
    webhookUrl,
    categories: categories?.length ? categories : ['*'],
    rewardTiers: rewardTiers?.length ? rewardTiers : ['*'],
    events: events?.length ? events : ['*'],
    createdAt: new Date().toISOString(),
    active: true
  };
  subs.push(sub);
  saveSubscribers(subs);
  return sub;
}

function removeSubscribersMatching({ id, webhookUrl }) {
  const subs = getSubscribers();
  const next = subs.filter((s) => {
    if (id && s.id === id) return false;
    if (webhookUrl && s.webhookUrl === webhookUrl) return false;
    return true;
  });
  const removedCount = subs.length - next.length;
  if (removedCount) saveSubscribers(next);
  return removedCount;
}

function getState() {
  return readJson(STATE_FILE, { bounties: {}, lastPolledAt: null });
}

function saveState(state) {
  writeJson(STATE_FILE, state);
}

function getFeedItems() {
  return readJson(FEED_ITEMS_FILE, []);
}

function addFeedItems(newItems, maxItems) {
  const items = getFeedItems();
  const combined = [...newItems, ...items].slice(0, maxItems);
  writeJson(FEED_ITEMS_FILE, combined);
  return combined;
}

module.exports = {
  DATA_DIR,
  getSubscribers,
  saveSubscribers,
  addSubscriber,
  removeSubscribersMatching,
  getState,
  saveState,
  getFeedItems,
  addFeedItems
};
