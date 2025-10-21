/*******************************************************
 * ARS Inventory Management System v2.0
 * Google Apps Script Backend
 *
 * Features:
 * - Robust GET/POST request handling
 * - Real-time presence tracking & item locking
 * - Inventory data management with flexible headers
 * - Sales calculation from inventory
 * - Cash reconciliation with discounts
 * - Automatic backup and data validation
 *
 * Spreadsheet ID: 1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0
 *******************************************************/

const SPREADSHEET_ID = '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0';
const ACTIVE_USERS_TIMEOUT = 30000; // 30 seconds

const ROUTES = ['Al-Hasa 1', 'Al-Hasa 2', 'Al-Hasa 3', 'Al-Hasa 4', 'Al-Hasa Wholesale'];

const SHEET_NAMES = {
  ACTIVE_USERS: 'ACTIVE_USERS',
  ITEM_LOCKS: 'ITEM_LOCKS',
  METADATA: 'METADATA',
  INVENTORY_SNAPSHOT: 'INVENTORY_SNAPSHOT',
  CASH_RECONCILIATION: 'CASH_RECONCILIATION',
  CASH_DENOMINATIONS: 'CASH_DENOMINATIONS',
  SALES_ITEMS: 'SALES_ITEMS'
};

/* ===========================
   HTTP ENTRYPOINTS
=========================== */

function doGet(e) {
  const response = handleRequest(e);
  const callback = e && e.parameter && e.parameter.callback;

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + response.getContent() + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return response;
}

function doPost(e) {
  return handleRequest(e);
}

/* ===========================
   REQUEST PARSING
=========================== */

function handleRequest(e) {
  try {
    var data = {};

    // Parse URL parameters
    if (e && e.parameter) {
      if (e.parameter.action) data.action = e.parameter.action;
      if (e.parameter.payload) {
        var payload = safeJSON(e.parameter.payload);
        if (payload) {
          for (var key in payload) data[key] = payload[key];
        }
      }
    }

    // Parse POST body
    if (e && e.postData && typeof e.postData.contents === 'string' && e.postData.contents.length) {
      var raw = e.postData.contents;
      var contentType = String(e.postData.type || '').toLowerCase();

      if (contentType.indexOf('application/json') > -1) {
        var body = safeJSON(raw);
        if (body) {
          for (var k in body) data[k] = body[k];
        }
      } else if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        var form = parseFormBody(raw);
        if (form.action && !data.action) data.action = form.action;
        if (form.payload) {
          var inner = safeJSON(form.payload);
          if (inner) {
            for (var k2 in inner) data[k2] = inner[k2];
          }
        }
        for (var fk in form) {
          if (fk !== 'action' && fk !== 'payload') data[fk] = form[fk];
        }
      } else {
        var asJson = safeJSON(raw);
        if (asJson) {
          for (var k3 in asJson) data[k3] = asJson[k3];
        } else {
          var form2 = parseFormBody(raw);
          if (form2.action && !data.action) data.action = form2.action;
          if (form2.payload) {
            var inner2 = safeJSON(form2.payload);
            if (inner2) {
              for (var k4 in inner2) data[k4] = inner2[k4];
            }
          }
          for (var fk2 in form2) {
            if (fk2 !== 'action' && fk2 !== 'payload') data[fk2] = form2[fk2];
          }
        }
      }
    }

    if (!data.action) {
      return createResponse('error', 'No action specified');
    }

    return handleAction(data);
  } catch (err) {
    logError('handleRequest', err);
    return createResponse('error', String(err));
  }
}

function createResponse(status, data) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    success: status === 'success',
    data: data,
    timestamp: Date.now()
  })).setMimeType(ContentService.MimeType.JSON);
}

/* ===========================
   HELPER FUNCTIONS
=========================== */

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function safeJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function parseFormBody(raw) {
  var out = {};
  String(raw).split('&').forEach(function(pair) {
    if (!pair) return;
    var idx = pair.indexOf('=');
    var key = idx >= 0 ? pair.slice(0, idx) : pair;
    var val = idx >= 0 ? pair.slice(idx + 1) : '';
    var decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
    var decodedVal = decodeURIComponent(val.replace(/\+/g, ' '));
    out[decodedKey] = decodedVal;
  });
  return out;
}

const TZ = Session.getScriptTimeZone();

