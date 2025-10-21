# 🚀 Deployment Guide - ARS Inventory v2.0

Complete step-by-step guide to deploy the ARS Inventory Management System.

## Prerequisites

- [ ] Google Account with access to Google Sheets
- [ ] Google Spreadsheet ID: `1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0`
- [ ] Netlify account (or other hosting platform)
- [ ] Git repository access

## Step 1: Prepare Google Sheets

### 1.1 Open Spreadsheet

1. Go to https://docs.google.com/spreadsheets/d/1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0/edit
2. Verify you have edit access

### 1.2 Create Route Sheets (if not existing)

Create the following sheets with headers:

**Sheet names:**
- Al-Hasa 1
- Al-Hasa 2
- Al-Hasa 3
- Al-Hasa 4
- Al-Hasa Wholesale

**Headers for each sheet:**
```
Date | Time | Category | Code | Item Name | Physical | P.Unit | Transfer | T.Unit | Additional Transfer | Add Unit | System | S.Unit | Difference | Reimbursed | R.Unit
```

### 1.3 Verify Data Sheets

These will be auto-created, but you can create them manually:
- SALES_ITEMS
- INVENTORY_SNAPSHOT
- CASH_RECONCILIATION
- CASH_DENOMINATIONS
- ACTIVE_USERS
- ITEM_LOCKS
- METADATA

## Step 2: Deploy Google Apps Script

### 2.1 Open Apps Script Editor

1. In Google Sheets: **Extensions > Apps Script**
2. You'll see the Apps Script editor

### 2.2 Create Script Files

**File 1: Code.gs**
1. Delete any existing code in `Code.gs`
2. Copy entire content from `v2/backend/Code.gs`
3. Paste into the editor

**File 2: SheetCleanup.gs**
1. Click **+ (Add a file) > Script**
2. Name it `SheetCleanup`
3. Copy content from `v2/backend/SheetCleanup.gs`
4. Paste into the new file

### 2.3 Save the Project

1. Click the **Save** icon (💾)
2. Name your project: `ARS Inventory v2.0`

### 2.4 Test the Script

1. Select function: `testConnection` from dropdown
2. Click **Run** (▶️)
3. First time: Click **Review Permissions**
   - Choose your Google Account
   - Click **Advanced**
   - Click **Go to [Project Name] (unsafe)**
   - Click **Allow**
4. Check execution log - should see "SUCCESS"

### 2.5 Deploy as Web App

1. Click **Deploy > New deployment**
2. Click ⚙️ **Settings** icon next to "Select type"
3. Select **Web app**
4. Fill in:
   - **Description:** `ARS Inventory v2.0 - Initial Deployment`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone`
5. Click **Deploy**
6. **IMPORTANT:** Copy the **Web app URL**
   - Format: `https://script.google.com/macros/s/XXXX.../exec`
   - Save this URL - you'll need it for frontend config

### 2.6 Note Deployment ID

Save this information:
```
Deployment ID: [shown in deployment]
Web App URL: [the URL you copied]
```

## Step 3: Configure Frontend

### 3.1 Update Config File

1. Open `v2/frontend/config.js`
2. Replace the `GOOGLE_SCRIPT_URL` with your Web App URL:

```javascript
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ID_HERE/exec',
  // ... rest stays the same
};
```

3. Save the file

### 3.2 Test Locally (Optional)

```bash
cd v2/frontend
python -m http.server 8000
# or
npx serve
```

Open http://localhost:8000 in browser and test:
- [ ] Page loads
- [ ] Routes appear
- [ ] Sync status shows "Online"
- [ ] Can select a route
- [ ] Categories display
- [ ] Can expand items

## Step 4: Deploy to Netlify

### 4.1 Prepare Repository

1. Ensure code is in GitHub repository
2. Commit all changes:
```bash
git add .
git commit -m "Add ARS Inventory v2.0"
git push origin main
```

### 4.2 Create Netlify Site

1. Go to https://netlify.com
2. Click **Add new site > Import an existing project**
3. Connect to Git provider (GitHub)
4. Select your repository
5. Configure build settings:
   - **Base directory:** `v2/frontend`
   - **Build command:** (leave empty)
   - **Publish directory:** `v2/frontend`
6. Click **Deploy site**

### 4.3 Configure Custom Domain (Optional)

1. In Netlify site settings: **Domain management**
2. Add custom domain
3. Follow DNS configuration instructions

### 4.4 Enable HTTPS

1. In Netlify: **Domain settings**
2. **HTTPS** section
3. Click **Verify DNS configuration**
4. Enable HTTPS (automatic)

## Step 5: Test Production Deployment

### 5.1 Open Live Site

1. Go to your Netlify URL (e.g., `https://your-app.netlify.app`)
2. Bookmark this URL

### 5.2 Run Smoke Tests

