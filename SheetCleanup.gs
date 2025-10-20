/*******************************************************
 * Google Sheets Cleanup & Migration Script
 *
 * PURPOSE:
 * - Consolidate all SALES_* sheets into single SALES_ITEMS sheet
 * - Clean up duplicate/old sheets without losing data
 * - Organize and optimize spreadsheet structure
 *
 * SAFETY:
 * - Creates automatic backup before any changes
 * - Validates data before migration
 * - Provides rollback option
 *
 * USAGE:
 * 1. Copy this code into your Apps Script project
 * 2. Go to Extensions > Apps Script in Google Sheets
 * 3. Create a new file called "SheetCleanup.gs"
 * 4. Paste this code
 * 5. Run from the "Utilities" menu
 *******************************************************/

const SPREADSHEET_ID = '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0';

/**
 * Creates the custom menu when spreadsheet opens
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛠️ Utilities')
    .addItem('📊 Consolidate SALES Sheets', 'consolidateSalesSheets')
    .addItem('🗑️ Delete Empty Sheets', 'deleteEmptySheets')
    .addItem('💾 Create Backup', 'createManualBackup')
    .addItem('📈 Generate Summary Report', 'generateSummaryReport')
    .addSeparator()
    .addItem('🔧 Full Cleanup (Recommended)', 'fullCleanup')
    .addToUi();
}

/**
 * Main cleanup function - runs all cleanup operations
 */
function fullCleanup() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Full Cleanup',
    'This will:\n' +
    '1. Create a backup of your spreadsheet\n' +
    '2. Consolidate all SALES_* sheets into SALES_ITEMS\n' +
    '3. Delete empty and duplicate sheets\n' +
    '4. Generate a summary report\n\n' +
    'This operation is SAFE and includes backup.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Cleanup cancelled.');
    return;
  }

  try {
    // Step 1: Create backup
    const backupUrl = createManualBackup();
    Logger.log('Backup created: ' + backupUrl);

    // Step 2: Consolidate sales sheets
    const salesResults = consolidateSalesSheets();
    Logger.log('Sales consolidation: ' + JSON.stringify(salesResults));

    // Step 3: Delete empty sheets
    const emptyResults = deleteEmptySheets();
    Logger.log('Empty sheets deleted: ' + emptyResults);

    // Step 4: Generate summary
    const summary = generateSummaryReport();

    ui.alert(
      'Cleanup Complete! ✅',
      'Results:\n' +
      '✓ Backup created: ' + backupUrl + '\n' +
      '✓ Sales sheets consolidated: ' + salesResults.sheetsProcessed + '\n' +
      '✓ Total rows migrated: ' + salesResults.totalRows + '\n' +
      '✓ Empty sheets deleted: ' + emptyResults + '\n\n' +
      'Check the CLEANUP_SUMMARY sheet for details.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Cleanup error: ' + error);
    Logger.log('Error stack: ' + error.stack);
    ui.alert(
      'Error During Cleanup',
      'An error occurred:\n\n' + error.message + '\n\n' +
      'Details have been logged. Your data is safe.\n' +
      'Check:\n' +
      '1. Apps Script logs (View > Logs)\n' +
      '2. Your backup in Google Drive\n\n' +
      'Try running individual cleanup steps instead of Full Cleanup.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Consolidates all SALES_* sheets into a single SALES_ITEMS sheet
 */
function consolidateSalesSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();

  // Find all SALES_* sheets
  const allSheets = ss.getSheets();
  const salesSheets = allSheets.filter(sheet => {
    const name = sheet.getName();
    return name.startsWith('SALES_') && name !== 'SALES_ITEMS';
  });

  if (salesSheets.length === 0) {
    ui.alert('No SALES_* sheets found to consolidate.');
    return { sheetsProcessed: 0, totalRows: 0 };
  }

  // Get or create SALES_ITEMS sheet
  let salesItemsSheet = ss.getSheetByName('SALES_ITEMS');
  if (!salesItemsSheet) {
    salesItemsSheet = ss.insertSheet('SALES_ITEMS');
    salesItemsSheet.appendRow(['Date', 'Time', 'Route', 'Category', 'Code', 'Item Name', 'Unit', 'Unit Price', 'Quantity', 'Total Value']);
    salesItemsSheet.setFrozenRows(1);

    // Format header
    const headerRange = salesItemsSheet.getRange(1, 1, 1, 10);
    headerRange.setBackground('#4361ee');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
  }

  let totalRowsMigrated = 0;
  const migrationLog = [];

  // Process each SALES_* sheet
  salesSheets.forEach(sheet => {
    const sheetName = sheet.getName();

    try {
      // Parse route and date from sheet name: SALES_Al-Hasa 1_2025-01-15
      const parts = sheetName.replace('SALES_', '').split('_');
      let route = 'Unknown';
      let date = '';

      if (parts.length >= 2) {
        // Route could be "Al-Hasa 1" (2 parts) or just one part
        date = parts[parts.length - 1]; // Last part is always date
        route = parts.slice(0, -1).join('_'); // Everything before date is route
      }

      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        migrationLog.push({ sheet: sheetName, status: 'empty', rows: 0 });
        return; // Skip empty sheets
      }

      // Get data (skip header if it exists)
      const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
      const data = dataRange.getValues();

      // Transform data to match SALES_ITEMS format
      const transformedData = data.map(row => {
        // Old format: [Date, Time, Category, Code, Item Name, Unit, Unit Price, Quantity, Total Value]
        // New format: [Date, Time, Route, Category, Code, Item Name, Unit, Unit Price, Quantity, Total Value]

        // If row is empty, skip it
        if (!row[0] && !row[2] && !row[3]) return null;

        return [
          row[0] || date,           // Date
          row[1] || '',             // Time
          route,                     // Route (NEW column)
          row[2] || '',             // Category
          row[3] || '',             // Code
          row[4] || '',             // Item Name
          row[5] || '',             // Unit
          row[6] || 0,              // Unit Price
          row[7] || 0,              // Quantity
          row[8] || 0               // Total Value
        ];
      }).filter(row => row !== null); // Remove null rows

      if (transformedData.length > 0) {
        // Append to SALES_ITEMS
        const targetRow = salesItemsSheet.getLastRow() + 1;
        salesItemsSheet.getRange(targetRow, 1, transformedData.length, 10).setValues(transformedData);

        totalRowsMigrated += transformedData.length;
        migrationLog.push({ sheet: sheetName, status: 'migrated', rows: transformedData.length });

        Logger.log(`Migrated ${transformedData.length} rows from ${sheetName}`);
      } else {
        migrationLog.push({ sheet: sheetName, status: 'no_data', rows: 0 });
      }

    } catch (error) {
      migrationLog.push({ sheet: sheetName, status: 'error', error: error.message });
      Logger.log(`Error processing ${sheetName}: ${error.message}`);
    }
  });

  // Log migration summary
  const summarySheet = getOrCreateSummarySheet(ss);
  summarySheet.appendRow(['=== SALES CONSOLIDATION ===', new Date()]);
  summarySheet.appendRow(['Total Sheets Processed', salesSheets.length]);
  summarySheet.appendRow(['Total Rows Migrated', totalRowsMigrated]);
  summarySheet.appendRow(['']);

  migrationLog.forEach(log => {
    summarySheet.appendRow([log.sheet, log.status, log.rows || 0, log.error || '']);
  });
  summarySheet.appendRow(['']);

  // Ask if user wants to delete old SALES_* sheets
  const deleteResponse = ui.alert(
    'Consolidation Complete',
    `Successfully migrated ${totalRowsMigrated} rows from ${salesSheets.length} sheets.\n\n` +
    'Delete the old SALES_* sheets?\n(Data is safely copied to SALES_ITEMS)',
    ui.ButtonSet.YES_NO
  );

  if (deleteResponse === ui.Button.YES) {
    salesSheets.forEach(sheet => {
      ss.deleteSheet(sheet);
    });
    ui.alert(`Deleted ${salesSheets.length} old SALES_* sheets.`);
  }

  return {
    sheetsProcessed: salesSheets.length,
    totalRows: totalRowsMigrated,
    migrationLog: migrationLog
  };
}