function formatTimeHMS(date) {
  return Utilities.formatDate(date, TZ, 'HH:mm:ss');
}

function todayYMD() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
  }

  var str = String(value || '').trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  var cleaned = str.replace(/[\.\/]/g, '-');
  var date = new Date(cleaned);
  if (!isNaN(date)) {
    return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
  }

  var match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    date = new Date(+match[3], +match[2] - 1, +match[1]);
    if (!isNaN(date)) {
      return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
    }
  }

  return str;
}

function logError(context, error) {
  Logger.log('ERROR in ' + context + ': ' + error);
  Logger.log('Stack: ' + error.stack);
}

/* ===========================
   HEADER MAPPING WITH SYNONYMS
=========================== */

function getHeaderIndex(headerRow) {
  var normalize = function(str) {
    return String(str || '').toLowerCase().replace(/[\.\s_]+/g, ' ').trim();
  };

  var positions = {};
  headerRow.forEach(function(header, index) {
    positions[normalize(header)] = index;
  });

  var find = function() {
    for (var i = 0; i < arguments.length; i++) {
      var idx = positions[normalize(arguments[i])];
      if (idx != null) return idx;
    }
    return -1;
  };

  return {
    Date: find('date'),
    Time: find('time', 'timestamp'),
    Category: find('category'),
    Code: find('code', 'item code', 'sku'),
    ItemName: find('item name', 'item', 'name'),
    Physical: find('physical', 'physical stock', 'physical qty', 'physical quantity'),
    PUnit: find('p.unit', 'p unit', 'phys unit', 'physical unit'),
    Transfer: find('transfer', 'stock transfer'),
    TUnit: find('t.unit', 't unit', 'transfer unit'),
    AddTransfer: find('additional transfer', 'additional trans', 'add transfer', 'addl transfer', 'add. transfer'),
    AddUnit: find('add unit', 'additional transfer unit', 'additional trans add unit', 'a.unit', 'addl unit'),
    System: find('system', 'system stock'),
    SUnit: find('s.unit', 's unit', 'system unit'),
    Difference: find('difference', 'diff'),
    Reimbursed: find('reimbursed', 'reimburse', 'pieces reimbursed', 'reimbursed pcs'),
    RUnit: find('r.unit', 'r unit', 'reimbursed unit')
  };
}

function ensureAdditionalColumns(sheet) {
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var index = getHeaderIndex(header);

  if (index.AddTransfer >= 0 && index.AddUnit >= 0) {
    return { header: header, index: index };
  }

  var insertAfter = (index.TUnit >= 0) ? index.TUnit : ((index.Transfer >= 0) ? index.Transfer : header.length - 1);

  if (index.AddTransfer < 0) {
    sheet.insertColumnAfter(insertAfter + 1);
    sheet.getRange(1, insertAfter + 2).setValue('Additional Transfer');
    insertAfter++;
  }

  if (index.AddUnit < 0) {
    sheet.insertColumnAfter(insertAfter + 1);
    sheet.getRange(1, insertAfter + 2).setValue('Add Unit');
  }

  header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  index = getHeaderIndex(header);

  return { header: header, index: index };
}

/* ===========================
   ACTION ROUTER
=========================== */

function handleAction(data) {
  switch (data.action) {
    case 'ping':
    case 'testConnection':
      return createResponse('success', 'Connection established');

    case 'init':
      return initializeApp();

    case 'heartbeat':
      return handleHeartbeat(data);

    case 'getActiveUsers':
      return getActiveUsers();

    case 'getRealTimeData':
      return getRealTimeData(data);

    case 'lockItem':
      return lockItem(data);

    case 'unlockItem':
      return unlockItem(data);

    case 'saveInventoryData': {
      var result = saveInventoryData(data);
      broadcastUpdate('inventory', data.route);
      return createResponse(result.status, result.data);
    }

    case 'getInventoryData':
      return getInventoryData(data);

    case 'calculateSalesFromInventory':
      return calculateSalesFromInventory(data);

    case 'saveCashReconciliation': {
      var validation = validateCashData(data);
      if (!validation.valid) {
        return createResponse('error', validation.error);
      }
      var cashResult = saveCashReconciliation(data);
      broadcastUpdate('cash', data.route);
      return createResponse('success', cashResult);
    }

    case 'getSummary':
      return getSummaryData();

    default:
      return createResponse('error', 'Invalid action: ' + data.action);
  }
}

