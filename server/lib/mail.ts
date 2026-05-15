import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const BRAND_NAME = 'Parking Latte';
const BRAND_ADDRESS = 'HRA Plaza, Salog, Hinunangan, Southern Leyte';
const BRAND_PHONE = '+63 9120491154';
const BRAND_PRIMARY_COLOR = '#0f172a'; // Dark Slate
const VERIFIED_SENDER = 'tomolmarc@outlook.com';

const getBaseTemplate = (title: string, content: string, cta?: { label: string, url: string }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
        .wrapper { background-color: #0f172a; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); }
        .header { padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .logo { font-family: 'Playfair Display', serif; color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; text-decoration: none; }
        .content { padding: 40px; }
        h1 { font-family: 'Playfair Display', serif; color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 20px; }
        p { line-height: 1.6; color: #cbd5e1; font-size: 16px; margin-bottom: 24px; }
        .btn { display: inline-block; padding: 16px 32px; background-color: #ffffff; color: #0f172a !important; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; transition: opacity 0.2s; }
        .footer { padding: 40px; background-color: #0f172a; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .item-row { border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 0; display: flex; justify-content: space-between; }
        .item-name { font-weight: 600; color: #f8fafc; }
        .item-qty { color: #94a3b8; margin-right: 8px; }
        .item-price { font-weight: 700; color: #ffffff; }
        .total-row { padding-top: 20px; margin-top: 10px; border-top: 2px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #ffffff; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">${BRAND_NAME}</div>
            <p style="margin: 8px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; font-family: sans-serif; font-weight: 900;">Sophisticated Coffee, Urban Vibe</p>
          </div>
          <div class="content">
            <h1>${title}</h1>
            ${content}
            ${cta ? `
              <div style="text-align: center; margin-top: 40px;">
                <a href="${cta.url}" class="btn">${cta.label}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px; color: #94a3b8; font-weight: 700; font-size: 14px;">Parking Latte - Hinunangan</p>
            <p style="margin: 0 0 4px;">${BRAND_ADDRESS}</p>
            <p style="margin: 0 0 8px;">Phone: ${BRAND_PHONE}</p>
            <div style="margin: 20px 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
               <p style="margin: 0 0 10px; font-style: italic;">You are receiving this because you placed an order or registered an account at Parking Latte.</p>
               <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
            </div>
            <p style="margin-top: 15px; font-size: 10px; color: #475569;">
               <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from these notifications.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;
  const html = getBaseTemplate(
    'Verify Your Identity',
    '<p>Welcome to the family. To complete your registration and start your Parking Latte experience, please confirm your email address.</p>',
    { label: 'Verify Email Address', url: verificationUrl }
  );

  const text = `Welcome to Parking Latte!\n\nPlease verify your email address by clicking the link below:\n${verificationUrl}\n\nThank you,\nParking Latte Team`;

  await sendMail(email, 'Confirm Your Parking Latte Account', html, text);
};

export const sendOrderConfirmationEmail = async (order: any) => {
  const itemsHtml = order.items.map((item: any) => `
    <div style="display: table; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0;">
      <div style="display: table-cell; text-align: left;">
        <span style="color: #94a3b8;">${item.quantity}x</span>
        <span style="color: #f8fafc; font-weight: 600; margin-left: 8px;">${item.product.name}</span>
      </div>
      <div style="display: table-cell; text-align: right; color: #ffffff; font-weight: 700;">
        ₱${(Number(item.priceAtOrder) * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  const itemsText = order.items.map((item: any) => `- ${item.quantity}x ${item.product.name}: ₱${(Number(item.priceAtOrder) * item.quantity).toFixed(2)}`).join('\n');

  const content = `
    <p>Thank you for choosing Parking Latte. We've received your order and our baristas are getting ready to prepare your brew.</p>
    <div style="background-color: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin: 20px 0;">
      <p style="margin: 0 0 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 800;">Order #${order.id.slice(0, 8)}</p>
      ${itemsHtml}
      <div style="display: table; width: 100%; padding-top: 16px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="display: table-cell; text-align: left; color: #ffffff; font-weight: 800; font-size: 18px;">Total</div>
        <div style="display: table-cell; text-align: right; color: #ffffff; font-weight: 800; font-size: 18px;">₱${Number(order.totalAmount).toFixed(2)}</div>
      </div>
    </div>
    <p style="font-size: 14px; color: #94a3b8; font-style: italic;">We'll notify you once your order is ready for pickup.</p>
  `;

  const text = `Thank you for your order at Parking Latte!\n\nOrder #${order.id.slice(0, 8)}\n\n${itemsText}\n\nTotal: ₱${Number(order.totalAmount).toFixed(2)}\n\nWe'll notify you once it's ready!`;

  const statusUrl = `${process.env.FRONTEND_URL}/orders`;
  const html = getBaseTemplate(
    'Brewing in Progress',
    content,
    { label: 'View Order Status', url: statusUrl }
  );

  await sendMail(order.user.email, `Order Received: #${order.id.slice(0, 8)}`, html, text);
};

export const sendNewOrderAlertEmail = async (order: any) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const itemsText = order.items.map((item: any) => `- ${item.quantity}x ${item.product.name}`).join('\n');

  const content = `
    <p>A new order has been placed by <strong>${order.user.name}</strong>.</p>
    <div style="background-color: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin: 20px 0;">
      <p style="margin: 0 0 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 800;">Order Details</p>
      <div style="display: table; width: 100%;">
        <div style="display: table-cell; text-align: left; color: #cbd5e1;">Customer:</div>
        <div style="display: table-cell; text-align: right; color: #ffffff; font-weight: 600;">${order.user.name}</div>
      </div>
      <div style="display: table; width: 100%; margin-top: 8px;">
        <div style="display: table-cell; text-align: left; color: #cbd5e1;">Total Price:</div>
        <div style="display: table-cell; text-align: right; color: #ffffff; font-weight: 700; font-size: 20px;">₱${Number(order.totalAmount).toFixed(2)}</div>
      </div>
    </div>
    <p>Log in to the dashboard to view full details and start preparation.</p>
  `;

  const text = `New Order Alert!\n\nCustomer: ${order.user.name}\nTotal: ₱${Number(order.totalAmount).toFixed(2)}\n\nItems:\n${itemsText}\n\nPlease prepare immediately.`;

  const dashboardUrl = `${process.env.FRONTEND_URL}/staff`;
  const html = getBaseTemplate(
    'New Order Alert',
    content,
    { label: 'Open Dashboard', url: dashboardUrl }
  );

  await sendMail(adminEmail, `ACTION REQUIRED: New Order from ${order.user.name}`, html, text);
};

export const sendOrderReadyEmail = async (order: any) => {
  const content = `<p>Exciting news, ${order.user.name.split(' ')[0]}! Your order is prepared and waiting for you.</p>
    <p>Please head to the counter at <strong>HRA Plaza</strong> to pick up your order while it's fresh.</p>
    <div style="background-color: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #ffffff; font-weight: 600;">Order #${order.id.slice(0, 8)}</p>
    </div>`;

  const text = `Your brew is ready!\n\nHi ${order.user.name.split(' ')[0]},\n\nYour order #${order.id.slice(0, 8)} is ready for pickup at HRA Plaza.\n\nSee you soon!`;

  const html = getBaseTemplate(
    'Your Brew is Ready! ☕',
    content,
    { label: 'View Pickup Details', url: `${process.env.FRONTEND_URL}/orders` }
  );

  await sendMail(order.user.email, 'Your coffee is ready at Parking Latte!', html, text);
};

export const sendOrderCompletedEmail = async (order: any) => {
  const content = `<p>We hope you enjoyed your Parking Latte experience! Your order has been successfully picked up and completed.</p>
    <p>We'd love to hear your thoughts on your brew and our service.</p>
    <div style="margin: 30px 0; text-align: center;">
      <h2 style="font-family: 'Playfair Display', serif; color: #ffffff; margin-bottom: 16px;">Rate Your Experience</h2>
      <a href="https://g.page/r/YOUR_GOOGLE_PROFILE_ID/review" style="display: inline-block; padding: 12px 24px; background-color: rgba(255,255,255,0.05); color: #ffffff; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-weight: 600;">Leave a Review on Google</a>
    </div>`;

  const text = `Thank you for visiting Parking Latte!\n\nWe hope you enjoyed your order #${order.id.slice(0, 8)}.\n\nPlease leave us a review on Google to help us improve!\n\nSee you again!`;

  const html = getBaseTemplate(
    'Transaction Complete',
    content,
    { label: 'View Past Orders', url: `${process.env.FRONTEND_URL}/orders` }
  );

  await sendMail(order.user.email, 'Thank you for visiting Parking Latte!', html, text);
};

const sendMail = async (to: string, subject: string, html: string, text: string) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn(`[Mail] SendGrid API Key missing. Skipping email to ${to}`);
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@parkinglatte.com';

    await sgMail.send({
      to,
      from: {
        email: VERIFIED_SENDER,
        name: `${BRAND_NAME} Notifications`
      },
      replyTo: adminEmail,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${process.env.FRONTEND_URL}/unsubscribe>, <mailto:${adminEmail}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    });
    console.log(`[Mail] Email sent to ${to}: ${subject}`);
  } catch (error: any) {
    console.error(`[Mail] Error sending to ${to}:`, error.message);
    if (error.response) {
      console.error('[Mail] Response Body:', JSON.stringify(error.response.body));
    }
  }
};