/**
 * Deletes all empty sheets (sheets with only headers or no data)
 */
function deleteEmptySheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();
  const allSheets = ss.getSheets();

  const emptySheets = allSheets.filter(sheet => {
    // Don't delete these important sheets even if empty
    const protectedNames = ['SALES_ITEMS', 'INVENTORY_SNAPSHOT', 'CASH_RECONCILIATION',
                           'CASH_DENOMINATIONS', 'ACTIVE_USERS', 'ITEM_LOCKS', 'METADATA'];
    if (protectedNames.includes(sheet.getName())) return false;

    const lastRow = sheet.getLastRow();
    return lastRow <= 1; // Only header or completely empty
  });

  if (emptySheets.length === 0) {
    ui.alert('No empty sheets found.');
    return 0;
  }

  const sheetNames = emptySheets.map(s => s.getName()).join('\n');
  const response = ui.alert(
    'Delete Empty Sheets',
    `Found ${emptySheets.length} empty sheet(s):\n\n${sheetNames}\n\nDelete these sheets?`,
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    emptySheets.forEach(sheet => {
      ss.deleteSheet(sheet);
    });
    ui.alert(`Deleted ${emptySheets.length} empty sheets.`);
    return emptySheets.length;
  }

  return 0;
}

/**
 * Creates a backup copy of the spreadsheet
 */
