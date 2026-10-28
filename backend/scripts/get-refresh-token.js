const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
const clientSecret = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();
const port = 5050;
const redirectUri = `http://localhost:${port}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are required in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const scopes = [
  'https://www.googleapis.com/auth/drive',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
});

function saveRefreshToken(refreshToken) {
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
    envContent = envContent.replace(
      /#?\s*GOOGLE_DRIVE_REFRESH_TOKEN=.*/g,
      `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken.trim()}`
    );
  } else {
    envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken.trim()}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n🎉 SUCCESS! GOOGLE_DRIVE_REFRESH_TOKEN has been saved into backend/.env!');
  console.log('Please restart your backend server to apply changes.\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste code or refresh token here directly (if you have one): ', async (input) => {
  if (!input || !input.trim()) return;
  const val = input.trim();
  if (val.startsWith('1//') || val.startsWith('1/')) {
    // Already a refresh token
    saveRefreshToken(val);
    process.exit(0);
  } else {
    // Treat as authorization code
    try {
      console.log('\nExchanging code for tokens...');
      const { tokens } = await oauth2Client.getToken(val);
      if (tokens.refresh_token) {
        saveRefreshToken(tokens.refresh_token);
        process.exit(0);
      } else {
        console.warn('⚠️ No refresh token was returned. Make sure prompt=consent was used.');
      }
    } catch (e) {
      console.error('❌ Error exchanging code:', e.message);
    }
  }
});

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${port}`);

    // Handle manual token / code submission via form
    if (req.method === 'POST' && reqUrl.pathname === '/submit') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const params = new URLSearchParams(body);
        const tokenOrCode = (params.get('token') || '').trim();
        if (!tokenOrCode) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h3 style="font-family:sans-serif;color:red;padding:20px;">Error: No value entered. <a href="/">Go back</a></h3>');
          return;
        }

        if (tokenOrCode.startsWith('1//') || tokenOrCode.startsWith('1/')) {
          saveRefreshToken(tokenOrCode);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #10b981;">🎉 Refresh Token Saved Successfully!</h2>
              <p>Saved into <code>backend/.env</code>. You can now restart your backend server.</p>
            </div>
          `);
          setTimeout(() => process.exit(0), 1500);
        } else {
          try {
            const { tokens } = await oauth2Client.getToken(tokenOrCode);
            if (tokens.refresh_token) {
              saveRefreshToken(tokens.refresh_token);
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h2 style="color: #10b981;">🎉 Authorization Code Exchanged & Token Saved!</h2>
                  <p>Saved into <code>backend/.env</code>. You can now restart your backend server.</p>
                </div>
              `);
              setTimeout(() => process.exit(0), 1500);
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end('<h3 style="font-family:sans-serif;color:orange;padding:20px;">No refresh token returned. Try again or check consent permissions. <a href="/">Go back</a></h3>');
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<div style="font-family:sans-serif;padding:30px;"><h3 style="color:red;">Error: ${err.message}</h3><a href="/">Go back</a></div>`);
          }
        }
      });
      return;
    }

    // Handle OAuth Callback from Google
    if (reqUrl.pathname === '/oauth2callback') {
      const error = reqUrl.searchParams.get('error');
      if (error) {
        console.error('❌ Google Auth Error:', error);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px;">
            <h2 style="color: #ef4444;">❌ Authorization Cancelled or Failed</h2>
            <p>Google returned error: <b>${error}</b></p>
            <p><a href="/" style="color:#2563eb;font-weight:600;">Click here to return</a></p>
          </div>
        `);
        return;
      }

      const code = reqUrl.searchParams.get('code');
      if (code) {
        console.log('\n✅ Received authorization callback code from Google!');
        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          console.warn('⚠️ No refresh token returned.');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px;">
              <h2 style="color: #f59e0b;">⚠️ No New Refresh Token Returned</h2>
              <p>Google didn't return a refresh token because this account was previously authorized.</p>
              <p><a href="${authUrl}">Click here to re-authorize with forced consent</a></p>
            </div>
          `);
          return;
        }

        saveRefreshToken(refreshToken);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px;">
            <h2 style="color: #10b981;">✅ Authorization Successful!</h2>
            <p>Your Google Drive Refresh Token was automatically saved to <code>backend/.env</code>.</p>
            <p>You can close this tab now and restart the backend server.</p>
          </div>
        `);

        setTimeout(() => {
          rl.close();
          server.close();
          process.exit(0);
        }, 2000);
        return;
      }
    }

    // Landing UI for http://localhost:5050/
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Google Drive OAuth Setup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #1e293b; margin: 0; padding: 40px 16px; display: flex; justify-content: center; }
          .container { max-width: 620px; width: 100%; background: #ffffff; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05); padding: 32px; }
          h1 { font-size: 22px; margin-top: 0; color: #0f172a; display: flex; align-items: center; gap: 10px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; }
          .btn-primary { display: block; text-align: center; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 20px; border-radius: 8px; text-decoration: none; margin: 20px 0; transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.3); }
          .btn-primary:hover { background: #1d4ed8; }
          .warning-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 18px 0; font-size: 13px; line-height: 1.5; color: #1e40af; }
          .divider { border-top: 1px solid #e2e8f0; margin: 28px 0 20px; position: relative; text-align: center; }
          .divider span { position: relative; top: -11px; background: #ffffff; padding: 0 12px; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .form-group { margin-bottom: 14px; }
          label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
          input[type="text"] { width: 100%; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: monospace; outline: none; }
          input[type="text"]:focus { border-color: #3b82f6; ring: 2px solid #93c5fd; }
          .btn-secondary { background: #0f172a; color: #ffffff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; }
          .btn-secondary:hover { background: #334155; }
          .tip-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 14px; font-size: 13px; color: #92400e; margin-top: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Google Drive Authorization</h1>
          <p>Authorize your Google account so the application can store and preview digital signatures and company logos.</p>
          
          <a class="btn-primary" href="${authUrl}" target="_blank">👉 Click Here to Sign In with Google</a>

          <div class="tip-box">
            <b>💡 Seeing "400. That’s an error / malformed" on Google?</b><br>
            This happens when existing browser cookies for multiple Google accounts conflict. To fix immediately:
            <ol style="margin: 6px 0 0 18px; padding: 0;">
              <li>Right-click the button above and select <b>"Open link in incognito window"</b> (or InPrivate).</li>
              <li>Sign in with your Google account.</li>
            </ol>
          </div>

          <div class="divider"><span>OR ALTERNATIVELY</span></div>

          <form action="/submit" method="POST">
            <div class="form-group">
              <label for="token">Already have an Authorization Code or Refresh Token?</label>
              <input type="text" id="token" name="token" placeholder="Paste 1//... or 4/0A... code here" required />
            </div>
            <button type="submit" class="btn-secondary">Save Directly to .env</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + err.message);
  }
});

server.listen(port, () => {
  console.log('\n================================================================');
  console.log('         Google Drive OAuth 2.0 Authorization');
  console.log('================================================================\n');
  console.log(`🌐 Local Setup Page: http://localhost:${port}`);
  console.log('\n👉 Open this URL in your browser:\n');
  console.log(`   http://localhost:${port}`);
  console.log('\n👉 OR open the Google Sign-in link directly:\n');
  console.log(authUrl);
  console.log('\n----------------------------------------------------------------');
  console.log('💡 TIP: If Google says "400. That’s an error / malformed request":');
  console.log('   Open the link in an INCOGNITO / InPrivate browser window.');
  console.log('   (This is caused by old cached Google account cookies).');
  console.log('----------------------------------------------------------------\n');
});
