/**
 * Gunkul Procurement — Tracking Sheet sync (Google Sheets -> Firestore)
 *
 * Paste this whole file into Extensions > Apps Script of the master
 * tracking spreadsheet. See ../google-apps-script/SETUP.md for the
 * full step-by-step setup (project ID, triggers, permissions).
 *
 * Every sheet tab EXCEPT "_Config" is treated as one person's tracking
 * subsheet (the Firestore "tabs"). Row 1 of every subsheet must be the
 * locked header row defined in HEADERS below, in this exact order.
 */

var FIREBASE_PROJECT_ID = "gunkul-internship";
var CONFIG_SHEET_NAME = "_Config";
var ROWID_COL_NAME = "_RowID"; // hidden helper column, last column

// HEADERS order MUST match the physical column order (left->right) of every
// subsheet, because rows are read by position. FIELD_MAP (keyed by name) maps
// each header to its Firestore field, so the web/dashboard are unaffected by
// the order — only the sheet column layout has to match this list.
var HEADERS = [
  "No.", "Company", "Dept",
  "Urgent", "Status",
  "PR No.", "Date PR",
  "PA No.", "Date PA Submitted", "Date PA Approved",
  "PO No.", "Date PO Submitted", "Date PO Approved",
  "Project", "Description",
  "Vendor", "Vendor ID",
  "Qty", "Unit", "ราคา/หน่วย", "Dis.", "Budget", "รวม Save Cost",
  "Payment", "วันต้องการสินค้า", "ทำรับ",
  "Supplier 1", "Supplier 2", "Supplier 3",
  "Remark",
];

var FIELD_MAP = {
  "No.": { key: "no", type: "number" },
  "Company": { key: "company", type: "string" },
  "Dept": { key: "dept", type: "string" },
  "Project": { key: "project", type: "string" },
  "Description": { key: "description", type: "string" },
  "PR No.": { key: "prNo", type: "string" },
  "Date PR": { key: "prDate", type: "date" },
  "PA No.": { key: "paNo", type: "string" },
  "Date PA Submitted": { key: "paSubmittedDate", type: "date" },
  "Date PA Approved": { key: "paApprovedDate", type: "date" },
  "PO No.": { key: "poNo", type: "string" },
  "Date PO Submitted": { key: "poSubmittedDate", type: "date" },
  "Date PO Approved": { key: "poApprovedDate", type: "date" },
  "Vendor": { key: "vendor", type: "string" },
  "Vendor ID": { key: "vendorId", type: "string" },
  "Qty": { key: "qty", type: "number" },
  "Unit": { key: "unit", type: "string" },
  "ราคา/หน่วย": { key: "unitPrice", type: "number" },
  "Dis.": { key: "discount", type: "number" },
  "Budget": { key: "budget", type: "number" },
  "รวม Save Cost": { key: "saveCost", type: "number" },
  "Payment": { key: "payment", type: "string" },
  "วันต้องการสินค้า": { key: "neededDate", type: "date" },
  "ทำรับ": { key: "deliveredDate", type: "date" },
  "Status": { key: "status", type: "string" },
  "Urgent": { key: "urgent", type: "boolean" },
  "Remark": { key: "remark", type: "string" },
};
var SUPPLIER_COLS = ["Supplier 1", "Supplier 2", "Supplier 3"];

/* ============================================================
   Triggers — install once via setupTriggers()
   ============================================================ */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  var ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("onEditInstallable").forSpreadsheet(ss).onEdit().create();
  // Safety-net resync runs a few times a day instead of every 5 minutes —
  // real-time edits already sync via onEdit, and syncRow now skips unchanged
  // rows, so a frequent full sweep just burned Firestore quota for nothing.
  ScriptApp.newTrigger("fullResync").timeBased().everyHours(6).create();
  Logger.log("Triggers installed.");
}

/* Guards every subsheet's header row against accidental template edits.
   Uses WARNING-ONLY protection (not hard restriction): a hard lock blocks
   the whole team from using the basic filter/sort on those columns, so
   instead we just show a dismissible warning if someone edits a header
   cell. The template can still be reset any time via setupProtection(). */
function setupProtection() {
  var ss = SpreadsheetApp.getActive();
  ss.getSheets().forEach(function (sheet) {
    if (sheet.getName() === CONFIG_SHEET_NAME) return;
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    // Remove any previous protections on this header range so re-running
    // doesn't stack a hard lock on top of the warning-only one.
    sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
      if (p.getRange() && p.getRange().getRow() === 1) p.remove();
    });
    headerRange.protect()
      .setDescription("Header — please don't edit (warning only)")
      .setWarningOnly(true);
  });
  Logger.log("Header rows protected (warning-only).");
}

