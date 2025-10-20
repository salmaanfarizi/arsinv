# Google Apps Script Fix - Sheet Proliferation Issue

## Problem Identified

The original code created a **new sheet for every route on every date** when saving cash reconciliation with sales items.

### Original Code (Line 291)
```javascript
function saveSalesItems(ss, data){
  var name = 'SALES_' + (data.route || 'Unknown') + '_' + (data.date || todayYMD());
  var sh = ss.getSheetByName(name);
  if (!sh){
    sh = ss.insertSheet(name);  // ❌ Creates new sheet per route per day
    // ...
  }
}
```

### Impact
- **5 routes × 30 days = 150 new sheets per month**
- **5 routes × 365 days = 1,825 sheets per year**
- Spreadsheet becomes unmanageable
- Performance degrades significantly
- Difficult to query/analyze data

## Solution Implemented

Changed to use a **single consolidated `SALES_ITEMS` sheet** for all sales data across all routes and dates.

### Fixed Code
```javascript
function saveSalesItems(ss, data){
  // ✅ Use a single SALES_ITEMS sheet instead of creating date-specific sheets
  var sh = ss.getSheetByName(SHEET_NAMES.SALES_ITEMS);
  if (!sh){
    sh = ss.insertSheet(SHEET_NAMES.SALES_ITEMS);
    sh.appendRow(['Date','Time','Route','Category','Code','Item Name','Unit','Unit Price','Quantity','Total Value']);
    sh.setFrozenRows(1);
  }
  var when = formatTimeHMS(new Date());
  var rows = (data.salesItems||[]).map(function(it){
    return [
      data.date,
      when,
      data.route,  // ✅ Added route column for filtering
      it.category||'',
      it.code||'',
      it.name||'',
      it.unit||'',
      Number(it.price||0),
      Number(it.quantity||0),
      Number(it.total||0)
    ];
  });
  if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length, rows[0].length).setValues(rows);
}
```

## Key Changes

1. **Single Sheet**: Added `SALES_ITEMS: 'SALES_ITEMS'` to `SHEET_NAMES` constant
2. **Route Column**: Added `Route` as the 3rd column to distinguish data by route
3. **Appends Data**: All sales items append to the same sheet with Date + Route identifiers
4. **Easy Filtering**: Can filter/query by Date and Route instead of navigating multiple sheets

## Benefits

✅ **Scalability**: One sheet regardless of number of days/routes
✅ **Performance**: Much faster sheet operations
✅ **Data Analysis**: Easier to create pivot tables, charts, and queries
✅ **Maintenance**: Simpler to manage and backup
✅ **Standards**: Follows database normalization principles

## Migration Notes

### For Existing Data
If you already have multiple `SALES_*` sheets:

1. **Backup your spreadsheet first**
2. Manually consolidate existing `SALES_*` sheets into the new `SALES_ITEMS` sheet
3. Add a `Route` column (3rd column) to existing data
4. Delete old `SALES_*` sheets after verification

### Sheet Structure
```
SALES_ITEMS Sheet:
┌────────────┬──────────┬─────────────┬──────────┬──────┬───────────┬──────┬────────────┬──────────┬─────────────┐
│ Date       │ Time     │ Route       │ Category │ Code │ Item Name │ Unit │ Unit Price │ Quantity │ Total Value │
├────────────┼──────────┼─────────────┼──────────┼──────┼───────────┼──────┼────────────┼──────────┼─────────────┤
│ 2025-01-15 │ 14:30:22 │ Al-Hasa 1   │ Popcorn  │ 1710 │ Cheese    │ bag  │ 5          │ 10       │ 50          │
│ 2025-01-15 │ 14:30:22 │ Al-Hasa 1   │ Seeds    │ 4402 │ 200g      │ bag  │ 58         │ 5        │ 290         │
│ 2025-01-16 │ 09:15:33 │ Al-Hasa 2   │ Popcorn  │ 1711 │ Butter    │ bag  │ 5          │ 8        │ 40          │
└────────────┴──────────┴─────────────┴──────────┴──────┴───────────┴──────┴────────────┴──────────┴─────────────┘
```

## Deployment Instructions

1. Open your Google Apps Script project: https://script.google.com
2. Replace the entire `Code.gs` file with the fixed version
3. Save the project
4. Deploy as a new version or update existing deployment
5. Test with a sample cash reconciliation submission

## Testing Checklist

- [ ] Submit cash reconciliation with sales items
- [ ] Verify data appears in `SALES_ITEMS` sheet
- [ ] Confirm Route column contains correct route name
- [ ] Submit for different route, verify it goes to same sheet
- [ ] Submit for different date, verify it goes to same sheet
- [ ] Check no new `SALES_*` sheets are created

## Additional Issues Found

While reviewing the code, I also identified:

1. **Incorrect difference calculation** in frontend (index.html:520)
   - Currently: `diff = systemBase - physicalBase`
   - Missing: Transfer and Additional Transfer values

2. **Duplicate `generateUserId()` function** (config.js + index.html)
   - Same function defined twice

Would you like me to fix these as well?
