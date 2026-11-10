import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// 1. Load environment variables from backend/.env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

import { MailService } from '../src/shared/utils/mailService';

async function testEmail() {
  console.log('\n========================================');
  console.log('   Ayatrio MailService Integration Test  ');
  console.log('========================================\n');
  console.log(`Loaded .env from: ${envPath}`);

  // 2. Optionally connect to MongoDB (required if testing Google OAuth tokens stored in the integrations collection)
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB successfully.\n');
    } catch (err: any) {
      console.warn(`MongoDB connection skipped: ${err?.message || err}. Testing with SMTP environment variables.\n`);
    }
  }

  // 3. Inspect status
  const status = await MailService.getStatus();
  console.log('MailService Status:');
  console.log(JSON.stringify(status, null, 2));
  console.log('----------------------------------------\n');

  // 4. Target recipient: pass via CLI arg (e.g. `npx tsx scripts/testEmail.ts you@example.com`) or fallback
  const recipient =
    process.argv[2] ||
    process.env.TEST_EMAIL_RECIPIENT ||
    process.env.AUTHORIZED_PRACTICE_EMAIL ||
    'searchaicloud@gmail.com';

  console.log(`Dispatching test email to: ${recipient}...`);

  // 5. Fire test email
  const result = await MailService.sendMail({
    to: recipient,
    subject: `Ayatrio MailService Test - ${new Date().toLocaleTimeString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">Ayatrio CA Practice Management</h2>
        <p>This is a live test email sent via <strong>MailService</strong> to verify your email configuration.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <ul style="line-height: 1.8;">
          <li><strong>Recipient:</strong> ${recipient}</li>
          <li><strong>Provider:</strong> ${status.provider}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">Sent from Ayatrio CRM Automated Email Service.</p>
      </div>
    `,
    text: `Ayatrio MailService Test\n\nThis is a live test email to verify your email configuration.\nRecipient: ${recipient}\nTimestamp: ${new Date().toISOString()}`,
  });

  console.log('\nSend Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`\nEmail delivered successfully via ${result.provider}! MessageId: ${result.messageId || 'N/A'}`);
  } else {
    console.error(`\nFailed to deliver email: ${result.error}`);
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(result.success ? 0 : 1);
}

testEmail().catch((err) => {
  console.error('\nFatal error executing test script:', err);
  process.exit(1);
});

