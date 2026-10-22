const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  const mailOptions = {
    from: `"Expense Flow" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: 'Expense Flow - Password Reset OTP',
    text: `Expense Flow - Password Reset\n\nYour OTP is:\n\n${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
    html: `
      <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1.5px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700;">ExpenseFlow</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Security Verification</p>
        </div>
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center; margin-bottom: 24px;">
          <p style="color: #475569; font-size: 14px; margin-top: 0; margin-bottom: 12px;">Your One-Time Password (OTP) for password reset is:</p>
          <div style="font-size: 32px; font-weight: 700; color: #1e3a8a; letter-spacing: 4px; line-height: 1;">${otp}</div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 12px; margin-bottom: 0;">This OTP will expire in 5 minutes.</p>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">Please enter this code on the password reset screen to verify your identity. For security, never share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendOTPEmail
};