/* ===========================
   APP INITIALIZATION
=========================== */

function initializeApp() {
  var catalog = {
    sunflower_seeds: [
      { code: '4402', name: '200g', unit: 'bag', price: 58, bundle: 5 },
      { code: '4401', name: '100g', unit: 'bag', price: 34, bundle: 5 },
      { code: '1129', name: '25g', unit: 'bag', price: 16, bundle: 6 },
      { code: '1116', name: '800g', unit: 'bag', price: 17, carton: 12 },
      { code: '1145', name: '130g', unit: 'box', price: 54, carton: 6 },
      { code: '1126', name: '10KG', unit: 'sack', price: 170 }
    ],
    pumpkin_seeds: [
      { code: '8001', name: '15g', unit: 'box', price: 16, carton: 6 },
      { code: '8002', name: '110g', unit: 'box', price: 54, carton: 6 },
      { code: '1142', name: '10KG', unit: 'sack', price: 230 }
    ],
    melon_seeds: [
      { code: '9001', name: '15g', unit: 'box', price: 16, carton: 6 },
      { code: '9002', name: '110g', unit: 'box', price: 54, carton: 6 }
    ],
    popcorn: [
      { code: '1710', name: 'Cheese', unit: 'bag', price: 5, carton: 8 },
      { code: '1711', name: 'Butter', unit: 'bag', price: 5, carton: 8 },
      { code: '1703', name: 'Lightly Salted', unit: 'bag', price: 5, carton: 8 }
    ]
  };

  return createResponse('success', { catalog: catalog });
}

/* ===========================
   INVENTORY DATA MANAGEMENT
=========================== */

function saveInventoryData(payload) {
  try {
    var route = payload && payload.route;
    var date = payload && payload.date;
    var items = (payload && payload.items) || [];

    if (!route) {
      return { status: 'error', data: 'Route is required' };
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(route);

    if (!sheet) {
      return { status: 'error', data: 'Route sheet not found' };
    }

    var meta = ensureAdditionalColumns(sheet);
    var header = meta.header;
    var index = meta.index;
    var lastCol = sheet.getLastColumn();
    var timestamp = formatTimeHMS(new Date());

    var toNumber = function(value) {
      return (value === '' || value == null) ? 0 : Number(value);
    };

    function createRow(item) {
      var row = new Array(lastCol).fill('');

      if (index.Date >= 0) row[index.Date] = normalizeDate(date || todayYMD());
      if (index.Time >= 0) row[index.Time] = timestamp;
      if (index.Category >= 0) row[index.Category] = item.category || '';
      if (index.Code >= 0) row[index.Code] = item.code || '';
      if (index.ItemName >= 0) row[index.ItemName] = item.name || '';

      if (index.Physical >= 0) row[index.Physical] = toNumber(item.physical);
      if (index.PUnit >= 0) row[index.PUnit] = item.physUnit || 'bag';

      if (index.Transfer >= 0) row[index.Transfer] = toNumber(item.transfer);
      if (index.TUnit >= 0) row[index.TUnit] = item.transUnit || item.physUnit || 'bag';

      var additionalQty = (item.hasOwnProperty('additionalTransfer') ? item.additionalTransfer : (item.addTransfer || 0));
      var additionalUnit = item.addUnit || item.transUnit || item.physUnit || 'bag';
      if (index.AddTransfer >= 0) row[index.AddTransfer] = toNumber(additionalQty);
      if (index.AddUnit >= 0) row[index.AddUnit] = additionalUnit;

      if (index.System >= 0) row[index.System] = toNumber(item.system);
      if (index.SUnit >= 0) row[index.SUnit] = item.sysUnit || item.physUnit || 'bag';

      if (index.Difference >= 0) row[index.Difference] = toNumber(item.difference);
      if (index.Reimbursed >= 0) row[index.Reimbursed] = toNumber(item.reimburse);
      if (index.RUnit >= 0) row[index.RUnit] = item.reimbUnit || 'pieces';

      return row;
    }

    if (!items.length) {
      return { status: 'success', data: 'Nothing to save' };
    }

    var values = items.map(createRow);
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, values.length, lastCol).setValues(values);

    saveDailyInventorySnapshot(ss, {
      date: normalizeDate(date || todayYMD()),
      route: route,
      items: items
    });

    return { status: 'success', data: { rowsAppended: values.length } };
  } catch (err) {
    logError('saveInventoryData', err);
    return { status: 'error', data: String(err) };
  }
}

