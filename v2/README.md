# ARS Inventory Management System v2.0

A modern, real-time inventory management system with offline support, real-time collaboration, and enhanced UX.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)

## 🎯 What's New in v2.0

### Frontend Improvements
- ✨ **Modern UI/UX** - Complete redesign with gradient themes and smooth animations
- 📱 **Better Mobile Experience** - Optimized for mobile devices with touch-friendly controls
- ⚡ **Faster Performance** - Optimized rendering and data handling
- 💾 **Offline Support** - Work offline, sync when reconnected
- ⌨️ **Keyboard Shortcuts** - Ctrl/Cmd+S to save, Ctrl/Cmd+K to calculate all
- 📊 **CSV Export** - Export inventory data directly from the app
- 🎨 **Enhanced Visuals** - Better icons, colors, and visual feedback

### Backend Enhancements
- 🔒 **Improved Security** - Better validation and error handling
- 📈 **Better Performance** - Optimized database queries
- 🧹 **Data Cleanup Tools** - Built-in tools to consolidate and clean data
- 🔄 **Robust Sync** - More reliable real-time synchronization
- 📝 **Better Logging** - Enhanced error tracking and debugging

### New Features
- 🔍 **Empty State Messaging** - Clear guidance when no data is present
- 🎯 **Route-based Views** - Better organization by sales route
- 💡 **Smart Calculations** - Automatic unit conversions
- 🌐 **Online/Offline Indicators** - Clear connection status
- 📦 **Additional Transfer Field** - Track all types of transfers

## 📋 Features

### Core Functionality
- **Multi-Route Support** - Track inventory across 5 different routes
- **Real-time Collaboration** - Multiple users can work simultaneously
- **Item Locking** - Prevent conflicts when editing the same item
- **Automatic Calculations** - Difference calculation between system and physical stock
- **Unit Conversions** - Support for bags, bundles, cartons, and sacks
- **Local Storage** - Save progress automatically
- **Previous Entry Loading** - Quickly load last entry for reference

### Product Categories
- 🌻 Sunflower Seeds (6 SKUs)
- 🎃 Pumpkin Seeds (3 SKUs)
- 🍉 Melon Seeds (2 SKUs)
- 🍿 Popcorn (3 SKUs)

### Data Management
- Save to Google Sheets in real-time
- Daily inventory snapshots
- Cash reconciliation tracking
- Sales calculation from inventory
- Automated backups

## 🚀 Quick Start

### Prerequisites
- Google Account with Google Sheets access
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial setup

### Installation

#### 1. Setup Google Sheets

