

const twilio = require("twilio");

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error(
    "[twilio] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing from environment — " +
    "all SMS/WhatsApp sends will fail until these are set and the server is restarted."
  );
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const SMS_FROM = process.env.TWILIO_PHONE_NUMBER;
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
const ADMIN_WHATSAPP_TOS = (process.env.ADMIN_WHATSAPP_NUMBER || process.env.ADMIN_PHONE || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const toWhatsAppAddress = (number) => {
  if (number.startsWith("whatsapp:")) return number;
  if (number.startsWith("+")) return `whatsapp:${number}`;
  return `whatsapp:+91${number.replace(/\D/g, "")}`;
};

// NEW: builds the right payload shape for client.messages.create depending
// on whether `content` is a plain string (free-form body, old behaviour) or
// a { contentSid, contentVariables } object (WhatsApp Content Template).
const buildContentPayload = (content) => {
  if (typeof content === "string") {
    return { body: content };
  }
  if (content && content.contentSid) {
    return {
      contentSid: content.contentSid,
      contentVariables: content.contentVariables,
    };
  }
  throw new Error(
    "sendAdminWhatsApp/sendCustomerWhatsApp expects a string body or a { contentSid, contentVariables } object"
  );
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async (buildMessage, { label, retries = 2, delayMs = 1000 }) => {
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await client.messages.create(buildMessage());
      console.log(`[twilio] ${label} sent (sid=${result.sid}, attempt=${attempt})`);
      return result;
    } catch (err) {
      lastError = err;
      const isTransientSandboxError = err.code === 63007;
      const isClientError = err.status >= 400 && err.status < 500 && !isTransientSandboxError;
      console.error(
        `[twilio] ${label} failed (attempt=${attempt}/${retries + 1}): ` +
        `status=${err.status} code=${err.code} message="${err.message}" moreInfo=${err.moreInfo || "n/a"}`
      );

      if (isClientError || attempt > retries) break;
      await wait(delayMs * attempt);
    }
  }

  throw lastError;
};

const generateOTPCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (phoneNumber, otp) => {
  if (!SMS_FROM) throw new Error("TWILIO_PHONE_NUMBER is not configured");

  return sendWithRetry(
    () => ({
      body: `Your RedClay Cashews & DryFruits OTP is ${otp}. It expires in 5 minutes. Do not share this code.`,
      from: SMS_FROM,
      to: phoneNumber,
    }),
    { label: `OTP SMS -> ${phoneNumber}` }
  );
};

/**
 * Notifies the store admin(s) over WhatsApp (new orders, alerts, etc).
 * `content` can be a plain string, or { contentSid, contentVariables } to
 * send an approved WhatsApp Content Template instead of free text.
 */
const sendAdminWhatsApp = async (content) => {
  if (ADMIN_WHATSAPP_TOS.length === 0) {
    throw new Error("ADMIN_WHATSAPP_NUMBER (or ADMIN_PHONE) is not configured");
  }

  const payload = buildContentPayload(content);

  const results = await Promise.allSettled(
    ADMIN_WHATSAPP_TOS.map((to) =>
      sendWithRetry(
        () => ({
          ...payload,
          from: WHATSAPP_FROM,
          to: toWhatsAppAddress(to),
        }),
        { label: `Admin WhatsApp notification -> ${to}` }
      )
    )
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length) {
    throw failures[0].reason;
  }

  return results;
};

/**
 * Sends an order-status update to a customer over WhatsApp.
 * `content` can be a plain string, or { contentSid, contentVariables } to
 * send an approved WhatsApp Content Template instead of free text.
 */
const sendCustomerWhatsApp = async (phoneNumber, content) => {
  if (!phoneNumber) throw new Error("Customer phone number is required");

  const payload = buildContentPayload(content);

  return sendWithRetry(
    () => ({
      ...payload,
      from: WHATSAPP_FROM,
      to: toWhatsAppAddress(phoneNumber),
    }),
    { label: `Customer WhatsApp -> ${phoneNumber}` }
  );
};

module.exports = {
  generateOTPCode,
  sendOTP,
  sendAdminWhatsApp,
  sendCustomerWhatsApp,
};