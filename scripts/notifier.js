// scripts/notifier.js
const { WEBHOOK_TIMEOUT_MS, WEBHOOK_RETRIES, rewardToTier } = require('./config');

function matches(list, value) {
  return list.includes('*') || list.includes(value);
}

function subscriberMatchesEvent(sub, event) {
  if (sub.active === false) return false;
  if (!matches(sub.events, event.type)) return false;
  if (!matches(sub.categories, event.bounty.category)) return false;
  if (!matches(sub.rewardTiers, rewardToTier(event.bounty.reward))) return false;
  return true;
}

function findMatchingSubscribers(subscribers, event) {
  return subscribers.filter((sub) => subscriberMatchesEvent(sub, event));
}

async function sendWebhook(url, payload, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok && attempt <= WEBHOOK_RETRIES) return sendWebhook(url, payload, attempt + 1);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    clearTimeout(timeout);
    if (attempt <= WEBHOOK_RETRIES) return sendWebhook(url, payload, attempt + 1);
    return { ok: false, error: err.message };
  }
}

async function dispatchEvent(event, subscribers) {
  const matched = findMatchingSubscribers(subscribers, event);
  const payload = { event: event.type, bounty: event.bounty, timestamp: event.timestamp };
  return Promise.all(
    matched.map(async (sub) => ({
      subscriberId: sub.id,
      webhookUrl: sub.webhookUrl,
      result: await sendWebhook(sub.webhookUrl, payload)
    }))
  );
}

module.exports = { findMatchingSubscribers, sendWebhook, dispatchEvent, subscriberMatchesEvent };
