#!/usr/bin/env node
/**
 * Dump Google Sheets tabs as JSON (tasks-on-me skill helper).
 *
 * Usage:
 *   cd tools/gdrive-mcp && \
 *   GDRIVE_OAUTH_PATH=credentials/gcp-oauth.keys.json \
 *   GDRIVE_CREDENTIALS_PATH=credentials/.gdrive-server-credentials.json \
 *   node scripts/dump-sheets-tabs.mjs <spreadsheetId> [tab ...]
 */
import { loadCredentials } from "../dist/auth.js";
import { google } from "googleapis";

const spreadsheetId = process.argv[2];
const tabFilter = process.argv.slice(3);

if (!spreadsheetId) {
  console.error(
    "Usage: node scripts/dump-sheets-tabs.mjs <spreadsheetId> [tab ...]",
  );
  process.exit(1);
}

const auth = await loadCredentials();
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const allTabs = meta.data.sheets.map((s) => s.properties.title);
const tabs = tabFilter.length ? tabFilter : allTabs;

const out = { spreadsheetId, tabs: {} };

for (const tab of tabs) {
  const range = `'${tab.replace(/'/g, "''")}'`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  out.tabs[tab] = res.data.values ?? [];
}

console.log(JSON.stringify(out, null, 2));
