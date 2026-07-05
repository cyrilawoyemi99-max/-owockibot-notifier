// scripts/parseIssueForm.js
// GitHub issue forms render the submitted body as markdown with one
// "### <Field label>" heading per field. This pulls those sections out.

function parseSections(body) {
  const sections = {};
  const parts = body.split(/^### /m).slice(1); // drop anything before first heading
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n');
    const label = part.slice(0, newlineIdx).trim();
    const content = part.slice(newlineIdx + 1).trim();
    sections[label] = content;
  }
  return sections;
}

function parseCheckedLabels(sectionContent) {
  if (!sectionContent) return [];
  const lines = sectionContent.split('\n');
  const checked = [];
  for (const line of lines) {
    const match = line.match(/^-\s*\[[xX]\]\s*(.+)$/);
    if (match) checked.push(match[1].trim());
  }
  return checked;
}

// Maps checked human-readable labels back to config ids by exact label match,
// or by the option's id being a case-insensitive prefix of the label.
function labelsToIds(checkedLabels, optionList) {
  const ids = [];
  for (const label of checkedLabels) {
    const opt = optionList.find(
      (o) => o.label.toLowerCase() === label.toLowerCase() || label.toLowerCase().startsWith(o.id.toLowerCase())
    );
    if (opt) ids.push(opt.id);
  }
  return ids;
}

module.exports = { parseSections, parseCheckedLabels, labelsToIds };