function getInventoryData(payload) {
  try {
    var route = payload && payload.route;
    var date = payload && payload.date;

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(route);

    if (!sheet) {
      return createResponse('error', 'Route sheet not found');
    }

    if (sheet.getLastRow() < 2) {
      return createResponse('success', []);
    }

    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var index = getHeaderIndex(header);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    var targetDate = normalizeDate(date || todayYMD());
    var items = [];

    data.forEach(function(row) {
      if (normalizeDate(row[index.Date]) !== targetDate) return;

      items.push({
        category: row[index.Category],
        code: row[index.Code],
        name: row[index.ItemName],
        physical: Number(row[index.Physical] || 0),
        physUnit: row[index.PUnit] || 'bag',
        transfer: Number(row[index.Transfer] || 0),
        transUnit: row[index.TUnit] || 'bag',
        additionalTransfer: Number(index.AddTransfer >= 0 ? row[index.AddTransfer] || 0 : 0),
        addUnit: row[index.AddUnit] || (row[index.TUnit] || row[index.PUnit] || 'bag'),
        system: Number(row[index.System] || 0),
        sysUnit: row[index.SUnit] || 'bag',
        difference: Number(row[index.Difference] || 0),
        reimburse: Number(row[index.Reimbursed] || 0),
        reimbUnit: row[index.RUnit] || 'pieces'
      });
    });

    return createResponse('success', items);
  } catch (err) {
    logError('getInventoryData', err);
    return createResponse('error', String(err));
  }
}

