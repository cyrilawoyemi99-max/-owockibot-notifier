// scripts/bountyClient.js
// The ONE file to edit if the real owockibot API shape differs.
// Normalized shape used everywhere else:
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
  return {
    id: String(raw.id ?? raw.bountyId ?? raw.slug ?? raw._id),
    title: raw.title ?? raw.name ?? 'Untitled bounty',
    category: (raw.category ?? raw.tag ?? raw.type ?? 'other').toLowerCase(),
    reward: Number(raw.reward ?? raw.amount ?? raw.rewardAmount ?? 0),
    status: (raw.status ?? raw.state ?? 'open').toLowerCase(),
    submissionsCount: Number(raw.submissionsCount ?? raw.submissions?.length ?? raw.submission_count ?? 0),
    url: raw.url ?? raw.link ?? (raw.id ? `https://owockibot.xyz/bounties/${raw.id}` : 'https://owockibot.xyz'),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString()
  };
}

async function fetchBounties() {
  const res = await fetch(BOUNTY_BOARD_API_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bounty board API returned ${res.status} ${res.statusText}`);
  const json = await res.json();
  return unwrapList(json).map(normalize).filter((b) => b.id && b.id !== 'undefined');
}

module.exports = { fetchBounties, normalize, unwrapList };
