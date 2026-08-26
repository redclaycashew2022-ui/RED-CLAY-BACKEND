const twilio = require("twilio");

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error(
    "[twilio] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing from environment — " +
    "all SMS/WhatsApp sends will fail until these are set and the server is restarted."
  );
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const SMS_FROM = process.env.TWILIO_PHONE_NUMBER;
// Twilio's public sandbox WhatsApp sender. Replace TWILIO_WHATSAPP_NUMBER in .env
// with your own WhatsApp-enabled Twilio sender once you have one approved.
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
// Comma-separated list, e.g. ADMIN_WHATSAPP_NUMBER="+918754201900,+919865916608"
const ADMIN_WHATSAPP_TOS = (process.env.ADMIN_WHATSAPP_NUMBER || process.env.ADMIN_PHONE || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

// Customer/order phone numbers are stored as bare 10-digit numbers (see
// normalizePhone in db/index.js), with no country code. Twilio needs a full
// E.164 address, so assume India (+91) for any number that isn't already
// in "whatsapp:" or "+"-prefixed form.
const toWhatsAppAddress = (number) => {
  if (number.startsWith("whatsapp:")) return number;
  if (number.startsWith("+")) return `whatsapp:${number}`;
  return `whatsapp:+91${number.replace(/\D/g, "")}`;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries transient Twilio failures (network errors, 5xx, rate limits) with
// backoff. Does not retry on 4xx client errors (bad number, unverified
// sandbox contact, etc.) since retrying those wastes time and money.
const sendWithRetry = async (buildMessage, { label, retries = 2, delayMs = 1000 }) => {
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await client.messages.create(buildMessage());
      console.log(`[twilio] ${label} sent (sid=${result.sid}, attempt=${attempt})`);
      return result;
    } catch (err) {
      lastError = err;
      // 63007 ("could not find a Channel with the specified From address") is
      // transient on Twilio's shared WhatsApp Sandbox number — the sandbox
      // channel can momentarily drop/reactivate — so it's worth retrying
      // even though it's a 4xx. See https://www.twilio.com/docs/errors/63007
      const isTransientSandboxError = err.code === 63007;
      const isClientError = err.status >= 400 && err.status < 500 && !isTransientSandboxError;
      // Twilio's RestException carries the real diagnostic info in .code /
      // .moreInfo, not just .message — log all of it so failures are
      // actionable instead of a generic "Error sending message".
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

/**
 * Sends a login OTP via SMS.
 */
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
 * Sends to every number in ADMIN_WHATSAPP_NUMBER (comma-separated) and
 * throws if all of them fail; a failure on some but not all still notifies
 * whichever admins were reachable.
 */
const sendAdminWhatsApp = async (message) => {
  if (ADMIN_WHATSAPP_TOS.length === 0) {
    throw new Error("ADMIN_WHATSAPP_NUMBER (or ADMIN_PHONE) is not configured");
  }

  const results = await Promise.allSettled(
    ADMIN_WHATSAPP_TOS.map((to) =>
      sendWithRetry(
        () => ({
          body: message,
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
 */
const sendCustomerWhatsApp = async (phoneNumber, message) => {
  if (!phoneNumber) throw new Error("Customer phone number is required");

  return sendWithRetry(
    () => ({
      body: message,
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
