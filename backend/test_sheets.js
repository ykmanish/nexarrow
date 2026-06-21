const { google } = require('googleapis');
const path = require('path');

async function testSheet() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'arbitrage.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const spreadsheetId = '1fdRd2sZvU-UKO3XEqFDJFWhH7UIVHlt31WwBkvoSGkk';
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log("Sheet names:");
    response.data.sheets.forEach(sheet => {
      console.log(sheet.properties.title);
    });
  } catch (error) {
    console.error("Error:", error.message || error);
  }
}

testSheet();
