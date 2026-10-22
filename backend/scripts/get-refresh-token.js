const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const port = 5050;
const redirectUri = `http://localhost:${port}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are required in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
});

console.log('\n================================================================');
console.log('         Google Drive OAuth 2.0 Authorization');
console.log('================================================================\n');
console.log('👉 STEP 1: Open this link in your browser to sign in and authorize:\n');
console.log(authUrl);
console.log('\n----------------------------------------------------------------');
console.log(`NOTE: If you get "redirect_uri_mismatch", make sure:`);
console.log(`  http://localhost:${port}/oauth2callback`);
console.log(`is listed under "Authorized redirect URIs" in your Google Cloud Console.`);
console.log('----------------------------------------------------------------\n');
console.log(`Waiting for browser authorization redirect on http://localhost:${port}/oauth2callback ...`);
console.log('👉 OR paste the authorization code below and press Enter:\n');

function saveRefreshToken(refreshToken) {
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
    envContent = envContent.replace(
      /#?\s*GOOGLE_DRIVE_REFRESH_TOKEN=.*/g,
      `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
    );
  } else {
    envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n🎉 SUCCESS! GOOGLE_DRIVE_REFRESH_TOKEN has been saved into backend/.env!');
  console.log('Please restart your backend server to apply changes.\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste code here (if you have one): ', async (code) => {
  if (!code || !code.trim()) return;
  try {
    console.log('\nExchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code.trim());
    if (tokens.refresh_token) {
      saveRefreshToken(tokens.refresh_token);
      process.exit(0);
    } else {
      console.warn('⚠️ No refresh token was returned. Make sure prompt=consent was used.');
    }
  } catch (e) {
    console.error('❌ Error exchanging code:', e.message);
  }
});

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h3>Authorization code missing.</h3>');
        return;
      }

      console.log('\n✅ Received authorization callback code from browser!');
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        console.warn('⚠️ No refresh token returned.');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h3>No new refresh token returned. Try revoking app access and running again.</h3>');
        return;
      }

      saveRefreshToken(refreshToken);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #10b981;">✅ Authorization Successful!</h2>
          <p>Your Google Drive Refresh Token was automatically saved to <code>backend/.env</code>.</p>
          <p>You can close this tab and restart your backend server.</p>
        </div>
      `);

      setTimeout(() => {
        rl.close();
        server.close();
        process.exit(0);
      }, 2000);
    }
  } catch (err) {
    console.error('❌ Token exchange error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h3>Error: ${err.message}</h3>`);
  }
});

server.listen(port);
