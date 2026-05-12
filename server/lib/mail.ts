import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: bold; color: #000000; text-decoration: none; }
        .content { background-color: #fcfaf8; border-radius: 40px; padding: 48px; border: 1px solid #eee5de; }
        h1 { font-family: 'Playfair Display', serif; font-size: 28px; color: #1a1a1a; margin-bottom: 16px; text-align: center; }
        p { font-size: 16px; color: #4a4a4a; margin-bottom: 32px; text-align: center; }
        .button-container { text-align: center; }
        .button { 
          display: inline-block; 
          background-color: #000000; 
          color: #ffffff !important; 
          padding: 18px 36px; 
          border-radius: 16px; 
          text-decoration: none; 
          font-weight: bold; 
          font-size: 16px;
          transition: transform 0.2s ease;
        }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999999; }
        .divider { border-top: 1px solid #eee5de; margin: 32px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="${process.env.FRONTEND_URL}" class="logo">Parking Latte</a>
        </div>
        <div class="content">
          <h1>Verify Your Identity</h1>
          <p>Welcome to the family. To complete your registration and start your Parking Latte experience, please confirm your email address.</p>
          <div class="button-container">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <div class="divider"></div>
          <p style="font-size: 14px; margin-bottom: 0;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Parking Latte. Sophisticated Coffee, Urban Vibe.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('[Mail] SENDGRID_API_KEY is not configured. Email will not be sent.');
      return;
    }

    await sgMail.send({
      to: email,
      from: {
        email: process.env.SMTP_FROM || 'noreply@parkinglatte.com',
        name: 'Parking Latte'
      },
      subject: 'Confirm Your Parking Latte Account',
      html,
    });
    console.log(`[Mail] Verification email sent to ${email}`);
  } catch (error: any) {
    console.error('[Mail] SendGrid API Error:', error);
    if (error.response) {
      console.error('[Mail] SendGrid Response Body:', JSON.stringify(error.response.body));
    }
    throw new Error('Failed to send verification email');
  }
};