/* ============================================================
   onEdit — real-time push of whatever rows were just changed
   ============================================================ */
function onEditInstallable(e) {
  try {
    var sheet = e.range.getSheet();
    var name = sheet.getName();
    if (name === CONFIG_SHEET_NAME) return;
    if (e.range.getRow() === 1) return; // header edits are not data

    var firstRow = Math.max(2, e.range.getRow());
    var lastRow = e.range.getLastRow();
    var tabId = getOrCreateTabId(name);

    for (var r = firstRow; r <= lastRow; r++) {
      syncRow(sheet, tabId, r);
    }
  } catch (err) {
    Logger.log("onEditInstallable error: " + err);
  }
}

/* ============================================================
   Time-based safety net — catches paste/delete operations that
   onEdit might not fully cover, and removes Firestore rows whose
   sheet row was deleted.
   ============================================================ */
function fullResync() {
  var ss = SpreadsheetApp.getActive();
  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName();
    if (name === CONFIG_SHEET_NAME) return;
    var tabId = getOrCreateTabId(name);
    var lastRow = sheet.getLastRow();
    var seenRowIds = {};

    for (var r = 2; r <= lastRow; r++) {
      var rowId = syncRow(sheet, tabId, r);
      if (rowId) seenRowIds[rowId] = true;
    }
    pruneDeletedRows(tabId, seenRowIds);
  });
  pruneDeletedTabs();
}

/* Removes Firestore tab docs (and their rows) for subsheets that were
   deleted or renamed in the Sheet — otherwise the website keeps showing
   stale tabs like an old "Sheet4" or a tab's former name after a rename.
   Driven by the _Config bookkeeping vs the current live sheet tabs. */
function pruneDeletedTabs() {
  var ss = SpreadsheetApp.getActive();
  var current = {};
  ss.getSheets().forEach(function (s) {
    if (s.getName() !== CONFIG_SHEET_NAME) current[s.getName()] = true;
  });
  var configSheet = getConfigSheet();
  var data = configSheet.getDataRange().getValues();
  // Walk bottom-up so deleting _Config rows doesn't shift the indexes above.
  for (var r = data.length - 1; r >= 1; r--) {
    var name = data[r][0];
    var tabId = data[r][1];
    if (name && !current[name]) {
      pruneDeletedRows(tabId, {});   // delete every row under the stale tab
      deleteFirestoreTab(tabId);     // delete the tab doc itself
      configSheet.deleteRow(r + 1);  // remove its _Config bookkeeping row (1-based)
      Logger.log("Pruned stale tab: " + name);
    }
  }
}

