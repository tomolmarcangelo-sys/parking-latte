import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'no-reply@parkinglatte.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: '"Parking Latte" <no-reply@parkinglatte.com>',
    to: email,
    subject: '☕ Verify Your Parking Latte Account',
    html: `
      <div style="font-family: serif; color: #1A1410; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #3A2E28; border-radius: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #C8A27A; margin: 0;">Parking Latte</h1>
          <p style="font-style: italic; color: #A67B5B;">Brewing your digital experience</p>
        </div>
        <h2 style="font-size: 24px;">Welcome to the family!</h2>
        <p style="line-height: 1.6; font-size: 16px;">
          Thank you for joining Parking Latte. To start ordering your favorite brews, we just need to verify your email address.
        </p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationUrl}" style="background-color: #C8A27A; color: white; padding: 16px 32px; border-radius: 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">
            Verify My Email
          </a>
        </div>
        <p style="font-size: 14px; color: #A67B5B;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: 0; border-top: 1px solid #3A2E28; margin: 40px 0;" />
        <p style="font-size: 12px; color: #A67B5B; text-align: center;">
          &copy; 2024 Parking Latte Coffee Ordering System. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // In dev environment, we might want to log the link if email fails
    console.log('Verification link (dev fallback):', verificationUrl);
  }
};
