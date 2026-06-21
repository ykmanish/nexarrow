const { google } = require('googleapis');
const path = require('path');

async function testAppend() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'arbitrage.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const spreadsheetId = '1fdRd2sZvU-UKO3XEqFDJFWhH7UIVHlt31WwBkvoSGkk';
    
    const values = [
      [
        '21/06/2026', // Date
        'Test Person', // Person Name
        'Test Platform', // Remittance Platform
        'Test Bank', // Bank/Platform
        100000, // Remitting Volume (INR)
        90.5, // EUR Rate
        500, // Remittance Fees (INR)
        1100, // Received EUR
        'Test USDC', // USDC Buying Platform
        '21/06/2026', // USDC Buying Date
        'Seller: 1100 EUR @ 1.05 = 1155 USDC', // USDC Purchases
        'Test USDT', // USDT Selling Account Name
        '21/06/2026', // USDT Selling Date
        'Buyer: 1155 USDT @ 85 = 98175 INR', // USDT Sales
        98175, // Total USDT Sold (INR)
        -1825, // Gross Profit
        0, // Estonia Tax
        0, // India Tax
        -1825, // Net Profit
        'Test Note' // Notes
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'Arbitrage Transactions'!A:T",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log("Successfully appended test row");
  } catch (error) {
    console.error("Error:", error.message || error);
  }
}

testAppend();