- [ ] Page loads without errors
- [ ] Can select a route
- [ ] Categories expand/collapse
- [ ] Items expand/collapse
- [ ] Can enter inventory data
- [ ] Calculations work
- [ ] "Save to Sheets" works
- [ ] Data appears in Google Sheets
- [ ] Multiple users can access simultaneously
- [ ] Item locking works (test with 2 browser tabs)
- [ ] Offline mode activates when disconnected
- [ ] CSV export works

### 5.3 Test on Mobile

- [ ] Open on mobile browser
- [ ] UI is responsive
- [ ] Touch interactions work
- [ ] Can complete full workflow

## Step 6: Setup Cleanup Tools

### 6.1 Access Utilities Menu

1. Go to Google Sheets
2. Refresh the page
3. You should see **🛠️ ARS Utilities** menu
4. If not visible, run step 2.4 again

### 6.2 Run Initial Cleanup (if needed)

1. **Create Backup** first
2. Run **Full Cleanup** if you have old data
3. Verify in **CLEANUP_SUMMARY** sheet

## Step 7: User Onboarding

### 7.1 Create User Guide

Share the README.md with users:
- [ ] Basic workflow
- [ ] Keyboard shortcuts
- [ ] Action buttons explanation
- [ ] Troubleshooting guide

### 7.2 Train Users

Conduct training session covering:
1. Selecting routes
2. Entering inventory data
3. Understanding calculations
4. Saving data
5. Loading previous entries
6. Handling errors

### 7.3 Share Access

Send users:
- App URL: `https://your-app.netlify.app`
- User guide
- Support contact

## Step 8: Monitoring & Maintenance

### 8.1 Monitor Usage

Check regularly:
- **Google Sheets** - Data being saved correctly
- **Apps Script Executions** - No errors (Extensions > Apps Script > Executions)
- **Netlify Analytics** - Site uptime and performance

### 8.2 Regular Maintenance

**Weekly:**
- [ ] Check for duplicate entries
- [ ] Review error logs

**Monthly:**
- [ ] Run cleanup tools
- [ ] Create backup
- [ ] Review performance

**Quarterly:**
- [ ] Archive old data
- [ ] Update documentation
- [ ] Gather user feedback

### 8.3 Backup Strategy

**Automatic:**
- Google Sheets auto-saves
- Apps Script keeps revision history

**Manual:**
1. Use **Create Backup** from utilities menu
2. Store backups in separate Drive folder
3. Keep at least 3 monthly backups

## Troubleshooting Deployment

### Issue: "Script function not found"

**Solution:**
1. Verify all code is copied correctly
2. Check file names match (Code.gs, SheetCleanup.gs)
3. Save and re-deploy

### Issue: "Authorization required"

**Solution:**
1. In Apps Script: Run > Run function > testConnection
2. Authorize the app
3. Re-deploy if needed

### Issue: Frontend shows "No action specified"

**Solution:**
1. Verify `GOOGLE_SCRIPT_URL` in config.js is correct
2. Ensure Apps Script is deployed as Web App
3. Check deployment has "Anyone" access

### Issue: CORS errors

**Solution:**
- Ensure Apps Script is deployed with "Anyone" access
- Use form POST (already configured)
- Check browser console for specific errors

### Issue: Data not appearing in sheets

**Solution:**
1. Check route names match exactly
2. Verify sheet headers are correct
3. Check Apps Script execution logs for errors
4. Test with simple data first

## Rollback Procedure

If you need to rollback:

### Apps Script Rollback

1. Go to Apps Script
2. Click **Deploy > Manage deployments**
3. Find previous version
4. Click pencil icon to edit active deployment
5. Change version to previous
6. Click **Deploy**

### Frontend Rollback (Netlify)

1. Go to Netlify dashboard
2. Click **Deploys**
3. Find previous successful deploy
4. Click **...** menu
5. Click **Publish deploy**

### Data Recovery

1. Use backup created before deployment
2. Or use Google Sheets version history
3. File > Version history > See version history

## Post-Deployment Checklist

- [ ] Apps Script deployed and tested
- [ ] Frontend deployed to Netlify
- [ ] Config file updated with correct URL
- [ ] All routes accessible
- [ ] Data saving to sheets correctly
- [ ] Utilities menu working
- [ ] Backup created
- [ ] Users trained
- [ ] Documentation shared
- [ ] Monitoring setup
- [ ] Support contact shared

## Production URLs

**App URL:**
```
https://your-app.netlify.app
```

**Google Sheets:**
```
https://docs.google.com/spreadsheets/d/1o3rmIC2mSUAS-0d0-w62mDDHGzJznHf9qEjcHoyZEX0/edit
```

**Apps Script URL:**
```
https://script.google.com/macros/s/YOUR_ID/exec
```

## Support

For deployment issues:
1. Check browser console (F12)
2. Check Apps Script execution logs
3. Review this deployment guide
4. Contact system administrator

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Version:** 2.0.0
