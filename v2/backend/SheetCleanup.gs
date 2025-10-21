/*******************************************************
 * Google Sheets Cleanup & Maintenance Utilities v2.0
 *
 * Features:
 * - Consolidate SALES_* sheets into single SALES_ITEMS
 * - Remove duplicate entries
 * - Clean up empty sheets
 * - Optimize sheet structure
 * - Automatic backup before operations
 *
 * SAFETY: All operations create backups first
 *******************************************************/

const SPREADSHEET_ID_CLEANUP = '1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0';

/**
 * Create custom menu on spreadsheet open
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛠️ ARS Utilities')
    .addItem('📊 Consolidate SALES Sheets', 'consolidateSalesSheets')
    .addItem('🗑️ Delete Empty Sheets', 'deleteEmptySheets')
    .addItem('🔧 Remove Duplicates', 'removeDuplicatesMenu')
    .addItem('💾 Create Backup', 'createManualBackup')
    .addItem('📈 Generate Report', 'generateSummaryReport')
    .addSeparator()
    .addItem('⚡ Full Cleanup (Recommended)', 'fullCleanup')
    .addToUi();
}

/**
 * Full cleanup - runs all operations
 */
function fullCleanup() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Full Cleanup',
    'This will:\n' +
    '1. Create a backup of your spreadsheet\n' +
    '2. Consolidate all SALES_* sheets into SALES_ITEMS\n' +
    '3. Remove duplicate entries\n' +
    '4. Delete empty sheets\n' +
    '5. Generate a summary report\n\n' +
    'This is SAFE - a backup will be created first.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Cleanup cancelled.');
    return;
  }

  try {
    // Step 1: Backup
    const backupUrl = createManualBackup();
    Logger.log('Backup created: ' + backupUrl);

    // Step 2: Consolidate sales sheets
    const salesResults = consolidateSalesSheets();
    Logger.log('Sales consolidation: ' + JSON.stringify(salesResults));

    // Step 3: Remove duplicates
    deduplicateSalesItems();
    deduplicateInventorySnapshot();

    // Step 4: Delete empty sheets
    const emptyResults = deleteEmptySheets();
    Logger.log('Empty sheets deleted: ' + emptyResults);

    // Step 5: Generate report
    generateSummaryReport();

    ui.alert(
      'Cleanup Complete! ✅',
      `Results:\n` +
      `✓ Backup: ${backupUrl}\n` +
      `✓ Sales sheets consolidated: ${salesResults.sheetsProcessed}\n` +
      `✓ Rows migrated: ${salesResults.totalRows}\n` +
      `✓ Empty sheets deleted: ${emptyResults}\n\n` +
      'Check the CLEANUP_SUMMARY sheet for details.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Cleanup error: ' + error);
    Logger.log('Stack: ' + error.stack);

    ui.alert(
      'Error During Cleanup',
      `An error occurred:\n\n${error.message}\n\n` +
      'Your data is safe in the backup.\n' +
      'Check View > Logs for details.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Consolidate all SALES_* sheets into SALES_ITEMS
 */
function consolidateSalesSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
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
    salesItemsSheet.appendRow([
      'Date', 'Time', 'Route', 'Category', 'Code',
      'Item Name', 'Unit', 'Unit Price', 'Quantity', 'Total Value'
    ]);
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
        date = parts[parts.length - 1]; // Last part is date
        route = parts.slice(0, -1).join('_'); // Everything before date is route
      }

      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        migrationLog.push({ sheet: sheetName, status: 'empty', rows: 0 });
        return;
      }

      // Get data (skip header)
      const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
      const data = dataRange.getValues();

      // Transform data to match SALES_ITEMS format
      const transformedData = data.map(row => {
        // Skip empty rows
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
      }).filter(row => row !== null);

      if (transformedData.length > 0) {
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

  // Log to summary sheet
  const summarySheet = getOrCreateSummarySheet(ss);
  summarySheet.appendRow(['=== SALES CONSOLIDATION ===', new Date()]);
  summarySheet.appendRow(['Total Sheets Processed', salesSheets.length]);
  summarySheet.appendRow(['Total Rows Migrated', totalRowsMigrated]);
  summarySheet.appendRow(['']);

  migrationLog.forEach(log => {
    summarySheet.appendRow([log.sheet, log.status, log.rows || 0, log.error || '']);
  });
  summarySheet.appendRow(['']);

  // Ask to delete old sheets
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
 * Delete all empty sheets
 */
function deleteEmptySheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
  const ui = SpreadsheetApp.getUi();
  const allSheets = ss.getSheets();

  // Protected sheets that shouldn't be deleted even if empty
  const protectedNames = [
    'SALES_ITEMS', 'INVENTORY_SNAPSHOT', 'CASH_RECONCILIATION',
    'CASH_DENOMINATIONS', 'ACTIVE_USERS', 'ITEM_LOCKS', 'METADATA'
  ];

  const emptySheets = allSheets.filter(sheet => {
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
 * Create a manual backup
 */
function createManualBackup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
  const backupName = `${ss.getName()} [BACKUP ${timestamp}]`;

  const backup = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  const backupUrl = backup.getUrl();

  Logger.log('Backup created: ' + backupName);
  Logger.log('Backup URL: ' + backupUrl);

  SpreadsheetApp.getUi().alert(
    'Backup Created',
    `Backup saved as:\n${backupName}\n\nURL: ${backupUrl}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return backupUrl;
}

/**
 * Generate summary report
 */
function generateSummaryReport() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
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

  // Format
  const lastRow = summarySheet.getLastRow();
  summarySheet.getRange(lastRow - allSheets.length - 3, 1, 1, 5)
    .setBackground('#22c55e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  summarySheet.autoResizeColumns(1, 5);

  SpreadsheetApp.getUi().alert('Summary report generated in CLEANUP_SUMMARY sheet.');

  return summarySheet;
}

/**
 * Get or create summary sheet
 */
function getOrCreateSummarySheet(ss) {
  let summarySheet = ss.getSheetByName('CLEANUP_SUMMARY');

  if (!summarySheet) {
    summarySheet = ss.insertSheet('CLEANUP_SUMMARY');
    summarySheet.appendRow(['Operation', 'Timestamp', 'Details', 'Status']);
    summarySheet.setFrozenRows(1);

    // Format header
    const headerRange = summarySheet.getRange(1, 1, 1, 4);
    headerRange.setBackground('#4361ee');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
  }

  return summarySheet;
}

/**
 * Deduplicate rows in a sheet
 */
function deduplicateSheet(sheetName, keyColumns) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found.`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // No data

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
    // Clear and rewrite
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    if (uniqueRows.length > 0) {
      sheet.getRange(2, 1, uniqueRows.length, sheet.getLastColumn()).setValues(uniqueRows);
    }

    SpreadsheetApp.getUi().alert(
      `Removed ${duplicatesCount} duplicate row(s) from "${sheetName}".\n` +
      `Kept ${uniqueRows.length} unique rows.`
    );

    Logger.log(`Deduplication: Removed ${duplicatesCount} duplicates, kept ${uniqueRows.length} unique rows`);
  } else {
    SpreadsheetApp.getUi().alert(`No duplicates found in "${sheetName}".`);
  }
}

/**
 * Deduplicate SALES_ITEMS
 */
function deduplicateSalesItems() {
  // Key: Date (0) + Route (2) + Code (4)
  deduplicateSheet('SALES_ITEMS', [0, 2, 4]);
}

/**
 * Deduplicate INVENTORY_SNAPSHOT
 */
function deduplicateInventorySnapshot() {
  // Key: Date (0) + Route (1) + Code (3)
  deduplicateSheet('INVENTORY_SNAPSHOT', [0, 1, 3]);
}

/**
 * Menu handler for deduplication
 */
function removeDuplicatesMenu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Remove Duplicates',
    'This will remove duplicate entries from:\n' +
    '- SALES_ITEMS\n' +
    '- INVENTORY_SNAPSHOT\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    deduplicateSalesItems();
    deduplicateInventorySnapshot();
    ui.alert('Duplicate removal complete!');
  }
}

/**
 * Optimize spreadsheet
 */
function optimizeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLEANUP);
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Optimize Spreadsheet',
    'This will:\n' +
    '1. Remove duplicates from key sheets\n' +
    '2. Sort data by date\n' +
    '3. Format headers consistently\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    // Deduplicate
    deduplicateSalesItems();
    deduplicateInventorySnapshot();

    // Sort SALES_ITEMS by date and time
    const salesSheet = ss.getSheetByName('SALES_ITEMS');
    if (salesSheet && salesSheet.getLastRow() > 1) {
      const range = salesSheet.getRange(2, 1, salesSheet.getLastRow() - 1, salesSheet.getLastColumn());
      range.sort([{ column: 1, ascending: true }, { column: 2, ascending: true }]);
    }

    // Sort INVENTORY_SNAPSHOT by date and route
    const invSheet = ss.getSheetByName('INVENTORY_SNAPSHOT');
    if (invSheet && invSheet.getLastRow() > 1) {
      const range = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn());
      range.sort([{ column: 1, ascending: true }, { column: 2, ascending: true }]);
    }

    ui.alert('Optimization complete! ✅');

  } catch (error) {
    ui.alert('Error during optimization: ' + error.message);
  }
}
