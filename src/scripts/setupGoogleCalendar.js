const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '../config/google-calendar-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-calendar-credentials.json');

async function authorize() {
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  } catch (err) {
    console.error('Error loading credentials file:', err);
    console.log('\nPlease download credentials from Google Cloud Console:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create or select a project');
    console.log('3. Enable Google Calendar API');
    console.log('4. Create OAuth 2.0 credentials');
    console.log('5. Download and save as config/google-calendar-credentials.json');
    return;
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log('Token already exists. Google Calendar is configured.');
    return;
  }

  return getAccessToken(oAuth2Client);
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);

      if (!fs.existsSync(path.dirname(TOKEN_PATH))) {
        fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
      }
      
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', TOKEN_PATH);
      console.log('Google Calendar setup complete!');
    });
  });
}

authorize().catch(console.error);