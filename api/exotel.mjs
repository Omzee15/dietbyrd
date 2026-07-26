// Exotel integration -- replaces Twilio for OTP verification (ExoVerify) and
// SMS/WhatsApp sending. Every function here is best-effort: if Exotel isn't
// configured yet (no credentials), each returns a clear "not configured"
// result instead of throwing, matching how the app already treated an
// unconfigured Twilio account -- callers don't need to change how they
// handle failures.
//
// NOTE on the WhatsApp template shape: Exotel's SMS API and ExoVerify API
// below are implemented against their documented request/response schemas.
// The WhatsApp template-message body was NOT fully confirmed against
// Exotel's own reference during implementation (their docs site didn't
// serve the detailed schema at fetch time) -- it's built on the documented
// base endpoint (`/v2/accounts/<sid>/messages`) plus the standard
// WhatsApp Cloud API template-message shape most providers mirror. Verify
// this against the Exotel API console once real credentials exist, before
// relying on it.

const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY || "";
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN || "";
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID || "";
const EXOTEL_SUBDOMAIN = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com"; // or api.in.exotel.com (Mumbai)
const EXOTEL_SMS_SENDER_ID = process.env.EXOTEL_SMS_SENDER_ID || ""; // ExoPhone or approved DLT Sender ID
const EXOTEL_DLT_ENTITY_ID = process.env.EXOTEL_DLT_ENTITY_ID || "";
const EXOTEL_SMS_DLT_TEMPLATE_ID = process.env.EXOTEL_SMS_DLT_TEMPLATE_ID || "";

const EXOTEL_EXOVERIFY_APP_ID = process.env.EXOTEL_EXOVERIFY_APP_ID || "";
const EXOTEL_EXOVERIFY_APP_SECRET = process.env.EXOTEL_EXOVERIFY_APP_SECRET || "";

const EXOTEL_WHATSAPP_FROM = process.env.EXOTEL_WHATSAPP_FROM || "";
const EXOTEL_WHATSAPP_TEMPLATE_WELCOME = process.env.EXOTEL_WHATSAPP_TEMPLATE_WELCOME || "";
const EXOTEL_WHATSAPP_TEMPLATE_REFERRAL = process.env.EXOTEL_WHATSAPP_TEMPLATE_REFERRAL || "";

export const exotelSmsConfigured = () =>
  Boolean(EXOTEL_API_KEY && EXOTEL_API_TOKEN && EXOTEL_ACCOUNT_SID && EXOTEL_SMS_SENDER_ID);

export const exotelWhatsAppConfigured = () =>
  Boolean(EXOTEL_API_KEY && EXOTEL_API_TOKEN && EXOTEL_ACCOUNT_SID && EXOTEL_WHATSAPP_FROM);

export const exotelVerifyConfigured = () =>
  Boolean(EXOTEL_EXOVERIFY_APP_ID && EXOTEL_EXOVERIFY_APP_SECRET && EXOTEL_ACCOUNT_SID);

const smsApiBase = () => `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}`;
const messagesApiBase = () => `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@${EXOTEL_SUBDOMAIN}/v2/accounts/${EXOTEL_ACCOUNT_SID}`;
const exoVerifyAuthHeader = () =>
  `Basic ${Buffer.from(`${EXOTEL_EXOVERIFY_APP_ID}:${EXOTEL_EXOVERIFY_APP_SECRET}`).toString("base64")}`;

