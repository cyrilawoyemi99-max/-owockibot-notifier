// scripts/handle-subscribe-issue.js
// Invoked by .github/workflows/subscribe.yml with the issue body in
// process.env.ISSUE_BODY. Writes ./subscribe-result.json for the workflow
// to use when commenting on / closing the issue.

const fs = require('fs');
const path = require('path');
const store = require('./store');
const { EVENT_TYPES, REWARD_TIERS, DEFAULT_CATEGORIES } = require('./config');
const { parseSections, parseCheckedLabels, labelsToIds } = require('./parseIssueForm');

const RESULT_FILE = path.join(__dirname, '..', 'subscribe-result.json');

function run() {
  const body = process.env.ISSUE_BODY || '';
  const sections = parseSections(body);

  const webhookUrl = (sections['Webhook URL'] || '').trim();
  const categoryOptions = DEFAULT_CATEGORIES.map((c) => ({ id: c, label: c }));
  const categories = labelsToIds(parseCheckedLabels(sections['Categories']), categoryOptions);
  const rewardTiers = labelsToIds(parseCheckedLabels(sections['Reward Tiers']), REWARD_TIERS);
  const events = labelsToIds(parseCheckedLabels(sections['Event Types']), EVENT_TYPES);

  let result;

  try {
    const url = new URL(webhookUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
  } catch {
    result = {
      success: false,
      message: `Could not subscribe: "${webhookUrl}" doesn't look like a valid http(s) webhook URL. Please open a new issue with a valid URL.`
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
    return;
  }

  const sub = store.addSubscriber({ webhookUrl, categories, rewardTiers, events });

  result = {
    success: true,
    message:
      `Subscribed! Your subscription ID is \`${sub.id}\` - save this if you want to unsubscribe later.\n\n` +
      `- Webhook: ${sub.webhookUrl}\n` +
      `- Categories: ${sub.categories.join(', ')}\n` +
      `- Reward tiers: ${sub.rewardTiers.join(', ')}\n` +
      `- Events: ${sub.events.join(', ')}\n\n` +
      `This issue will close automatically.`
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
}

run();
