// Email configuration for Gmail SMTP
module.exports = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: `"MeetCute81" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
  // Note: For Gmail, you'll need to use an App Password if 2FA is enabled
  // or enable "Less secure app access" in your Google Account settings
};

// Email templates
module.exports.templates = {
  verifyEmail: (verificationUrl) => {
    const profileSetupUrl = verificationUrl.replace('/verify-email', '/profile-setup');
    return {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to MeetCute81! 👋</h2>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </p>
          <p>After verification, you'll be taken to set up your profile.</p>
          <p>Or copy and paste this link into your browser:</p>
          <p><code>${verificationUrl}</code></p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent to you because someone registered with this email address on MeetCute81.
          </p>
        </div>
      `,
      text: `Welcome to MeetCute81!\n\nThank you for signing up. Please verify your email address by visiting this URL:\n\n${verificationUrl}\n\nAfter verification, you'll be taken to set up your profile.\n\nIf you didn't create an account, you can safely ignore this email.`
    };
  },
  verifyCode: (code) => {
    return {
      subject: 'Your MeetCute81 Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align:center;">
          <h2>Welcome to MeetCute81! 👋</h2>
          <p>Use the verification code below to verify your email address:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${code}</p>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your MeetCute81 verification code is: ${code}. This code expires in 15 minutes.`
    };
  },
  passwordResetCode: (code) => {
    return {
      subject: 'Your MeetCute81 Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align:center;">
          <h2>Password Reset Request</h2>
          <p>Use the code below to reset your password:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${code}</p>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your password reset code is: ${code}. This code expires in 30 minutes.`
    };
  }
};
