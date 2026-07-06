// scripts/bountyClient.js
// Verified against the live API on 2026-07-05: GET https://bounty.owockibot.xyz/bounties
// returns a bare JSON array of bounty objects shaped like:
// {
//   id: "156", tags: ["security","audit"], uuid: "...", title: "...",
//   reward: "104860000",       <- USDC in base units (6 decimals) - divide by 1e6
//   status: "completed",       <- seen: open, claimed, submitted, completed, cancelled, payment_pending
//   createdAt: 1770499893135,  <- epoch milliseconds
//   submissions: [ {...}, ... ]
// }
//
// Normalized shape used everywhere else in this service:
// { id, title, category, reward, status, submissionsCount, url, createdAt }

const { BOUNTY_BOARD_API_URL } = require('./config');

function unwrapList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.bounties)) return json.bounties;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  throw new Error('Unrecognized bounty board API response shape - update bountyClient.js unwrapList()');
}

function normalize(raw) {
  // The API has no single "category" field - it has a `tags` array. We use
  // the first tag as the primary category for filtering/subscriptions.
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const category = (tags[0] || 'other').toLowerCase();

  // reward comes back as a string of USDC base units (6 decimals).
  const rewardUsdc = Number(raw.reward ?? 0) / 1000000;

  // createdAt is epoch milliseconds (a number), not an ISO string.
  const createdAtMs = Number(raw.createdAt);
  const createdAt = Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : new Date().toISOString();

  return {
    id: String(raw.id ?? raw.uuid),
    title: raw.title ?? 'Untitled bounty',
    category,
    reward: rewardUsdc,
    status: String(raw.status ?? 'open').toLowerCase(),
    submissionsCount: Array.isArray(raw.submissions) ? raw.submissions.length : 0,
    // No confirmed per-bounty detail page was found on owockibot.xyz at
    // the time this was written - links to the board itself for now.
    url: 'https://www.owockibot.xyz/bounty',
    createdAt
  };
}

async function fetchBounties() {
  const res = await fetch(BOUNTY_BOARD_API_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bounty board API returned ${res.status} ${res.statusText}`);
  const json = await res.json();
 return unwrapList(json)
  .map(normalize)
  .filter((b) => b.id && b.id !== 'undefined')
  .filter((b) => b.title !== 'Untitled bounty' || b.reward > 0); // drop empty/placeholder records

module.exports = { fetchBounties, normalize, unwrapList };