function deleteFirestoreTab(tabId) {
  var url = firestoreBaseUrl() + "/trackingTabs/" + tabId;
  UrlFetchApp.fetch(url, {
    method: "delete",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
}

/* ============================================================
   Core: read one sheet row, write it to Firestore. Returns the
   Firestore row doc id (creating + writing back a hidden _RowID
   on the sheet the first time it's touched).
   ============================================================ */
function syncRow(sheet, tabId, rowIndex) {
  var rowIdCol = HEADERS.length + 1;   // hidden _RowID
  var hashCol = HEADERS.length + 2;    // hidden _Hash — lets us skip unchanged rows
  var values = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  var isBlank = values.every(function (v) { return v === "" || v === null; });
  var helpers = sheet.getRange(rowIndex, rowIdCol, 1, 2).getValues()[0];
  var rowId = helpers[0];
  var oldHash = helpers[1];

  if (isBlank) {
    if (rowId) deleteFirestoreRow(tabId, rowId);
    if (rowId) sheet.getRange(rowIndex, rowIdCol, 1, 2).setValues([["", ""]]);
    return null;
  }

  if (!rowId) {
    rowId = "row-" + Utilities.getUuid();
    sheet.getRange(rowIndex, rowIdCol).setValue(rowId);
  }

  // Read by position: each subsheet's column order must match HEADERS exactly.
  var data = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var header = HEADERS[i];
    if (FIELD_MAP[header]) {
      data[FIELD_MAP[header].key] = coerce(values[i], FIELD_MAP[header].type);
    }
  }
  var suppliers = SUPPLIER_COLS.map(function (label) {
    var idx = HEADERS.indexOf(label);
    return idx >= 0 ? values[idx] : "";
  }).filter(function (v) { return v !== "" && v !== null; });
  if (suppliers.length) data.compareSuppliers = suppliers;

  // Only hit Firestore when the row's content actually changed. The hash is a
  // sheet cell (no Firestore cost), so an idle fullResync writes nothing.
  var newHash = rowHash(data);
  if (String(oldHash) === newHash) return rowId;

  writeFirestoreRow(tabId, rowId, data);
  sheet.getRange(rowIndex, hashCol).setValue(newHash);
  return rowId;
}

/** Stable MD5 of the row payload, used to detect "nothing changed". */
function rowHash(data) {
  var s = JSON.stringify(data);
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  return hex;
}

function coerce(raw, type) {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  if (type === "number") {
    var n = Number(raw);
    return isNaN(n) ? undefined : n;
  }
  if (type === "boolean") {
    if (typeof raw === "boolean") return raw;
    var s = String(raw).trim().toLowerCase();
    // Negatives first — "not urgent" contains "urgent", so it must lose.
    if (s.indexOf("not") === 0 || s === "no" || s === "false" || s === "0"
      || s === "ไม่ด่วน" || s === "ไม่เร่งด่วน") return false;
    return s === "true" || s === "yes" || s === "1" || s === "✓"
      || s === "urgent" || s === "ด่วน" || s === "เร่งด่วน" || s === "งานด่วน";
  }
  if (type === "date") {
    if (raw instanceof Date) return Utilities.formatDate(raw, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return String(raw).trim();
  }
  return String(raw).trim();
}

/* ============================================================
   Firestore REST helpers (authenticated as the Apps Script
   owner's Google account, which needs the "Cloud Datastore User"
   IAM role on the Firebase project — see SETUP.md).
   ============================================================ */
function firestoreBaseUrl() {
  return "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents";
}

function fsValue(v) {
  if (v === undefined || v === null) return { nullValue: null };
  if (typeof v === "number") return { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  return { stringValue: String(v) };
}

function writeFirestoreRow(tabId, rowId, data) {
  var fields = {};
  Object.keys(data).forEach(function (k) {
    if (data[k] !== undefined) fields[k] = fsValue(data[k]);
  });
  var mask = Object.keys(fields).map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); }).join("&");
  var url = firestoreBaseUrl() + "/trackingTabs/" + tabId + "/rows/" + rowId + "?" + mask;
  var resp = UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() >= 300) {
    Logger.log("writeFirestoreRow FAILED (" + resp.getResponseCode() + "): " + resp.getContentText());
  }
}

function deleteFirestoreRow(tabId, rowId) {
  var url = firestoreBaseUrl() + "/trackingTabs/" + tabId + "/rows/" + rowId;
  UrlFetchApp.fetch(url, {
    method: "delete",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
}

function pruneDeletedRows(tabId, seenRowIds) {
  // Firestore's documents.list caps each response at pageSize (max 300) and
  // returns a nextPageToken for the rest. We MUST follow every page or stale
  // rows beyond the first page never get deleted (e.g. a tab duplicated from
  // another person that once held 300+ rows would keep showing the leftovers).
  var base = firestoreBaseUrl() + "/trackingTabs/" + tabId + "/rows?pageSize=300";
  var pageToken = "";
  do {
    var url = base + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
    var resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    var json = JSON.parse(resp.getContentText());
    (json.documents || []).forEach(function (docEntry) {
      var id = docEntry.name.split("/").pop();
      if (!seenRowIds[id]) deleteFirestoreRow(tabId, id);
    });
    pageToken = json.nextPageToken || "";
  } while (pageToken);
}

/* ============================================================
   Tab bookkeeping — each subsheet name maps to one trackingTabs
   Firestore doc, created on first sync.
   ============================================================ */
function getOrCreateTabId(sheetName) {
  var configSheet = getConfigSheet();
  var data = configSheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (data[r][0] === sheetName) return data[r][1];
  }
  var tabId = "tab-" + Utilities.getUuid();
  var order = data.length; // 0-based, increases as tabs are added
  configSheet.appendRow([sheetName, tabId, order]);
  createFirestoreTabDoc(tabId, sheetName, order);
  return tabId;
}

function createFirestoreTabDoc(tabId, name, order) {
  var url = firestoreBaseUrl() + "/trackingTabs/" + tabId
    + "?updateMask.fieldPaths=name&updateMask.fieldPaths=order";
  var resp = UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: { name: fsValue(name), order: fsValue(order) } }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() >= 300) {
    Logger.log("createFirestoreTabDoc FAILED (" + resp.getResponseCode() + "): " + resp.getContentText());
  }
}

function getConfigSheet() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    sheet.appendRow(["SheetName", "TabId", "Order"]);
    sheet.hideSheet();
  }
  return sheet;
}
