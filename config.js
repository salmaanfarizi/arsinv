// config.js for Inventory Tracking App
// Replace YOUR_DEPLOYMENT_ID with your actual Google Apps Script deployment ID

const CONFIG = {
    // Netlify function proxy URL (avoids CORS issues)
    GOOGLE_SCRIPT_URL: '/.netlify/functions/proxy',

    // Polling configuration
    HEARTBEAT_INTERVAL: 15000, // 15 seconds
    POLLING_INTERVAL: 5000,    // 5 seconds

    // User identification
    USER_ID: localStorage.getItem('userId') || generateUserId()
};

function generateUserId() {
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
    return id;
}