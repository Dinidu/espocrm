import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

/**
 * Usage:
 *   node scripts/import-reports.js dev
 *   node scripts/import-reports.js prod
 */

const target = process.argv[2]; // dev | prod
const REPORTS_DIR = process.env.REPORTS_DIR || "data/reports";

function getEnv() {
  if (target === "prod") {
    return {
      URL: process.env.ESPO_PROD_URL,
      KEY: process.env.ESPO_PROD_API_KEY
    };
  }
  if (target === "dev") {
    return {
      URL: process.env.ESPO_DEV_URL,
      KEY: process.env.ESPO_DEV_API_KEY
    };
  }
  throw new Error("Usage: node scripts/import-reports.js dev|prod");
}

const { URL: BASE_URL, KEY: API_KEY } = getEnv();

if (!BASE_URL || !API_KEY) {
  console.error("❌ Missing ESPO URL or API KEY for", target);
  process.exit(1);
}

/* -------------------------------------------------- */

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}\n${await res.text()}`
    );
  }
  return res.json();
}

/* -------------------------------------------------- */
/* Espo-safe helpers                                  */
/* -------------------------------------------------- */

async function findByName(name) {
  const res = await api(
    "GET",
    `/api/v1/Report?maxSize=1&filters[name]=${encodeURIComponent(name)}`
  );
  return res?.list?.[0] || null;
}

function sanitizeForImport(report) {
  const r = structuredClone(report);

  // system / env specific
  delete r.id;
  delete r.createdAt;
  delete r.modifiedAt;
  delete r.createdById;
  delete r.modifiedById;

  // Espo silently ignores updates if these are present
  delete r.entityId;
  delete r.entityType;
  delete r.isInternal;

  return r;
}

/* -------------------------------------------------- */
/* UPSERT                                             */
/* -------------------------------------------------- */

async function upsert(report) {
  if (!report?.name) {
    throw new Error("Report JSON missing required field: name");
  }

  const payload = sanitizeForImport(report);
  const existing = await findByName(payload.name);

  if (existing?.id) {
    await api("PATCH", `/api/v1/Report/${existing.id}`, payload);
    console.log(`🔁 Updated: ${payload.name}`);
  } else {
    await api("POST", "/api/v1/Report", payload);
    console.log(`✨ Created: ${payload.name}`);
  }
}

/* -------------------------------------------------- */

async function main() {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith(".json"));

  console.log(
    `🚀 Importing ${files.length} reports into ${target.toUpperCase()}`
  );

  for (const file of files) {
    const report = JSON.parse(
      fs.readFileSync(path.join(REPORTS_DIR, file), "utf8")
    );
    await upsert(report);
  }

  console.log("✅ Report import completed");
}

main().catch(err => {
  console.error("❌ Import failed");
  console.error(err);
  process.exit(1);
});
