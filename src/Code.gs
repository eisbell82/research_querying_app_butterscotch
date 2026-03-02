// ============================================================
// Research Database - Google Apps Script Backend
// ============================================================
//
// SETUP: Set SPREADSHEET_ID to your Google Sheet's ID.
// Find it in the Sheet URL:
//   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
//
// For container-bound scripts (script created inside the Sheet
// via Extensions > Apps Script), leave SPREADSHEET_ID empty.
// ============================================================

const SPREADSHEET_ID = '10Gd3iQ59BycCell1Bs6kpLO5EXlR2VpR3VYcFgAX3IE'; // ← Paste your Spreadsheet ID here (or leave empty for container-bound)
const SHEET_NAME = 'Experiments';

const HEADERS = [
  'ID', 'Timestamp', 'Title', 'Researcher', 'Category', 'Tags',
  'Status', 'Description', 'Hypothesis', 'Materials', 'Methods',
  'Results', 'Observations', 'Notes', 'Created By', 'Last Edited By'
];

// 0-based column index lookup
const COL = {};
HEADERS.forEach((h, i) => { COL[h] = i; });

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Completed', 'On Hold', 'Archived'];

// ---- ENTRY POINT ------------------------------------------------

/**
 * Serves the web app. Called automatically by Google when a user
 * visits the deployment URL.
 */
function doGet(e) {
  try {
    // Verify spreadsheet is accessible before serving the app
    getSheet();
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{font-family:sans-serif;display:flex;align-items:center;' +
      'justify-content:center;height:100vh;margin:0;background:#f0f4f8}' +
      '.card{background:#fff;border-radius:12px;padding:2.5rem;text-align:center;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:440px}' +
      'h2{color:#dc2626;margin-bottom:.5rem}p{color:#6b7280;line-height:1.6}' +
      '</style></head><body><div class="card">' +
      '<h2>&#9888; Configuration Required</h2>' +
      '<p>The Research Database has not been configured yet.<br>' +
      'Please set <code>SPREADSHEET_ID</code> in <strong>Code.gs</strong> and redeploy.</p>' +
      '<p style="font-size:.85rem;color:#9ca3af">Error: ' + err.message + '</p>' +
      '</div></body></html>'
    );
  }

  const template = HtmlService.createTemplateFromFile('Index');
  return template
    .evaluate()
    .setTitle('Research Database')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Includes an HTML file's content into a template (for CSS/JS).
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---- SHEET ACCESS -----------------------------------------------

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  // Container-bound: script lives inside the spreadsheet
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = initializeSheet_(ss);
  }
  return sheet;
}

function initializeSheet_(ss) {
  const sheet = ss.insertSheet(SHEET_NAME);

  // Write and style the header row
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  headerRange.setBackground('#1e3a5f');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);

  // Column widths (pixels)
  const widths = [130, 160, 280, 180, 160, 220, 120, 400, 300, 280, 380, 380, 280, 260, 220, 220];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // Wrap text for content-heavy columns
  sheet.getRange('H1:P1000').setWrap(true);

  return sheet;
}

// ---- ID GENERATION ----------------------------------------------

function generateId_() {
  const sheet = getSheet();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(lastRow).padStart(4, '0');
  return 'EXP-' + year + month + '-' + seq;
}

// ---- CRUD OPERATIONS --------------------------------------------

/**
 * Returns all experiments matching the given filter params.
 *
 * @param {Object} params
 *   {string}  params.search      - Full-text search across key fields
 *   {string}  params.category    - Filter by exact category
 *   {string}  params.status      - Filter by exact status
 *   {string}  params.researcher  - Filter by exact researcher name
 *   {string}  params.dateFrom    - ISO date string lower bound (inclusive)
 *   {string}  params.dateTo      - ISO date string upper bound (inclusive)
 *   {string}  params.sortCol     - Column name to sort by (default: Timestamp)
 *   {string}  params.sortDir     - 'asc' or 'desc' (default: desc)
 * @returns {Object[]} Array of experiment objects
 */