1. Open [Google Sheets](https://sheets.google.com)
2. Open your spreadsheet: `1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0`
3. Create route sheets if they don't exist:
   - `Al-Hasa 1`
   - `Al-Hasa 2`
   - `Al-Hasa 3`
   - `Al-Hasa 4`
   - `Al-Hasa Wholesale`

4. Each route sheet should have headers:
   ```
   Date | Time | Category | Code | Item Name | Physical | P.Unit | Transfer | T.Unit | Additional Transfer | Add Unit | System | S.Unit | Difference | Reimbursed | R.Unit
   ```

#### 2. Deploy Google Apps Script

1. In Google Sheets, go to **Extensions > Apps Script**
2. Delete any existing code
3. Create new files:
   - `Code.gs` - Copy from `v2/backend/Code.gs`
   - `SheetCleanup.gs` - Copy from `v2/backend/SheetCleanup.gs`

4. Deploy as Web App:
   - Click **Deploy > New deployment**
   - Type: **Web app**
   - Description: `ARS Inventory v2.0`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - Copy the **Web app URL**

#### 3. Setup Frontend

1. Update `v2/frontend/config.js`:
   ```javascript
   const CONFIG = {
     GOOGLE_SCRIPT_URL: 'YOUR_WEB_APP_URL_HERE',
     // ... rest of config
   };
   ```

2. Deploy frontend:
   - **Option A: Netlify** (Recommended)
     - Connect your GitHub repository
     - Set build directory to `v2/frontend`
     - Deploy

   - **Option B: Local Development**
     - Open `v2/frontend/index.html` in a browser
     - Use a local server (e.g., `python -m http.server`)

#### 4. First Use

1. Open the web app
2. Select a route
3. Click on a category to expand
4. Click on an item to enter data
5. Enter inventory counts
6. Click "Calculate All" to compute differences
7. Click "Save to Sheets" to save data

## 📖 User Guide

### Basic Workflow

1. **Select Route** - Choose your sales route from the buttons
2. **Select Date** - Pick the inventory date (defaults to today)
3. **Expand Categories** - Click category headers to view items
4. **Enter Data** - Click items to expand and enter:
   - Physical Stock (what you counted)
   - Transfer (stock transferred in)
   - Additional Transfer (extra transfers)
   - System Stock (what system shows)
   - Pieces Reimbursed (if any)
5. **Calculate** - Click "Calculate All" or calculations happen automatically
6. **Save** - Click "Save to Sheets" to store data

### Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save to Sheets
- `Ctrl/Cmd + K` - Calculate All

### Action Buttons

- **📋 Load Previous** - Load the last saved entry for this route
- **⚡ Calculate All** - Recalculate all item differences
- **🔄 Sync Data** - Force sync with server
- **📊 Export** - Export data as CSV
- **🗑️ Clear All** - Clear all entered data

### Understanding the Display

**Item Summary (Collapsed View)**
- **Physical** - Total physical stock in base units
- **Transfer** - Total transfer in base units
- **Add Trans** - Additional transfer in base units
- **System** - System stock in base units
- **Diff** - Difference (System - Physical)
  - 🟢 Green = Excess (more than expected)
  - 🔴 Red = Shortage (less than expected)

**Item Details (Expanded View)**
- Input fields for each metric
- Unit selectors (bag, bundle, carton)
- Large difference display at bottom

### Sync Status

- 🟢 **Online** - Connected to server
- 🔴 **Offline** - No connection (working locally)
- 🟡 **Syncing** - Actively syncing data

### Item Locking

When you expand an item, it locks for other users to prevent conflicts. The lock releases when you:
- Collapse the item
- Leave the page
- After 60 seconds of inactivity

## 🛠️ Admin Guide

### Cleanup & Maintenance

Access via **🛠️ ARS Utilities** menu in Google Sheets:

#### Consolidate SALES Sheets
Merges all `SALES_*` dated sheets into single `SALES_ITEMS` sheet.

#### Delete Empty Sheets
Removes sheets with no data (protected sheets are kept).

#### Remove Duplicates
Removes duplicate entries from:
- SALES_ITEMS (by Date + Route + Code)
- INVENTORY_SNAPSHOT (by Date + Route + Code)

#### Create Backup
Creates a timestamped backup copy in Google Drive.

#### Generate Report
Creates summary of all sheets with row counts and status.

#### Full Cleanup (Recommended)
Runs all cleanup operations in sequence with automatic backup.

### Data Structure

#### Route Sheets (Al-Hasa 1, etc.)
Raw inventory entries with all transactions.

#### SALES_ITEMS
Consolidated sales data from all routes and dates.

#### INVENTORY_SNAPSHOT
Daily snapshot of inventory state by route.

#### CASH_RECONCILIATION
Daily cash reconciliation records.

#### CASH_DENOMINATIONS
Cash denomination breakdowns.

#### ACTIVE_USERS
Currently active users (auto-cleanup after 30s).

#### ITEM_LOCKS
Item editing locks (auto-release after 60s).

#### METADATA
Last modified timestamps for real-time sync.

## 🔧 Configuration

### Frontend Config (`config.js`)

```javascript
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'your-url',  // Required
  HEARTBEAT_INTERVAL: 15000,      // How often to ping server (ms)
  POLLING_INTERVAL: 5000,         // How often to check for updates (ms)
  DEBUG: false                     // Enable debug logging
};
```

### Backend Config (`Code.gs`)

```javascript
const SPREADSHEET_ID = 'your-spreadsheet-id';
const ACTIVE_USERS_TIMEOUT = 30000;  // User timeout (ms)
```

## 🐛 Troubleshooting

### Common Issues

**Problem: "No action specified" error**
- Solution: Check that `GOOGLE_SCRIPT_URL` is set correctly in `config.js`

**Problem: Data not saving**
- Check internet connection
- Verify route sheet exists in spreadsheet
- Check browser console for errors

**Problem: "Item locked by another user"**
- Wait 60 seconds for lock to expire
- Or ask the other user to close the item

**Problem: Calculations not updating**
- Click "Calculate All" button
- Refresh the page
- Check that unit values are selected correctly

**Problem: Offline mode stuck**
- Refresh the page
- Check internet connection
- Clear browser cache

### Debug Mode

Enable debug logging:

```javascript
// In config.js
const CONFIG = {
  DEBUG: true
};
```

Then check browser console (F12) for detailed logs.

### Getting Help

1. Check browser console for errors (F12)
2. Check Apps Script logs: Extensions > Apps Script > Executions
3. Create backup before making changes
4. Test with small dataset first

## 📊 API Reference

### Available Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `testConnection` | Test API connectivity | None |
| `heartbeat` | Update user presence | `userId, route, module, userName` |
| `saveInventoryData` | Save inventory items | `route, date, items[]` |
| `getInventoryData` | Retrieve inventory | `route, date` |
| `calculateSalesFromInventory` | Calculate sales | `route, previousDate, currentDate` |
| `saveCashReconciliation` | Save cash data | Various cash fields |
| `getSummary` | Get statistics | None |
| `lockItem` | Lock an item | `route, itemCode, userId` |
| `unlockItem` | Unlock an item | `route, itemCode, userId` |
| `getRealTimeData` | Get updates | `route, timestamp, date` |

### Example API Call

```javascript
const response = await callAppsScript('saveInventoryData', {
  route: 'Al-Hasa 1',
  date: '2025-01-21',
  items: [
    {
      category: 'Sunflower Seeds',
      code: '4402',
      name: '200g',
      physical: 100,
      physUnit: 'bag',
      transfer: 50,
      transUnit: 'bag',
      // ... more fields
    }
  ]
});
```

## 🔒 Security Notes

- All API calls use POST requests
- User authentication via Google Account
- Item locking prevents concurrent edits
- All operations logged for audit trail
- Automatic backups before major operations

## 📈 Performance Tips

1. **Use "Load Previous"** instead of manually re-entering data
2. **Calculate All** once after entering all data, not per item
3. **Close items** when done to release locks
4. **Clear old data** periodically using cleanup tools
5. **Use offline mode** when internet is slow

## 🗺️ Roadmap

### Planned Features
- [ ] Multi-language support
- [ ] Advanced reporting dashboard
- [ ] Photo upload for inventory verification
- [ ] Barcode scanning
- [ ] Mobile app (PWA)
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Customizable product catalog

## 📝 Changelog

### v2.0.0 (2025-01-21)
- Complete UI redesign with modern aesthetics
- Added offline support
- CSV export functionality
- Keyboard shortcuts
- Better mobile experience
- Enhanced error handling
- Improved performance
- Comprehensive documentation

### v1.0.0
- Initial release
- Basic inventory tracking
- Real-time collaboration
- Google Sheets integration

## 📄 License

Copyright © 2025 ARS Inventory System. All rights reserved.

## 🙏 Support

For support, please contact your system administrator or create an issue in the project repository.

---

**Built with ❤️ for ARS**