// ── SMS ───────────────────────────────────────────────────────────────
export const sendExotelSms = async ({ to, body, dltTemplateId }) => {
  if (!exotelSmsConfigured()) {
    return { sent: false, reason: "exotel_sms_not_configured" };
  }
  try {
    const params = new URLSearchParams({
      From: EXOTEL_SMS_SENDER_ID,
      To: to,
      Body: body,
    });
    if (EXOTEL_DLT_ENTITY_ID) params.set("DltEntityId", EXOTEL_DLT_ENTITY_ID);
    const templateId = dltTemplateId || EXOTEL_SMS_DLT_TEMPLATE_ID;
    if (templateId) params.set("DltTemplateId", templateId);

    const res = await fetch(`${smsApiBase()}/Sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { sent: false, reason: "exotel_sms_failed", status: res.status, data };
    }
    return { sent: true, sid: data?.SMSMessage?.Sid, raw: data };
  } catch (err) {
    return { sent: false, reason: "exotel_sms_exception", error: err?.message || String(err) };
  }
};

// ── WhatsApp (template) ──────────────────────────────────────────────
export const sendExotelWhatsAppTemplate = async ({ to, templateId, variables = {}, languageCode = "en" }) => {
  if (!exotelWhatsAppConfigured()) {
    return { sent: false, reason: "exotel_whatsapp_not_configured" };
  }
  try {
    const body = {
      channel: "whatsapp",
      whatsapp: {
        messages: [
          {
            from: EXOTEL_WHATSAPP_FROM,
            to,
            content: {
              type: "template",
              template: {
                name: templateId,
                language: languageCode,
                components: Object.keys(variables).length
                  ? [
                      {
                        type: "body",
                        parameters: Object.values(variables).map((v) => ({ type: "text", text: String(v) })),
                      },
                    ]
                  : [],
              },
            },
          },
        ],
      },
    };

    const res = await fetch(`${messagesApiBase()}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { sent: false, reason: "exotel_whatsapp_failed", status: res.status, data };
    }
    return { sent: true, raw: data };
  } catch (err) {
    return { sent: false, reason: "exotel_whatsapp_exception", error: err?.message || String(err) };
  }
};

// ── WhatsApp (freeform text, only reliably deliverable inside an active
// customer-service window per WhatsApp policy -- same constraint this had
// under Twilio) ───────────────────────────────────────────────────────
export const sendExotelWhatsAppFreeform = async ({ to, body: text }) => {
  if (!exotelWhatsAppConfigured()) {
    return { sent: false, reason: "exotel_whatsapp_not_configured" };
  }
  try {
    const body = {
      channel: "whatsapp",
      whatsapp: {
        messages: [
          {
            from: EXOTEL_WHATSAPP_FROM,
            to,
            content: { type: "text", text: { body: text } },
          },
        ],
      },
    };
    const res = await fetch(`${messagesApiBase()}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { sent: false, reason: "exotel_whatsapp_failed", status: res.status, data };
    }
    return { sent: true, raw: data };
  } catch (err) {
    return { sent: false, reason: "exotel_whatsapp_exception", error: err?.message || String(err) };
  }
};

// ── ExoVerify (OTP) ───────────────────────────────────────────────────
export const startExotelVerification = async ({ phoneE164 }) => {
  if (!exotelVerifyConfigured()) {
    throw new Error("Exotel OTP is not configured. Please set EXOTEL_EXOVERIFY_APP_ID, EXOTEL_EXOVERIFY_APP_SECRET, and EXOTEL_ACCOUNT_SID.");
  }
  const res = await fetch(`https://exoverify.exotel.com/v2/accounts/${EXOTEL_ACCOUNT_SID}/verifications/sms`, {
    method: "POST",
    headers: {
      Authorization: exoVerifyAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      application_id: EXOTEL_EXOVERIFY_APP_ID,
      phone_number: phoneE164,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.response?.status !== "success") {
    const err = new Error(data?.response?.data?.message || `Exotel verification start failed (${res.status})`);
    err.raw = data;
    throw err;
  }
  return {
    verificationId: data.response.data.verification_id,
    expiresInSec: data.response.data.expiration_in_seconds,
  };
};

export const checkExotelVerification = async ({ verificationId, otp }) => {
  if (!exotelVerifyConfigured()) {
    throw new Error("Exotel OTP is not configured.");
  }
  const res = await fetch(
    `https://exoverify.exotel.com/v2/accounts/${EXOTEL_ACCOUNT_SID}/verifications/sms/${verificationId}`,
    {
      method: "POST",
      headers: {
        Authorization: exoVerifyAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ OTP: otp }),
    }
  );
  const data = await res.json().catch(() => ({}));
  const approved = res.ok && data?.response?.status === "success" && data?.response?.data?.status === "success";
  return { approved, raw: data };
};