function getExperiments(params) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const tz = Session.getScriptTimeZone();
  const raw = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  let experiments = raw
    .filter(row => row[COL['ID']] !== '')
    .map(row => {
      const exp = {};
      HEADERS.forEach((h, i) => {
        exp[h] = (row[i] instanceof Date)
          ? Utilities.formatDate(row[i], tz, 'yyyy-MM-dd HH:mm')
          : String(row[i] === null || row[i] === undefined ? '' : row[i]);
      });
      return exp;
    });

  if (!params) return experiments;

  const { search, category, status, researcher, dateFrom, dateTo } = params;

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    const searchFields = ['Title', 'Description', 'Researcher', 'Category', 'Tags',
                          'Hypothesis', 'Methods', 'Results', 'Observations', 'ID'];
    experiments = experiments.filter(exp =>
      searchFields.some(f => exp[f].toLowerCase().includes(term))
    );
  }

  if (category) {
    experiments = experiments.filter(exp => exp['Category'] === category);
  }
  if (status) {
    experiments = experiments.filter(exp => exp['Status'] === status);
  }
  if (researcher) {
    experiments = experiments.filter(exp => exp['Researcher'] === researcher);
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    experiments = experiments.filter(exp => new Date(exp['Timestamp']) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    experiments = experiments.filter(exp => new Date(exp['Timestamp']) <= to);
  }

  // Sort
  const sortCol = (params.sortCol && HEADERS.includes(params.sortCol)) ? params.sortCol : 'Timestamp';
  const sortDir = params.sortDir === 'asc' ? 1 : -1;
  experiments.sort((a, b) => {
    let va = a[sortCol] || '';
    let vb = b[sortCol] || '';
    if (sortCol === 'Timestamp') {
      va = new Date(va).getTime() || 0;
      vb = new Date(vb).getTime() || 0;
    } else {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
    }
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });

  return experiments;
}

/**
 * Appends a new experiment row to the sheet.
 *
 * @param {Object} data  Experiment fields (Title, Researcher, etc.)
 * @returns {{ success: boolean, id?: string, error?: string }}
 */
function addExperiment(data) {
  try {
    const sheet = getSheet();
    const id = generateId_();
    const timestamp = new Date();

    const userEmail = getCurrentUserEmail_();
    const row = [
      id,
      timestamp,
      sanitize_(data.Title),
      sanitize_(data.Researcher),
      sanitize_(data.Category),
      sanitize_(data.Tags),
      sanitize_(data.Status) || 'Planning',
      sanitize_(data.Description),
      sanitize_(data.Hypothesis),
      sanitize_(data.Materials),
      sanitize_(data.Methods),
      sanitize_(data.Results),
      sanitize_(data.Observations),
      sanitize_(data.Notes),
      userEmail,
      userEmail
    ];

    sheet.appendRow(row);

    // Alternate row shading for readability
    const newRow = sheet.getLastRow();
    if (newRow % 2 === 0) {
      sheet.getRange(newRow, 1, 1, HEADERS.length).setBackground('#f0f4f8');
    }

    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Updates specific fields of an existing experiment.
 *
 * @param {string} id    Experiment ID (e.g. "EXP-202403-0005")
 * @param {Object} data  Fields to update (only provided keys are changed)
 * @returns {{ success: boolean, error?: string }}
 */
function updateExperiment(id, data) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, error: 'No experiments found' };

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const rowIndex = ids.indexOf(id);
    if (rowIndex === -1) return { success: false, error: 'Experiment ' + id + ' not found' };

    const sheetRow = rowIndex + 2; // 1-indexed + header offset
    const updatable = ['Title', 'Researcher', 'Category', 'Tags', 'Status',
                       'Description', 'Hypothesis', 'Materials', 'Methods',
                       'Results', 'Observations', 'Notes'];

    updatable.forEach(field => {
      if (data[field] !== undefined) {
        sheet.getRange(sheetRow, COL[field] + 1).setValue(sanitize_(data[field]));
      }
    });

    // Always record who last edited this experiment
    sheet.getRange(sheetRow, COL['Last Edited By'] + 1).setValue(getCurrentUserEmail_());

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Returns sorted unique category values from the sheet.
 * @returns {string[]}
 */
function getCategories() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    const vals = sheet.getRange(2, COL['Category'] + 1, lastRow - 1, 1).getValues().flat();
    return [...new Set(vals.filter(v => v && v !== ''))].sort();
  } catch (e) {
    return [];
  }
}

/**
 * Returns sorted unique researcher names from the sheet.
 * @returns {string[]}
 */
function getResearchers() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    const vals = sheet.getRange(2, COL['Researcher'] + 1, lastRow - 1, 1).getValues().flat();
    return [...new Set(vals.filter(v => v && v !== ''))].sort();
  } catch (e) {
    return [];
  }
}

/**
 * Returns app metadata needed on page load.
 * @returns {{ statuses: string[], categories: string[], researchers: string[] }}
 */
function getAppMeta() {
  return {
    statuses: STATUS_OPTIONS,
    categories: getCategories(),
    researchers: getResearchers()
  };
}

// ---- HELPERS ----------------------------------------------------

function sanitize_(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function getCurrentUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch(e) {
    return '';
  }
}

