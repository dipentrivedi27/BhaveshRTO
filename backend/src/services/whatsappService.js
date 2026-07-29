/**
 * WhatsApp Service — pluggable provider interface.
 *
 * Set WHATSAPP_PROVIDER in .env:
 *   stub   → logs to console only (default dev mode)
 *   meta   → Meta WhatsApp Cloud API
 *   twilio → Twilio WhatsApp API
 *
 * All providers share the same interface:
 *   sendMessage(to, body) → { success, messageId, raw }
 */

const { MessageLog } = require('../models');

// ─── Message templates per category ─────────────────────────────────────────
const MESSAGE_TEMPLATES = {
  insurance: (name, endDate) =>
    `Hello ${name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *vehicle insurance* is expiring on *${endDate}*. Please renew it before the expiry date to avoid penalties.\n\nFor assistance, contact us anytime. Thank you! 🙏`,

  permit: (name, endDate) =>
    `Hello ${name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *vehicle permit* is expiring on *${endDate}*. Please arrange for renewal well in time.\n\nFor assistance, contact us anytime. Thank you! 🙏`,

  fitness_puc: (name, endDate) =>
    `Hello ${name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *Fitness / PUC certificate* is expiring on *${endDate}*. Please renew it before the due date.\n\nFor assistance, contact us anytime. Thank you! 🙏`,

  license: (name, endDate) =>
    `Hello ${name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *driving license* is due for renewal on *${endDate}*. Please complete the renewal process in time.\n\nFor assistance, contact us anytime. Thank you! 🙏`,
};

// ─── Provider: STUB ──────────────────────────────────────────────────────────
async function sendViaStub(to, body) {
  console.log(`\n📱  [WhatsApp STUB] To: ${to}`);
  console.log(`   Message: ${body}\n`);
  return { success: true, messageId: `stub_${Date.now()}`, raw: 'STUB mode' };
}

// ─── Provider: META Cloud API ────────────────────────────────────────────────
async function sendViaMeta(to, body) {
  const fetch = (await import('node-fetch')).default;
  const token = process.env.META_WA_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const version = process.env.META_WA_VERSION || 'v19.0';

  // Ensure number starts with country code (no '+')
  const cleanTo = to.replace(/[^\d]/g, '');

  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
  return { success: true, messageId: data.messages?.[0]?.id, raw: data };
}

// ─── Provider: TWILIO ────────────────────────────────────────────────────────
async function sendViaTwilio(to, body) {
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const cleanTo = to.startsWith('+') ? to : `+${to.replace(/[^\d]/g, '')}`;
  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${cleanTo}`,
    body,
  });
  return { success: true, messageId: message.sid, raw: message };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the category-specific WhatsApp message body.
 */
function buildMessage(customer) {
  const tmpl = MESSAGE_TEMPLATES[customer.category];
  if (!tmpl) throw new Error(`No template for category: ${customer.category}`);

  const endDate = customer.end_date
    ? new Date(customer.end_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : 'N/A';

  return tmpl(customer.name, endDate);
}

/**
 * Send a WhatsApp reminder for a customer and log the attempt.
 * @param {object} customer - Sequelize Customer instance
 * @returns {object} log entry
 */
async function sendReminder(customer) {
  const provider = process.env.WHATSAPP_PROVIDER || 'stub';
  const body = buildMessage(customer);

  let status = 'failed';
  let providerResponse = '';
  let messageId = null;

  try {
    let result;
    if (provider === 'meta') {
      result = await sendViaMeta(customer.contact_number, body);
    } else if (provider === 'twilio') {
      result = await sendViaTwilio(customer.contact_number, body);
    } else {
      result = await sendViaStub(customer.contact_number, body);
      status = 'stub';
    }

    if (result.success) {
      status = provider === 'stub' ? 'stub' : 'sent';
      messageId = result.messageId;
      providerResponse = JSON.stringify(result.raw);
    }
  } catch (err) {
    console.error(`[WhatsApp] Send failed for customer ${customer.id}:`, err.message);
    providerResponse = err.message;
    status = 'failed';
  }

  // Always log the attempt
  const log = await MessageLog.create({
    customer_id: customer.id,
    category: customer.category,
    message_body: body,
    sent_at: new Date(),
    status,
    provider_response: providerResponse,
  });

  return { log, status, messageId };
}

module.exports = { sendReminder, buildMessage, MESSAGE_TEMPLATES };
