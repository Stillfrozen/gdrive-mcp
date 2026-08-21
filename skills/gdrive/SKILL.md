---
name: gdrive
description: >-
  Work with Google Drive, Docs and Sheets via gdrive-mcp. Search and read files,
  create and edit Docs/Sheets. Use when the user mentions Google Doc, Spreadsheet,
  Drive file, таблица на Диске, or pastes a docs.google.com / drive.google.com URL.
---

# Google Drive / Docs / Sheets (Cursor MCP)

## When to use

- User asks to **find**, **read**, or **edit** a Google Doc, Sheet, or Drive file.
- User pastes `docs.google.com`, `sheets.google.com`, or `drive.google.com` URL.

Prefer **MCP tools** when the `gdrive` server is connected.

This skill is generic. Do not hardcode a team's file ids here.

---

## Auth

OAuth JSON and the refresh token live on disk, never in git.

Default layout after `./scripts/install.sh`:

```
gdrive-mcp/credentials/gcp-oauth.keys.json
gdrive-mcp/credentials/.gdrive-server-credentials.json
```

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": ["/absolute/path/to/gdrive-mcp/dist/index.js"],
      "env": {
        "GDRIVE_OAUTH_PATH": "/absolute/path/to/gdrive-mcp/credentials/gcp-oauth.keys.json",
        "GDRIVE_CREDENTIALS_PATH": "/absolute/path/to/gdrive-mcp/credentials/.gdrive-server-credentials.json"
      }
    }
  }
}
```

Setup: `docs/INSTALL.ru.md`. After `git pull`: `./scripts/upgrade.sh`, then Reload MCP.

External OAuth client in Testing: refresh token dies after **7 days** → `invalid_grant` → `npm run auth`.

---

## Tools (short)

**Read:** `gdrive_search`, `gdrive_get_file`, `gdrive_read_file` (Docs → Markdown, Sheets → CSV of first tab, Slides → text), `gdrive_list_files`, `gdrive_get_spreadsheet_info`, `gdrive_get_document_info`.

**Sheets write:** create / update / append / clear / format / tabs / insert or delete rows and columns.

**Docs write:** create / insert / replace / delete text / styles / headings / lists / rename / duplicate.

Full table: repo `README.md`.

---

## Agent workflow

1. Extract file id from the URL (`/d/FILE_ID/` or `/spreadsheets/d/FILE_ID/`).
2. **Read before write.** The server rejects writes if this session has not opened the file. Use `gdrive_read_file` or `gdrive_get_document_info` / `gdrive_get_spreadsheet_info`.
3. Sheets: first tab only via `gdrive_read_file`. Other tabs → `gdrive_get_spreadsheet_info` then a range tool.
4. Docs: Markdown from `gdrive_read_file` is enough to summarize. For anchors, headings, lists → `gdrive_get_document_info` with `include_content=true`.
5. Destructive tools (replace, delete tab, delete rows): state file id and the diff in one line, then call.
6. Never delete a Drive file through MCP — the server cannot. Ask the user to use the Drive UI.

---

## Safety

- Do not echo OAuth JSON or refresh tokens.
- Scope is full `drive`: the agent sees whatever the Google account already can.
- Mask PAN, secrets, personal emails in outgoing summaries.
- `conflict_mode: "strict"` is the default for Docs writes — keep it unless the user asks to merge.

---

## Related

- Setup: `docs/INSTALL.ru.md`
- Tool list and safety model: `README.md`
- MCP entry: `dist/index.js`
