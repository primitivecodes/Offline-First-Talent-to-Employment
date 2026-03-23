const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'noreply@talentplatform.rw';

// ── Generic send ───────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('Email send error:', err.message);
    // Non-fatal — log but do not crash the server
  }
};

// ── Welcome email after registration ──────────────────
const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to the Talent-to-Employment Platform!',
    html: `
      <h2>Hi ${user.name},</h2>
      <p>Your account has been created successfully as a <strong>${user.role}</strong>.</p>
      ${user.role === 'learner'
        ? `<p>You can browse the platform freely. When you are ready to access your first course,
           a one-time fee of <strong>$10</strong> will be requested via MTN Mobile Money.</p>`
        : ''}
      ${user.role === 'employer'
        ? `<p>To access graduate talent profiles, you will need an active monthly subscription of
           <strong>$20/month</strong> via MTN Mobile Money.</p>`
        : ''}
      <p>Let's build Africa's future together.</p>
      <p><strong>The ALU Talent Platform Team</strong></p>
    `,
  });

// ── Payment receipt ────────────────────────────────────
const sendPaymentReceipt = (user, payment) =>
  sendEmail({
    to: user.email,
    subject: `Payment Confirmed – ${payment.type === 'learner_access' ? 'Course Access' : 'Monthly Subscription'}`,
    html: `
      <h2>Payment Confirmed ✓</h2>
      <p>Hi ${user.name}, your payment has been received.</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Type</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.type === 'learner_access' ? 'One-time course access' : 'Monthly employer subscription'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Amount</strong></td>
            <td style="padding:8px;border:1px solid #ddd">$${payment.amountUSD} (${payment.amount} RWF)</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.phone}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Reference</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.id}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Date</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${new Date(payment.paidAt).toLocaleString()}</td></tr>
      </table>
      <p style="margin-top:20px">Thank you for investing in Africa's talent ecosystem.</p>
    `,
  });

// ── Subscription expiry warning ───────────────────────
const sendSubscriptionWarning = (user, daysLeft) =>
  sendEmail({
    to: user.email,
    subject: `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: `
      <h2>Subscription Reminder</h2>
      <p>Hi ${user.name}, your employer subscription expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
      <p>Log in to renew via MTN Mobile Money and keep your access to graduate talent profiles.</p>
    `,
  });

// ── Certificate issued notification ──────────────────
const sendCertificateEmail = (user, certificate) =>
  sendEmail({
    to: user.email,
    subject: `Certificate Issued: ${certificate.skillArea}`,
    html: `
      <h2>Congratulations ${user.name}! 🎉</h2>
      <p>You have successfully earned a certificate in <strong>${certificate.skillArea}</strong>.</p>
      <p>Your certificate has been added to your public portfolio and is now visible to verified employers.</p>
      <p>Certificate ID: <strong>${certificate.verificationCode}</strong></p>
    `,
  });

// ── New feedback notification ─────────────────────────
const sendFeedbackNotification = (learner, mentorName, submissionTitle) =>
  sendEmail({
    to: learner.email,
    subject: `New feedback on your submission: ${submissionTitle}`,
    html: `
      <h2>You have new feedback!</h2>
      <p>Hi ${learner.name}, <strong>${mentorName}</strong> has reviewed your submission 
      "<em>${submissionTitle}</em>" and left feedback.</p>
      <p>Log in to read the full feedback and continue your learning journey.</p>
    `,
  });

module.exports = {
  sendWelcomeEmail,
  sendPaymentReceipt,
  sendSubscriptionWarning,
  sendCertificateEmail,
  sendFeedbackNotification,
};