// ---- ATTACHMENTS ------------------------------------------------

const ATTACHMENTS_SHEET       = "Attachments";
const ATTACHMENTS_FOLDER_NAME = "Experiment Attachments";
const ATT_HEADERS = [
  "AttachmentID", "ExperimentID", "FileName",
  "MimeType", "DriveFileID", "ViewLink", "UploadedDate", "Type"
];

function getOrCreateAttachmentsSheet_() {
  const ss = getSpreadsheet_();
  let s = ss.getSheetByName(ATTACHMENTS_SHEET);
  if (!s) {
    s = ss.insertSheet(ATTACHMENTS_SHEET);
    s.appendRow(ATT_HEADERS);
    const h = s.getRange(1, 1, 1, ATT_HEADERS.length);
    h.setBackground("#1e3a5f"); h.setFontColor("#fff");
    h.setFontWeight("bold"); h.setFontSize(11);
    s.setFrozenRows(1);
    s.setColumnWidth(1, 160); s.setColumnWidth(2, 160);
    s.setColumnWidth(3, 240); s.setColumnWidth(4, 200);
    s.setColumnWidth(5, 180); s.setColumnWidth(6, 300);
    s.setColumnWidth(7, 180); s.setColumnWidth(8, 80);
  }
  return s;
}

function getOrCreateAttachmentsBaseFolder_() {
  const ss = getSpreadsheet_();
  const ssFile = DriveApp.getFileById(ss.getId());
  const parents = ssFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const found = parent.getFoldersByName(ATTACHMENTS_FOLDER_NAME);
  return found.hasNext() ? found.next() : parent.createFolder(ATTACHMENTS_FOLDER_NAME);
}

function getOrCreateExperimentSubfolder_(experimentId) {
  const base = getOrCreateAttachmentsBaseFolder_();
  const found = base.getFoldersByName(experimentId);
  return found.hasNext() ? found.next() : base.createFolder(experimentId);
}

/**
 * Uploads a file (CSV or Excel) to Drive and records it in the Attachments sheet.
 * @param {string} experimentId
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} base64data  - Base64-encoded file contents
 * @returns {{ success: boolean, attachmentId?: string, error?: string }}
 */
function uploadAttachment(experimentId, filename, mimeType, base64data) {
  try {
    const bytes  = Utilities.base64Decode(base64data);
    const blob   = Utilities.newBlob(bytes, mimeType, filename);
    const folder = getOrCreateExperimentSubfolder_(experimentId);
    const file   = folder.createFile(blob);

    const attId = "ATT-" + Date.now();
    const s = getOrCreateAttachmentsSheet_();
    s.appendRow([
      attId, experimentId, filename, mimeType,
      file.getId(), file.getUrl(), new Date().toISOString(), "upload"
    ]);
    return { success: true, attachmentId: attId };
  } catch(e) { return { error: e.message }; }
}

/**
 * Returns all attachment records for the given experiment.
 * @param {string} experimentId
 * @returns {Object[]}
 */
function getAttachments(experimentId) {
  try {
    const s = getOrCreateAttachmentsSheet_();
    const data = s.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0];
    return data.slice(1)
      .filter(r => r[0] && String(r[1]) === String(experimentId))
      .map(r => {
        const o = {};
        headers.forEach((h, i) => { o[h] = String(r[i] || ""); });
        return o;
      });
  } catch(e) { return { error: e.message }; }
}

/**
 * Moves the Drive file to trash and removes the record from the Attachments sheet.
 * @param {string} attachmentId
 */
function deleteAttachment(attachmentId) {
  try {
    const s = getOrCreateAttachmentsSheet_();
    const data = s.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(attachmentId)) {
        const fileId = String(data[i][4]);
        if (fileId) {
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}
        }
        s.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { error: "Attachment not found." };
  } catch(e) { return { error: e.message }; }
}

/**
 * Stores a link to an existing Google Sheet as an attachment record (no file upload).
 * @param {string} experimentId
 * @param {string} url   - Full Google Sheets URL
 * @param {string} name  - Display label (optional)
 */
function linkGoogleSheet(experimentId, url, name) {
  try {
    if (!url || !url.includes("docs.google.com/spreadsheets")) {
      return { error: "Please provide a valid Google Sheets URL." };
    }
    const attId = "ATT-" + Date.now();
    const s = getOrCreateAttachmentsSheet_();
    s.appendRow([
      attId, experimentId, name || "Linked Google Sheet",
      "application/vnd.google-apps.spreadsheet",
      "", url, new Date().toISOString(), "link"
    ]);
    return { success: true, attachmentId: attId };
  } catch(e) { return { error: e.message }; }
}
