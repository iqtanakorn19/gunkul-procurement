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

// Header order must match TrackingRow fields in src/TrackingPage.tsx
var HEADERS = [
  "No.", "Company", "Dept", "Project", "Description",
  "PR No.", "Date PR",
  "PA No.", "Date PA Submitted", "Date PA Approved",
  "PO No.", "Date PO Submitted", "Date PO Approved",
  "Vendor", "Vendor ID",
  "Qty", "Unit", "ราคา/หน่วย", "Dis.", "Budget", "รวม Save Cost",
  "Payment", "วันต้องการสินค้า", "ทำรับ",
  "Status", "Urgent",
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
  ScriptApp.newTrigger("fullResync").timeBased().everyMinutes(5).create();
  Logger.log("Triggers installed.");
}

/* Locks every subsheet's header row + sets data validation widths so
   the team can only type into the cells, not change the template. */
function setupProtection() {
  var ss = SpreadsheetApp.getActive();
  ss.getSheets().forEach(function (sheet) {
    if (sheet.getName() === CONFIG_SHEET_NAME) return;
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    var protection = headerRange.protect().setDescription("Locked header — do not edit");
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  });
  Logger.log("Header rows protected.");
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
}

/* ============================================================
   Core: read one sheet row, write it to Firestore. Returns the
   Firestore row doc id (creating + writing back a hidden _RowID
   on the sheet the first time it's touched).
   ============================================================ */
function syncRow(sheet, tabId, rowIndex) {
  var rowIdCol = HEADERS.length + 1;
  var values = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  var isBlank = values.every(function (v) { return v === "" || v === null; });
  var rowId = sheet.getRange(rowIndex, rowIdCol).getValue();

  if (isBlank) {
    if (rowId) deleteFirestoreRow(tabId, rowId);
    if (rowId) sheet.getRange(rowIndex, rowIdCol).setValue("");
    return null;
  }

  if (!rowId) {
    rowId = "row-" + Utilities.getUuid();
    sheet.getRange(rowIndex, rowIdCol).setValue(rowId);
  }

  var data = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var header = HEADERS[i];
    var raw = values[i];
    if (FIELD_MAP[header]) {
      var field = FIELD_MAP[header];
      data[field.key] = coerce(raw, field.type);
    }
  }
  var suppliers = SUPPLIER_COLS.map(function (label) {
    var idx = HEADERS.indexOf(label);
    return idx >= 0 ? values[idx] : "";
  }).filter(function (v) { return v !== "" && v !== null; });
  if (suppliers.length) data.compareSuppliers = suppliers;

  writeFirestoreRow(tabId, rowId, data);
  return rowId;
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
    return s === "true" || s === "yes" || s === "1" || s === "✓";
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
  UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true,
  });
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
  var url = firestoreBaseUrl() + "/trackingTabs/" + tabId + "/rows";
  var resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  var json = JSON.parse(resp.getContentText());
  (json.documents || []).forEach(function (docEntry) {
    var id = docEntry.name.split("/").pop();
    if (!seenRowIds[id]) deleteFirestoreRow(tabId, id);
  });
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
  UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: { name: fsValue(name), order: fsValue(order) } }),
    muteHttpExceptions: true,
  });
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
