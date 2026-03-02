# Research Database

A Google Apps Script web app that turns a Google Sheet into a searchable, shareable research experiment database. Anyone with the link can browse, search, and submit experiments — no separate login or infrastructure required.

---

## Features

- **Single shareable URL** — deploy once, share a link with your whole team (inside or outside your org)
- **Full-text search** — instantly searches titles, descriptions, tags, researchers, hypotheses, and more
- **Multi-field filters** — filter by category, status, researcher, and date range simultaneously
- **Table & Card views** — toggle between dense table view and visual card layout
- **Paginated results** — handles hundreds of experiments without performance issues
- **Add & Edit experiments** — tabbed form with fields for every stage of an experiment
- **CSV export** — download the current filtered view as a CSV file
- **Auto-initializing sheet** — creates the `Experiments` sheet with correct headers on first use
- **Sortable columns** — click any column header to sort ascending/descending

---

## Sheet Data Model

The app manages an `Experiments` sheet with these columns:

| Column | Field | Description |
|--------|-------|-------------|
| A | ID | Auto-generated (e.g. `EXP-202403-0005`) |
| B | Timestamp | Date/time the record was created |
| C | Title | Short descriptive title (required) |
| D | Researcher | Name of the submitting researcher (required) |
| E | Category | Experiment category (e.g. "Cell Biology") |
| F | Tags | Comma-separated keywords |
| G | Status | `Planning` / `In Progress` / `Completed` / `On Hold` / `Archived` |
| H | Description | Purpose and overview of the experiment (required) |
| I | Hypothesis | Expected outcome and rationale |
| J | Materials | Reagents, equipment, cell lines, etc. |
| K | Methods | Protocol steps or reference to SOP |
| L | Results | Quantitative and qualitative findings |
| M | Observations | Notable observations during the experiment |
| N | Notes | Troubleshooting, follow-ups, general notes |

---

## Setup — Two Paths

### Path A: Container-Bound Script (Easiest)

Best when you already have a Google Sheet and want the script to live inside it.

1. **Open your Google Sheet** in Google Drive
2. Click **Extensions → Apps Script**
3. Delete all existing code in the editor
4. Copy the contents of `src/Code.gs` and paste it into the editor
5. Click **+** next to "Files" and add three HTML files:
   - `Index` — paste from `src/Index.html`
   - `Stylesheet` — paste from `src/Stylesheet.html`
   - `JavaScript` — paste from `src/JavaScript.html`
6. Leave `SPREADSHEET_ID = ''` in `Code.gs` (empty = uses the active spreadsheet automatically)
7. Go to **Deploy → New deployment** and follow the [Deployment steps](#deployment) below

### Path B: Standalone Script + Spreadsheet ID (Recommended for Teams)

Best for keeping the script separate from the sheet and using `clasp` for version control.

1. **Create a Google Sheet** at [sheets.google.com](https://sheets.google.com)
2. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
3. Open `src/Code.gs` and paste your ID:
   ```javascript
   const SPREADSHEET_ID = 'your-spreadsheet-id-here';
   ```
4. **Create a new Apps Script project** at [script.google.com](https://script.google.com) → **New project**
5. Upload your files using [clasp](#deploying-with-clasp) or paste each file manually
6. Go to **Deploy → New deployment** and follow the [Deployment steps](#deployment) below

---

## Deployment

In the Apps Script editor:

1. Click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Configure:
   - **Execute as**: `Me` *(uses your credentials to read/write the sheet)*
   - **Who has access**: `Anyone` *(no Google login required — anyone with the link can use the app)*
4. Click **Deploy** and copy the **Web app URL**

Share that URL with your team. That URL is your app.

> **Access control:** The URL is the access gate. Share it only with intended users.
> To require Google login, change "Who has access" to `Anyone with Google Account`.

### Redeploying after edits

Go to **Deploy → Manage deployments**, click the pencil icon, set version to **"New version"**, click **Deploy**.

---

## Deploying with clasp (Version Control)

[clasp](https://developers.google.com/apps-script/guides/clasp) lets you push from this repo directly to Apps Script.

```bash
# Install clasp
npm install -g @google/clasp

# Authenticate
clasp login

# Set up your config
cp .clasp.json.example .clasp.json
# Edit .clasp.json — set "scriptId" to your Apps Script project ID
# (found in the script editor URL: script.google.com/d/SCRIPT_ID/edit)

# Push to Apps Script
clasp push

# Open in browser to deploy
clasp open
```

After `clasp push`, deploy via **Deploy → New deployment** in the browser.

---

## Access Modes

| Setting | Behavior |
|---------|----------|
| `Anyone` (anonymous) | No login needed — anyone with the link can use the app |
| `Anyone with Google Account` | Must be signed into any Google account |
| `Anyone in your organization` | Must be signed into your Google Workspace org |
| `Only myself` | Private to you |

The script always **runs as you** (the deployer), so it uses your permissions to access the spreadsheet. Viewers do not need direct sheet access.

---

## Project Structure

```
research_querying_app_butterscotch/
├── src/
│   ├── appsscript.json     # Apps Script manifest (permissions, runtime, deploy config)
│   ├── Code.gs             # Server-side: CRUD operations, doGet(), filtering, sorting
│   ├── Index.html          # HTML template (includes CSS/JS via the include() helper)
│   ├── Stylesheet.html     # All CSS (Bootstrap 5 + custom styles)
│   └── JavaScript.html     # All client-side JS (search, filter, render, submit)
├── .clasp.json.example     # Copy to .clasp.json and fill in your scriptId
├── .claspignore            # Files excluded from clasp push
├── .gitignore
└── README.md
```

---

## Customization

### Adding new fields

1. Add the field name to `HEADERS` in `Code.gs`
2. Add the corresponding form input to `Index.html`
3. Add it to the `data` object in `submitExperiment()` in `JavaScript.html`
4. Add it to `showDetail()` rendering in `JavaScript.html`

### Changing the sheet name

Edit `const SHEET_NAME = 'Experiments';` in `Code.gs`.

### Restricting who can submit

Add a domain or email allowlist inside `addExperiment()` in `Code.gs`:

```javascript
// Inside addExperiment(), before appending the row:
const user = Session.getActiveUser().getEmail();
const allowedDomains = ['yourlab.org'];
if (!allowedDomains.some(d => user.endsWith('@' + d))) {
  return { success: false, error: 'Submissions are restricted to authorized researchers.' };
}
```

> `Session.getActiveUser()` only returns the correct email when the script is set to
> "Execute as: User accessing the web app". With "Execute as: Me" it always returns your email.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Configuration Required" on load | Set `SPREADSHEET_ID` in `Code.gs` and redeploy |
| Old version showing after edits | Redeploy with "New version" in Manage deployments |
| Permission error on save | Ensure the deploying account has editor access to the sheet |
| Dropdowns empty | Add at least one experiment — categories/researchers populate from existing data |
| `clasp push` fails | Run `clasp login` again and verify `.clasp.json` has the correct `scriptId` |