function saveDailyInventorySnapshot(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAMES.INVENTORY_SNAPSHOT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.INVENTORY_SNAPSHOT);
    sheet.appendRow([
      'Date', 'Route', 'Category', 'Code', 'Item Name',
      'Physical', 'P.Unit', 'Transfer', 'T.Unit',
      'Additional Transfer', 'Add Unit', 'System', 'S.Unit',
      'Difference', 'Last Updated'
    ]);
    sheet.setFrozenRows(1);
  }

  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (normalizeDate(values[i][0]) === normalizeDate(data.date) && values[i][1] === data.route) {
        sheet.deleteRow(i + 2);
      }
    }
  }

  var rows = [];
  (data.items || []).forEach(function(item) {
    rows.push([
      normalizeDate(data.date),
      data.route,
      item.category || '',
      item.code || '',
      item.name || '',
      Number(item.physical || 0),
      item.physUnit || 'bag',
      Number(item.transfer || 0),
      item.transUnit || 'bag',
      Number((item.hasOwnProperty('additionalTransfer') ? item.additionalTransfer : (item.addTransfer || 0)) || 0),
      item.addUnit || item.transUnit || item.physUnit || 'bag',
      Number(item.system || 0),
      item.sysUnit || 'bag',
      Number(item.difference || 0),
      new Date()
    ]);
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/* ===========================
   SALES CALCULATION
=========================== */

function calculateSalesFromInventory(payload) {
  try {
    var route = payload && payload.route;
    var previousDate = payload && payload.previousDate;
    var currentDate = payload && payload.currentDate;

    if (!route || !previousDate || !currentDate) {
      return createResponse('error', 'Missing route/previousDate/currentDate');
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(route);

    if (!sheet) {
      return createResponse('error', 'Route sheet not found');
    }

    if (sheet.getLastRow() < 2) {
      return createResponse('success', []);
    }

    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var index = getHeaderIndex(header);
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    var toNum = function(value) {
      var num = Number(String(value == null ? '' : value).replace(/[, ]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    var rollup = {};

    rows.forEach(function(row) {
      var dateStr = normalizeDate(row[index.Date]);
      var code = String(row[index.Code] || '').trim();
      if (!dateStr || !code) return;

      var key = dateStr + '__' + code;
      if (!rollup[key]) {
        rollup[key] = { physical: 0, transfer: 0, additional: 0 };
      }

      rollup[key].physical += toNum(row[index.Physical]);
      rollup[key].transfer += toNum(row[index.Transfer]);
      if (index.AddTransfer >= 0) {
        rollup[key].additional += toNum(row[index.AddTransfer]);
      }
    });

    function getByDate(dateStr) {
      var out = {};
      var target = normalizeDate(dateStr);
      Object.keys(rollup).forEach(function(key) {
        var parts = key.split('__');
        if (parts[0] === target) {
          out[parts[1]] = rollup[key];
        }
      });
      return out;
    }

    var prev = getByDate(previousDate);
    var curr = getByDate(currentDate);

    var result = Object.keys(prev).map(function(code) {
      var prevData = prev[code];
      var currPhysical = (curr[code] && curr[code].physical) || 0;
      var salesQty = (prevData.physical + prevData.transfer + prevData.additional) - currPhysical;

      return { code: code, salesQty: salesQty };
    });

    return createResponse('success', result);
  } catch (err) {
    logError('calculateSalesFromInventory', err);
    return createResponse('error', String(err));
  }
}

/* ===========================
   CASH RECONCILIATION
=========================== */

function validateCashData(data) {
  if (!data.route) return { valid: false, error: 'Route is required' };
  if (!data.date) return { valid: false, error: 'Date is required' };
  return { valid: true };
}

function createCashReconciliationSheet(ss) {
  var sheet = ss.insertSheet(SHEET_NAMES.CASH_RECONCILIATION);
  sheet.appendRow([
    'Date', 'Time', 'Route', 'Total Sales',
    'Discount (Base)', 'Discount (+15%)',
    'Credit Sales', 'Credit Repayment', 'Bank POS', 'Bank Transfer', 'Cheque',
    'Expected Cash', 'Cash Notes', 'Coins', 'Actual Cash', 'Difference', 'Status'
  ]);
  sheet.setFrozenRows(1);
  return sheet;
}

function saveCashDenominations(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAMES.CASH_DENOMINATIONS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.CASH_DENOMINATIONS);
    sheet.appendRow([
      'Date', 'Route', 'SAR 500', 'SAR 100', 'SAR 50', 'SAR 20', 'SAR 10', 'SAR 5',
      'Notes Total', 'SAR 2', 'SAR 1', 'SAR 0.50', 'SAR 0.25', 'Coins Total', 'Grand Total'
    ]);
    sheet.setFrozenRows(1);
  }

  var denominations = (data.cashNotes && data.cashNotes.denominations) ? data.cashNotes.denominations : {};

  function getValue(key) {
    return Number(denominations[key] || 0);
  }

  var notes = getValue('500') * 500 + getValue('100') * 100 + getValue('50') * 50 +
              getValue('20') * 20 + getValue('10') * 10 + getValue('5') * 5;

  var coins = getValue('2') * 2 + getValue('1') * 1 +
              (getValue('0.50') || getValue('0.5')) * 0.5 + getValue('0.25') * 0.25;

  var grand = notes + coins;

  var row = [
    data.date, data.route,
    getValue('500'), getValue('100'), getValue('50'), getValue('20'), getValue('10'), getValue('5'), notes,
    getValue('2'), getValue('1'), (getValue('0.50') || getValue('0.5')), getValue('0.25'), coins, grand
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function saveSalesItems(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SALES_ITEMS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SALES_ITEMS);
    sheet.appendRow(['Date', 'Time', 'Route', 'Category', 'Code', 'Item Name', 'Unit', 'Unit Price', 'Quantity', 'Total Value']);
    sheet.setFrozenRows(1);
  }

  var timestamp = formatTimeHMS(new Date());
  var rows = (data.salesItems || []).map(function(item) {
    return [
      data.date,
      timestamp,
      data.route,
      item.category || '',
      item.code || '',
      item.name || '',
      item.unit || '',
      Number(item.price || 0),
      Number(item.quantity || 0),
      Number(item.total || 0)
    ];
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function saveCashReconciliation(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CASH_RECONCILIATION);

  if (!sheet) {
    sheet = createCashReconciliationSheet(ss);
  }

  var discountBase = Number(data.discountBase || 0);
  var discountWithVAT = Number(data.discountWithVAT || 0);

  var row = [
    data.date, formatTimeHMS(new Date()), data.route,
    Number(data.totalSales || 0),
    discountBase, discountWithVAT,
    Number(data.creditSales || 0),
    Number(data.creditRepayment || 0),
    Number(data.bankPOS || 0),
    Number(data.bankTransfer || 0),
    Number(data.cheque || 0),
    Number(data.expectedCash || 0),
    Number((data.cashNotes && data.cashNotes.total) || 0),
    Number(data.coins || 0),
    Number(data.actualCash || 0),
    Number(data.difference || 0),
    (Number(data.difference || 0) === 0 ? 'BALANCED' : (Number(data.difference) > 0 ? 'EXCESS' : 'SHORTAGE'))
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);

  if (Array.isArray(data.salesItems) && data.salesItems.length) {
    saveSalesItems(ss, data);
  }

  saveCashDenominations(ss, data);
  updateLastModified(ss, data.route);

  return 'Cash reconciliation saved';
}

/* ===========================
   PRESENCE & LOCKING
=========================== */

function handleHeartbeat(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_USERS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ACTIVE_USERS);
    sheet.appendRow(['User ID', 'Last Seen', 'Route', 'Module', 'User Name']);
    sheet.setFrozenRows(1);
  }

  var userId = data.userId || Utilities.getUuid();
  var now = Date.now();
  var route = data.route || '';
  var module = data.module || 'inventory';

  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  if (lastRow > 1) {
    var userIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < userIds.length; i++) {
      if (userIds[i][0] === userId) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  if (rowIndex === -1) {
    sheet.appendRow([userId, now, route, module, data.userName || 'User']);
  } else {
    sheet.getRange(rowIndex, 2, 1, 3).setValues([[now, route, module]]);
  }

  cleanupInactiveUsers(sheet);

  return createResponse('success', {
    userId: userId,
    activeUsers: getActiveUsersCount(sheet),
    timestamp: now
  });
}

function cleanupInactiveUsers(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var now = Date.now();

  for (var i = values.length - 1; i >= 0; i--) {
    if (now - values[i][1] > ACTIVE_USERS_TIMEOUT) {
      sheet.deleteRow(i + 2);
    }
  }
}

function getActiveUsersCount(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  var timestamps = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var now = Date.now();

  return timestamps.filter(function(row) {
    return now - row[0] < ACTIVE_USERS_TIMEOUT;
  }).length;
}

function getActiveUsers() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_USERS);

  if (!sheet) {
    return createResponse('success', { users: [], count: 0 });
  }

  cleanupInactiveUsers(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createResponse('success', { users: [], count: 0 });
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var now = Date.now();

  var users = rows.filter(function(row) {
      return now - row[1] < ACTIVE_USERS_TIMEOUT;
    })
    .map(function(row) {
      return {
        userId: row[0],
        route: row[2],
        module: row[3],
        userName: row[4] || 'User',
        lastSeen: new Date(row[1]).toISOString()
      };
    });

  return createResponse('success', { users: users, count: users.length });
}

function lockItem(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ITEM_LOCKS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ITEM_LOCKS);
    sheet.appendRow(['Lock Key', 'User ID', 'Timestamp']);
    sheet.setFrozenRows(1);
  }

  var key = data.route + '_' + data.itemCode;
  var userId = data.userId;
  var now = Date.now();

  var locks = getLocksMap(sheet);

  if (locks[key] && locks[key].userId !== userId && now - locks[key].timestamp < 60000) {
    return createResponse('error', 'Item locked by another user');
  }

  setLock(sheet, key, userId, now);
  return createResponse('success', 'Item locked');
}

function unlockItem(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ITEM_LOCKS);

  if (!sheet) {
    return createResponse('success', 'No locks');
  }

  removeLock(sheet, data.route + '_' + data.itemCode);
  return createResponse('success', 'Item unlocked');
}

function getLocksMap(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 3).getValues().forEach(function(row) {
      map[row[0]] = { userId: row[1], timestamp: row[2] };
    });
  }

  return map;
}

