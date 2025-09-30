
// config.js for Inventory Tracking App
// Replace YOUR_DEPLOYMENT_ID with your actual Google Apps Script deployment ID

const CONFIG = {
    // Your Google Apps Script Web App URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwypCmWtoaQszCtDOkdsY02ZJAc9ul5eoe6oQc1rhdDjz4D7LkTMdKxPhPaugk_w7U/exec',
    
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