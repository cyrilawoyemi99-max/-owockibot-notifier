// scripts/handle-unsubscribe-issue.js
const fs = require('fs');
const path = require('path');
const store = require('./store');
const { parseSections } = require('./parseIssueForm');

const RESULT_FILE = path.join(__dirname, '..', 'unsubscribe-result.json');

function run() {
  const body = process.env.ISSUE_BODY || '';
  const sections = parseSections(body);

  const id = (sections['Subscription ID'] || '').trim();
  const webhookUrl = (sections['Webhook URL'] || '').trim();

  if (!id && !webhookUrl) {
    fs.writeFileSync(
      RESULT_FILE,
      JSON.stringify(
        { success: false, message: 'Please provide either a Subscription ID or a Webhook URL to unsubscribe.' },
        null,
        2
      )
    );
    return;
  }

  const removedCount = store.removeSubscribersMatching({ id: id || undefined, webhookUrl: webhookUrl || undefined });

  const result = removedCount
    ? { success: true, message: `Removed ${removedCount} subscription(s). This issue will close automatically.` }
    : { success: false, message: 'No matching subscription found for that ID / webhook URL.' };

  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
}

run();
