// scripts/rss.js
const fs = require('fs');
const path = require('path');
const { Feed } = require('feed');
const { PUBLIC_BASE_URL, rewardToTier, REWARD_TIERS } = require('./config');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

const EVENT_LABELS = {
  new_bounty: 'New bounty',
  claimed: 'Claimed',
  submitted: 'Submitted',
  completed: 'Completed',
  new_submission: 'New submission'
};

function filterItems(items, { category, tier } = {}) {
  return items.filter((item) => {
    if (category && item.bounty.category !== category) return false;
    if (tier && rewardToTier(item.bounty.reward) !== tier) return false;
    return true;
  });
}

function buildFeed(items, filters, feedFileName) {
  const feed = new Feed({
    title: 'owockibot Bounty Board Updates',
    description: 'New bounties, status changes, and submissions from the owockibot bounty board',
    id: PUBLIC_BASE_URL,
    link: PUBLIC_BASE_URL,
    language: 'en',
    updated: items.length ? new Date(items[0].timestamp) : new Date(),
    generator: 'owockibot-bounty-notifier',
    feedLinks: {
      rss: `${PUBLIC_BASE_URL}/${feedFileName}.xml`,
      json: `${PUBLIC_BASE_URL}/${feedFileName}.json`
    }
  });

  for (const item of filterItems(items, filters)) {
    const label = EVENT_LABELS[item.type] || item.type;
    feed.addItem({
      title: `[${label}] ${item.bounty.title}`,
      id: `${item.bounty.id}-${item.type}-${item.timestamp}`,
      link: item.bounty.url,
      description: `${label} - ${item.bounty.title} (category: ${item.bounty.category}, reward: ${item.bounty.reward}, status: ${item.bounty.status})`,
      date: new Date(item.timestamp),
      category: [{ name: item.bounty.category }]
    });
  }

  return feed;
}

function writeFeedFile(fileNameBase, items, filters) {
  const feed = buildFeed(items, filters, fileNameBase);
  fs.writeFileSync(path.join(DOCS_DIR, `${fileNameBase}.xml`), feed.rss2());
  fs.writeFileSync(path.join(DOCS_DIR, `${fileNameBase}.json`), feed.json1());
}

// Writes the main feed, plus one feed per observed category and per reward tier.
function writeAllFeeds(items) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  writeFeedFile('feed', items, {});

  const categories = [...new Set(items.map((i) => i.bounty.category))].sort();
  for (const category of categories) {
    writeFeedFile(`feed-category-${category}`, items, { category });
  }

  for (const tier of REWARD_TIERS) {
    writeFeedFile(`feed-tier-${tier.id}`, items, { tier: tier.id });
  }

  fs.writeFileSync(
    path.join(DOCS_DIR, 'categories.json'),
    JSON.stringify({ categories, tiers: REWARD_TIERS.map((t) => ({ id: t.id, label: t.label })) }, null, 2) + '\n'
  );
}

module.exports = { writeAllFeeds, filterItems };