function setLock(sheet, key, userId, timestamp) {
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2, 1, 2).setValues([[userId, timestamp]]);
        return;
      }
    }
  }

  sheet.appendRow([key, userId, timestamp]);
}

function removeLock(sheet, key) {
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = keys.length - 1; i >= 0; i--) {
      if (keys[i][0] === key) {
        sheet.deleteRow(i + 2);
        return;
      }
    }
  }
}

function getLockedItems(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.ITEM_LOCKS);
  if (!sheet) return [];

  var map = getLocksMap(sheet);
  var out = [];
  var now = Date.now();

  Object.keys(map).forEach(function(key) {
    if (now - map[key].timestamp < 60000) {
      out.push({
        itemKey: key,
        userId: map[key].userId,
        timestamp: map[key].timestamp
      });
    }
  });

  return out;
}

/* ===========================
   REAL-TIME METADATA
=========================== */

function getRealTimeData(payload) {
  var ss = getSpreadsheet();
  var updates = [];
  var meta = getOrCreateMetaSheet(ss);
  var lastModified = getLastModifiedData(meta);
  var clientTimestamp = Number(payload.timestamp || 0);

  if (payload.route && lastModified[payload.route] > clientTimestamp) {
    var routeData = JSON.parse(getInventoryData({
      route: payload.route,
      date: payload.date || todayYMD()
    }).getContent()).data;

    updates.push({
      type: 'route_update',
      route: payload.route,
      data: routeData,
      timestamp: lastModified[payload.route]
    });
  }

  var lockedItems = getLockedItems(ss);

  return createResponse('success', {
    updates: updates,
    lockedItems: lockedItems,
    serverTimestamp: Date.now()
  });
}

