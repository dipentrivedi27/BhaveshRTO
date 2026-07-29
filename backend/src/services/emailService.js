const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Lazy-initialize the mail transporter based on EMAIL_PROVIDER env var.
 * Supported: 'ethereal' (dev), 'smtp', 'sendgrid'
 */
async function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'ethereal';

  if (provider === 'ethereal') {
    // Create a free Ethereal test account automatically
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧  Ethereal email configured. Preview URL will be logged per email.');
    return transporter;
  }

  if (provider === 'sendgrid') {
    transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
    return transporter;
  }

  // Default: SMTP
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Send an OTP code to the admin email.
 * @param {string} to  - recipient email
 * @param {string} code - 6-digit OTP
 */
async function sendOTPEmail(to, code) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM || '"Bhavesh RTO CRM" <noreply@bhaveshrto.com>',
    to,
    subject: 'Your Login OTP — Bhavesh RTO CRM',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background:#f9f9f9; border-radius:8px;">
        <h2 style="color:#1e3a5f;">Bhavesh RTO & Insurance CRM</h2>
        <p>Use the following one-time password to complete your login:</p>
        <div style="font-size:40px; font-weight:bold; letter-spacing:10px; color:#1e3a5f; text-align:center; padding:24px; background:#fff; border-radius:8px; margin:16px 0;">
          ${code}
        </div>
        <p style="color:#888; font-size:13px;">This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. Do not share it with anyone.</p>
      </div>
    `,
  });

  // Log Ethereal preview URL in dev
  if (process.env.EMAIL_PROVIDER === 'ethereal' || !process.env.EMAIL_PROVIDER) {
    console.log('📧  Email preview URL:', nodemailer.getTestMessageUrl(info));
  }

  console.log(`📧  OTP email sent to ${to} — Code: ${code}`);
  return info;
}

module.exports = { sendOTPEmail };