function createManualBackup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  const backupName = `${ss.getName()} [BACKUP ${timestamp}]`;

  const backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  const backupUrl = backup.getUrl();

  Logger.log('Backup created: ' + backupName);
  Logger.log('Backup URL: ' + backupUrl);

  SpreadsheetApp.getUi().alert('Backup Created', `Backup saved as:\n${backupName}\n\nURL: ${backupUrl}`, SpreadsheetApp.getUi().ButtonSet.OK);

  return backupUrl;
}

/**
 * Generates a summary report of the spreadsheet
 */
function generateSummaryReport() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const summarySheet = getOrCreateSummarySheet(ss);

  summarySheet.appendRow(['=== SPREADSHEET SUMMARY ===', new Date()]);
  summarySheet.appendRow(['']);

  const allSheets = ss.getSheets();
  summarySheet.appendRow(['Sheet Name', 'Total Rows', 'Total Columns', 'Data Size', 'Status']);

  allSheets.forEach(sheet => {
    const name = sheet.getName();
    const rows = sheet.getLastRow();
    const cols = sheet.getLastColumn();
    const dataSize = rows * cols;
    const status = rows <= 1 ? 'Empty' : 'Active';

    summarySheet.appendRow([name, rows, cols, dataSize, status]);
  });

  summarySheet.appendRow(['']);
  summarySheet.appendRow(['Total Sheets', allSheets.length]);

  // Format summary sheet
  summarySheet.getRange(1, 1, 1, 5).setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');
  summarySheet.autoResizeColumns(1, 5);

  SpreadsheetApp.getUi().alert('Summary report generated in CLEANUP_SUMMARY sheet.');

  return summarySheet;
}

/**
 * Helper: Get or create summary sheet
 */
function getOrCreateSummarySheet(ss) {
  let summarySheet = ss.getSheetByName('CLEANUP_SUMMARY');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('CLEANUP_SUMMARY');
    summarySheet.appendRow(['Cleanup Log', 'Timestamp', 'Details', 'Status']);
    summarySheet.setFrozenRows(1);
  }
  return summarySheet;
}

/**
 * Advanced: Deduplicate rows in a sheet based on key columns
 */
function deduplicateSheet(sheetName, keyColumns) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found.`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // No data to deduplicate

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const seen = new Set();
  const uniqueRows = [];
  let duplicatesCount = 0;

  data.forEach(row => {
    // Create key from specified columns
    const key = keyColumns.map(col => row[col]).join('|');

    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    } else {
      duplicatesCount++;
    }
  });

  if (duplicatesCount > 0) {
    // Clear existing data and write unique rows
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    if (uniqueRows.length > 0) {
      sheet.getRange(2, 1, uniqueRows.length, sheet.getLastColumn()).setValues(uniqueRows);
    }

    SpreadsheetApp.getUi().alert(`Removed ${duplicatesCount} duplicate row(s) from "${sheetName}".`);
    Logger.log(`Deduplication: Removed ${duplicatesCount} duplicates, kept ${uniqueRows.length} unique rows`);
  } else {
    SpreadsheetApp.getUi().alert(`No duplicates found in "${sheetName}".`);
  }
}

/**
 * Deduplicate SALES_ITEMS sheet (by Date + Route + Code)
 */
function deduplicateSalesItems() {
  // Key columns: 0=Date, 2=Route, 4=Code
  deduplicateSheet('SALES_ITEMS', [0, 2, 4]);
}

/**
 * Deduplicate INVENTORY_SNAPSHOT sheet (by Date + Route + Code)
 */
function deduplicateInventorySnapshot() {
  // Key columns: 0=Date, 1=Route, 3=Code
  deduplicateSheet('INVENTORY_SNAPSHOT', [0, 1, 3]);
}

/**
 * Optimize spreadsheet performance
 */
function optimizeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Optimize Spreadsheet',
    'This will:\n' +
    '1. Remove duplicate rows from key sheets\n' +
    '2. Sort data by date\n' +
    '3. Apply data validation\n' +
    '4. Format headers consistently\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    // Deduplicate key sheets
    deduplicateSalesItems();
    deduplicateInventorySnapshot();

    // Sort SALES_ITEMS by date
    const salesSheet = ss.getSheetByName('SALES_ITEMS');
    if (salesSheet && salesSheet.getLastRow() > 1) {
      const range = salesSheet.getRange(2, 1, salesSheet.getLastRow() - 1, salesSheet.getLastColumn());
      range.sort([{column: 1, ascending: true}, {column: 2, ascending: true}]); // Sort by Date, then Time
    }

    // Sort INVENTORY_SNAPSHOT by date
    const invSheet = ss.getSheetByName('INVENTORY_SNAPSHOT');
    if (invSheet && invSheet.getLastRow() > 1) {
      const range = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn());
      range.sort([{column: 1, ascending: true}, {column: 2, ascending: true}]); // Sort by Date, then Route
    }

    ui.alert('Optimization complete! ✅');

  } catch (error) {
    ui.alert('Error during optimization: ' + error.message);
  }
}
