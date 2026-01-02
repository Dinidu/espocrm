import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

const DEV_URL = process.env.ESPO_DEV_URL;
const DEV_KEY = process.env.ESPO_DEV_API_KEY;
const REPORTS_DIR = process.env.REPORTS_DIR || "data/reports";
const REPORT_NAMES = (process.env.REPORT_NAMES || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

if (!DEV_URL || !DEV_KEY) {
  console.error("Missing ESPO_DEV_URL or ESPO_DEV_API_KEY");
  process.exit(1);
}

async function api(method, urlPath) {
  const res = await fetch(`${DEV_URL}${urlPath}`, {
    method,
    headers: { "X-Api-Key": DEV_KEY }
  });
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function sanitize(report) {
  // Remove env-specific fields that cause noisy diffs / broken portability
  const r = structuredClone(report);
  delete r.id;
  delete r.createdAt;
  delete r.modifiedAt;
  delete r.createdById;
  delete r.modifiedById;

  // If you find these are env-specific in your instance, consider removing:
  // delete r.assignedUserId;
  // delete r.teamsIds;

  return r;
}

function fileNameFor(report) {
  // Use name as file name (safe-ish) so it’s stable and readable
  return report.name
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const list = await api("GET", `/api/v1/Report?maxSize=200`);
  const reports = list.list || [];

  const filtered = REPORT_NAMES.length
    ? reports.filter(r => REPORT_NAMES.includes(r.name))
    : reports;

  console.log(`Found ${reports.length} reports, exporting ${filtered.length}...`);

  for (const r of filtered) {
    const full = await api("GET", `/api/v1/Report/${r.id}`);
    const out = sanitize(full);
    const fn = `${fileNameFor(out)}.json`;
    fs.writeFileSync(path.join(REPORTS_DIR, fn), JSON.stringify(out, null, 2));
    console.log(`Exported: ${out.name} -> ${fn}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