function broadcastUpdate(type, route) {
  updateLastModified(getSpreadsheet(), route);
}

function getOrCreateMetaSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.METADATA);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.METADATA);
    sheet.appendRow(['Route', 'Last Modified']);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function updateLastModified(ss, route) {
  var sheet = getOrCreateMetaSheet(ss);
  var lastRow = sheet.getLastRow();
  var timestamp = Date.now();

  if (lastRow > 1) {
    var routes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < routes.length; i++) {
      if (routes[i][0] === route) {
        sheet.getRange(i + 2, 2).setValue(timestamp);
        return;
      }
    }
  }

  sheet.appendRow([route, timestamp]);
}

function getLastModifiedData(meta) {
  var map = {};
  var lastRow = meta.getLastRow();

  if (lastRow > 1) {
    meta.getRange(2, 1, lastRow - 1, 2).getValues().forEach(function(row) {
      map[row[0]] = row[1];
    });
  }

  return map;
}

/* ===========================
   SUMMARY DATA
=========================== */

function getSummaryData() {
  var ss = getSpreadsheet();
  var output = {};

  ROUTES.forEach(function(route) {
    var sheet = ss.getSheetByName(route);

    if (!sheet || sheet.getLastRow() < 2) {
      output[route] = {
        totalItems: 0,
        shortageItems: 0,
        excessItems: 0,
        matchedItems: 0,
        lastUpdated: null
      };
      return;
    }

    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var index = getHeaderIndex(header);
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    var total = 0;
    var shortage = 0;
    var excess = 0;
    var matched = 0;

    values.forEach(function(row) {
      var diff = Number(row[index.Difference] || 0);
      total++;
      if (diff < 0) shortage++;
      else if (diff > 0) excess++;
      else matched++;
    });

    output[route] = {
      totalItems: total,
      shortageItems: shortage,
      excessItems: excess,
      matchedItems: matched,
      lastUpdated: normalizeDate(values[values.length - 1][index.Date])
    };
  });

  return createResponse('success', output);
}

/* ===========================
   MENU & UTILITIES
=========================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠️ ARS Utilities')
    .addItem('Migrate inventory sheets (safe backup)', 'migrateAllInventorySheets')
    .addSeparator()
    .addItem('📋 Show Documentation', 'showDocumentation')
    .addToUi();
}

function showDocumentation() {
  var html = '<h2>ARS Inventory System v2.0</h2>' +
    '<p>Enhanced inventory management with real-time collaboration.</p>' +
    '<h3>Available Actions:</h3>' +
    '<ul>' +
    '<li><strong>testConnection</strong> - Test API connection</li>' +
    '<li><strong>heartbeat</strong> - Update user presence</li>' +
    '<li><strong>saveInventoryData</strong> - Save inventory items</li>' +
    '<li><strong>getInventoryData</strong> - Retrieve inventory data</li>' +
    '<li><strong>calculateSalesFromInventory</strong> - Calculate sales</li>' +
    '<li><strong>saveCashReconciliation</strong> - Save cash data</li>' +
    '<li><strong>getSummary</strong> - Get summary statistics</li>' +
    '</ul>';

  var ui = SpreadsheetApp.getUi();
  ui.alert('Documentation', html, ui.ButtonSet.OK);
}
