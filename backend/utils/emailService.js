import nodemailer from 'nodemailer';

/**
 * Enterprise Email Delivery Service for Finance360
 * Supports configurable SMTP providers (Gmail, SendGrid, Amazon SES, Mailgun, custom SMTP)
 * with graceful fallback and diagnostic logging for development environments.
 */

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  let from = process.env.SMTP_FROM || '';
  if (!from || from.includes('@finance360.local')) {
    from = user ? `"Finance360 Platform" <${user}>` : '"Finance360 Platform" <finance360@misar.io>';
  }
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const isConfigured = Boolean(host && user && pass);

  return { host, port, secure, user, pass, from, appUrl, isConfigured };
}

let transporterInstance = null;

function getTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) return null;

  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporterInstance;
}

export const emailService = {
  isConfigured() {
    return getSmtpConfig().isConfigured;
  },

  getAppUrl() {
    return getSmtpConfig().appUrl;
  },

  /**
   * Verify SMTP connectivity (non-blocking)
   */
  async verifyConnection() {
    const config = getSmtpConfig();
    if (!config.isConfigured) {
      return { ok: false, reason: 'SMTP credentials not configured in environment variables' };
    }
    try {
      const transporter = getTransporter();
      await transporter.verify();
      return { ok: true };
    } catch (err) {
      console.error('[Email Service] SMTP verification failed:', err.message);
      return { ok: false, reason: err.message };
    }
  },

  /**
   * Send Password Reset Email with single-use token
   */
  async sendPasswordResetEmail({ to, name, resetToken }) {
    const config = getSmtpConfig();
    const cleanTo = String(to || '').toLowerCase().trim();
    const recipientName = name ? name.trim() : cleanTo.split('@')[0];
    const resetLink = `${config.appUrl}/fin/reset-password?token=${encodeURIComponent(resetToken)}`;

    if (!config.isConfigured) {
      console.warn(
        `[Email Service Notice] SMTP not configured. Development reset link for ${cleanTo}:\n` +
        `--> ${resetLink}\n` +
        `To enable live emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend/.env.`
      );
      return {
        sent: false,
        reason: 'SMTP_NOT_CONFIGURED',
        previewLink: resetLink,
      };
    }

    const subject = 'Finance360 — Password Reset Request';
    const textBody =
      `Hello ${recipientName},\n\n` +
      `We received a request to reset your password for your Finance360 account.\n\n` +
      `To choose a new password, open the following link (expires in 15 minutes):\n` +
      `${resetLink}\n\n` +
      `If you did not request this change, please ignore this email or notify your system administrator immediately.\n\n` +
      `— Finance360 Security Team`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #0B1E36 0%, #1E56A0 100%); padding: 28px 32px; color: #ffffff; text-align: left; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 4px 0 0; font-size: 11px; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
          .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }
          .button-wrap { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
          .url-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-family: monospace; font-size: 11px; word-break: break-all; color: #475569; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Finance360</h1>
            <p>Financial Intelligence Suite</p>
          </div>
          <div class="content">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>We received a request to reset the password for your Finance360 user account (<code>${cleanTo}</code>).</p>
            <div class="button-wrap">
              <a href="${resetLink}" class="btn" target="_blank">Reset Your Password</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">This single-use link is valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">If the button above does not work, copy and paste this URL into your browser:</p>
            <div class="url-box">${resetLink}</div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Finance360 Intelligence Suite &bull; Automated Security Notice
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: config.from,
        to: cleanTo,
        subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`[Email Service] Password reset email delivered to ${cleanTo} (MessageId: ${info.messageId})`);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service Delivery Error] Could not send reset email to ${cleanTo}:`, err.message);
      return { sent: false, reason: 'DELIVERY_ERROR', error: err.message };
    }
  },

  /**
   * Send New User Welcome and Account Setup Email
   */
  async sendWelcomeInviteEmail({ to, name, setupToken, temporaryPassword = null }) {
    const config = getSmtpConfig();
    const cleanTo = String(to || '').toLowerCase().trim();
    const recipientName = name ? name.trim() : cleanTo.split('@')[0];
    const loginLink = `${config.appUrl}/fin/login`;
    const setupLink = `${config.appUrl}/fin/reset-password?token=${encodeURIComponent(setupToken)}`;
    const tempPassword = temporaryPassword || process.env.DEFAULT_USER_PASSWORD || 'Welcome@Finance360';

    if (!config.isConfigured) {
      console.warn(
        `[Email Service Notice] SMTP not configured. Development credentials for newly added user ${cleanTo}:\n` +
        `--> Username: ${cleanTo}\n` +
        `--> Temporary Password: ${tempPassword}\n` +
        `--> Direct Setup Link: ${setupLink}\n` +
        `--> Login Link: ${loginLink}`
      );
      return {
        sent: false,
        reason: 'SMTP_NOT_CONFIGURED',
        previewLink: setupLink,
        credentials: { username: cleanTo, temporaryPassword: tempPassword },
      };
    }

    const subject = 'Welcome to Finance360 — Your Account Credentials & Setup';
    const textBody =
      `Hello ${recipientName},\n\n` +
      `Your user account for Finance360 Financial Intelligence Suite has been created by your system administrator.\n\n` +
      `ACCOUNT CREDENTIALS:\n` +
      `--------------------------------------------------\n` +
      `Username / Email:   ${cleanTo}\n` +
      `Temporary Password: ${tempPassword}\n` +
      `Sign In URL:        ${loginLink}\n` +
      `--------------------------------------------------\n\n` +
      `IMPORTANT — FIRST SIGN-IN NOTE:\n` +
      `Please change your password upon your first sign in. For your initial sign in, please use the temporary password provided above. ` +
      `Upon entering these credentials, you will be prompted to create your new permanent password before accessing the system.\n\n` +
      `Alternatively, you can activate your account and configure your new password directly using this link:\n` +
      `${setupLink}\n\n` +
      `— Finance360 Security & Administration Team`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #0B1E36 0%, #1E56A0 100%); padding: 28px 32px; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 4px 0 0; font-size: 11px; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
          .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }
          .creds-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 22px; margin: 24px 0; }
          .creds-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 12px; }
          .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .cred-row:last-child { border-bottom: none; }
          .cred-label { color: #64748b; font-weight: 600; }
          .cred-val { font-family: monospace; font-weight: 700; color: #0f172a; }
          .cred-val-highlight { font-family: monospace; font-size: 14px; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 2px 8px; border-radius: 4px; }
          .notice-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 18px; margin: 24px 0; color: #78350f; font-size: 13px; line-height: 1.5; }
          .notice-title { font-weight: 700; font-size: 13px; color: #92400e; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
          .button-wrap { text-align: center; margin: 28px 0 16px 0; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 32px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25); }
          .alt-setup { text-align: center; font-size: 12px; color: #64748b; margin-top: 16px; }
          .alt-setup a { color: #2563eb; text-decoration: underline; font-weight: 600; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Finance360</h1>
            <p>Financial Intelligence Suite</p>
          </div>
          <div class="content">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>Your user account for <strong>Finance360</strong> has been configured by your system administrator. You have been granted access to the financial intelligence dashboard.</p>
            
            <div class="creds-card">
              <div class="creds-title">Your Sign-In Credentials</div>
              <div class="cred-row">
                <span class="cred-label">Username / Email:</span>
                <span class="cred-val">${cleanTo}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Temporary Password:</span>
                <span class="cred-val-highlight">${tempPassword}</span>
              </div>
            </div>

            <div class="notice-box">
              <div class="notice-title">⚠️ Mandatory First Sign-In Password Change</div>
              <div>Please change your password upon your first sign in. For your first sign in, please use the temporary password provided above. After logging in, you will be prompted to choose your permanent, secure password before accessing the system.</div>
            </div>

            <div class="button-wrap">
              <a href="${loginLink}" class="btn" target="_blank">Sign In to Finance360</a>
            </div>

            <div class="alt-setup">
              Prefer to set your permanent password directly? <br/>
              <a href="${setupLink}" target="_blank">Click here to activate and set your new password</a>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Finance360 Intelligence Suite &bull; Automated Security Notice
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: config.from,
        to: cleanTo,
        subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`[Email Service] Welcome email delivered to ${cleanTo} (MessageId: ${info.messageId})`);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service Delivery Error] Could not send welcome email to ${cleanTo}:`, err.message);
      return { sent: false, reason: 'DELIVERY_ERROR', error: err.message };
    }
  },
};

export default emailService;
