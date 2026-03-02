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

## Setup

### Step 1 — Create or open your Google Sheet

Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet, or open an existing one. The app will create the `Experiments` tab inside it automatically on first use.

---

### Step 2 — Open the Apps Script editor

Inside your Google Sheet, click **Extensions → Apps Script** in the top menu. This opens the script editor in a new browser tab.

---

### Step 3 — Add the script files

You'll add five files total. The editor starts with one file called `Code.gs` — use that for the first file, then create the rest.

**File 1 — `Code.gs`** (already exists in the editor)

1. Open [`src/Code.gs`](src/Code.gs) in this repo
2. Select all the text and copy it
3. In the Apps Script editor, select all existing code and replace it with what you copied
4. At the top of the file, find this line and paste in your Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = ''; // ← paste your ID here
   ```
   Your Spreadsheet ID is the long string in your sheet's URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_PART_HERE/edit
   ```
   Leave it empty (`''`) if you opened the script from inside the sheet — it will connect automatically.

**Files 2–5 — HTML files**

For each of the following, click the **+** button next to "Files" in the left sidebar, choose **HTML**, name it exactly as shown, then paste in the contents from this repo:

| File name to create | Copy contents from |
|---------------------|--------------------|
| `Index`             | [`src/Index.html`](src/Index.html) |
| `Stylesheet`        | [`src/Stylesheet.html`](src/Stylesheet.html) |
| `JavaScript`        | [`src/JavaScript.html`](src/JavaScript.html) |

> The file names must match exactly — the code references them by name.

---

### Step 4 — Save everything

Click the floppy disk icon (or press `Ctrl+S` / `Cmd+S`) to save. Do this for each file.

---

### Step 5 — Deploy as a web app

1. Click **Deploy → New deployment** in the top right
2. Click the gear icon next to "Select type" → choose **Web app**
3. Configure:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. Google may ask you to authorize the app — click through the prompts and approve
6. Copy the **Web app URL** at the end — this is your shareable link

Share that URL with your team. Anyone with the link can use the app immediately.

> **Access control:** The URL is the access gate — only share it with people who should have access. To require a Google login instead, change "Who has access" to `Anyone with Google Account`.

---

### Updating the app after changes

If the code in this repo is updated and you want to apply the changes:

1. Copy the updated file contents from this repo into the Apps Script editor (same as setup)
2. Save
3. Click **Deploy → Manage deployments**
4. Click the pencil icon on your existing deployment
5. Set version to **"New version"** and click **Deploy**

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
| Authorization error on deploy | Re-run authorization: Deploy → Manage deployments → authorize again |
