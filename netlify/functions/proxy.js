// Netlify serverless function to proxy requests to Google Apps Script
// This avoids CORS issues by making the request from the server side

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby69Ngv7yflRCqkOOtRznWOtzcJDMLltSFGkdWMZmTyYYiYvBNZrIkmffXpcdQTrVqk/exec';

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { action, payload } = body;

    // Create form data to send to Google Apps Script
    const formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('payload', JSON.stringify(payload));

    // Make the request to Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: formData.toString()
    });

    // Get the response text
    const responseText = await response.text();

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, return the raw text
      responseData = { status: 'error', data: responseText };
    }

    // Return the response from Google Apps Script
    return {
      statusCode: response.ok ? 200 : response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        data: error.message || 'Internal server error'
      })
    };
  }
};
