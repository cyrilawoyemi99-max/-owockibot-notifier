// scripts/config.js
// Edit REWARD_TIERS / DEFAULT_CATEGORIES to match owockibot's real data
// once confirmed (see README "Adapting to the real API").

const EVENT_TYPES = [
  { id: 'new_bounty', label: 'New bounty posted' },
  { id: 'claimed', label: 'Bounty claimed' },
  { id: 'submitted', label: 'Submission made' },
  { id: 'completed', label: 'Bounty completed' },
  { id: 'new_submission', label: 'New submission on a bounty' }
];

const DEFAULT_CATEGORIES = ['development', 'content', 'design', 'research', 'community', 'other'];

// First match wins, evaluated in order.
const REWARD_TIERS = [
  { id: 'small', label: 'Small (up to 50)', max: 50 },
  { id: 'medium', label: 'Medium (51-200)', max: 200 },
  { id: 'large', label: 'Large (201-1000)', max: 1000 },
  { id: 'xlarge', label: 'X-Large (1000+)', max: Infinity }
];

function rewardToTier(reward) {
  const amount = Number(reward) || 0;
  const tier = REWARD_TIERS.find((t) => amount <= t.max);
  return tier ? tier.id : REWARD_TIERS[REWARD_TIERS.length - 1].id;
}

module.exports = {
  BOUNTY_BOARD_API_URL: process.env.BOUNTY_BOARD_API_URL || 'https://owockibot.xyz/api/bounties',
  // Set this to your GitHub Pages URL, e.g. https://yourname.github.io/owockibot-notifier
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://example.github.io/owockibot-notifier',
  MAX_FEED_ITEMS: Number(process.env.MAX_FEED_ITEMS || 200),
  WEBHOOK_TIMEOUT_MS: Number(process.env.WEBHOOK_TIMEOUT_MS || 8000),
  WEBHOOK_RETRIES: Number(process.env.WEBHOOK_RETRIES || 2),
  EVENT_TYPES,
  DEFAULT_CATEGORIES,
  REWARD_TIERS,
  rewardToTier
};
