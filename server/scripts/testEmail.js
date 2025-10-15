require('dotenv').config();
const nodemailer = require('nodemailer');

async function runTest() {
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

  if (!process.env.EMAIL_PASS) {
    console.error('No EMAIL_PASS found in environment. Set EMAIL_PASS (app password) and retry.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified OK');
  } catch (err) {
    console.error('Transporter verification failed:', err && err.message ? err.message : err);
    process.exit(1);
  }

  const to = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Test email from Expense Tracker - SMTP test',
    text: 'This is a test email to verify SMTP configuration.'
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info && info.messageId, info && info.response);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

runTest();
