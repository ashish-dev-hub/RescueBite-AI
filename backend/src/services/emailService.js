const nodemailer = require('nodemailer');

/**
 * Configure email transporter
 * Supports custom SMTP (Host, Port, User, Pass) or service (like 'gmail')
 */
const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  if (EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      service: EMAIL_SERVICE || 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  return null;
};

/**
 * Send password reset OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name
 */
const sendPasswordResetEmail = async (to, otp, userName = 'RescueBite Partner') => {
  const transporter = getTransporter();

  const appName = 'RescueBite AI';
  const fromAddress = process.env.EMAIL_FROM || `"RescueBite AI Support" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@rescuebite.org'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Your Password - RescueBite AI</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f5; margin: 0; padding: 20px; color: #1a3b34; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e1e7e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #1a3b34; color: #ffffff; padding: 24px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #4b5d56; margin-bottom: 20px; }
        .otp-box { background: #f0f7f4; border: 2px dashed #2f7d67; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2f7d67; margin: 0; font-family: monospace; }
        .expiry { font-size: 12px; color: #72847d; margin-top: 8px; }
        .alert-box { background: #fff8e6; border-left: 4px solid #e5a324; padding: 12px; border-radius: 4px; font-size: 12px; color: #7a5806; margin-top: 20px; }
        .footer { background: #f9fbfb; border-top: 1px solid #eef2f0; padding: 16px; text-align: center; font-size: 12px; color: #8e9e98; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>RescueBite AI</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${userName},</div>
          <div class="text">
            We received a request to reset the password for your RescueBite AI account (<strong>${to}</strong>).
            Use the 6-digit verification code below to complete your password reset:
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">This verification code is valid for <strong>15 minutes</strong>.</div>
          </div>
          <div class="text">
            If you did not initiate this request, you can safely ignore this email. Your account password will remain unchanged.
          </div>
          <div class="alert-box">
            <strong>Security Tip:</strong> Never share this verification code with anyone. RescueBite staff will never ask for your code or password.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RescueBite AI &mdash; Connecting Surplus Food to Communities in Need.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n======================================================');
    console.log(`[RescueBite Auth] PASSWORD RESET CODE for: ${to}`);
    console.log(`Code: ${otp}`);
    console.log(`Expires in: 15 minutes`);
    console.log(`(Email transporter not configured. Set SMTP_USER & SMTP_PASS in backend/.env to send real emails)`);
    console.log('======================================================\n');
    return {
      sent: false,
      preview: true,
      otp,
      message: 'Email service is running in local/test mode. Check server console for code.',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `[${appName}] Your Password Reset Code: ${otp}`,
      text: `Hello ${userName},\n\nYour password reset code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nRescueBite AI Team`,
      html: htmlContent,
    });

    console.log(`[RescueBite Auth] Password reset email sent to ${to}: ${info.messageId}`);
    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[RescueBite Auth] Error sending email via transporter:', error.message);
    // Don't crash; return fail status with fallback info
    return {
      sent: false,
      error: error.message,
      otp,
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
};

