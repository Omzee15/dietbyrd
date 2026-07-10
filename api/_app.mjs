import express from "express";
import cors from "cors";
import pg from "pg";
import twilio from "twilio";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import sgMail from "@sendgrid/mail";

const BCRYPT_ROUNDS = 10;

const { Pool } = pg;

// App environment
const APP_ENV = process.env.APP_ENV || "production";
const IS_DEV = APP_ENV === "dev";

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || process.env.TWILLO_ACCOUNT_SID || process.env.TWILLO_ACCOUNT_SD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || process.env.TWILLO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILLO_VERIFY_SERVICE_SID || "VA8d0807c34b0d64d7e01f4bd65f7079b2";
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+919076150904"; // Your registered WhatsApp Business number

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "";
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "DietByRD";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const getTwilioVerifyService = () => {
  if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
    
    throw new Error("Twilio OTP is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in .env");
  }

  return twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID);
};

// Generate a 6-digit OTP for dev mode
const generateDevOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP - uses mock in dev mode, Twilio in production
const sendOtpViaTwilio = async (phone, channel = "sms") => {
  const toNumber = formatPhoneE164(phone);
  const normalizedChannel = channel === "whatsapp" ? "whatsapp" : "sms";

  // Dev mode: generate mock OTP and log it
  if (IS_DEV) {
    const devOtp = generateDevOtp();
    const messageContent = `Your DietByRD verification code is: ${devOtp}. Valid for 5 minutes.`;

    console.log(`\n========== DEV MODE OTP ==========`);
    console.log(`Message send to ${toNumber}, message sent : ${messageContent}`);
    console.log(`==================================\n`);

    return {
      verification: { sid: `dev_${Date.now()}`, status: "pending" },
      toNumber,
      channel: normalizedChannel,
      devOtp // Return OTP for storage
    };
  }

  // Production mode: use Twilio Verify
  const service = getTwilioVerifyService();

  const verification = await service.verifications.create({
    to: toNumber,
    channel: normalizedChannel,
  });

  return { verification, toNumber, channel: normalizedChannel };
};

const verifyOtpViaTwilio = async (phone, otp) => {
  const toNumber = formatPhoneE164(phone);
  const service = getTwilioVerifyService();

  const verificationCheck = await service.verificationChecks.create({
    to: toNumber,
    code: otp,
  });

  return verificationCheck;
};

// OTP configuration
const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

// Template SIDs for WhatsApp messages (approved by Meta)
const TWILIO_TEMPLATE_WELCOME_SID = process.env.TWILIO_TEMPLATE_WELCOME_SID || "HX328f4bea0c71b8a51ca4dc299ebec18c";
const TWILIO_TEMPLATE_REFERRAL_SID = process.env.TWILIO_TEMPLATE_REFERRAL_SID || "HXa30600aedf64f90077f9bb14f2f30160";

// Send WhatsApp welcome message using approved template (best effort - doesn't fail if message fails)
const sendWelcomeWhatsApp = async (phone, name, patientId = null) => {
  const messageBody = `Hi ${name || 'there'}! ðŸ‘‹\n\nThank you for joining DietByRD! ðŸŽ‰\n\nOur team will contact you shortly to guide you through the onboarding process and help you get started on your health journey.\n\nIf you have any questions, feel free to reach out!\n\n- Team DietByRD`;

  try {
    if (!twilioClient) {
      console.log("[Welcome] Twilio client not configured, skipping welcome WhatsApp message");
      // Still store the message as pending/not-sent for tracking
      await storePatientMessage({
        patientId,
        phone,
        messageType: 'welcome_whatsapp',
        channel: 'whatsapp',
        content: messageBody,
        status: 'not_sent',
        metadata: { reason: 'twilio_not_configured' }
      });
      return;
    }

    const toNumber = `whatsapp:+91${phone.replace(/\D/g, '').replace(/^91/, '')}`;
    const userName = name || 'there';

    // Use content template for sending (works outside 24-hour window)
    await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: TWILIO_TEMPLATE_WELCOME_SID,
      contentVariables: JSON.stringify({ "1": userName })
    });
    console.log(`[Welcome] WhatsApp template message sent to ${toNumber}`);

    // Store the sent message
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'welcome_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'sent',
      metadata: { to: toNumber, templateSid: TWILIO_TEMPLATE_WELCOME_SID }
    });
  } catch (err) {
    // Log but don't fail - welcome message is best effort
    console.log(`[Welcome] WhatsApp send failed: ${err.message}`);

    // Store the failed message attempt
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'welcome_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'failed',
      metadata: { error: err.message }
    });
  }
};

// Send approval notification to a newly approved doctor/RD (best-effort, never throws)
const sendJoinApprovalNotification = async (phone, name, role) => {
  const roleLabel = role === "doctor" ? "Doctor" : "Dietician (RD)";
  const messageBody = `Hi ${name}! ðŸŽ‰\n\nYour application to join DietByRD as a ${roleLabel} has been approved!\n\nYou can now log in using your registered phone number and the password you set during sign-up.\n\nWelcome to the team!\n\n- Team DietByRD`;

  try {
    if (!twilioClient) {
      console.log(`[JoinApproval] Twilio not configured â€” skipping notification for ${phone}`);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    const toWhatsApp = `whatsapp:+91${cleanPhone}`;

    await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: toWhatsApp,
      body: messageBody,
    });
    console.log(`[JoinApproval] WhatsApp notification sent to ${toWhatsApp}`);
  } catch (err) {
    console.log(`[JoinApproval] Notification failed for ${phone}: ${err.message}`);
  }
};

const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM
  || process.env.TWILLO_SMS_FROM
  || process.env.TWILIO_PHONE_NUMBER
  || process.env.TWILLO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID
  || process.env.TWILLO_MESSAGING_SERVICE_SID;
const REFERRAL_SMS_MODE = String(process.env.REFERRAL_SMS_MODE || "log").trim().toLowerCase(); // log | twilio

let cachedSmsFrom = TWILIO_SMS_FROM || null;
let cachedMessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID || null;

const resolveTwilioSmsSender = async () => {
  if (cachedMessagingServiceSid) {
    try {
      const senderNumbers = await twilioClient.messaging.v1
        .services(cachedMessagingServiceSid)
        .phoneNumbers.list({ limit: 1 });

      if (senderNumbers.length > 0) {
        return {
          payload: { messagingServiceSid: cachedMessagingServiceSid },
          source: TWILIO_MESSAGING_SERVICE_SID ? "env_messaging_service_sid" : "account_messaging_service_sid",
        };
      }

      if (TWILIO_MESSAGING_SERVICE_SID) {
        console.log(`[Referral SMS] Configured messaging service ${cachedMessagingServiceSid} has no sender phone numbers attached`);
      }
      cachedMessagingServiceSid = null;
    } catch (err) {
      console.log(`[Referral SMS] Failed to validate messaging service ${cachedMessagingServiceSid}: ${err?.message || "unknown error"}`);
      cachedMessagingServiceSid = null;
    }
  }

  if (cachedSmsFrom) {
    return {
      payload: { from: cachedSmsFrom },
      source: TWILIO_SMS_FROM ? "env_sms_from" : "cached_account_number",
    };
  }

  if (!twilioClient) {
    return null;
  }

  try {
    const messagingServices = await twilioClient.messaging.v1.services.list({ limit: 20 });
    for (const service of messagingServices) {
      const senderNumbers = await twilioClient.messaging.v1
        .services(service.sid)
        .phoneNumbers.list({ limit: 1 });

      if (senderNumbers.length > 0) {
        cachedMessagingServiceSid = service.sid;
        return {
          payload: { messagingServiceSid: service.sid },
          source: "account_messaging_service_sid",
        };
      }
    }

    const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 20 });
    const smsNumber = incomingNumbers.find((entry) => entry?.capabilities?.sms)?.phoneNumber;

    if (!smsNumber) {
      return null;
    }

    cachedSmsFrom = smsNumber;
    return {
      payload: { from: smsNumber },
      source: "account_incoming_phone",
    };
  } catch (err) {
    console.log(`[Referral SMS] Failed to resolve sender from account: ${err?.message || "unknown error"}`);
    return null;
  }
};

// Send referral message via WhatsApp using approved template
const sendReferralWhatsApp = async ({ patientId, patientName, phone, doctorName, registrationLink }) => {
  const messageBody = `Hello ${patientName || "there"}!\n\nYou have been referred to DietByRD by Dr. ${doctorName || "your doctor"}.\n\nComplete your registration here:\n${registrationLink}\n\n- Team DietByRD`;

  // Format phone for WhatsApp
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
  const toNumber = `whatsapp:+91${cleanPhone}`;

  if (REFERRAL_SMS_MODE !== "twilio") {
    console.log("[Referral WhatsApp][LOG-ONLY] Message flow executed", {
      mode: REFERRAL_SMS_MODE,
      to: toNumber,
      patientName: patientName || "there",
      doctorName: doctorName || "your doctor",
      registrationLink,
      body: messageBody,
    });

    // Store the message even in log-only mode
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'sent',
      metadata: { to: toNumber, mode: 'log_only', doctorName, registrationLink }
    });

    return {
      sent: true,
      mode: "log_only",
      toNumber,
      reason: "console_logged_only",
    };
  }

  if (!twilioClient) {
    console.log("[Referral WhatsApp] Skipped: Twilio client not configured");

    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'not_sent',
      metadata: { reason: 'twilio_not_configured', doctorName }
    });

    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    // Use WhatsApp template with content variables
    // Template: Hello {{1}}! You have been referred to DietByRD by Dr. {{2}}. Complete your registration here: {{3}}
    // Strip "Dr." prefix from doctorName since template already includes it
    const cleanDoctorName = (doctorName || "your doctor").replace(/^Dr\.?\s*/i, '');

    // Try using Messaging Service if available, otherwise fall back to direct from number
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const msgOptions = {
      to: toNumber,
      contentSid: TWILIO_TEMPLATE_REFERRAL_SID,
      contentVariables: JSON.stringify({
        "1": patientName || "there",
        "2": cleanDoctorName,
        "3": registrationLink
      })
    };

    if (messagingServiceSid) {
      msgOptions.messagingServiceSid = messagingServiceSid;
    } else {
      msgOptions.from = TWILIO_WHATSAPP_FROM;
    }

    const msg = await twilioClient.messages.create(msgOptions);

    console.log(`[Referral WhatsApp] Sent successfully to ${toNumber}. SID: ${msg.sid}`);

    // Store successful message
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'sent',
      metadata: { to: toNumber, sid: msg.sid, templateSid: TWILIO_TEMPLATE_REFERRAL_SID, doctorName }
    });

    return { sent: true, sid: msg.sid, toNumber };
  } catch (err) {
    const code = err?.code || "unknown";
    const message = err?.message || "unknown error";
    console.log(`[Referral WhatsApp] Failed for ${toNumber}. code=${code} message=${message}`);

    // Store failed message attempt
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_whatsapp',
      channel: 'whatsapp',
      content: messageBody,
      status: 'failed',
      metadata: { to: toNumber, error: message, errorCode: code, doctorName }
    });

    return { sent: false, reason: "twilio_send_failed", code, message };
  }
};

// Legacy SMS function (kept for fallback if needed)
const sendReferralRegistrationSms = async ({ patientId, patientName, phone, doctorName, registrationLink }) => {
  const toNumber = formatPhoneE164(phone);
  const body = `Hello ${patientName || "there"}!\n\nYou have been referred to DietByRD by Dr. ${doctorName || "your doctor"}.\n\nComplete your registration here:\n${registrationLink}\n\n- Team DietByRD`;

  if (REFERRAL_SMS_MODE !== "twilio") {
    console.log("[Referral SMS][LOG-ONLY] Message flow executed", {
      mode: REFERRAL_SMS_MODE,
      to: toNumber,
      patientName: patientName || "there",
      doctorName: doctorName || "your doctor",
      registrationLink,
      body,
    });

    // Store the message even in log-only mode
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_sms',
      channel: 'sms',
      content: body,
      status: 'sent',
      metadata: { to: toNumber, mode: 'log_only', doctorName, registrationLink }
    });

    return {
      sent: true,
      mode: "log_only",
      toNumber,
      reason: "console_logged_only",
    };
  }

  if (!twilioClient) {
    console.log("[Referral SMS] Skipped: Twilio client not configured");

    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_sms',
      channel: 'sms',
      content: body,
      status: 'not_sent',
      metadata: { reason: 'twilio_not_configured', doctorName }
    });

    return { sent: false, reason: "twilio_not_configured" };
  }

  const sender = await resolveTwilioSmsSender();
  if (!sender) {
    console.log("[Referral SMS] Skipped: missing SMS sender (env and account number not available)");

    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_sms',
      channel: 'sms',
      content: body,
      status: 'not_sent',
      metadata: { reason: 'missing_sms_sender', doctorName }
    });

    return { sent: false, reason: "missing_sms_sender" };
  }

  try {
    const payload = {
      to: toNumber,
      body,
      ...sender.payload,
    };

    const msg = await twilioClient.messages.create(payload);
    console.log(`[Referral SMS] Sent successfully to ${toNumber}. SID: ${msg.sid}. senderSource=${sender.source}`);

    // Store successful message
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_sms',
      channel: 'sms',
      content: body,
      status: 'sent',
      metadata: { to: toNumber, sid: msg.sid, senderSource: sender.source, doctorName }
    });

    return { sent: true, sid: msg.sid, toNumber, senderSource: sender.source };
  } catch (err) {
    const code = err?.code || "unknown";
    const message = err?.message || "unknown error";
    console.log(`[Referral SMS] Failed for ${toNumber}. code=${code} message=${message}`);

    // Store failed message attempt
    await storePatientMessage({
      patientId,
      phone,
      messageType: 'referral_sms',
      channel: 'sms',
      content: body,
      status: 'failed',
      metadata: { to: toNumber, error: message, errorCode: code, doctorName }
    });

    return { sent: false, reason: "twilio_send_failed", code, message };
  }
};

const sendPasswordResetSms = async ({ phone, resetLink }) => {
  const toNumber = formatPhoneE164(phone);
  const body = `Reset your DietByRD password: ${resetLink}\nThis link expires in 15 minutes. If you did not request this, you can ignore this message.`;

  if (IS_DEV) {
    console.log("[Password Reset][DEV] SMS payload", { to: toNumber, body });
    return { sent: false, reason: "dev_mode", toNumber };
  }

  if (!twilioClient) {
    console.log("[Password Reset] Skipped: Twilio client not configured");
    return { sent: false, reason: "twilio_not_configured", toNumber };
  }

  const sender = await resolveTwilioSmsSender();
  if (!sender) {
    console.log("[Password Reset] Skipped: missing SMS sender (env and account number not available)");
    return { sent: false, reason: "missing_sms_sender", toNumber };
  }

  try {
    const payload = {
      to: toNumber,
      body,
      ...sender.payload,
    };

    const msg = await twilioClient.messages.create(payload);
    console.log(`[Password Reset] Sent successfully to ${toNumber}. SID: ${msg.sid}. senderSource=${sender.source}`);
    return { sent: true, sid: msg.sid, toNumber, senderSource: sender.source };
  } catch (err) {
    const code = err?.code || "unknown";
    const message = err?.message || "unknown error";
    console.log(`[Password Reset] Failed for ${toNumber}. code=${code} message=${message}`);
    return { sent: false, reason: "twilio_send_failed", code, message, toNumber };
  }
};

// Store message in patient_messages for history tracking (called after message is sent)
const storePatientMessage = async ({ patientId, phone, messageType, channel, content, status, metadata = {} }) => {
  try {
    if (!patientId && phone) {
      // Try to find patient by phone
      const result = await getPool().query(
        `SELECT p.id FROM dietbyrd_patients p
         LEFT JOIN dietbyrd_users u ON p.user_id = u.id
         WHERE regexp_replace(COALESCE(p.phone, u.phone, ''), '[^0-9]', '', 'g') LIKE $1
         LIMIT 1`,
        [`%${phone.replace(/\D/g, '').slice(-10)}`]
      );
      if (result.rows.length > 0) {
        patientId = result.rows[0].id;
      }
    }

    if (!patientId) {
      console.log(`[Message Store] Skipped: Could not find patient for phone ${phone}`);
      return { stored: false, reason: "patient_not_found" };
    }

    const message = {
      id: crypto.randomUUID(),
      type: messageType, // 'referral_sms', 'welcome_whatsapp', 'otp', etc.
      channel: channel,  // 'sms', 'whatsapp'
      content: content,
      status: status,    // 'sent', 'failed', 'pending'
      sent_at: new Date().toISOString(),
      sent_by: 'system',
      ...metadata
    };

    await getPool().query(
      `UPDATE dietbyrd_patients
       SET patient_messages = COALESCE(patient_messages, '[]'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [patientId, JSON.stringify([message])]
    );

    console.log(`[Message Store] Stored ${messageType} message for patient ${patientId}`);
    return { stored: true, patientId, messageId: message.id };
  } catch (err) {
    console.log(`[Message Store] Failed to store message: ${err.message}`);
    return { stored: false, reason: "storage_failed", error: err.message };
  }
};

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const buildPhoneVariants = (value) => {
  const input = String(value || "").trim();
  const digits = normalizePhoneDigits(input);
  const lastTenDigits = digits.length >= 10 ? digits.slice(-10) : digits;

  return [...new Set([
    input,
    digits,
    lastTenDigits,
    lastTenDigits ? `+91${lastTenDigits}` : "",
    lastTenDigits ? `91${lastTenDigits}` : "",
  ].filter(Boolean))];
};

const normalizePhoneForStorage = (value) => {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const normalizeIndianMobileForAuth = (value) => {
  const digits = normalizePhoneDigits(value);
  const lastTenDigits = digits.length >= 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(lastTenDigits)) {
    return null;
  }
  return {
    digits: lastTenDigits,
    e164: `+91${lastTenDigits}`,
    variants: buildPhoneVariants(lastTenDigits),
  };
};

const EMPLOYEE_AUTH_ROLES = [
  "doctor",
  "rd",
  "mlt_intern",
  "support",
  "support_intern",
  "assistant",
  "ops_manager",
  "founder",
  "tech_lead",
];

const getAuthProfileIds = async (user) => {
  let profileId = null;
  let doctorId = null;

  if (user.role === "doctor") {
    const doctorResult = await query("SELECT id FROM dietbyrd_doctors WHERE user_id = $1", [user.id]);
    if (doctorResult.rows.length > 0) profileId = doctorResult.rows[0].id;
  } else if (user.role === "assistant") {
    const assistantResult = await query("SELECT id, doctor_id FROM dietbyrd_assistants WHERE user_id = $1", [user.id]);
    if (assistantResult.rows.length > 0) {
      profileId = assistantResult.rows[0].id;
      doctorId = assistantResult.rows[0].doctor_id;
    }
  } else if (user.role === "rd") {
    const rdResult = await query("SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1", [user.id]);
    if (rdResult.rows.length > 0) profileId = rdResult.rows[0].id;
  } else if (user.role === "patient") {
    const patientResult = await query("SELECT id FROM dietbyrd_patients WHERE user_id = $1", [user.id]);
    if (patientResult.rows.length > 0) profileId = patientResult.rows[0].id;
  }

  return { profileId, doctorId };
};

const buildAuthUserPayload = async (user) => {
  const { profileId, doctorId } = await getAuthProfileIds(user);
  return {
    id: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
    profileId,
    doctorId,
    isVerified: user.is_verified ?? true,
  };
};

// Format phone number for E.164 (assumes Indian numbers if no country code)
const formatPhoneE164 = (phone) => {
  // Remove all non-digit characters
  let cleaned = normalizePhoneDigits(phone);

  // If starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits (Indian mobile), add +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If already has country code (11+ digits), just add +
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  // Fallback
  return `+91${cleaned}`;
};

// Short code generation for clean referral URLs
const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
const generateShortCode = () => {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return code;
};

let referralShortCodeColumnEnsured = false;
const ensureReferralShortCodeColumn = async () => {
  if (referralShortCodeColumnEnsured) return;
  try {
    await query(`ALTER TABLE dietbyrd_referrals ADD COLUMN IF NOT EXISTS short_code VARCHAR(16) UNIQUE`);
    await query(`ALTER TABLE dietbyrd_referrals ADD COLUMN IF NOT EXISTS registration_data JSONB`);
    await query(`CREATE INDEX IF NOT EXISTS idx_referrals_short_code ON dietbyrd_referrals(short_code)`);
    referralShortCodeColumnEnsured = true;
  } catch (err) {
    console.log(`[ReferralShortCode] Column setup skipped: ${err.message}`);
    referralShortCodeColumnEnsured = true;
  }
};

// Registration token generation and verification
const TOKEN_SECRET = process.env.REGISTRATION_TOKEN_SECRET || "dietbyrd-registration-secret-key-2024";
const TOKEN_EXPIRY = 48 * 60 * 60 * 1000; // 48 hours

const generateRegistrationToken = (patientData) => {
  const payload = {
    patientPhone: patientData.phone,
    patientName: patientData.patient_name,
    doctorId: patientData.doctor_id,
    doctorName: patientData.doctor_name,
    diagnosis: patientData.diagnosis,
    diagnosisDescription: patientData.diagnosis_description,
    timestamp: Date.now()
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64');

  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest('hex').substring(0, 32);

  return `${payloadBase64}.${signature}`;
};

const verifyRegistrationToken = (token) => {
  try {
    const [payloadBase64, signature] = token.split('.');

    const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest('hex').substring(0, 32);

    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Check if token is still valid (48 hours)
    if (Date.now() - payload.timestamp > TOKEN_EXPIRY) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (err) {
    throw new Error(`Invalid or expired registration token: ${err.message}`);
  }
};

// Database connection (lazy initialization for serverless)
const DATABASE_URL = process.env.DATABASE_URL || "";
const isDatabaseConfigured = Boolean(DATABASE_URL);

let pool;
const getPool = () => {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }

    const useSSL = DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('.neon.tech');

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PGPOOL_MAX || 1),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10000),
    });
  }
  return pool;
};

const query = async (text, params) => {
  const safeParams = params ? params.map(p => p === undefined ? null : p) : params;
  const res = await getPool().query(text, safeParams);
  return res;
};

const ADMIN_JOIN_REQUEST_ROLES = ["ops_manager", "mlt_intern", "founder", "tech_lead"];
const ADMIN_COMMISSION_ROLES = ["ops_manager", "founder", "tech_lead"];
const ADMIN_DOCTOR_ASSISTANT_ROLES = ["admin", "ops_manager", "founder", "tech_lead", "mlt_intern"];
const JOIN_REQUEST_RECIPIENT_ROLES = ["doctor", "rd"];

const getAuthContextFromHeaders = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const rawId = req.headers["x-user-id"];
    const rawRole = req.headers["x-user-role"];
    if (rawId && rawRole) {
      const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
      const roleValue = Array.isArray(rawRole) ? rawRole[0] : rawRole;
      const userId = parseInt(String(idValue), 10);
      if (!Number.isInteger(userId)) return { error: "Invalid user id" };
      const userResult = await query("SELECT id, role, email, phone, name FROM dietbyrd_users WHERE id = $1", [userId]);
      if (userResult.rows.length === 0) return { error: "User not found" };
      const user = userResult.rows[0];
      const role = String(roleValue).trim();
      if (user.role !== role) return { error: "Role mismatch" };
      return { userId, role, user, patientProfileId: req.headers["x-patient-id"] ? parseInt(String(req.headers["x-patient-id"]), 10) : null };
    }
    return { error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  
  const sessionResult = await query(
    `SELECT s.user_id, s.is_active, s.expires_at, u.role, u.email, u.phone, u.name 
     FROM dietbyrd_user_sessions s
     JOIN dietbyrd_users u ON s.user_id = u.id
     WHERE s.session_token = $1`,
    [token]
  );

  if (sessionResult.rows.length === 0) {
    return { error: "Invalid session token" };
  }

  const session = sessionResult.rows[0];

  if (!session.is_active) {
    return { error: "Session has been invalidated" };
  }

  if (new Date() > new Date(session.expires_at)) {
    await query("UPDATE dietbyrd_user_sessions SET is_active = false WHERE session_token = $1", [token]);
    return { error: "Session has expired" };
  }

  const patientProfileId = req.headers["x-patient-id"] ? parseInt(String(req.headers["x-patient-id"]), 10) : null;

  return {
    userId: session.user_id,
    role: session.role,
    user: {
      id: session.user_id,
      role: session.role,
      email: session.email,
      phone: session.phone,
      name: session.name
    },
    patientProfileId: Number.isInteger(patientProfileId) ? patientProfileId : null,
  };
};

const sendJoinRequestMessageEmail = async ({ recipientEmail, recipientName, senderName, message, subject }) => {
  if (!recipientEmail) {
    return { sent: false, reason: "missing_email" };
  }

  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.log("[JoinRequestMessage][email] SendGrid not configured", {
      to: recipientEmail,
      missingApiKey: !SENDGRID_API_KEY,
      missingFromEmail: !SENDGRID_FROM_EMAIL,
    });
    return { sent: false, reason: "sendgrid_not_configured" };
  }

  const resolvedSubject = subject || "Update on your DietByRD join request";
  const safeRecipient = recipientName || "there";
  const safeSender = senderName || "DietByRD team";
  const text = `Hi ${safeRecipient},\n\n${message}\n\n- DietByRD Team (from ${safeSender})`;
  const escapeHtml = (value) =>
    String(value).replace(/[&<>\"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
    }[char] || char));
  const html = `<p>Hi ${escapeHtml(safeRecipient)},</p><p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p><p>- DietByRD Team (from ${escapeHtml(safeSender)})</p>`;

  try {
    await sgMail.send({
      to: recipientEmail,
      from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
      subject: resolvedSubject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.log("[JoinRequestMessage][email] SendGrid error", {
      to: recipientEmail,
      error: err?.message || "unknown error",
    });
    return { sent: false, reason: "sendgrid_send_failed" };
  }
};

let paymentsTableInitialized = false;
const ensurePaymentsTable = async () => {
  if (paymentsTableInitialized) return;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_payments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
        registered_patient_id INTEGER REFERENCES dietbyrd_registered_patients(id) ON DELETE SET NULL,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        payment_type VARCHAR(20) NOT NULL DEFAULT 'manual',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        gateway_transaction_id VARCHAR(100),
        gateway_order_id VARCHAR(100),
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT dietbyrd_payments_payment_type_chk CHECK (payment_type IN ('initial', 'autopay', 'retry', 'manual')),
        CONSTRAINT dietbyrd_payments_status_chk CHECK (status IN ('pending', 'success', 'failed', 'refunded'))
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON dietbyrd_payments(patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_registered_patient_id ON dietbyrd_payments(registered_patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON dietbyrd_payments(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_created_at ON dietbyrd_payments(created_at DESC)`);

    paymentsTableInitialized = true;
  } catch (err) {
    console.error("Error ensuring payments table:", err.message);
  }
};

// Initialize OTP table (called lazily on first use)
let otpTableInitialized = false;
const ensureOtpTable = async () => {
  if (otpTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_otps (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(20) NOT NULL DEFAULT 'login',
        pending_data JSONB,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(phone, purpose)
      )
    `);
    otpTableInitialized = true;
  } catch (err) {
    console.error("Error creating OTP table:", err.message);
  }
};

// OTP helper functions
const storeOtp = async (phone, otp, purpose = 'login', pendingData = null) => {
  await ensureOtpTable();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  await query(`
    INSERT INTO dietbyrd_otps (phone, otp, purpose, pending_data, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (phone, purpose) 
    DO UPDATE SET otp = $2, pending_data = $4, expires_at = $5, verified = FALSE, created_at = CURRENT_TIMESTAMP
  `, [phone, otp, purpose, pendingData ? JSON.stringify(pendingData) : null, expiresAt]);
};

const verifyOtpFromDb = async (phone, otp, purpose = 'login') => {
  if (IS_DEV) {
    return { valid: true, pendingData: null };
  }

  await ensureOtpTable();
  const result = await query(`
    SELECT * FROM dietbyrd_otps
    WHERE phone = $1 AND purpose = $2 AND expires_at > NOW()
  `, [phone, purpose]);

  if (result.rows.length === 0) {
    return { valid: false, error: "OTP expired or not requested" };
  }

  const stored = result.rows[0];
  if (stored.otp !== otp) {
    return { valid: false, error: "Invalid OTP" };
  }

  // Mark as verified and return pending data
  await query(`UPDATE dietbyrd_otps SET verified = TRUE WHERE id = $1`, [stored.id]);

  return { valid: true, pendingData: stored.pending_data };
};

const clearOtp = async (phone, purpose = 'login') => {
  await ensureOtpTable();
  await query(`DELETE FROM dietbyrd_otps WHERE phone = $1 AND purpose = $2`, [phone, purpose]);
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// â”€â”€â”€ Health Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/health", async (_req, res) => {
  try {
    await getPool().query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

// â”€â”€â”€ Authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password required" });
    }

    // Find user by phone (now includes name and is_verified)
    const variants = buildPhoneVariants(phone);
    const userResult = await query(
      "SELECT id, phone, role, name, password, is_active, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    // Pending doctor/RD applicants should see their application status even if
    // they mistype or forget the password created during sign-up.
    if (["doctor", "rd"].includes(user.role) && !user.is_verified) {
      const jrResult = await query(
        `SELECT status, admin_message, rejection_reason
         FROM dietbyrd_join_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id]
      );
      const joinRequest = jrResult.rows[0] || {};
      return res.status(403).json({
        success: false,
        error: "Your account is pending approval",
        data: {
          pending: true,
          status: joinRequest.status || "pending",
          admin_message: joinRequest.admin_message || null,
          rejection_reason: joinRequest.rejection_reason || null,
        },
      });
    }

    // Compare password â€” supports both bcrypt hashes and legacy plain-text
    // (plain-text passwords are re-hashed on successful login for seamless migration)
    let isValidPassword = false;
    if (!user.password) {
      const legacyPasswords = new Set(["helloworld", "hello world"]);
      isValidPassword = legacyPasswords.has(String(password));
      if (isValidPassword) {
        const hashed = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
        await query("UPDATE dietbyrd_users SET password = $1 WHERE id = $2", [hashed, user.id]);
      }
    } else if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain-text â€” compare and re-hash immediately
      isValidPassword = user.password === password;
      if (isValidPassword) {
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await query("UPDATE dietbyrd_users SET password = $1 WHERE id = $2", [hashed, user.id]);
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    // Check if user is verified (doctors/RDs pending approval)
    if (!user.is_verified) {
      const jrResult = await query(
        "SELECT admin_message FROM dietbyrd_join_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      const adminMessage = jrResult.rows[0]?.admin_message || null;
      return res.status(403).json({
        success: false,
        error: "Your account is pending approval",
        data: { pending: true, admin_message: adminMessage },
      });
    }

    // Get profile ID based on role (for role-specific data)
    let profileId = null;
    let doctorId = null;

    if (user.role === "doctor") {
      const doctorResult = await query(
        "SELECT id FROM dietbyrd_doctors WHERE user_id = $1",
        [user.id]
      );
      if (doctorResult.rows.length > 0) {
        profileId = doctorResult.rows[0].id;
      }
    } else if (user.role === "assistant") {
      const assistantResult = await query(
        "SELECT id, doctor_id FROM dietbyrd_assistants WHERE user_id = $1",
        [user.id]
      );
      if (assistantResult.rows.length > 0) {
        profileId = assistantResult.rows[0].id;
        doctorId = assistantResult.rows[0].doctor_id;
      }
    } else if (user.role === "rd") {
      const rdResult = await query(
        "SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1",
        [user.id]
      );
      if (rdResult.rows.length > 0) {
        profileId = rdResult.rows[0].id;
      }
    } else if (user.role === "patient") {
      const patientResult = await query(
        "SELECT id FROM dietbyrd_patients WHERE user_id = $1",
        [user.id]
      );
      if (patientResult.rows.length > 0) {
        profileId = patientResult.rows[0].id;
      }
    }

    // Update last login
    await query(
      "UPDATE dietbyrd_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    // Consent logging for patients if provided
    if (user.role === "patient" && req.body.consent) {
      await query(
        `INSERT INTO dietbyrd_user_consents (user_id, consent_text_version, ip_address)
         VALUES ($1, $2, $3)`,
        [user.id, "v1", ipAddress]
      );
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        profileId,
        doctorId,
        isVerified: user.is_verified ?? true,
        token: sessionToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PASSWORD_RESET_RATE_LIMIT = 5;
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const passwordResetRateLimitMap = new Map();

const getPasswordResetRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const checkPasswordResetRateLimit = (ip) => {
  const now = Date.now();
  const windowStart = now - PASSWORD_RESET_WINDOW_MS;
  const timestamps = (passwordResetRateLimitMap.get(ip) || []).filter((t) => t > windowStart);
  if (timestamps.length >= PASSWORD_RESET_RATE_LIMIT) {
    const retryAfterSec = Math.ceil((timestamps[0] + PASSWORD_RESET_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  passwordResetRateLimitMap.set(ip, timestamps);
  return { allowed: true };
};

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email_or_phone } = req.body || {};

    const input = String(email_or_phone || "").trim();
    if (!input) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    const requestIp = getPasswordResetRequestIp(req);
    const rateCheck = checkPasswordResetRateLimit(requestIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      });
    }

    let userResult;
    if (input.includes("@")) {
      userResult = await query(
        "SELECT id, phone, email FROM dietbyrd_users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [input]
      );
    } else {
      const variants = buildPhoneVariants(input);
      userResult = await query(
        "SELECT id, phone, email FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
        [variants]
      );
    }

    if (userResult.rows.length === 0) {
      return res.json({ ok: true, message: "If an account exists, a reset link has been sent." });
    }

    const user = userResult.rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')",
      [user.id, tokenHash]
    );

    const resetLink = `https://dietbyrd.buildc3.tech/reset-password?token=${rawToken}`;

    if (user.phone) {
      await sendPasswordResetSms({ phone: user.phone, resetLink });
    } else {
      console.log("[Password Reset] User has no phone on file", { userId: user.id, email: user.email });
    }

    return res.json({ ok: true, message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body || {};

    if (!token || !new_password) {
      return res.status(400).json({ error: "Token and new_password are required" });
    }

    if (String(new_password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenResult = await query(
      "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()",
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const resetToken = tokenResult.rows[0];
    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await query("UPDATE dietbyrd_users SET password = $1 WHERE id = $2", [
      hashedPassword,
      resetToken.user_id,
    ]);

    await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [resetToken.id]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// â”€â”€â”€ Patient Signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { phone, password, name } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    const normalizedPhone = normalizePhoneForStorage(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: "Phone and password are required" });
    }

    // Check if user already exists
    const variants = buildPhoneVariants(phone);
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Create user as patient
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, is_active)
       VALUES ($1, $2, 'patient', $3, true)
       RETURNING id, phone, role, name`,
      [normalizedPhone, hashedPassword, name || null]
    );
    const user = userResult.rows[0];

    // Create patient record
    const patientResult = await query(
      `INSERT INTO dietbyrd_patients (user_id, phone, name, referral_source)
       VALUES ($1, $2, $3, 'content')
       RETURNING id`,
      [user.id, normalizedPhone, name || null]
    );

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    // Consent logging for patients if provided
    if (user.role === "patient" && req.body.consent) {
      await query(
        `INSERT INTO dietbyrd_user_consents (user_id, consent_text_version, ip_address)
         VALUES ($1, $2, $3)`,
        [user.id, "v1", ipAddress]
      );
    }

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        profileId: patientResult.rows[0].id,
        token: sessionToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/check-phone", async (req, res) => {
  try {
    const parsedPhone = normalizeIndianMobileForAuth(req.body?.phone);
    if (!parsedPhone) {
      return res.json({ success: true, exists: false, track: "invalid_phone" });
    }

    if (!isDatabaseConfigured) {
      return res.json({
        success: true,
        exists: false,
        track: "new_patient",
        data: { exists: false, track: "new_patient", auth_flow: "otp" },
        warning: "db_not_configured",
      });
    }

    const employeeResult = await query(
      `SELECT id, role
       FROM dietbyrd_users
       WHERE phone = ANY($1::text[])
         AND role::text = ANY($2::text[])
         AND COALESCE(is_active, true) = true
       LIMIT 1`,
      [parsedPhone.variants, EMPLOYEE_AUTH_ROLES]
    );

    if (employeeResult.rows.length > 0) {
      const role = employeeResult.rows[0].role;
      return res.json({
        success: true,
        exists: true,
        track: "employee",
        role,
        data: { exists: true, track: "employee", role, auth_flow: "password", user_role: role },
      });
    }

    const patientResult = await query(
      `SELECT p.id
       FROM dietbyrd_patients p
       LEFT JOIN dietbyrd_users u ON u.id = p.user_id
       WHERE p.phone = ANY($1::text[])
          OR u.phone = ANY($1::text[])
       LIMIT 1`,
      [parsedPhone.variants]
    );

    const track = patientResult.rows.length > 0 ? "patient" : "new_patient";

    return res.json({
      success: true,
      exists: patientResult.rows.length > 0,
      track,
      data: { exists: patientResult.rows.length > 0, track, auth_flow: "otp" },
    });
  } catch (err) {
    console.log(`[Auth] check-phone fallback: ${err?.message || "unknown error"}`);
    return res.json({
      success: true,
      exists: false,
      track: "new_patient",
      data: { exists: false, track: "new_patient", auth_flow: "otp" },
      warning: "lookup_failed",
    });
  }
});

app.post("/api/auth/employee/login", async (req, res) => {
  try {
    const { password } = req.body || {};
    const parsedPhone = normalizeIndianMobileForAuth(req.body?.phone);

    if (!parsedPhone || !password) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    const userResult = await query(
      `SELECT id, phone, role, name, password, is_active, is_verified
       FROM dietbyrd_users
       WHERE phone = ANY($1::text[])
         AND role::text = ANY($2::text[])
       LIMIT 1`,
      [parsedPhone.variants, EMPLOYEE_AUTH_ROLES]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    // Pending doctor/RD applicants should see their application status even if
    // they mistype or forget the password created during sign-up.
    if (["doctor", "rd"].includes(user.role) && !user.is_verified) {
      const jrResult = await query(
        `SELECT status, admin_message, rejection_reason
         FROM dietbyrd_join_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id]
      );
      const joinRequest = jrResult.rows[0] || {};
      return res.status(403).json({
        success: false,
        error: "Your account is pending approval",
        data: {
          pending: true,
          status: joinRequest.status || "pending",
          admin_message: joinRequest.admin_message || null,
          rejection_reason: joinRequest.rejection_reason || null,
        },
      });
    }

    if (!user.password || !/^\$2[aby]\$/.test(user.password)) {
      console.error(`[Auth] Refusing employee login for user ${user.id}: password is not a bcrypt hash`);
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    if (!user.is_verified) {
      const jrResult = await query(
        "SELECT admin_message FROM dietbyrd_join_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      const adminMessage = jrResult.rows[0]?.admin_message || null;
      return res.status(403).json({
        success: false,
        error: "Your account is pending approval",
        data: { pending: true, admin_message: adminMessage },
      });
    }

    await query("UPDATE dietbyrd_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    const payload = await buildAuthUserPayload(user);
    payload.token = sessionToken;

    return res.json({
      success: true,
      data: payload,
    });
  } catch (err) {
    console.error("[Auth] employee login error:", err);
    return res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

// â”€â”€â”€ OTP Authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// In-memory OTP rate limiter: max 3 sends per phone per 10 minutes
const OTP_RATE_LIMIT = 3;
const OTP_WINDOW_MS = 10 * 60 * 1000;
const otpRateLimitMap = new Map(); // phone -> [timestamp, ...]

function checkOtpRateLimit(phone) {
  const now = Date.now();
  const windowStart = now - OTP_WINDOW_MS;
  const timestamps = (otpRateLimitMap.get(phone) || []).filter(t => t > windowStart);
  if (timestamps.length >= OTP_RATE_LIMIT) {
    const retryAfterSec = Math.ceil((timestamps[0] + OTP_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  otpRateLimitMap.set(phone, timestamps);
  return { allowed: true };
}

const findPatientAuthUser = async (phoneVariants) => {
  const userResult = await query(
    `SELECT u.id, u.phone, u.role, u.name, u.is_active, u.is_verified
     FROM dietbyrd_users u
     WHERE u.phone = ANY($1::text[])
       AND u.role = 'patient'
     LIMIT 1`,
    [phoneVariants]
  );

  if (userResult.rows.length > 0) {
    return userResult.rows[0];
  }

  const patientResult = await query(
    `SELECT p.id AS patient_id, p.user_id, p.phone, p.name, u.id AS uid, u.phone AS user_phone,
            u.role, u.is_active, u.is_verified
     FROM dietbyrd_patients p
     LEFT JOIN dietbyrd_users u ON u.id = p.user_id
     WHERE p.phone = ANY($1::text[])
     LIMIT 1`,
    [phoneVariants]
  );

  if (patientResult.rows.length === 0) {
    return null;
  }

  const patient = patientResult.rows[0];
  if (patient.uid) {
    return {
      id: patient.uid,
      phone: patient.user_phone || patient.phone,
      role: patient.role || "patient",
      name: patient.name || "Patient",
      is_active: patient.is_active ?? true,
      is_verified: patient.is_verified ?? true,
    };
  }

  const normalizedPhone = normalizePhoneForStorage(patient.phone);
  const newUserResult = await query(
    `INSERT INTO dietbyrd_users (phone, role, name, is_active, is_verified)
     VALUES ($1, 'patient', $2, true, true)
     RETURNING id, phone, role, name, is_active, is_verified`,
    [normalizedPhone, patient.name || "Patient"]
  );
  const newUser = newUserResult.rows[0];

  await query("UPDATE dietbyrd_patients SET user_id = $1 WHERE id = $2", [newUser.id, patient.patient_id]);
  return newUser;
};

const ensurePatientAuthUser = async (parsedPhone) => {
  const existingUser = await findPatientAuthUser(parsedPhone.variants);
  if (existingUser) {
    return existingUser;
  }

  const newUserResult = await query(
    `INSERT INTO dietbyrd_users (phone, role, name, is_active, is_verified)
     VALUES ($1, 'patient', 'Patient', true, true)
     RETURNING id, phone, role, name, is_active, is_verified`,
    [parsedPhone.digits]
  );
  const newUser = newUserResult.rows[0];

  await query(
    `INSERT INTO dietbyrd_patients (user_id, phone, name, referral_source)
     VALUES ($1, $2, 'Patient', 'content')
     ON CONFLICT DO NOTHING`,
    [newUser.id, parsedPhone.digits]
  );

  return newUser;
};

app.post("/api/auth/patient/send-otp", async (req, res) => {
  try {
    const parsedPhone = normalizeIndianMobileForAuth(req.body?.phone);
    const channel = req.body?.channel || "sms";

    if (!parsedPhone) {
      return res.status(400).json({ success: false, error: "Please enter a valid mobile number" });
    }

    const rateCheck = checkOtpRateLimit(parsedPhone.e164);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many OTP requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      });
    }

    const result = await sendOtpViaTwilio(parsedPhone.e164, channel);
    const { verification, toNumber, channel: normalizedChannel, devOtp } = result;

    if (IS_DEV && devOtp) {
      await storeOtp(parsedPhone.e164, devOtp, "patient_login");
    }

    console.log(`[OTP] Patient auth OTP sent, SID: ${verification.sid}, Status: ${verification.status}`);
    return res.json({
      success: true,
      sent: true,
      message: normalizedChannel === "whatsapp" ? "OTP sent to your WhatsApp" : "OTP sent via SMS",
      to: toNumber,
      expiresIn: 120,
      expiresInSec: 120,
    });
  } catch (err) {
    console.error("[OTP] Patient send error:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again." });
  }
});

app.post("/api/auth/patient/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body || {};
    const parsedPhone = normalizeIndianMobileForAuth(req.body?.phone);

    if (!parsedPhone || !otp) {
      return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
    }

    if (IS_DEV) {
      const verifyResult = await verifyOtpFromDb(parsedPhone.e164, otp, "patient_login");
      if (!verifyResult.valid) {
        return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
      }
      await clearOtp(parsedPhone.e164, "patient_login");
    } else {
      try {
        const verificationCheck = await verifyOtpViaTwilio(parsedPhone.e164, otp);
        if (verificationCheck.status !== "approved") {
          return res.status(401).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Patient verify error:", twilioErr.message, twilioErr.code);
        return res.status(401).json({ success: false, error: "Invalid OTP. Please try again." });
      }
    }

    const user = await ensurePatientAuthUser(parsedPhone);
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    await query("UPDATE dietbyrd_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    // Consent logging for patients if provided
    if (req.body.consent) {
      await query(
        `INSERT INTO dietbyrd_user_consents (user_id, consent_text_version, ip_address)
         VALUES ($1, $2, $3)`,
        [user.id, "v1", ipAddress]
      );
    }

    const payload = await buildAuthUserPayload(user);
    payload.token = sessionToken;

    return res.json({
      success: true,
      data: payload,
    });
  } catch (err) {
    console.error("[OTP] Patient verify route error:", err);
    return res.status(500).json({ success: false, error: "Invalid OTP. Please try again." });
  }
});

// Send OTP via Twilio Verify (for login)
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const phoneForValidation = String(req.body?.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneForValidation)) {
      return res.status(400).json({ success: false, error: "Invalid Indian mobile number" });
    }

    const { phone, channel = "sms" } = req.body; // channel: "sms" or "whatsapp"

    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    const rateCheck = checkOtpRateLimit(phone);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many OTP requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      });
    }

    // Check if user exists
    const variants = buildPhoneVariants(phone);
    let userResult = await query(
      "SELECT id, phone, is_active FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    // If user doesn't exist, create a new patient account
    if (userResult.rows.length === 0) {
      console.log(`[OTP] New phone number detected: ${phone}. Creating patient account...`);

      try {
        const normalizedPhone = normalizePhoneForStorage(phone);
        if (!normalizedPhone) {
          return res.status(400).json({ success: false, error: "Phone number is required" });
        }

        // Create user with patient role
        const newUserResult = await query(
          `INSERT INTO dietbyrd_users (phone, role, is_active)
           VALUES ($1, 'patient', true)
           RETURNING id, phone, is_active`,
          [normalizedPhone]
        );

        const newUser = newUserResult.rows[0];

        // Create patient record
        await query(
          `INSERT INTO dietbyrd_patients (user_id, phone, referral_source)
           VALUES ($1, $2, 'doctor')`,
          [newUser.id, normalizedPhone]
        );

        console.log(`[OTP] Created new patient account for ${phone}, user_id: ${newUser.id}`);
        userResult = newUserResult; // Update userResult with the newly created user
      } catch (createErr) {
        console.error("[OTP] Failed to create new patient:", createErr.message);
        return res.status(500).json({ success: false, error: "Failed to create account. Please try again." });
      }
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    // Send OTP using Twilio Verify (or mock in dev mode)
    console.log(`[OTP] Sending login OTP to ${phone} via ${channel}`);

    try {
      const result = await sendOtpViaTwilio(phone, channel);
      const { verification, toNumber, channel: normalizedChannel, devOtp } = result;

      // In dev mode, store the OTP for verification
      if (IS_DEV && devOtp) {
        await storeOtp(phone, devOtp, 'login');
      }

      console.log(`[OTP] Verification sent, SID: ${verification.sid}, Status: ${verification.status}`);
      return res.json({
        success: true,
        message: normalizedChannel === "whatsapp" ? "OTP sent to your WhatsApp" : "OTP sent via SMS",
        to: toNumber,
        expiresIn: 120 // OTPs expire in 2 minutes
      });
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
      return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send OTP for registration (no account creation)
app.post("/api/auth/send-otp-registration", async (req, res) => {
  try {
    const { phone, channel = "sms" } = req.body;

    const parsedPhone = normalizeIndianMobileForAuth(phone);
    if (!parsedPhone) {
      return res.status(400).json({ success: false, error: "Please enter a valid Indian mobile number" });
    }

    const rateCheck = checkOtpRateLimit(parsedPhone.digits);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many OTP requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      });
    }

    // If account or an active application already exists, do not send a registration OTP.
    const existing = await query(
      "SELECT id, role, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [parsedPhone.variants]
    );
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (["doctor", "rd"].includes(user.role) && !user.is_verified) {
        return res.status(409).json({
          success: false,
          error: "An application already exists for this phone. Please log in to check approval status.",
          data: { pending: true },
        });
      }
      return res.status(409).json({ success: false, error: "Account already exists for this phone" });
    }

    const existingRequest = await query(
      `SELECT id, status FROM dietbyrd_join_requests
       WHERE phone = ANY($1::text[])
         AND status IN ('pending', 'interview_sent', 'approved')
       ORDER BY created_at DESC
       LIMIT 1`,
      [parsedPhone.variants]
    );
    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      return res.status(409).json({
        success: false,
        error: status === "approved"
          ? "This application is already approved. Please log in with your password."
          : "An application already exists for this phone. Please log in to check approval status.",
        data: { status, pending: status !== "approved" },
      });
    }

    // Send OTP using Twilio Verify (or mock in dev mode)
    try {
      const result = await sendOtpViaTwilio(parsedPhone.e164, channel);
      const { verification, toNumber, channel: normalizedChannel, devOtp } = result;

      // In dev mode, store the OTP for verification under 'registration'
      if (IS_DEV && devOtp) {
        await storeOtp(parsedPhone.digits, devOtp, 'registration');
      }

      return res.json({
        success: true,
        message: normalizedChannel === "whatsapp" ? "OTP sent to your WhatsApp" : "OTP sent via SMS",
        to: toNumber,
        expiresIn: 120,
      });
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr?.message || twilioErr, twilioErr?.code);
      return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP and login
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    // Verify OTP - use local DB in dev mode, Twilio in production
    if (IS_DEV) {
      const verifyResult = await verifyOtpFromDb(phone, otp, 'login');
      if (!verifyResult.valid) {
        return res.status(400).json({ success: false, error: verifyResult.error || "Invalid OTP." });
      }
      await clearOtp(phone, 'login');
    } else {
      try {
        const verificationCheck = await verifyOtpViaTwilio(phone, otp);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
    }

    // Find user and login
    const variants = buildPhoneVariants(phone);
    const userResult = await query(
      "SELECT id, phone, role, name, is_active, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    // If user doesn't exist, this is a new patient - they need to complete welcome form
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          isNewPatient: true,
          phone: phone,
          requiresWelcomeForm: true
        }
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    let patientDisplayName = null;

    // For patients, check if they have completed their profile
    if (user.role === "patient") {
      const patientResult = await query(
        "SELECT id, name, age, gender FROM dietbyrd_patients WHERE user_id = $1",
        [user.id]
      );

      // If patient profile doesn't exist or is incomplete, show welcome form
      if (patientResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            isNewPatient: true,
            phone: phone,
            requiresWelcomeForm: true,
            userId: user.id
          }
        });
      }

      const patientProfile = patientResult.rows[0];
      patientDisplayName = patientProfile.name || null;

      // Only prompt welcome form if patient has no name at all (truly first time)
      if (!patientProfile.name) {
        return res.json({
          success: true,
          data: {
            isNewPatient: true,
            phone: phone,
            requiresWelcomeForm: true,
            userId: user.id
          }
        });
      }
    }

    // Get profile ID based on role
    let profileId = null;
    let doctorId = null;

    if (user.role === "doctor") {
      const doctorResult = await query("SELECT id FROM dietbyrd_doctors WHERE user_id = $1", [user.id]);
      if (doctorResult.rows.length > 0) profileId = doctorResult.rows[0].id;
    } else if (user.role === "assistant") {
      const assistantResult = await query("SELECT id, doctor_id FROM dietbyrd_assistants WHERE user_id = $1", [user.id]);
      if (assistantResult.rows.length > 0) {
        profileId = assistantResult.rows[0].id;
        doctorId = assistantResult.rows[0].doctor_id;
      }
    } else if (user.role === "rd") {
      const rdResult = await query("SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1", [user.id]);
      if (rdResult.rows.length > 0) profileId = rdResult.rows[0].id;
    } else if (user.role === "patient") {
      const patientResult = await query("SELECT id FROM dietbyrd_patients WHERE user_id = $1", [user.id]);
      if (patientResult.rows.length > 0) profileId = patientResult.rows[0].id;
    }

    // Update last login
    await query("UPDATE dietbyrd_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: patientDisplayName || user.name,
        profileId,
        doctorId,
        isVerified: user.is_verified ?? true,
        isNewPatient: false,
        token: sessionToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complete patient welcome form for new patients
app.post("/api/auth/complete-welcome", async (req, res) => {
  try {
    const {
      phone,
      name,
      email,
      age,
      gender,
      diagnosis,
      diagnosisDescription,
      allergies,
      height,
      weight,
      workoutFrequency,
      dietaryPreference,
      state
    } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ success: false, error: "Phone and name are required" });
    }

    const variants = buildPhoneVariants(phone);
    const normalizedPhone = normalizePhoneForStorage(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: "Phone and name are required" });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id, phone, role, name, is_active, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    let userId, userPhone, userRole, userName;

    if (existingUser.rows.length > 0) {
      // User exists - just update/create their patient profile
      const user = existingUser.rows[0];
      userId = user.id;
      userPhone = user.phone;
      userRole = user.role;
      userName = name; // Use the provided name from the form

      // Update user name and email if they weren't set
      if (!user.name || email) {
        await query(
          "UPDATE dietbyrd_users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3",
          [name, email, userId]
        );
      }
    } else {
      // Create new user account
      const userResult = await query(
        `INSERT INTO dietbyrd_users (phone, role, name, email, is_active, is_verified) 
         VALUES ($1, 'patient', $2, $3, true, true) 
         RETURNING id, phone, role, name, is_active, is_verified`,
        [normalizedPhone, name, email]
      );

      const newUser = userResult.rows[0];
      userId = newUser.id;
      userPhone = newUser.phone;
      userRole = newUser.role;
      userName = newUser.name;
    }

    // Check if patient profile exists
    const existingPatient = await query(
      "SELECT id FROM dietbyrd_patients WHERE user_id = $1",
      [userId]
    );

    let patientId;

    if (existingPatient.rows.length > 0) {
      // Update existing patient profile
      patientId = existingPatient.rows[0].id;
      await query(
        `UPDATE dietbyrd_patients SET 
          name = $1,
          email = $2,
          age = $3, 
          gender = $4, 
          diagnosis = $5, 
          diagnosis_description = $6,
          allergies = $7, 
          height = $8, 
          weight = $9, 
          workout_frequency = $10,
          state = $11,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $12`,
        [
          name,
          email,
          age || null,
          gender || null,
          diagnosis || null,
          diagnosisDescription || null,
          allergies ? JSON.stringify(allergies) : null,
          height || null,
          weight || null,
          workoutFrequency || null,
          state || null,
          patientId
        ]
      );
    } else {
      // Create new patient profile
      const patientResult = await query(
        `INSERT INTO dietbyrd_patients (
          user_id, name, phone, email, age, gender, diagnosis, diagnosis_description,
          allergies, height, weight, workout_frequency, state, referral_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'self_signup')
        RETURNING id`,
        [
          userId,
          name,
          phone,
          email,
          age || null,
          gender || null,
          diagnosis || null,
          diagnosisDescription || null,
          allergies ? JSON.stringify(allergies) : null,
          height || null,
          weight || null,
          workoutFrequency || null,
          state || null
        ]
      );

      patientId = patientResult.rows[0].id;
    }

    // Update last login
    await query("UPDATE dietbyrd_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [userId]);

    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = req.body.device_fingerprint || req.headers["user-agent"] || "unknown";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO dietbyrd_user_sessions (user_id, session_token, device_fingerprint, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, sessionToken, deviceFingerprint, ipAddress, expiresAt]
    );

    // Consent logging for patients if provided
    if (req.body.consent) {
      await query(
        `INSERT INTO dietbyrd_user_consents (user_id, consent_text_version, ip_address)
         VALUES ($1, $2, $3)`,
        [userId, "v1", ipAddress]
      );
    }

    // Return user session data
    res.json({
      success: true,
      data: {
        id: userId,
        phone: userPhone,
        role: userRole,
        name: userName,
        profileId: patientId,
        isVerified: true,
        isNewPatient: false,
        token: sessionToken,
      },
    });
  } catch (err) {
    console.error("[Welcome] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout current session
app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await query("DELETE FROM dietbyrd_user_sessions WHERE session_token = $1", [token]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[Auth] Logout error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Log user consent
app.post("/api/auth/consent", async (req, res) => {
  try {
    const auth = await getAuthContextFromReq(req);
    if (!auth) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { user_id, consent_version } = req.body;
    if (auth.id !== user_id) return res.status(403).json({ success: false, error: "Forbidden" });

    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    
    await query(
      "INSERT INTO dietbyrd_user_consents (user_id, consent_version, ip_address) VALUES ($1, $2, $3)",
      [user_id, consent_version, ip_address]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[Auth] Consent error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
async function getAuthContextFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const { rows } = await query(`
    SELECT u.id, u.role, u.phone 
    FROM dietbyrd_users u
    JOIN dietbyrd_user_sessions s ON u.id = s.user_id
    WHERE s.session_token = $1 AND s.expires_at > NOW()
  `, [token]);
  return rows[0] || null;
}


// Verify OTP only (without login), used for referred-user password setup
app.post("/api/auth/verify-otp-only", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    if (!IS_DEV) {
      try {
        const verificationCheck = await verifyOtpViaTwilio(phone, otp);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
    }

    const variants = buildPhoneVariants(phone);
    const userResult = await query(
      "SELECT id, is_active FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!userResult.rows[0].is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    return res.json({ success: true, data: { verified: true } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP for join request registration (no account creation/checking)
app.post("/api/auth/verify-otp-registration", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const parsedPhone = normalizeIndianMobileForAuth(phone);
    if (!parsedPhone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    // Verify OTP - use local DB in dev mode, Twilio in production
    if (IS_DEV) {
      const verifyResult = await verifyOtpFromDb(parsedPhone.digits, otp, 'registration');
      if (!verifyResult.valid) {
        return res.status(400).json({ success: false, error: verifyResult.error || "Invalid OTP." });
      }
      await clearOtp(parsedPhone.digits, 'registration');
    } else {
      try {
        const verificationCheck = await verifyOtpViaTwilio(parsedPhone.e164, otp);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
    }

    // Just return success - no account creation or checking
    return res.json({ success: true, data: { verified: true, phone: parsedPhone.digits } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Set password after OTP verification and sign user in
app.post("/api/auth/set-password-after-otp", async (req, res) => {
  try {
    const { phone, otp, password } = req.body;

    if (!phone || !otp || !password) {
      return res.status(400).json({ success: false, error: "Phone, OTP, and password are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    if (!IS_DEV) {
      try {
        const verificationCheck = await verifyOtpViaTwilio(phone, otp);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
    }

    const variants = buildPhoneVariants(phone);
    const userResult = await query(
      "SELECT id, phone, role, name, is_active, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    const hashedPw = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await query(
      "UPDATE dietbyrd_users SET password = $1, last_login_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPw, user.id]
    );

    let profileId = null;
    let doctorId = null;

    if (user.role === "doctor") {
      const doctorResult = await query("SELECT id FROM dietbyrd_doctors WHERE user_id = $1", [user.id]);
      if (doctorResult.rows.length > 0) profileId = doctorResult.rows[0].id;
    } else if (user.role === "assistant") {
      const assistantResult = await query("SELECT id, doctor_id FROM dietbyrd_assistants WHERE user_id = $1", [user.id]);
      if (assistantResult.rows.length > 0) {
        profileId = assistantResult.rows[0].id;
        doctorId = assistantResult.rows[0].doctor_id;
      }
    } else if (user.role === "rd") {
      const rdResult = await query("SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1", [user.id]);
      if (rdResult.rows.length > 0) profileId = rdResult.rows[0].id;
    } else if (user.role === "patient") {
      const patientResult = await query("SELECT id FROM dietbyrd_patients WHERE user_id = $1", [user.id]);
      if (patientResult.rows.length > 0) profileId = patientResult.rows[0].id;
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        profileId,
        doctorId,
        isVerified: user.is_verified ?? true,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Signup with OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Send OTP for signup (stores pending signup data)
app.post("/api/auth/signup/send-otp", async (req, res) => {
  try {
    const { phone, password, name, channel = "sms" } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    const normalizedPhone = normalizePhoneForStorage(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: "Phone and password are required" });
    }

    const rateCheck = checkOtpRateLimit(normalizedPhone);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many OTP requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      });
    }

    // Check if user already exists
    const variants = buildPhoneVariants(phone);
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Send OTP using Twilio Verify (or mock in dev mode)
    console.log(`[OTP] Sending signup OTP to ${normalizedPhone} via ${channel}`);

    try {
      const result = await sendOtpViaTwilio(normalizedPhone, channel);
      const { verification, toNumber, channel: normalizedChannel, devOtp } = result;

      // Hash password before storing in pending data
      const hashedSignupPw = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const pendingData = { phone: normalizedPhone, password: hashedSignupPw, name };
      // In dev mode, store the actual OTP; in production, Twilio handles it
      await storeOtp(normalizedPhone, devOtp || "", 'signup', pendingData);

      console.log(`[OTP] Verification sent, SID: ${verification.sid}, Status: ${verification.status}`);
      return res.json({
        success: true,
        message: normalizedChannel === "whatsapp" ? "OTP sent to your WhatsApp" : "OTP sent via SMS",
        to: toNumber,
        expiresIn: 120
      });
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
      await clearOtp(normalizedPhone, 'signup');
      return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP and complete signup
app.post("/api/auth/signup/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    const normalizedPhone = normalizePhoneForStorage(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    // Verify OTP - use local DB in dev mode, Twilio in production
    if (IS_DEV) {
      const verifyResult = await verifyOtpFromDb(normalizedPhone, otp, 'signup');
      if (!verifyResult.valid) {
        return res.status(400).json({ success: false, error: verifyResult.error || "Invalid OTP." });
      }
    } else {
      try {
        const verificationCheck = await verifyOtpViaTwilio(normalizedPhone, otp);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }
      } catch (twilioErr) {
        console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
    }

    // Get pending signup data from our database
    await ensureOtpTable();
    const pendingResult = await query(
      "SELECT pending_data FROM dietbyrd_otps WHERE phone = $1 AND purpose = 'signup'",
      [normalizedPhone]
    );

    if (pendingResult.rows.length === 0 || !pendingResult.rows[0].pending_data) {
      return res.status(400).json({ success: false, error: "Signup session expired. Please try again." });
    }

    const pendingData = pendingResult.rows[0].pending_data;
    if (!pendingData.phone || !pendingData.password) {
      await clearOtp(normalizedPhone, 'signup');
      return res.status(400).json({ success: false, error: "Signup data not found. Please try again." });
    }

    // Clear pending data
    await clearOtp(normalizedPhone, 'signup');

    // Double-check user doesn't exist (race condition protection)
    const variants = buildPhoneVariants(normalizedPhone);
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Create user as patient (password in pendingData is already bcrypt-hashed)
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, is_active)
       VALUES ($1, $2, 'patient', $3, true)
       RETURNING id, phone, role, name`,
      [pendingData.phone, pendingData.password, pendingData.name || null]
    );
    const user = userResult.rows[0];

    // Create patient record
    const patientResult = await query(
      `INSERT INTO dietbyrd_patients (user_id, phone, name, referral_source)
       VALUES ($1, $2, $3, 'content')
       RETURNING id`,
      [user.id, pendingData.phone, pendingData.name || null]
    );

    const patientId = patientResult.rows[0].id;

    // Send welcome WhatsApp message (best effort - async, don't wait)
    sendWelcomeWhatsApp(pendingData.phone, pendingData.name, patientId);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        profileId: patientId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Join Requests (Doctor/Dietician) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Create a join request
app.post("/api/join-requests", async (req, res) => {
  try {
    const { phone, password, name, email, role, qualification, clinic_name, clinic_address, specializations, about_yourself } = req.body;

    if (!phone || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: "Phone, password, name, and role are required"
      });
    }

    const parsedPhone = normalizeIndianMobileForAuth(phone);
    if (!parsedPhone) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid Indian mobile number"
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters"
      });
    }

    if (!["doctor", "rd"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Role must be 'doctor' or 'rd'"
      });
    }

    if (role === "doctor" && !qualification) {
      return res.status(400).json({
        success: false,
        error: "Qualification is required for doctors"
      });
    }

    if (role === "rd" && !qualification) {
      return res.status(400).json({
        success: false,
        error: "Qualification is required for dieticians"
      });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id, is_verified FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [parsedPhone.variants]
    );

    if (existingUser.rows.length > 0) {
      // If user exists but is not verified, they already have a pending request
      if (!existingUser.rows[0].is_verified) {
        return res.status(409).json({ success: false, error: "A pending request already exists for this phone number. Please wait for admin approval or login to check status." });
      }
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Check if pending request exists (fallback check)
    const existingRequest = await query(
      "SELECT id FROM dietbyrd_join_requests WHERE phone = ANY($1::text[]) AND status IN ('pending', 'interview_sent') LIMIT 1",
      [parsedPhone.variants]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({ success: false, error: "A pending request already exists for this phone number" });
    }

    // Hash password before storing
    const hashedJoinPw = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user immediately with is_verified = false
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, email, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, true, false)
       RETURNING id`,
      [parsedPhone.digits, hashedJoinPw, role, name, email || null]
    );
    const userId = userResult.rows[0].id;

    // Create join request and link to user (store hashed password)
    const result = await query(
      `INSERT INTO dietbyrd_join_requests
        (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, about_yourself, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
       RETURNING id, phone, name, requested_role, status, created_at`,
      [parsedPhone.digits, hashedJoinPw, name, role, qualification, clinic_name || null, clinic_address || null, specializations ? JSON.stringify(specializations) : null, about_yourself || null, userId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Your request has been submitted. You can now login to check your verification status."
    });
  } catch (err) {
    // Handle case where table doesn't exist - create it
    if (err.message.includes("relation") && err.message.includes("does not exist")) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS dietbyrd_join_requests (
            id SERIAL PRIMARY KEY,
            phone VARCHAR(15) NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            requested_role VARCHAR(20) NOT NULL CHECK (requested_role IN ('doctor', 'rd')),
            qualification VARCHAR(150),
            clinic_name VARCHAR(150),
            clinic_address TEXT,
            specializations JSONB,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'interview_sent', 'approved', 'rejected')),
            reviewed_by INT NULL,
            reviewed_at TIMESTAMP NULL,
            rejection_reason TEXT NULL,
            user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        // Retry with original request body
        const { phone, password, name, role, qualification, clinic_name, clinic_address, specializations } = req.body;
        const parsedPhone = normalizeIndianMobileForAuth(phone);
        if (!parsedPhone) {
          return res.status(400).json({ success: false, error: "Please enter a valid Indian mobile number" });
        }
        const hashedFallbackPw = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const userResult = await query(
          `INSERT INTO dietbyrd_users (phone, password, role, name, is_active, is_verified)
           VALUES ($1, $2, $3, $4, true, false)
           RETURNING id`,
          [parsedPhone.digits, hashedFallbackPw, role, name]
        );
        const userId = userResult.rows[0].id;

        const result = await query(
          `INSERT INTO dietbyrd_join_requests
            (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, status, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
           RETURNING id, phone, name, requested_role, status, created_at`,
          [parsedPhone.digits, hashedFallbackPw, name, role, qualification, clinic_name || null, clinic_address || null, specializations ? JSON.stringify(specializations) : null, userId]
        );
        return res.status(201).json({ success: true, data: result.rows[0] });
      } catch (createErr) {
        return res.status(500).json({ success: false, error: createErr.message });
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all join requests (admin only)
app.get("/api/join-requests", async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT 
        jr.*,
        reviewer.name AS reviewed_by_name,
        applicant.email AS applicant_email
      FROM dietbyrd_join_requests jr
      LEFT JOIN dietbyrd_users reviewer ON jr.reviewed_by = reviewer.id
      LEFT JOIN dietbyrd_users applicant ON jr.user_id = applicant.id
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` WHERE jr.status = $${params.length}`;
    }
    sql += ` ORDER BY jr.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    // If table doesn't exist, return empty array
    if (err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Schedule interview for a join request (admin sends WhatsApp/SMS to applicant)
app.post("/api/join-requests/:id/schedule-interview", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, delivery } = req.body || {};
    const deliveryMode = ["email_first", "email_only", "whatsapp_only", "both"].includes(String(delivery))
      ? String(delivery)
      : "email_first";

    const result = await query(
      "SELECT jr.phone, jr.name, u.email FROM dietbyrd_join_requests jr LEFT JOIN dietbyrd_users u ON jr.user_id = u.id WHERE jr.id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Join request not found" });
    }
    const { phone, name, email } = result.rows[0];
    const customMessage = String(message || "").trim();
    const baseMessage = customMessage
      ? `We'd like to schedule an interview with you regarding your DietByRD application.\n\n${customMessage}`
      : "We'd like to schedule an interview with you regarding your DietByRD application. Our team will contact you shortly to confirm the details.";
    const whatsappBody = `Hi ${name}! ðŸ‘‹\n\n${baseMessage}\n\n- Team DietByRD`;

    const shouldSendEmail = deliveryMode !== "whatsapp_only";
    const shouldSendWhatsapp = deliveryMode !== "email_only";

    let emailResult = { sent: false, reason: "not_requested" };
    let whatsappResult = { sent: false, reason: "not_requested" };

    if (shouldSendEmail) {
      emailResult = await sendJoinRequestMessageEmail({
        recipientEmail: email,
        recipientName: name,
        senderName: "DietByRD team",
        message: baseMessage,
        subject: "Interview invitation â€” DietByRD",
      });
    }

    const shouldFallbackToWhatsapp =
      shouldSendWhatsapp &&
      (deliveryMode === "whatsapp_only" || deliveryMode === "both" || (deliveryMode === "email_first" && !emailResult.sent));

    if (shouldFallbackToWhatsapp) {
      if (twilioClient) {
        const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "");
        try {
          await twilioClient.messages.create({
            from: TWILIO_WHATSAPP_FROM,
            to: `whatsapp:+91${cleanPhone}`,
            body: whatsappBody,
          });
          whatsappResult = { sent: true };
          console.log(`[Interview] WhatsApp sent to +91${cleanPhone}`);
        } catch (smsErr) {
          whatsappResult = { sent: false, reason: "whatsapp_failed" };
          console.log(`[Interview] WhatsApp failed: ${smsErr.message}`);
        }
      } else {
        whatsappResult = { sent: true, reason: "dev_simulated" };
        console.log(`[Interview][dev] Would send to ${phone}: ${whatsappBody}`);
      }
    }

    if (!emailResult.sent && !whatsappResult.sent) {
      return res.status(400).json({
        success: false,
        error: "Invitation could not be delivered. Please verify email or WhatsApp settings.",
      });
    }

    await query("UPDATE dietbyrd_join_requests SET status = 'interview_sent' WHERE id = $1", [id]);

    res.json({
      success: true,
      data: {
        email: emailResult,
        whatsapp: whatsappResult,
        status: "interview_sent",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send a message to a join request applicant (admin roles only)
app.post("/api/join-requests/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, recipient_user_id } = req.body || {};

    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    if (!ADMIN_JOIN_REQUEST_ROLES.includes(auth.role)) {
      return res.status(403).json({ error: "Not authorized to send join request messages" });
    }

    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    const recipientId = parseInt(String(recipient_user_id), 10);
    if (!Number.isInteger(recipientId)) {
      return res.status(400).json({ error: "recipient_user_id is required" });
    }

    const joinRequestResult = await query(
      "SELECT id, user_id FROM dietbyrd_join_requests WHERE id = $1",
      [id]
    );

    if (joinRequestResult.rows.length === 0) {
      return res.status(404).json({ error: "Join request not found" });
    }

    const joinRequest = joinRequestResult.rows[0];
    if (joinRequest.user_id && joinRequest.user_id !== recipientId) {
      return res.status(400).json({ error: "Recipient does not match join request applicant" });
    }

    const recipientResult = await query(
      "SELECT id, role, email, name FROM dietbyrd_users WHERE id = $1",
      [recipientId]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const recipient = recipientResult.rows[0];
    if (!JOIN_REQUEST_RECIPIENT_ROLES.includes(recipient.role)) {
      return res.status(400).json({ error: "Recipient must be a doctor or dietician" });
    }

    const insertResult = await query(
      `INSERT INTO dietbyrd_join_request_messages
        (join_request_id, sender_id, sender_role, recipient_user_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [id, auth.userId, auth.role, recipientId, trimmedMessage]
    );

    await sendJoinRequestMessageEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      senderName: auth.user?.name,
      message: trimmedMessage,
    });

    return res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get join request messages for the current user (doctor/rd only)
app.get("/api/me/join-request-messages", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    if (!JOIN_REQUEST_RECIPIENT_ROLES.includes(auth.role)) {
      return res.status(403).json({ error: "Not authorized to view join request messages" });
    }

    const unreadOnly = String(req.query.unread || "").trim() === "1";
    const conditions = ["recipient_user_id = $1"];
    const params = [auth.userId];

    if (unreadOnly) {
      conditions.push("read_at IS NULL");
    }

    const result = await query(
      `SELECT id, join_request_id, sender_id, sender_role, recipient_user_id, message, read_at, created_at
       FROM dietbyrd_join_request_messages
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark a join request message as read
app.patch("/api/join-request-messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { read_at } = req.body || {};

    if (!read_at || String(read_at).toLowerCase() !== "now") {
      return res.status(400).json({ error: "read_at must be 'now'" });
    }

    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    const updateResult = await query(
      `UPDATE dietbyrd_join_request_messages
       SET read_at = NOW()
       WHERE id = $1 AND recipient_user_id = $2
       RETURNING id, join_request_id, sender_id, sender_role, recipient_user_id, message, read_at, created_at`,
      [id, auth.userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res.json(updateResult.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Approve/Reject a join request (admin only)
app.patch("/api/join-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewed_by, rejection_reason, admin_message, commission_rate, delivery } = req.body;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'approve' or 'reject'" });
    }

    // Get the join request
    const requestResult = await query(
      "SELECT * FROM dietbyrd_join_requests WHERE id = $1",
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Join request not found" });
    }

    const joinRequest = requestResult.rows[0];

    if (!["pending", "interview_sent"].includes(joinRequest.status)) {
      return res.status(400).json({ success: false, error: "Request has already been processed" });
    }

    const parsedPhone = normalizeIndianMobileForAuth(joinRequest.phone);
    if (!parsedPhone) {
      return res.status(400).json({
        success: false,
        error: "This request has an invalid phone number. Please reject it and ask the applicant to apply with a valid Indian mobile number."
      });
    }

    if (action === "reject") {
      const deliveryMode = ["email_first", "email_only", "whatsapp_only", "both"].includes(String(delivery))
        ? String(delivery)
        : "email_first";

      let applicantEmail = null;
      if (joinRequest.user_id) {
        const userResult = await query("SELECT email FROM dietbyrd_users WHERE id = $1", [joinRequest.user_id]);
        if (userResult.rows.length > 0) applicantEmail = userResult.rows[0].email;
      }

      const customMessage = String(admin_message || "").trim();
      const baseMessage = customMessage
        ? `Thank you for your interest in joining DietByRD.\n\n${customMessage}`
        : "Thank you for your interest in joining DietByRD. Unfortunately, we are unable to proceed with your application at this time.";
      const whatsappBody = `Hi ${joinRequest.name}! ðŸ‘‹\n\n${baseMessage}\n\n- Team DietByRD`;

      const shouldSendEmail = deliveryMode !== "whatsapp_only";
      const shouldSendWhatsapp = deliveryMode !== "email_only";

      let emailResult = { sent: false, reason: "not_requested" };
      let whatsappResult = { sent: false, reason: "not_requested" };

      if (shouldSendEmail && applicantEmail) {
        try {
          emailResult = await sendJoinRequestMessageEmail({
            recipientEmail: applicantEmail,
            recipientName: joinRequest.name,
            senderName: "DietByRD team",
            message: baseMessage,
            subject: "Update on your DietByRD application",
          });
        } catch (e) {
          emailResult = { sent: false, reason: "email_failed" };
        }
      } else if (shouldSendEmail && !applicantEmail) {
        emailResult = { sent: false, reason: "no_email_found" };
      }

      const shouldFallbackToWhatsapp =
        shouldSendWhatsapp &&
        (deliveryMode === "whatsapp_only" || deliveryMode === "both" || (deliveryMode === "email_first" && !emailResult.sent));

      if (shouldFallbackToWhatsapp) {
        if (twilioClient) {
          const cleanPhone = joinRequest.phone.replace(/\D/g, "").replace(/^91/, "");
          try {
            await twilioClient.messages.create({
              from: TWILIO_WHATSAPP_FROM,
              to: `whatsapp:+91${cleanPhone}`,
              body: whatsappBody,
            });
            whatsappResult = { sent: true };
          } catch (smsErr) {
            whatsappResult = { sent: false, reason: "whatsapp_failed" };
          }
        } else {
          whatsappResult = { sent: true, reason: "dev_simulated" };
        }
      }

      // Reject the request - also deactivate/delete the unverified user
      if (joinRequest.user_id) {
        // Unlink first to avoid FK violations in environments without ON DELETE SET NULL
        await query(
          "UPDATE dietbyrd_join_requests SET user_id = NULL WHERE id = $1 AND user_id = $2",
          [id, joinRequest.user_id]
        );
        await query("DELETE FROM dietbyrd_users WHERE id = $1 AND is_verified = false", [joinRequest.user_id]);
      }
      await query(
        `UPDATE dietbyrd_join_requests
         SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2, admin_message = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [reviewed_by || null, rejection_reason || null, admin_message || null, id]
      );
      return res.json({ success: true, message: "Request rejected", email: emailResult, whatsapp: whatsappResult });
    }

    // Approve: Verify the user and create the profile
    let userId = joinRequest.user_id;

    if (userId) {
      // User was created at join request time - just verify them
      await query(
        `UPDATE dietbyrd_users
         SET phone = $1, role = $2, name = $3, is_active = true, is_verified = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [parsedPhone.digits, joinRequest.requested_role, joinRequest.name, userId]
      );
    } else {
      const existingUser = await query(
        "SELECT id FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
        [parsedPhone.variants]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        await query(
          `UPDATE dietbyrd_users
           SET phone = $1, role = $2, name = $3, password = COALESCE(password, $4), is_active = true, is_verified = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [parsedPhone.digits, joinRequest.requested_role, joinRequest.name, joinRequest.password, userId]
        );
      } else {
        // Legacy: user wasn't created at join time, create now (for old requests)
        const userResult = await query(
          `INSERT INTO dietbyrd_users (phone, password, role, name, is_active, is_verified)
           VALUES ($1, $2, $3, $4, true, true)
           RETURNING id`,
          [parsedPhone.digits, joinRequest.password, joinRequest.requested_role, joinRequest.name]
        );
        userId = userResult.rows[0].id;
      }

      // Link user to join request
      await query("UPDATE dietbyrd_join_requests SET user_id = $1 WHERE id = $2", [userId, id]);
    }

    if (joinRequest.requested_role === "doctor") {
      const commissionValue = commission_rate != null ? parseFloat(commission_rate) : 0;
      await query(
        `INSERT INTO dietbyrd_doctors (user_id, name, qualification, clinic_name, clinic_address, is_verified, commission_rate)
         VALUES ($1, $2, $3, $4, $5, true, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           name = EXCLUDED.name,
           qualification = EXCLUDED.qualification,
           clinic_name = EXCLUDED.clinic_name,
           clinic_address = EXCLUDED.clinic_address,
           is_verified = true,
           commission_rate = EXCLUDED.commission_rate,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, joinRequest.name, joinRequest.qualification, joinRequest.clinic_name, joinRequest.clinic_address, commissionValue]
      );
    } else if (joinRequest.requested_role === "rd") {
      // Prepare specializations for JSONB column
      const specializationsValue = joinRequest.specializations
        ? (typeof joinRequest.specializations === 'string'
          ? joinRequest.specializations  // Already a JSON string
          : JSON.stringify(joinRequest.specializations))  // Object from DB, needs stringify
        : null;

      const rdResult = await query(
        `INSERT INTO dietbyrd_registered_dietitians (user_id, name, qualification, specializations, clinic_name, clinic_address, is_active)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, true)
         ON CONFLICT (user_id) DO UPDATE SET
           name = EXCLUDED.name,
           qualification = EXCLUDED.qualification,
           specializations = EXCLUDED.specializations,
           clinic_name = EXCLUDED.clinic_name,
           clinic_address = EXCLUDED.clinic_address,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [userId, joinRequest.name, joinRequest.qualification, specializationsValue, joinRequest.clinic_name || null, joinRequest.clinic_address || null]
      );

      const rdId = rdResult.rows[0].id;

      // Create default availability: Monday-Friday, 9 AM - 5 PM
      const defaultAvailability = [];
      for (let day = 1; day <= 5; day++) { // 1=Monday, 5=Friday
        defaultAvailability.push(
          query(
            `INSERT INTO dietbyrd_dietician_availability (rd_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
             SELECT $1, $2, '09:00', '17:00', 60, true
             WHERE NOT EXISTS (
               SELECT 1 FROM dietbyrd_dietician_availability
               WHERE rd_id = $1 AND day_of_week = $2
             )`,
            [rdId, day]
          )
        );
      }

      // Execute all availability inserts
      await Promise.all(defaultAvailability);
      console.log(`[Dietician] Created default availability (Mon-Fri, 9-5) for RD ID: ${rdId}`);
    }

    // Update the join request
    await query(
      `UPDATE dietbyrd_join_requests
       SET phone = $1, status = 'approved', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, admin_message = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [parsedPhone.digits, reviewed_by || null, admin_message || null, id]
    );

    // Notify the applicant â€” best effort, never blocks the response
    sendJoinApprovalNotification(joinRequest.phone, joinRequest.name, joinRequest.requested_role).catch(() => { });

    res.json({ success: true, message: `${joinRequest.requested_role === "doctor" ? "Doctor" : "Dietician"} account verified successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/analytics", async (_req, res) => {
  try {
    const [patients, referrals, doctors, dieticians] = await Promise.all([
      query("SELECT COUNT(*) FROM dietbyrd_patients"),
      query("SELECT COUNT(*) FROM dietbyrd_referrals"),
      query("SELECT COUNT(*) FROM dietbyrd_doctors"),
      query("SELECT COUNT(*) FROM dietbyrd_registered_dietitians WHERE is_active = true"),
    ]);
    res.json({
      success: true,
      data: {
        total_patients: parseInt(patients.rows[0].count),
        total_referrals: parseInt(referrals.rows[0].count),
        active_doctors: parseInt(doctors.rows[0].count),
        active_dieticians: parseInt(dieticians.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Patients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/patients", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        p.*,
        u.phone AS user_phone,
        u.role,
        u.is_active,
        rp.dietary_preference,
        rp.state_region,
        rp.city,
        rp.assigned_rd_id,
        rd.name AS assigned_dietician_name,
        (CASE
          WHEN COALESCE(payment_summary.has_razorpay, false) = true
            OR EXISTS (
              SELECT 1
              FROM dietbyrd_payments dp
              WHERE (dp.patient_id = p.id OR (rp.id IS NOT NULL AND dp.registered_patient_id = rp.id))
                AND dp.status::text IN ('success', 'paid', 'captured')
            ) THEN 'paid'
          ELSE 'unpaid'
        END) AS payment_status,
        COALESCE(payment_summary.payment_history, '[]'::json) AS payment_history
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      LEFT JOIN LATERAL (
        SELECT
          (COUNT(*) FILTER (WHERE pay.status::text IN ('success', 'paid', 'captured')) > 0) AS has_razorpay,
          COALESCE(
            json_agg(
              json_build_object(
                'payment_id', pay.id,
                'amount', pay.amount,
                'currency', pay.currency,
                'status', pay.status,
                'consultations_purchased', pay.consultations_purchased,
                'payment_method', pay.payment_method,
                'razorpay_payment_id', pay.razorpay_payment_id,
                'paid_at', pay.updated_at,
                'created_at', pay.created_at
              )
              ORDER BY pay.created_at DESC
            ) FILTER (WHERE pay.id IS NOT NULL),
            '[]'::json
          ) AS payment_history
        FROM dietbyrd_razorpay_payments pay
        WHERE pay.patient_id = p.id
      ) AS payment_summary ON true
      ORDER BY p.created_at DESC
      LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/patients/:id(\\d+)", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        p.*,
        u.phone AS user_phone,
        COALESCE(p.dietary_preference, rp.dietary_preference::text) AS dietary_preference,
        rp.food_restrictions,
        rp.assigned_rd_id,
        rd.name AS assigned_dietician_name,
        rd.qualification AS assigned_dietician_qualification,
        ref.doctor_id AS referring_doctor_id,
        d.name AS referring_doctor_name,
        d.qualification AS referring_doctor_qualification,
        d.clinic_name AS referring_doctor_clinic,
        (CASE
          WHEN COALESCE(payment_summary.has_razorpay, false) = true
            OR EXISTS (
              SELECT 1
              FROM dietbyrd_payments dp
              WHERE (dp.patient_id = p.id OR (rp.id IS NOT NULL AND dp.registered_patient_id = rp.id))
                AND dp.status::text IN ('success', 'paid', 'captured')
            ) THEN 'paid'
          ELSE 'unpaid'
        END) AS payment_status,
        COALESCE(payment_summary.payment_history, '[]'::json) AS payment_history,
        true AS registration_completed,
        (
          COALESCE(payment_summary.has_razorpay, false) = true
          OR EXISTS (
            SELECT 1
            FROM dietbyrd_payments dp
            WHERE (dp.patient_id = p.id OR (rp.id IS NOT NULL AND dp.registered_patient_id = rp.id))
              AND dp.status::text IN ('success', 'paid', 'captured')
          )
        ) AS payment_completed,
        EXISTS (
          SELECT 1
          FROM dietbyrd_consultations c
          WHERE c.registered_patient_id = rp.id
            AND c.scheduled_at > NOW()
            AND c.status IN ('scheduled', 'confirmed')
        ) AS appointment_completed,
        EXISTS (
          SELECT 1
          FROM dietbyrd_consultations c
          WHERE c.registered_patient_id = rp.id
            AND c.status = 'completed'
        ) AS consultation_completed
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      LEFT JOIN dietbyrd_referrals ref ON ref.patient_id = p.id
      LEFT JOIN dietbyrd_doctors d ON ref.doctor_id = d.id
      LEFT JOIN LATERAL (
        SELECT
          (COUNT(*) FILTER (WHERE pay.status::text IN ('success', 'paid', 'captured')) > 0) AS has_razorpay,
          COALESCE(
            json_agg(
              json_build_object(
                'payment_id', pay.id,
                'amount', pay.amount,
                'currency', pay.currency,
                'status', pay.status,
                'consultations_purchased', pay.consultations_purchased,
                'payment_method', pay.payment_method,
                'razorpay_payment_id', pay.razorpay_payment_id,
                'paid_at', pay.updated_at,
                'created_at', pay.created_at
              )
              ORDER BY pay.created_at DESC
            ) FILTER (WHERE pay.id IS NOT NULL),
            '[]'::json
          ) AS payment_history
        FROM dietbyrd_razorpay_payments pay
        WHERE pay.patient_id = p.id
      ) AS payment_summary ON true
      WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/patients/:id(\\d+)", async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await getPool().connect();
    const tableExists = async (tableName) => {
      const result = await client.query("SELECT to_regclass($1) AS table_name", [tableName]);
      return Boolean(result.rows[0]?.table_name);
    };
    const columnExists = async (tableName, columnName) => {
      const result = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = $2`,
        [tableName, columnName]
      );
      return result.rows.length > 0;
    };
    const queryIfTableExists = async (tableName, text, params = []) => {
      if (await tableExists(tableName)) {
        await client.query(text, params);
      }
    };

    await client.query("BEGIN");

    const patient = await client.query(
      "SELECT user_id, phone FROM dietbyrd_patients WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (patient.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Patient not found" });
    }
    const userId = patient.rows[0].user_id;
    const patientPhone = patient.rows[0].phone;

    const regResult = await client.query(
      "SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1",
      [id]
    );
    const regId = regResult.rows[0]?.id ?? null;

    await queryIfTableExists(
      "dietbyrd_patient_documents",
      `DELETE FROM dietbyrd_patient_documents
       WHERE patient_profile_id = $1 OR patient_id = $2 OR uploaded_by = $2`,
      [id, userId]
    );

    await queryIfTableExists(
      "reviews",
      "DELETE FROM reviews WHERE patient_id = $1",
      [userId]
    );

    await queryIfTableExists(
      "dietbyrd_doctor_commissions",
      "DELETE FROM dietbyrd_doctor_commissions WHERE patient_id = $1",
      [userId]
    );

    await queryIfTableExists(
      "dietbyrd_appointments",
      "DELETE FROM dietbyrd_appointments WHERE patient_id = $1",
      [id]
    );

    if (regId) {
      // Delete consultation notes first (deepest child)
      await client.query(
        `DELETE FROM dietbyrd_consultation_notes
         WHERE consultation_id IN (
           SELECT id FROM dietbyrd_consultations WHERE registered_patient_id = $1
         )`,
        [regId]
      );
      await queryIfTableExists(
        "dietbyrd_documents",
        "DELETE FROM dietbyrd_documents WHERE registered_patient_id = $1",
        [regId]
      );
      // Delete diet plans
      await client.query(
        "DELETE FROM dietbyrd_diet_plans WHERE registered_patient_id = $1",
        [regId]
      );
      // Delete consultations
      await client.query(
        "DELETE FROM dietbyrd_consultations WHERE registered_patient_id = $1",
        [regId]
      );
      // Delete subscriptions if table exists
      await queryIfTableExists(
        "dietbyrd_subscriptions",
        "DELETE FROM dietbyrd_subscriptions WHERE registered_patient_id = $1",
        [regId]
      );
      await queryIfTableExists(
        "dietbyrd_payments",
        `UPDATE dietbyrd_payments
         SET patient_id = NULL,
             registered_patient_id = NULL,
             subscription_id = NULL
         WHERE patient_id = $1 OR registered_patient_id = $2`,
        [id, regId]
      );
    }

    // Delete ticket comments before tickets.
    await queryIfTableExists(
      "dietbyrd_ticket_comments",
      `DELETE FROM dietbyrd_ticket_comments
       WHERE user_id = $2
          OR ticket_id IN (
            SELECT id FROM dietbyrd_tickets
            WHERE patient_id = $1 OR created_by = $2
          )`,
      [id, userId]
    );
    await queryIfTableExists(
      "dietbyrd_tickets",
      "DELETE FROM dietbyrd_tickets WHERE patient_id = $1 OR created_by = $2",
      [id, userId]
    );

    // Delete referrals
    await client.query("DELETE FROM dietbyrd_referrals WHERE patient_id = $1", [id]);

    // Delete coupon usage; payment rows are kept with patient FKs cleared.
    await queryIfTableExists(
      "dietbyrd_razorpay_payments",
      "DELETE FROM dietbyrd_razorpay_payments WHERE patient_id = $1",
      [id]
    );

    await queryIfTableExists(
      "dietbyrd_coupon_usage",
      "DELETE FROM dietbyrd_coupon_usage WHERE patient_id = $1 OR user_id = $2",
      [id, userId]
    );

    // Delete registered_patient row (payments FK already SET NULL)
    if (regId) {
      await client.query("DELETE FROM dietbyrd_registered_patients WHERE id = $1", [regId]);
    }

    // Delete patient (payments FK already SET NULL)
    await client.query("DELETE FROM dietbyrd_patients WHERE id = $1", [id]);

    // Delete OTPs and user account
    if (userId) {
      if (await tableExists("dietbyrd_otps")) {
        const hasOtpPhone = await columnExists("dietbyrd_otps", "phone");
        const hasOtpUserId = await columnExists("dietbyrd_otps", "user_id");
        if (hasOtpPhone && patientPhone) {
          await client.query("DELETE FROM dietbyrd_otps WHERE phone = $1", [patientPhone]);
        }
        if (hasOtpUserId) {
          await client.query("DELETE FROM dietbyrd_otps WHERE user_id = $1", [userId]);
        }
      }
      await queryIfTableExists(
        "dietbyrd_join_request_messages",
        "DELETE FROM dietbyrd_join_request_messages WHERE recipient_user_id = $1 OR sender_id = $1",
        [userId]
      );
      await queryIfTableExists(
        "dietbyrd_join_requests",
        "UPDATE dietbyrd_join_requests SET user_id = NULL WHERE user_id = $1",
        [userId]
      );
      await client.query("DELETE FROM dietbyrd_users WHERE id = $1", [userId]);
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[delete patient] Rollback error:", rollbackErr.message);
      }
    }
    console.error("[delete patient] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

// Get patient message history
app.get("/api/patients/:id(\\d+)/messages", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT COALESCE(patient_messages, '[]'::jsonb) AS messages
       FROM dietbyrd_patients
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    // Return messages sorted by sent_at descending (newest first)
    const messages = result.rows[0].messages || [];
    const sortedMessages = Array.isArray(messages)
      ? messages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      : [];

    res.json({ success: true, data: sortedMessages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/patients", async (req, res) => {
  try {
    const { name, phone, age, gender, diagnosis, diagnosis_description, referral_source } = req.body;
    if (!phone || !referral_source) {
      return res.status(400).json({ success: false, error: "phone and referral_source are required" });
    }
    const result = await query(
      `INSERT INTO dietbyrd_patients (name, phone, age, gender, diagnosis, diagnosis_description, referral_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, phone, age, gender, diagnosis, diagnosis_description, referral_source].map(v => v === undefined ? null : v)
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/patients/:id(\\d+)", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age, gender, diagnosis, diagnosis_description, height, weight, allergies, workout_frequency, diagnoses, address, dietary_preference, city, current_weight, target_weight } = req.body;

    // Prepare allergies for JSONB column
    let allergiesValue = null;
    if (allergies !== undefined && allergies !== null && allergies !== '') {
      allergiesValue = typeof allergies === 'string'
        ? JSON.stringify([allergies])
        : JSON.stringify(allergies);
    }

    // Prepare diagnoses: prefer array form; derive single diagnosis from first element
    let diagnosesValue = null;
    let primaryDiagnosis = diagnosis || null;
    if (Array.isArray(diagnoses) && diagnoses.length > 0) {
      diagnosesValue = JSON.stringify(diagnoses);
      primaryDiagnosis = diagnoses[0] || diagnosis || null;
    } else if (diagnosis) {
      diagnosesValue = JSON.stringify([diagnosis]);
    }

    if (primaryDiagnosis) {
      primaryDiagnosis = primaryDiagnosis.toLowerCase();
      const validDiagnoses = ['diabetes', 'hypertension', 'obesity', 'other', 'pcos', 'thyroid'];
      if (!validDiagnoses.includes(primaryDiagnosis)) {
        primaryDiagnosis = 'other';
      }
    }

    const result = await query(
      `UPDATE dietbyrd_patients
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           age = COALESCE($3, age),
           gender = COALESCE($4, gender),
           diagnosis = COALESCE($5, diagnosis),
           diagnosis_description = COALESCE($6, diagnosis_description),
           height = COALESCE($7, height),
           weight = COALESCE($8, weight),
           allergies = COALESCE($9::jsonb, allergies),
           workout_frequency = COALESCE($10, workout_frequency),
           diagnoses = COALESCE($12::jsonb, diagnoses),
           address = COALESCE($13, address),
           dietary_preference = COALESCE($14, dietary_preference),
           city = COALESCE($15, city),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [name, email || null, age, gender, primaryDiagnosis, diagnosis_description, height, weight, allergiesValue, workout_frequency, id, diagnosesValue, address, dietary_preference, city].map(v => v === undefined ? null : v)
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });

    // Keep dietbyrd_users.email in sync when email is provided
    if (email && result.rows[0].user_id) {
      await query(
        "UPDATE dietbyrd_users SET email = $1 WHERE id = $2",
        [email, result.rows[0].user_id]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign dietician to patient
app.post("/api/patients/:id(\\d+)/assign-dietician", async (req, res) => {
  try {
    const { id } = req.params;
    const { dietician_id } = req.body;

    if (dietician_id === undefined) {
      return res.status(400).json({ success: false, error: "dietician_id is required" });
    }

    const targetDieticianId = dietician_id === 0 ? null : dietician_id;

    // Check if patient exists
    const patientCheck = await query("SELECT id FROM dietbyrd_patients WHERE id = $1", [id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    // Block assignment if patient has not paid
    const paymentCheck = await query(
      `SELECT COUNT(*) AS cnt
       FROM dietbyrd_razorpay_payments
       WHERE patient_id = $1 AND status IN ('paid', 'captured', 'success')`,
      [id]
    );
    if (parseInt(paymentCheck.rows[0]?.cnt || "0") === 0) {
      return res.status(403).json({ success: false, error: "Cannot assign a dietician to an unpaid patient. Please ensure the patient has completed payment first." });
    }

    // Check if registered_patient record exists
    const regPatient = await query("SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1", [id]);

    let result;
    if (regPatient.rows.length === 0) {
      // Create registered_patient record with dietician assignment
      result = await query(
        `INSERT INTO dietbyrd_registered_patients (patient_id, assigned_rd_id)
         VALUES ($1, $2)
         RETURNING *`,
        [id, targetDieticianId]
      );
    } else {
      // Update existing record
      result = await query(
        `UPDATE dietbyrd_registered_patients
         SET assigned_rd_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $2
         RETURNING *`,
        [targetDieticianId, id]
      );
    }

    // Get dietician name for response
    let dieticianName = null;
    if (targetDieticianId) {
      const dieticianInfo = await query(
        "SELECT name FROM dietbyrd_registered_dietitians WHERE id = $1",
        [targetDieticianId]
      );
      dieticianName = dieticianInfo.rows[0]?.name;
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        dietician_name: dieticianName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign doctor to patient
app.post("/api/patients/:id(\\d+)/assign-doctor", async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id } = req.body;

    // Check if patient exists
    const patientCheck = await query("SELECT id FROM dietbyrd_patients WHERE id = $1", [id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    if (doctor_id) {
      // Check if doctor exists
      const doctorCheck = await query("SELECT id FROM dietbyrd_doctors WHERE id = $1", [doctor_id]);
      if (doctorCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Doctor not found" });
      }

      // Upsert into dietbyrd_referrals
      const existing = await query("SELECT id FROM dietbyrd_referrals WHERE patient_id = $1", [id]);
      if (existing.rows.length > 0) {
        await query(
          "UPDATE dietbyrd_referrals SET doctor_id = $1 WHERE patient_id = $2",
          [doctor_id, id]
        );
      } else {
        await query(
          "INSERT INTO dietbyrd_referrals (patient_id, doctor_id, source) VALUES ($1, $2, 'doctor_portal')",
          [id, doctor_id]
        );
      }

      // Update patient's referral_source
      await query(
        "UPDATE dietbyrd_patients SET referral_source = 'doctor' WHERE id = $1",
        [id]
      );
    } else {
      // Reset: delete referral and set referral_source to 'content'
      await query("DELETE FROM dietbyrd_referrals WHERE patient_id = $1", [id]);
      await query(
        "UPDATE dietbyrd_patients SET referral_source = 'content' WHERE id = $1",
        [id]
      );
    }

    // Return the updated referral info
    const result = await query(
      `SELECT 
        p.id,
        ref.doctor_id AS referring_doctor_id,
        d.name AS referring_doctor_name
       FROM dietbyrd_patients p
       LEFT JOIN dietbyrd_referrals ref ON ref.patient_id = p.id
       LEFT JOIN dietbyrd_doctors d ON ref.doctor_id = d.id
       WHERE p.id = $1`,
      [id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Doctors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/doctors", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        d.*,
        u.phone,
        u.email,
        u.is_active,
        COUNT(DISTINCT r.patient_id) AS total_referrals
      FROM dietbyrd_doctors d
      LEFT JOIN dietbyrd_users u ON d.user_id = u.id
      LEFT JOIN dietbyrd_referrals r ON r.doctor_id = d.id
      GROUP BY d.id, u.phone, u.email, u.is_active
      ORDER BY d.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT d.*, u.phone, u.email, u.is_active,
              COUNT(DISTINCT r.patient_id) AS total_referrals
       FROM dietbyrd_doctors d
       LEFT JOIN dietbyrd_users u ON d.user_id = u.id
       LEFT JOIN dietbyrd_referrals r ON r.doctor_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, u.phone, u.email, u.is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Doctor not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/doctors", async (req, res) => {
  try {
    const { name, qualification, clinic_name, clinic_address, default_diagnosis, phone } = req.body;
    if (!name || !qualification || !phone) {
      return res.status(400).json({ success: false, error: "name, qualification, and phone are required" });
    }
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, role) VALUES ($1, 'doctor') RETURNING id`,
      [phone]
    );
    const userId = userResult.rows[0].id;
    const doctorResult = await query(
      `INSERT INTO dietbyrd_doctors (user_id, name, qualification, clinic_name, clinic_address, default_diagnosis)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, qualification, clinic_name, clinic_address, default_diagnosis || "diabetes"]
    );
    res.status(201).json({ success: true, data: doctorResult.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/doctors/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE dietbyrd_doctors SET is_verified = true WHERE id = $1 RETURNING id, name, is_verified`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await query(
      "SELECT user_id FROM dietbyrd_doctors WHERE id = $1",
      [id]
    );
    if (doctor.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }
    const userId = doctor.rows[0].user_id;

    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM dietbyrd_doctors WHERE id = $1", [id]);
      if (userId) {
        await client.query("DELETE FROM dietbyrd_join_requests WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM dietbyrd_users WHERE id = $1", [userId]);
      }
      await client.query("COMMIT");
      res.json({ success: true, message: "Doctor deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Dieticians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/dieticians", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
          rd.*,
          u.phone,
          u.email,
          u.is_active,
          COUNT(DISTINCT rp.patient_id) AS active_patients
        FROM dietbyrd_registered_dietitians rd
        LEFT JOIN dietbyrd_users u ON rd.user_id = u.id
        LEFT JOIN dietbyrd_registered_patients rp ON rp.assigned_rd_id = rd.id
        WHERE rd.is_active = true
        GROUP BY rd.id, u.phone, u.email, u.is_active
        ORDER BY rd.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available slots across ALL active dieticians (for unassigned patients)
// MUST be registered before /api/dieticians/:id to avoid being caught by the parameterized route
app.get("/api/dieticians/all-available-slots", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required (YYYY-MM-DD format)",
      });
    }

    const dieticiansResult = await query(
      "SELECT id, name FROM dietbyrd_registered_dietitians WHERE is_active = true ORDER BY name"
    );

    const getISTNow = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const formatLocalDatetime = (date, time) => {
      const [hour, min] = time.split(":").map(Number);
      return `${date}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
    };

    const istNow = getISTNow();
    const minBookingTime = new Date(istNow.getTime() + 2 * 60 * 60 * 1000);
    const allSlots = [];

    for (const dietician of dieticiansResult.rows) {
      const rdId = dietician.id;

      const availabilityResult = await query(
        "SELECT * FROM dietbyrd_dietician_availability WHERE rd_id = $1 AND is_active = true",
        [rdId]
      );
      if (availabilityResult.rows.length === 0) continue;

      const bookedResult = await query(
        `SELECT TO_CHAR(scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS') as scheduled_at_str
         FROM dietbyrd_consultations
         WHERE rd_id = $1
           AND scheduled_at >= $2::timestamp
           AND scheduled_at < ($3::date + interval '1 day')::timestamp
           AND status NOT IN ('cancelled', 'no_show')`,
        [rdId, start_date, end_date]
      );
      const bookedSlots = new Set(bookedResult.rows.map((r) => r.scheduled_at_str));

      const blockedResult = await query(
        `SELECT *, TO_CHAR(blocked_date, 'YYYY-MM-DD') as blocked_date_str
         FROM dietbyrd_dietician_blocked_slots
         WHERE rd_id = $1 AND blocked_date >= $2::date AND blocked_date <= $3::date`,
        [rdId, start_date, end_date]
      );

      const startDateParts = start_date.split("-").map(Number);
      const endDateParts = end_date.split("-").map(Number);
      let currentDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
      const endDate_ = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);

      while (currentDate <= endDate_) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = formatDateStr(currentDate);

        const dayBlocked = blockedResult.rows.find(
          (b) => b.blocked_date_str === dateStr && !b.start_time && !b.end_time
        );
        if (dayBlocked) { currentDate.setDate(currentDate.getDate() + 1); continue; }

        const dayAvailability = availabilityResult.rows.filter((a) => a.day_of_week === dayOfWeek);

        for (const avail of dayAvailability) {
          const slotDuration = avail.slot_duration_minutes || 60;
          const [startHour, startMin] = avail.start_time.split(":").map(Number);
          const [endHour, endMin] = avail.end_time.split(":").map(Number);
          let slotMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          while (slotMinutes + slotDuration <= endMinutes) {
            const slotHour = Math.floor(slotMinutes / 60);
            const slotMin = slotMinutes % 60;
            const slotTimeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}`;
            const slotDatetime = formatLocalDatetime(dateStr, slotTimeStr);

            const slotDate = new Date(currentDate);
            slotDate.setHours(slotHour, slotMin, 0, 0);

            if (slotDate < minBookingTime) { slotMinutes += slotDuration; continue; }
            if (bookedSlots.has(slotDatetime)) { slotMinutes += slotDuration; continue; }

            const timeBlocked = blockedResult.rows.find((b) => {
              if (b.blocked_date_str !== dateStr || !b.start_time || !b.end_time) return false;
              const blockStart = b.start_time.split(":").map(Number);
              const blockEnd = b.end_time.split(":").map(Number);
              const slotTimeNum = slotHour * 60 + slotMin;
              return slotTimeNum >= blockStart[0] * 60 + blockStart[1] && slotTimeNum < blockEnd[0] * 60 + blockEnd[1];
            });
            if (timeBlocked) { slotMinutes += slotDuration; continue; }

            allSlots.push({
              date: dateStr,
              start_time: slotTimeStr,
              datetime: slotDatetime,
              duration_minutes: slotDuration,
              is_booked: false,
              rd_id: rdId,
              dietician_name: dietician.name,
            });

            slotMinutes += slotDuration;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    allSlots.sort((a, b) => a.datetime.localeCompare(b.datetime));
    res.json({ success: true, data: allSlots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/dieticians/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT rd.*, u.phone, u.is_active
       FROM dietbyrd_registered_dietitians rd
       LEFT JOIN dietbyrd_users u ON rd.user_id = u.id
       WHERE rd.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Dietician not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/dieticians/:id", async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await getPool().connect();
    const tableExists = async (tableName) => {
      const result = await client.query("SELECT to_regclass($1) AS table_name", [tableName]);
      return Boolean(result.rows[0]?.table_name);
    };
    const columnIsNullable = async (tableName, columnName) => {
      const result = await client.query(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = $2`,
        [tableName, columnName]
      );
      return result.rows[0]?.is_nullable === "YES";
    };
    const queryIfTableExists = async (tableName, text, params = []) => {
      if (await tableExists(tableName)) {
        await client.query(text, params);
      }
    };

    await client.query("BEGIN");

    const dietician = await client.query(
      "SELECT user_id FROM dietbyrd_registered_dietitians WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (dietician.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Dietician not found" });
    }
    const userId = dietician.rows[0].user_id;

    await queryIfTableExists(
      "dietbyrd_registered_patients",
      "UPDATE dietbyrd_registered_patients SET assigned_rd_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE assigned_rd_id = $1",
      [id]
    );

    await queryIfTableExists(
      "dietbyrd_dietician_blocked_slots",
      "DELETE FROM dietbyrd_dietician_blocked_slots WHERE rd_id = $1",
      [id]
    );
    await queryIfTableExists(
      "dietbyrd_dietician_availability",
      "DELETE FROM dietbyrd_dietician_availability WHERE rd_id = $1",
      [id]
    );

    if (await tableExists("dietbyrd_consultations") && await columnIsNullable("dietbyrd_consultations", "rd_id")) {
      await client.query(
        "UPDATE dietbyrd_consultations SET rd_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE rd_id = $1",
        [id]
      );
    }
    if (await tableExists("dietbyrd_diet_plans") && await columnIsNullable("dietbyrd_diet_plans", "rd_id")) {
      await client.query(
        "UPDATE dietbyrd_diet_plans SET rd_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE rd_id = $1",
        [id]
      );
    }

    let deletedDietician = false;
    await client.query("SAVEPOINT delete_dietician_row");
    try {
      const deleteResult = await client.query(
        "DELETE FROM dietbyrd_registered_dietitians WHERE id = $1",
        [id]
      );
      deletedDietician = deleteResult.rowCount > 0;
      await client.query("RELEASE SAVEPOINT delete_dietician_row");
    } catch (deleteErr) {
      if (deleteErr.code !== "23503") {
        throw deleteErr;
      }
      await client.query("ROLLBACK TO SAVEPOINT delete_dietician_row");
      await client.query(
        "UPDATE dietbyrd_registered_dietitians SET is_active = false, user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      await client.query("RELEASE SAVEPOINT delete_dietician_row");
    }

    if (userId) {
      await queryIfTableExists(
        "dietbyrd_join_request_messages",
        "DELETE FROM dietbyrd_join_request_messages WHERE recipient_user_id = $1 OR sender_id = $1",
        [userId]
      );
      await queryIfTableExists(
        "dietbyrd_join_requests",
        "UPDATE dietbyrd_join_requests SET user_id = NULL WHERE user_id = $1",
        [userId]
      );
      await queryIfTableExists(
        "dietbyrd_tickets",
        "UPDATE dietbyrd_tickets SET assigned_to = NULL WHERE assigned_to = $1",
        [userId]
      );
      await client.query("DELETE FROM dietbyrd_users WHERE id = $1", [userId]);
    }

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Dietician deleted successfully",
      deleted: deletedDietician,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[delete dietician] Rollback error:", rollbackErr.message);
      }
    }
    console.error("[delete dietician] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

app.get("/api/dieticians/:id/patients", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        p.*,
        s.status AS subscription_status,
        s.start_date,
        s.end_date
      FROM dietbyrd_patients p
      INNER JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_subscriptions s ON s.registered_patient_id = rp.id
      WHERE rp.assigned_rd_id = $1
      ORDER BY rp.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Dietitian Blocked Slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/dieticians/:id/blocked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    let queryStr = "SELECT * FROM dietbyrd_dietitian_blocked_slots WHERE rd_id = $1";
    const params = [id];

    if (start_date && end_date) {
      queryStr += " AND blocked_date BETWEEN $2 AND $3";
      params.push(start_date, end_date);
    }

    queryStr += " ORDER BY blocked_date ASC, start_time ASC";
    const result = await query(queryStr, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/dieticians/:id/blocked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked_date, start_time, end_time, reason } = req.body;
    const result = await query(
      `INSERT INTO dietbyrd_dietitian_blocked_slots (rd_id, blocked_date, start_time, end_time, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, blocked_date, start_time || null, end_time || null, reason || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/dieticians/:id/blocked-slots/:slotId", async (req, res) => {
  try {
    const { id, slotId } = req.params;
    const result = await query(
      "DELETE FROM dietbyrd_dietitian_blocked_slots WHERE id = $1 AND rd_id = $2 RETURNING *",
      [slotId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Slot not found" });
    }
    res.json({ success: true, message: "Blocked slot removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Referrals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/referrals", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        r.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        p.diagnosis,
        d.name AS doctor_name,
        d.clinic_name
      FROM dietbyrd_referrals r
      LEFT JOIN dietbyrd_patients p ON r.patient_id = p.id
      LEFT JOIN dietbyrd_doctors d ON r.doctor_id = d.id
      ORDER BY r.referred_at DESC
      LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/referrals/doctor/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const result = await query(
      `SELECT
        r.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        p.diagnosis,
        p.age,
        p.gender,
        CASE WHEN u.id IS NOT NULL THEN true ELSE false END AS is_registered
      FROM dietbyrd_referrals r
      LEFT JOIN dietbyrd_patients p ON r.patient_id = p.id
      LEFT JOIN dietbyrd_users u ON u.phone = p.phone AND u.is_verified = true
      WHERE r.doctor_id = $1
      ORDER BY r.referred_at DESC`,
      [doctorId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get unregistered referrals (referred but not yet registered/paid)
app.get("/api/referrals/unregistered", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        p.id,
        p.name,
        p.phone,
        p.age,
        p.gender,
        p.diagnosis,
        p.diagnosis_description,
        p.referral_source,
        p.created_at,
        r.referred_at,
        r.source AS referral_method,
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.clinic_name AS doctor_clinic,
        d.qualification AS doctor_qualification,
        -- Check if any messages were sent
        CASE 
          WHEN jsonb_array_length(p.patient_messages) > 0 THEN true
          ELSE false
        END AS message_sent,
        -- Get the last message status if available
        CASE 
          WHEN jsonb_array_length(p.patient_messages) > 0 
          THEN (p.patient_messages->-1->>'status')::text
          ELSE NULL
        END AS last_message_status
      FROM dietbyrd_patients p
      INNER JOIN dietbyrd_referrals r ON r.patient_id = p.id
      LEFT JOIN dietbyrd_doctors d ON r.doctor_id = d.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      WHERE rp.id IS NULL  -- Not registered yet
      ORDER BY r.referred_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/referrals", async (req, res) => {
  try {
    const { patient_name, phone, diagnosis, diagnosis_description, doctor_id } = req.body;
    if (!phone || !doctor_id) {
      return res.status(400).json({ success: false, error: "phone and doctor_id are required" });
    }

    // Get doctor information
    const doctorResult = await query(`SELECT name, clinic_name FROM dietbyrd_doctors WHERE id = $1`, [doctor_id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }
    const doctor = doctorResult.rows[0];

    let patientId;
    let isNewPatient = false;

    // Check if patient already exists
    const existingPatient = await query(`SELECT id FROM dietbyrd_patients WHERE phone = $1`, [phone]);

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({ success: false, error: "The recommended patient is already an existing DietByRD patient." });
    } else {
      isNewPatient = true;

      // First, create (or get existing) user entry
      let userId;
      const existingUser = await query(`SELECT id FROM dietbyrd_users WHERE phone = $1`, [phone]);

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
      } else {
        // Create new user (patient will need to set password later)
        const newUser = await query(
          `INSERT INTO dietbyrd_users (phone, role, name, is_active)
           VALUES ($1, 'patient', $2, true)
           RETURNING id`,
          [phone, patient_name]
        );
        userId = newUser.rows[0].id;
      }

      // Now create the patient entry with user_id
      const newPatient = await query(
        `INSERT INTO dietbyrd_patients (user_id, name, phone, diagnosis, diagnosis_description, referral_source)
         VALUES ($1, $2, $3, $4, $5, 'doctor')
         RETURNING id`,
        [userId, patient_name, phone, diagnosis, diagnosis_description]
      );
      patientId = newPatient.rows[0].id;
    }

    // Ensure short_code column exists
    await ensureReferralShortCodeColumn();

    // Generate a unique short code for the clean URL
    let shortCode = generateShortCode();
    let shortCodeAttempts = 0;
    while (shortCodeAttempts < 5) {
      const existing = await query(`SELECT id FROM dietbyrd_referrals WHERE short_code = $1`, [shortCode]);
      if (existing.rows.length === 0) break;
      shortCode = generateShortCode();
      shortCodeAttempts++;
    }

    const registrationData = {
      patientPhone: phone,
      patientName: patient_name,
      doctorId: doctor_id,
      doctorName: doctor.name,
      diagnosis,
      diagnosisDescription: diagnosis_description,
      timestamp: Date.now()
    };

    const referral = await query(
      `INSERT INTO dietbyrd_referrals (patient_id, doctor_id, source, short_code, registration_data)
       VALUES ($1, $2, 'doctor_portal', $3, $4)
       RETURNING *`,
      [patientId, doctor_id, shortCode, JSON.stringify(registrationData)]
    );

    // Generate registration link using short code for a clean URL
    let referralMessageStatus = { sent: false, reason: "not_attempted" };
    try {
      const registrationLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/register?ref=${shortCode}`;

      console.log(`[Referral SMS] Referral created. isNewPatient=${isNewPatient} phone=${phone}`);
      referralMessageStatus = await sendReferralRegistrationSms({
        patientId,
        patientName: patient_name,
        phone,
        doctorName: doctor.name,
        registrationLink,
      });
    } catch (tokenErr) {
      console.log(`[Referral Token] Error: ${tokenErr.message}`);
      referralMessageStatus = { sent: false, reason: "token_generation_failed", message: tokenErr.message };
    }

    res.status(201).json({
      success: true,
      data: {
        ...referral.rows[0],
        patient_id: patientId,
        is_new_patient: isNewPatient,
        referral_message: referralMessageStatus,
        message: isNewPatient
          ? "New patient created and referred successfully. Registration WhatsApp has been sent."
          : "Existing patient referred successfully."
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify registration token (legacy â€” kept for backward compat)
app.get("/api/referrals/verify-token", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: "Token is required" });
    }

    const tokenData = verifyRegistrationToken(token);
    res.json({ success: true, data: tokenData });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify referral by short code (clean URL approach)
app.get("/api/referrals/verify-ref", async (req, res) => {
  try {
    const { ref } = req.query;
    if (!ref) {
      return res.status(400).json({ success: false, error: "Referral code is required" });
    }

    await ensureReferralShortCodeColumn();

    const result = await query(
      `SELECT r.registration_data, r.id, r.patient_id,
              p.name AS patient_name, p.phone, p.diagnosis, p.diagnosis_description,
              d.name AS doctor_name, r.doctor_id
       FROM dietbyrd_referrals r
       LEFT JOIN dietbyrd_patients p ON p.id = r.patient_id
       LEFT JOIN dietbyrd_doctors d ON d.id = r.doctor_id
       WHERE r.short_code = $1`,
      [String(ref).toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Invalid or expired referral link." });
    }

    const row = result.rows[0];
    // Prefer stored registration_data (has all fields), fall back to joined columns
    const data = row.registration_data || {
      patientPhone: row.phone,
      patientName: row.patient_name,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      diagnosis: row.diagnosis,
      diagnosisDescription: row.diagnosis_description,
      timestamp: Date.now()
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Phone Number Lookup (for doctor referral autocomplete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/patients/lookup-phone", async (req, res) => {
  try {
    const phoneQuery = Array.isArray(req.query.phone) ? req.query.phone[0] : req.query.phone;
    const phone = String(phoneQuery || "").replace(/\D/g, "");

    if (!phone || phone.length < 3) {
      return res.json({ success: true, data: [] });
    }

    const result = await query(
      `SELECT DISTINCT
          u.id,
          COALESCE(p.name, u.name) AS name,
          u.phone,
          p.diagnosis
       FROM dietbyrd_users u
       LEFT JOIN dietbyrd_patients p ON p.user_id = u.id
       WHERE regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g') LIKE $1
          OR regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g') LIKE $2
       ORDER BY u.id DESC
       LIMIT 10`,
      [`${phone}%`, `91${phone}%`]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    const error = err || {};
    const phoneQuery = Array.isArray(req.query.phone) ? req.query.phone[0] : req.query.phone;
    console.error("[patients/lookup-phone] Lookup failed", {
      timestamp: new Date().toISOString(),
      route: req.originalUrl || req.url,
      method: req.method,
      phoneQuery,
      normalizedPhone: String(phoneQuery || "").replace(/\D/g, ""),
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetail: error.detail,
      errorHint: error.hint,
      errorPosition: error.position,
      errorWhere: error.where,
      stack: error.stack,
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Doctor creates patient + pending payment booking and sends payment link
app.post("/api/doctor/patients", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== 'doctor') return res.status(403).json({ success: false, error: 'Forbidden' });

    const { name, phone_e164, age, condition, notes } = req.body;
    const rawPhone = phone_e164 || req.body.phone || req.body.phone_e164 || '';
    if (!rawPhone || !name) return res.status(400).json({ success: false, error: 'name and phone_e164 are required' });

    const variants = buildPhoneVariants(rawPhone);

    // Check for existing patient (by user->patient or patient.phone)
    const existingUser = await query(
      "SELECT id, phone FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    let patientId = null;
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      const existingPatient = await query("SELECT id FROM dietbyrd_patients WHERE user_id = $1 LIMIT 1", [userId]);
      if (existingPatient.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Patient already exists', patient_id: existingPatient.rows[0].id });
      }
    }

    // Also check if a patient row exists with matching phone directly
    const existingPatientByPhone = await query(
      "SELECT id FROM dietbyrd_patients WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );
    if (existingPatientByPhone.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Patient already exists', patient_id: existingPatientByPhone.rows[0].id });
    }

    // Create user if needed
    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      const newUser = await query(
        `INSERT INTO dietbyrd_users (phone, role, name, is_active)
         VALUES ($1, 'patient', $2, true)
         RETURNING id`,
        [formatPhoneE164(rawPhone), name]
      );
      userId = newUser.rows[0].id;
    }

    // Create patient record
    const newPatient = await query(
      `INSERT INTO dietbyrd_patients (user_id, name, phone, age, diagnosis, diagnosis_description, referral_source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'doctor_portal', $7)
       RETURNING id`,
      [userId, name, formatPhoneE164(rawPhone), age || null, condition || null, null, notes || null]
    );
    patientId = newPatient.rows[0].id;

    // Ensure a registered_patient exists for consultations
    let regPatient = await query("SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1", [patientId]);
    let registeredPatientId;
    if (regPatient.rows.length === 0) {
      const created = await query(
        `INSERT INTO dietbyrd_registered_patients (patient_id)
         VALUES ($1) RETURNING id`,
        [patientId]
      );
      registeredPatientId = created.rows[0].id;
    } else {
      registeredPatientId = regPatient.rows[0].id;
    }

    // Create pending consultation (booking) record
    const consult = await query(
      `INSERT INTO dietbyrd_consultations (registered_patient_id, status, referred_by_doctor_id, notes)
       VALUES ($1, 'pending_payment', $2, $3)
       RETURNING id`,
      [registeredPatientId, auth.userId, notes || null]
    );
    const bookingId = consult.rows[0].id;

    const paymentLink = `${process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/pay?ref=${bookingId}`;

    // Attempt to send WhatsApp/SMS using existing helpers (falls back to SMS/console logging)
    let messageResult = { sent: false, reason: 'not_attempted' };
    try {
      // Prefer WhatsApp template path if available
      messageResult = await sendReferralWhatsApp({
        patientId,
        patientName: name,
        phone: formatPhoneE164(rawPhone),
        doctorName: auth.user?.name || 'your doctor',
        registrationLink: paymentLink
      });

      // If WhatsApp failed, try SMS fallback
      if (!messageResult || !messageResult.sent) {
        messageResult = await sendReferralRegistrationSms({
          patientId,
          patientName: name,
          phone: formatPhoneE164(rawPhone),
          doctorName: auth.user?.name || 'your doctor',
          registrationLink: paymentLink
        });
      }
    } catch (err) {
      console.log('[Doctor Referral] Message send failed', err?.message || err);
      messageResult = { sent: false, reason: 'exception', error: err?.message || String(err) };
    }

    // Log to doctor_referrals_log if table exists (best-effort)
    try {
      await query(
        `INSERT INTO doctor_referrals_log (doctor_id, patient_id, consultation_id, phone, sent_at, channel, message, metadata)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7)`,
        [auth.userId, patientId, bookingId, formatPhoneE164(rawPhone), messageResult?.channel || (messageResult?.sent ? 'whatsapp_or_sms' : 'none'), messageResult?.reason || 'sent', JSON.stringify(messageResult || {})]
      );
    } catch (err) {
      // ignore if logging table does not exist
    }

    res.status(201).json({
      success: true,
      data: { patient_id: patientId, booking_id: bookingId, payment_link: paymentLink, payment_link_sent: !!messageResult?.sent, message_result: messageResult }
    });
  } catch (err) {
    console.error('[/api/doctor/patients] error', err?.message || err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Consultations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/consultations", async (req, res) => {
  try {
    const { rd_id, patient_id, status } = req.query;
    let sql = `
      SELECT 
        c.*,
        p.name AS patient_name,
        p.diagnosis,
        rd.name AS dietician_name
      FROM dietbyrd_consultations c
      LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
      WHERE 1=1
    `;
    const params = [];
    if (rd_id) { params.push(rd_id); sql += ` AND c.rd_id = $${params.length}`; }
    if (patient_id) { params.push(patient_id); sql += ` AND rp.patient_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND c.status = $${params.length}`; }
    sql += ` ORDER BY c.scheduled_at DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get consultation preview for payment page
app.get("/api/consultations/:id(\\d+)/preview", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.id AS consultation_id, c.status,
              rp.id AS registered_patient_id, p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone, p.diagnosis,
              d.name AS doctor_name
       FROM dietbyrd_consultations c
       LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
       LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
       LEFT JOIN dietbyrd_doctors d ON c.referred_by_doctor_id = d.id
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Consultation not found' });
    const row = result.rows[0];

    // Find default package price (best-effort)
    let amount = 99900; // default in paise
    try {
      const pkgRes = await query(`SELECT price FROM dietbyrd_consultation_packages WHERE is_active = true ORDER BY num_consultations ASC LIMIT 1`);
      if (pkgRes.rows.length > 0) amount = Number(pkgRes.rows[0].price) || amount;
    } catch (err) {
      // ignore and use default
    }

    res.json({
      success: true, data: {
        consultation_id: row.consultation_id,
        patient_id: row.patient_id,
        patient_name: row.patient_name,
        patient_phone: row.patient_phone,
        doctor_name: row.doctor_name || null,
        diagnosis: row.diagnosis || null,
        amount,
        currency: 'INR',
        status: row.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Resend payment link for a consultation (doctor/assistant)
app.post("/api/consultations/:id(\\d+)/resend-payment-link", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (!['doctor', 'assistant'].includes(auth.role)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const { id } = req.params;
    const result = await query(
      `SELECT c.id AS consultation_id, rp.id AS registered_patient_id, p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone, d.name AS doctor_name
       FROM dietbyrd_consultations c
       LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
       LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
       LEFT JOIN dietbyrd_doctors d ON c.referred_by_doctor_id = d.id
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Consultation not found' });
    const row = result.rows[0];

    const paymentLink = `${process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/pay?ref=${row.consultation_id}`;

    let messageResult = { sent: false };
    try {
      messageResult = await sendReferralWhatsApp({
        patientId: row.patient_id,
        patientName: row.patient_name,
        phone: formatPhoneE164(row.patient_phone),
        doctorName: row.doctor_name || auth.user?.name || 'your doctor',
        registrationLink: paymentLink
      });
      if (!messageResult || !messageResult.sent) {
        messageResult = await sendReferralRegistrationSms({
          patientId: row.patient_id,
          patientName: row.patient_name,
          phone: formatPhoneE164(row.patient_phone),
          doctorName: row.doctor_name || auth.user?.name || 'your doctor',
          registrationLink: paymentLink
        });
      }
    } catch (err) {
      messageResult = { sent: false, reason: 'exception', error: err?.message || String(err) };
    }

    // Best-effort log
    try {
      await query(`INSERT INTO doctor_referrals_log (doctor_id, patient_id, consultation_id, phone, sent_at, channel, message, metadata) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,$7)`,
        [auth.userId, row.patient_id, row.consultation_id, formatPhoneE164(row.patient_phone), messageResult?.channel || (messageResult?.sent ? 'whatsapp_or_sms' : 'none'), messageResult?.reason || 'resent', JSON.stringify(messageResult || {})]);
    } catch (e) { }

    res.json({ success: true, data: { sent: !!messageResult?.sent, message_result: messageResult, payment_link: paymentLink } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/plans", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM dietbyrd_plans WHERE is_active = true ORDER BY price ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Diet Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Get diet plans for a specific patient
app.get("/api/patients/:id(\\d+)/diet-plans", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        dp.*,
        rd.name AS dietician_name
      FROM dietbyrd_diet_plans dp
      LEFT JOIN dietbyrd_registered_patients rp ON dp.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON dp.rd_id = rd.id
      WHERE rp.patient_id = $1
      ORDER BY dp.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new diet plan
app.post("/api/diet-plans", async (req, res) => {
  try {
    const { patient_id, rd_id, plan_json, consultation_id } = req.body;

    if (!patient_id || !rd_id || !plan_json) {
      return res.status(400).json({
        success: false,
        error: "patient_id, rd_id, and plan_json are required"
      });
    }

    // Check if registered_patient record exists, create if not
    let regPatientResult = await query(
      "SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1",
      [patient_id]
    );

    let registeredPatientId;
    if (regPatientResult.rows.length === 0) {
      // Create registered_patient record
      const newRegPatient = await query(
        `INSERT INTO dietbyrd_registered_patients (patient_id, assigned_rd_id)
         VALUES ($1, $2)
         RETURNING id`,
        [patient_id, rd_id]
      );
      registeredPatientId = newRegPatient.rows[0].id;
    } else {
      registeredPatientId = regPatientResult.rows[0].id;
    }

    // Deactivate previous active plans for this patient
    await query(
      `UPDATE dietbyrd_diet_plans 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE registered_patient_id = $1 AND is_active = true`,
      [registeredPatientId]
    );

    // Create the new diet plan
    const result = await query(
      `INSERT INTO dietbyrd_diet_plans 
        (registered_patient_id, rd_id, consultation_id, plan_json, is_active, issued_at)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING *`,
      [registeredPatientId, rd_id, consultation_id || null, JSON.stringify(plan_json)]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get a specific diet plan
app.get("/api/diet-plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        dp.*,
        rd.name AS dietician_name,
        p.name AS patient_name
      FROM dietbyrd_diet_plans dp
      LEFT JOIN dietbyrd_registered_patients rp ON dp.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON dp.rd_id = rd.id
      WHERE dp.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Diet plan not found" });
    }

    // Increment view count
    await query(
      "UPDATE dietbyrd_diet_plans SET view_count = view_count + 1 WHERE id = $1",
      [id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a specific diet plan
app.patch("/api/diet-plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_json } = req.body;

    if (!plan_json) {
      return res.status(400).json({ success: false, error: "plan_json is required" });
    }

    const result = await query(
      `UPDATE dietbyrd_diet_plans
       SET plan_json = $1,
           updated_at = CURRENT_TIMESTAMP,
           issued_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(plan_json), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Diet plan not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Doctor Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/doctors/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;

    // Get total referred patients (either by doctor or their assistants)
    const referredResult = await query(
      `SELECT COUNT(DISTINCT r.id) as total_referred
       FROM dietbyrd_referrals r
       WHERE r.doctor_id = $1 OR r.assistant_id IN (
         SELECT id FROM dietbyrd_assistants WHERE doctor_id = $1
       )`,
      [id]
    );

    // Get onboarded patients (those with active subscriptions)
    const onboardedResult = await query(
      `SELECT COUNT(DISTINCT s.registered_patient_id) as total_onboarded
       FROM dietbyrd_subscriptions s
       JOIN dietbyrd_registered_patients rp ON s.registered_patient_id = rp.id
       JOIN dietbyrd_referrals r ON rp.patient_id = r.patient_id
       WHERE (r.doctor_id = $1 OR r.assistant_id IN (
         SELECT id FROM dietbyrd_assistants WHERE doctor_id = $1
       ))
       AND s.status IN ('active', 'paused')`,
      [id]
    );

    // Get commission earned (from doctor_earnings table)
    const commissionResult = await query(
      `SELECT COALESCE(SUM(earnings_amount), 0) as total_commission
       FROM dietbyrd_doctor_earnings
       WHERE doctor_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        total_referred: parseInt(referredResult.rows[0]?.total_referred || 0),
        total_onboarded: parseInt(onboardedResult.rows[0]?.total_onboarded || 0),
        total_commission: parseFloat(commissionResult.rows[0]?.total_commission || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Doctor Assistants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/doctors/:id/assistants", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, u.phone, u.is_active as user_active
       FROM dietbyrd_assistants a
       LEFT JOIN dietbyrd_users u ON a.user_id = u.id
       WHERE a.doctor_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/doctors/:doctorId/assistants", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (!ADMIN_DOCTOR_ASSISTANT_ROLES.includes(auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const doctorId = parseInt(String(req.params.doctorId), 10);
    if (!Number.isInteger(doctorId)) {
      return res.status(400).json({ success: false, error: "Invalid doctor id" });
    }

    const doctorResult = await query("SELECT id FROM dietbyrd_doctors WHERE id = $1", [doctorId]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    const result = await query(
      `SELECT
        a.id,
        a.user_id,
        a.doctor_id,
        COALESCE(u.name, a.name) AS name,
        u.phone,
        u.email,
        COALESCE(u.is_active, true) AS is_active,
        a.created_at
      FROM dietbyrd_assistants a
      LEFT JOIN dietbyrd_users u ON a.user_id = u.id
      WHERE a.doctor_id = $1
      ORDER BY a.created_at DESC`,
      [doctorId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[admin/doctors/assistants] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create assistant (with user account)
app.post("/api/assistants", async (req, res) => {
  try {
    const { name, phone, password, doctor_id } = req.body;

    if (!name || !phone || !password || !doctor_id) {
      return res.status(400).json({
        success: false,
        error: "name, phone, password, and doctor_id are required"
      });
    }

    // Check if phone already exists
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Phone number already registered"
      });
    }

    // Create user
    const hashedAssistantPw = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, name, password, role, is_active)
       VALUES ($1, $2, $3, 'assistant', true)
       RETURNING id`,
      [phone, name, hashedAssistantPw]
    );

    const userId = userResult.rows[0].id;

    // Create assistant record
    const assistantResult = await query(
      `INSERT INTO dietbyrd_assistants (user_id, doctor_id, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, doctor_id, name]
    );

    res.status(201).json({
      success: true,
      data: { ...assistantResult.rows[0], phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete assistant
app.delete("/api/assistants/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get user_id before deleting assistant
    const assistant = await query(
      "SELECT user_id FROM dietbyrd_assistants WHERE id = $1",
      [id]
    );

    if (assistant.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Assistant not found" });
    }

    const userId = assistant.rows[0].user_id;

    // Delete assistant record
    await query("DELETE FROM dietbyrd_assistants WHERE id = $1", [id]);

    // Delete user account
    if (userId) {
      await query("DELETE FROM dietbyrd_users WHERE id = $1", [userId]);
    }

    res.json({ success: true, message: "Assistant deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Food Library â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Get all food items
app.get("/api/food-library", async (req, res) => {
  try {
    const { search, category, food_type } = req.query;

    let queryText = "SELECT * FROM dietbyrd_food_library WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (LOWER(name_en) LIKE $${paramIndex} OR LOWER(name_hi) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    if (category && category !== 'all') {
      queryText += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (food_type && food_type !== 'all') {
      queryText += ` AND food_type = $${paramIndex}`;
      params.push(food_type);
      paramIndex++;
    }

    queryText += " ORDER BY name_en";

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single food item
app.get("/api/food-library/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM dietbyrd_food_library WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create food item
app.post("/api/food-library", async (req, res) => {
  try {
    const {
      id, name_en, name_hi, category,
      calories, protein, carbs, fat, fiber,
      iron, calcium, magnesium, zinc, potassium, sodium, phosphorus, iodine, selenium, copper,
      vitamin_a, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, vitamin_b9, vitamin_b12,
      vitamin_c, vitamin_d, vitamin_e, vitamin_k,
      oxalate_eee, phytate_eee,
      yield_factor, image_url, tags, food_type, dietitian_visibility, caution_level, notes,
      created_by_user_id
    } = req.body;

    if (!id || !name_en || !category) {
      return res.status(400).json({
        success: false,
        error: "id, name_en, and category are required"
      });
    }

    const result = await query(
      `INSERT INTO dietbyrd_food_library (
        id, name_en, name_hi, category,
        calories, protein, carbs, fat, fiber,
        iron, calcium, magnesium, zinc, potassium, sodium, phosphorus, iodine, selenium, copper,
        vitamin_a, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, vitamin_b9, vitamin_b12,
        vitamin_c, vitamin_d, vitamin_e, vitamin_k,
        oxalate_eee, phytate_eee,
        yield_factor, image_url, tags, food_type, dietitian_visibility, caution_level, notes,
        created_by_user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39, $40
      ) RETURNING *`,
      [
        id, name_en, name_hi, category,
        calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0,
        iron || 0, calcium || 0, magnesium || 0, zinc || 0, potassium || 0, sodium || 0,
        phosphorus || 0, iodine || 0, selenium || 0, copper || 0,
        vitamin_a || 0, vitamin_b1 || 0, vitamin_b2 || 0, vitamin_b3 || 0, vitamin_b6 || 0,
        vitamin_b9 || 0, vitamin_b12 || 0, vitamin_c || 0, vitamin_d || 0, vitamin_e || 0, vitamin_k || 0,
        oxalate_eee || 0, phytate_eee || 0,
        yield_factor || 1.0, image_url, tags, food_type || 'CORE',
        dietitian_visibility !== undefined ? dietitian_visibility : true,
        caution_level || 'NONE', notes, created_by_user_id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, error: "Food ID already exists" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update food item
app.put("/api/food-library/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_en, name_hi, category,
      calories, protein, carbs, fat, fiber,
      iron, calcium, magnesium, zinc, potassium, sodium, phosphorus, iodine, selenium, copper,
      vitamin_a, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, vitamin_b9, vitamin_b12,
      vitamin_c, vitamin_d, vitamin_e, vitamin_k,
      oxalate_eee, phytate_eee,
      yield_factor, image_url, tags, food_type, dietitian_visibility, caution_level, notes
    } = req.body;

    // Build dynamic update query based on provided fields
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name_en !== undefined) {
      updates.push(`name_en = $${paramIndex++}`);
      params.push(name_en);
    }
    if (name_hi !== undefined) {
      updates.push(`name_hi = $${paramIndex++}`);
      params.push(name_hi);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (calories !== undefined) {
      updates.push(`calories = $${paramIndex++}`);
      params.push(calories);
    }
    if (protein !== undefined) {
      updates.push(`protein = $${paramIndex++}`);
      params.push(protein);
    }
    if (carbs !== undefined) {
      updates.push(`carbs = $${paramIndex++}`);
      params.push(carbs);
    }
    if (fat !== undefined) {
      updates.push(`fat = $${paramIndex++}`);
      params.push(fat);
    }
    if (fiber !== undefined) {
      updates.push(`fiber = $${paramIndex++}`);
      params.push(fiber);
    }
    if (iron !== undefined) {
      updates.push(`iron = $${paramIndex++}`);
      params.push(iron);
    }
    if (calcium !== undefined) {
      updates.push(`calcium = $${paramIndex++}`);
      params.push(calcium);
    }
    if (magnesium !== undefined) {
      updates.push(`magnesium = $${paramIndex++}`);
      params.push(magnesium);
    }
    if (zinc !== undefined) {
      updates.push(`zinc = $${paramIndex++}`);
      params.push(zinc);
    }
    if (potassium !== undefined) {
      updates.push(`potassium = $${paramIndex++}`);
      params.push(potassium);
    }
    if (sodium !== undefined) {
      updates.push(`sodium = $${paramIndex++}`);
      params.push(sodium);
    }
    if (phosphorus !== undefined) {
      updates.push(`phosphorus = $${paramIndex++}`);
      params.push(phosphorus);
    }
    if (iodine !== undefined) {
      updates.push(`iodine = $${paramIndex++}`);
      params.push(iodine);
    }
    if (selenium !== undefined) {
      updates.push(`selenium = $${paramIndex++}`);
      params.push(selenium);
    }
    if (copper !== undefined) {
      updates.push(`copper = $${paramIndex++}`);
      params.push(copper);
    }
    if (vitamin_a !== undefined) {
      updates.push(`vitamin_a = $${paramIndex++}`);
      params.push(vitamin_a);
    }
    if (vitamin_b1 !== undefined) {
      updates.push(`vitamin_b1 = $${paramIndex++}`);
      params.push(vitamin_b1);
    }
    if (vitamin_b2 !== undefined) {
      updates.push(`vitamin_b2 = $${paramIndex++}`);
      params.push(vitamin_b2);
    }
    if (vitamin_b3 !== undefined) {
      updates.push(`vitamin_b3 = $${paramIndex++}`);
      params.push(vitamin_b3);
    }
    if (vitamin_b6 !== undefined) {
      updates.push(`vitamin_b6 = $${paramIndex++}`);
      params.push(vitamin_b6);
    }
    if (vitamin_b9 !== undefined) {
      updates.push(`vitamin_b9 = $${paramIndex++}`);
      params.push(vitamin_b9);
    }
    if (vitamin_b12 !== undefined) {
      updates.push(`vitamin_b12 = $${paramIndex++}`);
      params.push(vitamin_b12);
    }
    if (vitamin_c !== undefined) {
      updates.push(`vitamin_c = $${paramIndex++}`);
      params.push(vitamin_c);
    }
    if (vitamin_d !== undefined) {
      updates.push(`vitamin_d = $${paramIndex++}`);
      params.push(vitamin_d);
    }
    if (vitamin_e !== undefined) {
      updates.push(`vitamin_e = $${paramIndex++}`);
      params.push(vitamin_e);
    }
    if (vitamin_k !== undefined) {
      updates.push(`vitamin_k = $${paramIndex++}`);
      params.push(vitamin_k);
    }
    if (oxalate_eee !== undefined) {
      updates.push(`oxalate_eee = $${paramIndex++}`);
      params.push(oxalate_eee);
    }
    if (phytate_eee !== undefined) {
      updates.push(`phytate_eee = $${paramIndex++}`);
      params.push(phytate_eee);
    }
    if (yield_factor !== undefined) {
      updates.push(`yield_factor = $${paramIndex++}`);
      params.push(yield_factor);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      params.push(image_url);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(tags);
    }
    if (food_type !== undefined) {
      updates.push(`food_type = $${paramIndex++}`);
      params.push(food_type);
    }
    if (dietitian_visibility !== undefined) {
      updates.push(`dietitian_visibility = $${paramIndex++}`);
      params.push(dietitian_visibility);
    }
    if (caution_level !== undefined) {
      updates.push(`caution_level = $${paramIndex++}`);
      params.push(caution_level);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    params.push(id);
    const result = await query(
      `UPDATE dietbyrd_food_library SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Food item not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete food item
app.delete("/api/food-library/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM dietbyrd_food_library WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Food item not found" });
    }

    res.json({ success: true, message: "Food item deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Coupon Codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Get all coupons (admin only)
app.get("/api/admin/coupons", async (req, res) => {
  try {
    const { active_only } = req.query;

    let queryText = "SELECT * FROM dietbyrd_coupon_codes WHERE 1=1";

    if (active_only === 'true') {
      queryText += " AND is_active = true AND valid_until > NOW()";
    }

    queryText += " ORDER BY created_at DESC";

    const result = await query(queryText);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single coupon (admin only)
app.get("/api/admin/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM dietbyrd_coupon_codes WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate coupon code
app.post("/api/coupons/validate", async (req, res) => {
  try {
    const { code, order_amount, user_id } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: "Coupon code is required" });
    }

    // Get coupon
    const couponResult = await query(
      `SELECT * FROM dietbyrd_coupon_codes 
       WHERE UPPER(code) = UPPER($1) 
       AND is_active = true 
       AND valid_from <= NOW() 
       AND valid_until > NOW()`,
      [code]
    );

    if (couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Invalid or expired coupon code"
      });
    }

    const coupon = couponResult.rows[0];

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        error: "Coupon usage limit reached"
      });
    }

    // Check minimum purchase amount
    if (order_amount && coupon.min_purchase_amount > 0) {
      if (order_amount < coupon.min_purchase_amount) {
        return res.status(400).json({
          success: false,
          error: `Minimum purchase amount of â‚¹${coupon.min_purchase_amount} required`
        });
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (order_amount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
        discount = coupon.max_discount_amount;
      }
    } else {
      discount = coupon.discount_value;
    }

    res.json({
      success: true,
      data: {
        ...coupon,
        discount_applied: discount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create coupon (admin only)
app.post("/api/admin/coupons", async (req, res) => {
  try {
    const {
      code, discount_type, discount_value, max_discount_amount, min_purchase_amount,
      usage_limit, valid_from, valid_until, is_active, applicable_plans, notes,
      created_by_user_id
    } = req.body;

    if (!code || !discount_type || discount_value === undefined || !valid_until) {
      return res.status(400).json({
        success: false,
        error: "code, discount_type, discount_value, and valid_until are required"
      });
    }

    const result = await query(
      `INSERT INTO dietbyrd_coupon_codes (
        code, discount_type, discount_value, max_discount_amount, min_purchase_amount,
        usage_limit, valid_from, valid_until, is_active, applicable_plans, notes,
        created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        code.toUpperCase(), discount_type, discount_value, max_discount_amount,
        min_purchase_amount || 0, usage_limit, valid_from || new Date(),
        valid_until, is_active !== undefined ? is_active : true,
        applicable_plans ? JSON.stringify(applicable_plans) : null,
        notes, created_by_user_id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, error: "Coupon code already exists" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update coupon (admin only)
app.put("/api/admin/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, discount_type, discount_value, max_discount_amount, min_purchase_amount,
      usage_limit, valid_from, valid_until, is_active, applicable_plans, notes
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      params.push(code.toUpperCase());
    }
    if (discount_type !== undefined) {
      updates.push(`discount_type = $${paramIndex++}`);
      params.push(discount_type);
    }
    if (discount_value !== undefined) {
      updates.push(`discount_value = $${paramIndex++}`);
      params.push(discount_value);
    }
    if (max_discount_amount !== undefined) {
      updates.push(`max_discount_amount = $${paramIndex++}`);
      params.push(max_discount_amount);
    }
    if (min_purchase_amount !== undefined) {
      updates.push(`min_purchase_amount = $${paramIndex++}`);
      params.push(min_purchase_amount);
    }
    if (usage_limit !== undefined) {
      updates.push(`usage_limit = $${paramIndex++}`);
      params.push(usage_limit);
    }
    if (valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex++}`);
      params.push(valid_from);
    }
    if (valid_until !== undefined) {
      updates.push(`valid_until = $${paramIndex++}`);
      params.push(valid_until);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }
    if (applicable_plans !== undefined) {
      updates.push(`applicable_plans = $${paramIndex++}`);
      params.push(applicable_plans ? JSON.stringify(applicable_plans) : null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    params.push(id);
    const result = await query(
      `UPDATE dietbyrd_coupon_codes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: "Coupon code already exists" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete coupon (admin only)
app.delete("/api/admin/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM dietbyrd_coupon_codes WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply coupon (increment usage count)
app.post("/api/coupons/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, patient_id, subscription_id, discount_applied, order_amount } = req.body;

    // Increment usage count
    const couponResult = await query(
      `UPDATE dietbyrd_coupon_codes 
       SET usage_count = usage_count + 1 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (couponResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }

    // Record usage
    await query(
      `INSERT INTO dietbyrd_coupon_usage 
       (coupon_id, user_id, patient_id, subscription_id, discount_applied, order_amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, user_id, patient_id, subscription_id, discount_applied, order_amount]
    );

    res.json({
      success: true,
      message: "Coupon applied successfully",
      data: couponResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Appointment Booking System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Get dietician's weekly availability schedule
app.get("/api/dieticians/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM dietbyrd_dietician_availability 
       WHERE rd_id = $1 AND is_active = true 
       ORDER BY day_of_week, start_time`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set/Update dietician's weekly availability
app.post("/api/dieticians/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { schedules } = req.body; // Array of { day_of_week, start_time, end_time, slot_duration_minutes }

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        error: "schedules array is required"
      });
    }

    const client = await getPool().connect();
    try {
      // Start transaction
      await client.query("BEGIN");

      // Deactivate all existing schedules for this dietician
      await client.query(
        `UPDATE dietbyrd_dietician_availability 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP 
         WHERE rd_id = $1`,
        [id]
      );

      // Insert new schedules
      for (const schedule of schedules) {
        await client.query(
          `INSERT INTO dietbyrd_dietician_availability 
           (rd_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (rd_id, day_of_week, start_time) 
           DO UPDATE SET 
             end_time = EXCLUDED.end_time,
             slot_duration_minutes = EXCLUDED.slot_duration_minutes,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP`,
          [id, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.slot_duration_minutes || 60]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Return updated schedules
    const result = await query(
      `SELECT * FROM dietbyrd_dietician_availability 
       WHERE rd_id = $1 AND is_active = true 
       ORDER BY day_of_week, start_time`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available appointment slots for a dietician within a date range
app.get("/api/dieticians/:id/available-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required (YYYY-MM-DD format)"
      });
    }

    // Get dietician's weekly availability
    const availabilityResult = await query(
      `SELECT * FROM dietbyrd_dietician_availability 
       WHERE rd_id = $1 AND is_active = true`,
      [id]
    );

    if (availabilityResult.rows.length === 0) {
      return res.json({ success: true, data: [], message: "No availability set for this dietician" });
    }

    // Get already booked consultations in the date range (stored as IST)
    const bookedResult = await query(
      `SELECT TO_CHAR(scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS') as scheduled_at_str FROM dietbyrd_consultations 
       WHERE rd_id = $1 
       AND scheduled_at >= $2::timestamp 
       AND scheduled_at < ($3::date + interval '1 day')::timestamp
       AND status NOT IN ('cancelled', 'no_show')`,
      [id, start_date, end_date]
    );

    const bookedSlots = new Set(
      bookedResult.rows.map(row => row.scheduled_at_str)
    );

    // Get blocked slots for the date range
    const blockedResult = await query(
      `SELECT *, TO_CHAR(blocked_date, 'YYYY-MM-DD') as blocked_date_str FROM dietbyrd_dietician_blocked_slots 
       WHERE rd_id = $1 
       AND blocked_date >= $2::date 
       AND blocked_date <= $3::date`,
      [id, start_date, end_date]
    );

    // Helper to format datetime as local string (no timezone)
    const formatLocalDatetime = (date, time) => {
      const [hour, min] = time.split(":").map(Number);
      const hh = String(hour).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      return `${date}T${hh}:${mm}:00`;
    };

    // Helper to get IST "now" for comparison (IST = UTC + 5:30)
    const getISTNow = () => {
      const now = new Date();
      // Add 5:30 hours to UTC to get IST
      return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    };

    // Helper to format date as YYYY-MM-DD without timezone conversion
    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Generate available slots (all times in IST)
    const availableSlots = [];
    const startDateParts = start_date.split("-").map(Number);
    const endDateParts = end_date.split("-").map(Number);

    // Create date objects for iteration (using local date parts only)
    let currentDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
    const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);

    // Get current IST time for filtering past slots
    const istNow = getISTNow();
    const minBookingTime = new Date(istNow.getTime() + 2 * 60 * 60 * 1000); // 2 hour buffer

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      const dateStr = formatDateStr(currentDate);

      // Check if this day is completely blocked
      const dayBlocked = blockedResult.rows.find(
        b => b.blocked_date_str === dateStr && !b.start_time && !b.end_time
      );
      if (dayBlocked) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Get availability for this day of week
      const dayAvailability = availabilityResult.rows.filter(a => a.day_of_week === dayOfWeek);

      for (const avail of dayAvailability) {
        const slotDuration = avail.slot_duration_minutes || 60;

        // Parse start and end times
        const [startHour, startMin] = avail.start_time.split(":").map(Number);
        const [endHour, endMin] = avail.end_time.split(":").map(Number);

        // Convert to minutes for easier calculation
        let slotMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (slotMinutes + slotDuration <= endMinutes) {
          const slotHour = Math.floor(slotMinutes / 60);
          const slotMin = slotMinutes % 60;
          const slotTimeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
          const slotDatetime = formatLocalDatetime(dateStr, slotTimeStr);

          // Create a Date object for this slot to compare with minBookingTime
          const slotDate = new Date(currentDate);
          slotDate.setHours(slotHour, slotMin, 0, 0);

          // Check if slot is in the past or too soon (comparing IST to IST)
          if (slotDate < minBookingTime) {
            slotMinutes += slotDuration;
            continue;
          }

          // Check if slot is booked
          const isBooked = bookedSlots.has(slotDatetime);

          // Check if slot is in a blocked time range for this specific date
          const timeBlocked = blockedResult.rows.find(b => {
            if (b.blocked_date_str !== dateStr) return false;
            if (!b.start_time || !b.end_time) return false;
            const blockStart = b.start_time.split(":").map(Number);
            const blockEnd = b.end_time.split(":").map(Number);
            const slotTimeNum = slotHour * 60 + slotMin;
            const blockStartNum = blockStart[0] * 60 + blockStart[1];
            const blockEndNum = blockEnd[0] * 60 + blockEnd[1];
            return slotTimeNum >= blockStartNum && slotTimeNum < blockEndNum;
          });

          if (timeBlocked) {
            slotMinutes += slotDuration;
            continue;
          }

          // Skip booked slots — they should not be shown to patients
          if (isBooked) {
            slotMinutes += slotDuration;
            continue;
          }

          // Include only available slots
          availableSlots.push({
            date: dateStr,
            start_time: slotTimeStr,
            datetime: slotDatetime,
            duration_minutes: slotDuration,
            is_booked: false
          });

          slotMinutes += slotDuration;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({ success: true, data: availableSlots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Book an appointment (create consultation)
app.post("/api/appointments/book", async (req, res) => {
  try {
    const { patient_id, scheduled_at, consultation_type, patient_notes } = req.body;
    // rd_id is optional â€” when null the appointment is pending dietitian assignment
    const rdId = null;

    if (!patient_id || !scheduled_at) {
      return res.status(400).json({
        success: false,
        error: "patient_id and scheduled_at are required"
      });
    }

    // Check if patient has consultations left
    const patientResult = await query(
      `SELECT consultations_left FROM dietbyrd_patients WHERE id = $1`,
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const consultationsLeft = patientResult.rows[0].consultations_left || 0;
    if (consultationsLeft <= 0) {
      return res.status(402).json({
        success: false,
        error: "No consultations left. Please purchase a consultation package to book an appointment."
      });
    }

    // Get or create registered_patient record
    let regPatientResult = await query(
      "SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1",
      [patient_id]
    );

    let registeredPatientId;
    if (regPatientResult.rows.length === 0) {
      const newRegPatient = await query(
        `INSERT INTO dietbyrd_registered_patients (patient_id)
         VALUES ($1) RETURNING id`,
        [patient_id]
      );
      registeredPatientId = newRegPatient.rows[0].id;
    } else {
      registeredPatientId = regPatientResult.rows[0].id;
      // If booking with a specific dietician and patient had none assigned, assign now
      if (rdId) {
        const currentAssignment = await query(
          "SELECT assigned_rd_id FROM dietbyrd_registered_patients WHERE id = $1",
          [registeredPatientId]
        );
        if (!currentAssignment.rows[0]?.assigned_rd_id) {
          await query(
            "UPDATE dietbyrd_registered_patients SET assigned_rd_id = $1 WHERE id = $2",
            [rdId, registeredPatientId]
          );
        }
      }
    }

    // Only check slot availability when a specific dietitian is requested
    if (rdId) {
      const existingResult = await query(
        `SELECT id FROM dietbyrd_consultations
         WHERE rd_id = $1
         AND scheduled_at = $2::timestamp
         AND status NOT IN ('cancelled', 'no_show')`,
        [rdId, scheduled_at]
      );
      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "This time slot is no longer available"
        });
      }
    }

    // Determine consultation type (first or returning)
    const previousConsultations = await query(
      `SELECT COUNT(*) as count FROM dietbyrd_consultations
       WHERE registered_patient_id = $1 AND status = 'completed'`,
      [registeredPatientId]
    );
    const type = consultation_type || (previousConsultations.rows[0].count > 0 ? 'returning' : 'first');

    // Create the consultation (rd_id may be NULL â€” pending auto-assignment)
    const rdResult = await query(
      `SELECT rd.id
       FROM dietbyrd_registered_dietitians rd
       JOIN dietbyrd_users u ON u.id = rd.user_id
       WHERE rd.is_active = true
         AND u.role = 'rd'
         AND COALESCE(u.is_active, true) = true
         AND NOT EXISTS (
           SELECT 1
           FROM dietbyrd_consultations c
           WHERE c.rd_id = rd.id
             AND c.scheduled_at = $1::timestamp
             AND c.status IN ('confirmed', 'scheduled')
         )
       ORDER BY (
         SELECT COUNT(*)
         FROM dietbyrd_consultations c2
         WHERE c2.rd_id = rd.id
           AND c2.status = 'confirmed'
       ) ASC, rd.id ASC
       LIMIT 1`,
      [scheduled_at]
    );

    if (rdResult.rows.length === 0) {
      return res.status(409).json({
        success: false,
        error: "No dietitian available at this time. Please choose a different slot."
      });
    }

    const assignedRdId = rdResult.rows[0].id;

    const result = await query(
      `INSERT INTO dietbyrd_consultations
       (registered_patient_id, rd_id, scheduled_at, consultation_type, status, booked_by_patient, patient_notes)
       VALUES ($1, $2, $3::timestamp, $4, 'scheduled', true, $5)
       RETURNING *`,
      [registeredPatientId, assignedRdId, scheduled_at, type, patient_notes || null]
    );

    await query(
      `UPDATE dietbyrd_registered_patients
       SET assigned_rd_id = COALESCE(assigned_rd_id, $1), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [assignedRdId, registeredPatientId]
    );

    // Deduct one consultation from patient's balance
    await query(
      `UPDATE dietbyrd_patients
       SET consultations_left = GREATEST(0, COALESCE(consultations_left, 0) - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [patient_id]
    );

    // Get full consultation details with names
    const fullResult = await query(
      `SELECT
        c.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        rd.name AS dietician_name
       FROM dietbyrd_consultations c
       LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
       LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
       LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ success: true, data: fullResult.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get patient's appointments
app.get("/api/patients/:id/appointments", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, upcoming_only } = req.query;

    let sql = `
      SELECT 
        c.*,
        rd.name AS dietician_name,
        rd.qualification AS dietician_qualification,
        p.name AS patient_name
      FROM dietbyrd_consultations c
      LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
      WHERE rp.patient_id = $1
    `;
    const params = [id];

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    if (upcoming_only === 'true') {
      sql += ` AND c.scheduled_at >= NOW() AND c.status NOT IN ('cancelled', 'no_show', 'completed')`;
    }

    sql += ` ORDER BY c.scheduled_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/patient/me/appointments", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (auth.role !== "patient") {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const patient = await getPatientProfileForAuth(auth);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient profile not found" });
    }

    const patientId = patient.id;
    const { status, upcoming_only } = req.query;

    let sql = `
      SELECT
        c.*,
        rd.name AS dietician_name,
        rd.qualification AS dietician_qualification,
        p.name AS patient_name
      FROM dietbyrd_consultations c
      LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
      WHERE rp.patient_id = $1
    `;
    const params = [patientId];

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    if (upcoming_only === "true") {
      sql += ` AND c.scheduled_at >= NOW() AND c.status NOT IN ('cancelled', 'no_show', 'completed')`;
    }

    sql += ` ORDER BY c.scheduled_at DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[patient/me/appointments] Error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch appointments" });
  }
});

// Cancel an appointment
app.put("/api/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelled_by, reason } = req.body;

    const result = await query(
      `UPDATE dietbyrd_consultations 
       SET status = 'cancelled', 
           cancelled_at = CURRENT_TIMESTAMP,
           cancelled_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [id, cancelled_by || 'patient']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Appointment not found or cannot be cancelled"
      });
    }

    res.json({ success: true, data: result.rows[0], message: "Appointment cancelled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reschedule an appointment
app.put("/api/appointments/:id/reschedule", async (req, res) => {
  try {
    const { id } = req.params;
    const { new_scheduled_at, patient_notes } = req.body;

    if (!new_scheduled_at) {
      return res.status(400).json({
        success: false,
        error: "new_scheduled_at is required"
      });
    }

    // Get the current appointment to check its rd_id
    const currentAppt = await query(
      `SELECT rd_id FROM dietbyrd_consultations WHERE id = $1 AND status = 'scheduled'`,
      [id]
    );

    if (currentAppt.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Appointment not found or cannot be rescheduled"
      });
    }

    const rdId = currentAppt.rows[0].rd_id;

    // Check if new slot is available
    const existingResult = await query(
      `SELECT id FROM dietbyrd_consultations 
       WHERE rd_id = $1 
       AND scheduled_at = $2::timestamp 
       AND status NOT IN ('cancelled', 'no_show')
       AND id != $3`,
      [rdId, new_scheduled_at, id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "The new time slot is no longer available"
      });
    }

    // Update the appointment
    const result = await query(
      `UPDATE dietbyrd_consultations 
       SET scheduled_at = $2::timestamp,
           patient_notes = COALESCE($3, patient_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [id, new_scheduled_at, patient_notes || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Failed to reschedule appointment"
      });
    }

    res.json({ success: true, data: result.rows[0], message: "Appointment rescheduled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update appointment status (complete / no_show / cancel) â€” RD action
app.patch("/api/appointments/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rd_notes } = req.body;

    const ALLOWED = ["completed", "no_show", "cancelled"];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${ALLOWED.join(", ")}`,
      });
    }

    // Fetch the appointment first
    const apptResult = await query(
      `SELECT id, status, rd_id FROM dietbyrd_consultations WHERE id = $1`,
      [id]
    );
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Appointment not found" });
    }
    const appt = apptResult.rows[0];
    if (appt.status !== "scheduled") {
      return res.status(409).json({
        success: false,
        error: `Cannot update status â€” appointment is already '${appt.status}'`,
      });
    }

    let extraSet = "";
    if (status === "completed") extraSet = ", completed_at = CURRENT_TIMESTAMP";
    if (status === "cancelled") extraSet = ", cancelled_at = CURRENT_TIMESTAMP, cancelled_by = 'rd'";

    const result = await query(
      `UPDATE dietbyrd_consultations
       SET status = $1, updated_at = CURRENT_TIMESTAMP${extraSet}
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Save consultation notes if provided
    if (rd_notes && rd_notes.trim() && status === "completed") {
      await query(
        `INSERT INTO dietbyrd_consultation_notes (consultation_id, rd_id, notes_content)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [id, appt.rd_id, rd_notes.trim()]
      );
    }

    res.json({ success: true, data: result.rows[0], message: `Appointment marked as ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update meeting link for an appointment
app.put("/api/rd/:rd_id/consultations/:consultation_id/link", async (req, res) => {
  try {
    const { rd_id, consultation_id } = req.params;
    const { meeting_link } = req.body;

    const result = await query(
      `UPDATE dietbyrd_consultations
       SET meeting_link = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND rd_id = $3
       RETURNING *`,
      [meeting_link || null, consultation_id, rd_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Appointment not found or not assigned to this dietician" });
    }

    res.json({ success: true, data: result.rows[0], message: "Meeting link updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Block time slots for a dietician (for leave, holidays, etc.)
app.post("/api/dieticians/:id/blocked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked_date, start_time, end_time, reason } = req.body;

    if (!blocked_date) {
      return res.status(400).json({
        success: false,
        error: "blocked_date is required"
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: "Reason is required"
      });
    }

    const hasStart = !!start_time;
    const hasEnd = !!end_time;
    if (hasStart !== hasEnd) {
      return res.status(400).json({
        error: "Both start_time and end_time are required for a time slot leave"
      });
    }
    if (hasStart && hasEnd && start_time >= end_time) {
      return res.status(400).json({
        error: "end_time must be after start_time"
      });
    }

    const result = await query(
      `INSERT INTO dietbyrd_dietician_blocked_slots 
       (rd_id, blocked_date, start_time, end_time, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rd_id, blocked_date, start_time) DO UPDATE SET
         end_time = EXCLUDED.end_time,
         reason = EXCLUDED.reason
       RETURNING *`,
      [id, blocked_date, start_time || null, end_time || null, reason || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get blocked slots for all dieticians
app.get("/api/all-dietician-blocked-slots", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT bs.*, TO_CHAR(bs.blocked_date, 'YYYY-MM-DD') as blocked_date_str, rd.name as dietician_name 
      FROM dietbyrd_dietician_blocked_slots bs
      LEFT JOIN dietbyrd_registered_dietitians rd ON bs.rd_id = rd.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND bs.blocked_date >= $${params.length}::date`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND bs.blocked_date <= $${params.length}::date`;
    }

    sql += ` ORDER BY bs.blocked_date, bs.start_time`;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get blocked slots for a dietician
app.get("/api/dieticians/:id/blocked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let sql = `SELECT *, TO_CHAR(blocked_date, 'YYYY-MM-DD') as blocked_date_str FROM dietbyrd_dietician_blocked_slots WHERE rd_id = $1`;
    const params = [id];

    if (start_date) {
      params.push(start_date);
      sql += ` AND blocked_date >= $${params.length}::date`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND blocked_date <= $${params.length}::date`;
    }

    sql += ` ORDER BY blocked_date, start_time`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove blocked slot
app.delete("/api/dieticians/:rdId/blocked-slots/:slotId", async (req, res) => {
  try {
    const { rdId, slotId } = req.params;

    const result = await query(
      `DELETE FROM dietbyrd_dietician_blocked_slots 
       WHERE id = $1 AND rd_id = $2
       RETURNING *`,
      [slotId, rdId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Blocked slot not found" });
    }

    res.json({ success: true, message: "Blocked slot removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Dietician Appointments (Calendar View) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Get all appointments for a dietician (for calendar view)
app.get("/api/dieticians/:id/appointments", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, status } = req.query;

    let sql = `
      SELECT 
        c.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        p.diagnosis,
        rd.name AS dietician_name
      FROM dietbyrd_consultations c
      LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
      LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON c.rd_id = rd.id
      WHERE c.rd_id = $1
    `;
    const params = [id];

    if (start_date) {
      params.push(start_date);
      sql += ` AND c.scheduled_at >= $${params.length}::date`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND c.scheduled_at < ($${params.length}::date + interval '1 day')`;
    }

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    sql += ` ORDER BY c.scheduled_at ASC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Consultation Packages & Razorpay Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const DEFAULT_DOCTOR_COMMISSION_PERCENT = 15;

const createDoctorCommissionForPayment = async (payment, source = "unknown") => {
  try {
    if (!payment?.patient_id) {
      console.log(`[doctor_commissions] Skipped (${source}): missing patient_id`);
      return { inserted: false, reason: "missing_patient" };
    }

    const paymentId = payment.razorpay_payment_id || payment.razorpay_order_id;
    if (!paymentId) {
      console.log(`[doctor_commissions] Skipped (${source}): missing payment id`);
      return { inserted: false, reason: "missing_payment_id" };
    }

    const patientResult = await query(
      "SELECT user_id FROM dietbyrd_patients WHERE id = $1",
      [payment.patient_id]
    );
    const patientUserId = patientResult.rows[0]?.user_id;
    if (!patientUserId) {
      console.log(`[doctor_commissions] Skipped (${source}): patient has no user_id`, {
        patientId: payment.patient_id,
      });
      return { inserted: false, reason: "patient_user_missing" };
    }

    const referralResult = await query(
      `SELECT doctor_id
       FROM dietbyrd_referrals
       WHERE patient_id = $1
       ORDER BY referred_at DESC
       LIMIT 1`,
      [payment.patient_id]
    );

    if (referralResult.rows.length === 0) {
      console.log(`[doctor_commissions] Skipped (${source}): no referral found`, {
        patientId: payment.patient_id,
      });
      return { inserted: false, reason: "no_referral" };
    }

    const doctorId = referralResult.rows[0].doctor_id;
    const doctorResult = await query(
      `SELECT d.user_id, u.commission_percent
       FROM dietbyrd_doctors d
       JOIN dietbyrd_users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [doctorId]
    );

    const doctorUserId = doctorResult.rows[0]?.user_id;
    if (!doctorUserId) {
      console.log(`[doctor_commissions] Skipped (${source}): doctor missing user_id`, {
        doctorId,
      });
      return { inserted: false, reason: "doctor_user_missing" };
    }

    const rawPercent = doctorResult.rows[0]?.commission_percent;
    const commissionPercent = Number.isFinite(Number(rawPercent))
      ? Number(rawPercent)
      : DEFAULT_DOCTOR_COMMISSION_PERCENT;

    const existing = await query(
      `SELECT id FROM dietbyrd_doctor_commissions
       WHERE payment_id = $1 AND doctor_id = $2
       LIMIT 1`,
      [paymentId, doctorUserId]
    );

    if (existing.rows.length > 0) {
      console.log(`[doctor_commissions] Skipped (${source}): already exists`, {
        paymentId,
        doctorUserId,
      });
      return { inserted: false, reason: "already_exists" };
    }

    const paymentAmount = Number(payment.amount || 0) / 100;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      console.log(`[doctor_commissions] Skipped (${source}): invalid payment amount`, {
        paymentId,
        amount: payment.amount,
      });
      return { inserted: false, reason: "invalid_amount" };
    }

    const commissionAmount = Math.round(paymentAmount * commissionPercent) / 100;

    const insertResult = await query(
      `INSERT INTO dietbyrd_doctor_commissions
       (doctor_id, patient_id, payment_id, payment_amount, commission_percent, commission_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [doctorUserId, patientUserId, paymentId, paymentAmount, commissionPercent, commissionAmount]
    );

    const insertedId = insertResult.rows[0]?.id;
    console.log(`[doctor_commissions] Inserted ${insertedId} for payment ${paymentId}`, {
      doctorUserId,
      patientUserId,
      commissionPercent,
      commissionAmount,
      source,
    });

    return { inserted: true, id: insertedId };
  } catch (err) {
    console.log(`[doctor_commissions] Failed (${source}): ${err.message}`);
    return { inserted: false, reason: "error", error: err.message };
  }
};

// Get all consultation packages
app.get("/api/consultation-packages", async (req, res) => {
  try {
    const result = await query(
      `SELECT
         id,
         name,
         num_consultations,
         CASE
           WHEN num_consultations = 1 AND price < 99900 THEN 99900
           ELSE price
         END AS price,
         discount_percentage,
         description,
         is_active,
         created_at
       FROM dietbyrd_consultation_packages
       WHERE is_active = true
       ORDER BY num_consultations ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Razorpay payment order
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { patient_id, package_id, amount, discounted_amount } = req.body;

    if (!patient_id || !package_id || !amount) {
      return res.status(400).json({
        success: false,
        error: "patient_id, package_id, and amount are required"
      });
    }

    // Get package details
    const pkgResult = await query(
      `SELECT * FROM dietbyrd_consultation_packages WHERE id = $1 AND is_active = true`,
      [package_id]
    );

    if (pkgResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Package not found" });
    }

    const pkg = {
      ...pkgResult.rows[0],
      price:
        pkgResult.rows[0].num_consultations === 1 && Number(pkgResult.rows[0].price) < 99900
          ? 99900
          : Number(pkgResult.rows[0].price),
    };

    // Use discounted amount if provided (must be >= 1 rupee = 100 paise)
    const chargeAmount = discounted_amount && discounted_amount >= 100
      ? Math.round(discounted_amount)
      : pkg.price;

    // Create or get Razorpay order
    let razorpayOrderId;

    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      console.log("[razorpay] creating order with key prefix:", RAZORPAY_KEY_ID.slice(0, 8));
      // Real Razorpay integration
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: chargeAmount,
        currency: "INR",
        receipt: `order_${patient_id}_${Date.now()}`,
        notes: {
          patient_id: patient_id.toString(),
          package_id: package_id.toString(),
        },
      });

      razorpayOrderId = order.id;
    } else {
      // Demo/test mode - generate fake order ID
      razorpayOrderId = `demo_order_${Date.now()}`;
    }

    // Store payment record
    const paymentRow = await query(
      `INSERT INTO dietbyrd_razorpay_payments
       (patient_id, razorpay_order_id, amount, currency, consultations_purchased, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patient_id, razorpayOrderId, chargeAmount, 'INR', pkg.num_consultations || 1, 'created']
    );

    res.json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrderId,
        amount: chargeAmount,
        currency: "INR",
        patient_id,
        package_id,
      },
    });
  } catch (err) {
    console.error("[payments/create-order] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Razorpay payment
app.post("/api/payments/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    console.log("[razorpay] verifying payment:", { razorpay_order_id, razorpay_payment_id });

    // Get payment record
    const paymentResult = await query(
      `SELECT * FROM dietbyrd_razorpay_payments WHERE razorpay_order_id = $1`,
      [razorpay_order_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    // Verify signature
    let isValidSignature = false;

    if (RAZORPAY_KEY_SECRET && !razorpay_order_id.startsWith("demo_")) {
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isValidSignature = expectedSignature === razorpay_signature;
    } else {
      // Demo mode - accept any signature
      isValidSignature = true;
    }

    console.log("[razorpay] signature match:", isValidSignature);

    if (!isValidSignature) {
      await query(
        `UPDATE dietbyrd_razorpay_payments 
         SET status = 'failed', error_description = 'Invalid signature', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payment.id]
      );
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // Update payment record
    await query(
      `UPDATE dietbyrd_razorpay_payments 
       SET razorpay_payment_id = $1,
      razorpay_signature = $2,
      status = 'success',
      payment_method = 'razorpay',
      updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    // Add consultations to patient
    await query(
      `UPDATE dietbyrd_patients 
       SET consultations_left = COALESCE(consultations_left, 0) + $1,
      last_payment_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [payment.consultations_purchased, payment.patient_id]
    );

    await createDoctorCommissionForPayment(
      { ...payment, razorpay_payment_id },
      "verify"
    );

    res.json({
      success: true,
      data: {
        success: true,
        consultations_added: payment.consultations_purchased,
      },
    });
  } catch (err) {
    console.error("[payments/verify] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Meta WhatsApp Webhook Verification
app.get("/api/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "dietbyrd_meta_verify_token";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[webhooks/whatsapp] Webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Meta WhatsApp Webhook Events (Messages, Status Updates)
app.post("/api/webhooks/whatsapp", (req, res) => {
  console.log("[webhooks/whatsapp] Incoming Webhook Event:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Razorpay webhook handler (payment.captured)
app.post("/api/payments/webhook", async (req, res) => {
  try {
    const event = req.body?.event;
    if (event !== "payment.captured") {
      return res.json({ success: true, ignored: true });
    }

    const paymentEntity = req.body?.payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;

    if (!razorpayPaymentId && !razorpayOrderId) {
      return res.status(400).json({ success: false, error: "Missing Razorpay payment identifiers" });
    }

    const paymentResult = await query(
      `SELECT * FROM dietbyrd_razorpay_payments
       WHERE razorpay_order_id = $1 OR razorpay_payment_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [razorpayOrderId || "", razorpayPaymentId || ""]
    );

    if (paymentResult.rows.length === 0) {
      console.log("[payments/webhook] Payment not found", {
        razorpayOrderId,
        razorpayPaymentId,
      });
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "success") {
      await query(
        `UPDATE dietbyrd_razorpay_payments
         SET razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
      status = 'success',
      payment_method = 'razorpay',
      updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [razorpayPaymentId || null, payment.id]
      );
    }

    await createDoctorCommissionForPayment(
      {
        ...payment,
        razorpay_payment_id: razorpayPaymentId || payment.razorpay_payment_id,
        razorpay_order_id: razorpayOrderId || payment.razorpay_order_id,
      },
      "webhook"
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[payments/webhook] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Doctor Commissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Update doctor commission percent (admin only)
app.patch("/api/admin/doctors/:id/commission", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (!ADMIN_COMMISSION_ROLES.includes(auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const doctorUserId = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(doctorUserId)) {
      return res.status(400).json({ success: false, error: "Invalid doctor id" });
    }

    const percent = Number(req.body?.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({ success: false, error: "percent must be between 0 and 100" });
    }

    const updateResult = await query(
      `UPDATE dietbyrd_users
       SET commission_percent = $1
       WHERE id = $2 AND role = 'doctor'
       RETURNING id, name, phone, commission_percent`,
      [percent, doctorUserId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    res.json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    console.error("[admin/doctors/commission] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get commissions for current doctor
app.get("/api/me/commissions", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (auth.role !== "doctor") {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const status = String(req.query.status || "all").trim();
    if (!"pending,paid,all".split(",").includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status filter" });
    }

    const params = [auth.userId];
    let whereSql = "doctor_id = $1";
    if (status !== "all") {
      params.push(status);
      whereSql += ` AND status = $${params.length}`;
    }

    const commissionsResult = await query(
      `SELECT * FROM dietbyrd_doctor_commissions
       WHERE ${whereSql}
       ORDER BY created_at DESC`,
      params
    );

    const totalsResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount END), 0) AS total_pending,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount END), 0) AS total_paid
       FROM dietbyrd_doctor_commissions
       WHERE doctor_id = $1`,
      [auth.userId]
    );

    const totals = totalsResult.rows[0] || { total_pending: 0, total_paid: 0 };

    res.json({ success: true, data: commissionsResult.rows, totals });
  } catch (err) {
    console.error("[me/commissions] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get patients referred by the current doctor
app.get("/api/doctor/me/patients", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    if (!["doctor", "assistant"].includes(auth.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    let doctorId = null;
    if (auth.role === "doctor") {
      const doctorResult = await query(
        "SELECT id FROM dietbyrd_doctors WHERE user_id = $1",
        [auth.userId]
      );
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      doctorId = doctorResult.rows[0].id;
    } else {
      const assistantResult = await query(
        "SELECT doctor_id FROM dietbyrd_assistants WHERE user_id = $1",
        [auth.userId]
      );
      if (assistantResult.rows.length === 0) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      doctorId = assistantResult.rows[0].doctor_id;
    }

    const patientsResult = await query(
      `SELECT
        p.id,
        p.name,
        p.improvement_score,
        p.improvement_updated_at,
        p.phone                       AS phone,
        r.referred_at                 AS referral_date,
        COALESCE(c.status::text, 'pending') AS consultation_status,
        (CASE WHEN pay.id IS NOT NULL THEN 'paid' ELSE 'unpaid' END)::text AS payment_status,
        c.scheduled_at                AS next_consultation_at,
        rd.name                       AS assigned_dietitian_name
      FROM dietbyrd_referrals r
      JOIN dietbyrd_patients p ON p.id = r.patient_id
      LEFT JOIN LATERAL (
        SELECT c2.id, c2.status, c2.scheduled_at, c2.rd_id
        FROM dietbyrd_consultations c2
        JOIN dietbyrd_registered_patients rp ON rp.id = c2.registered_patient_id
        WHERE rp.patient_id = p.id
        ORDER BY c2.scheduled_at DESC NULLS LAST, c2.created_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN dietbyrd_registered_dietitians rd ON rd.id = c.rd_id
      LEFT JOIN dietbyrd_payments pay
        ON pay.patient_id = p.id AND pay.status = 'success'
      WHERE r.doctor_id = $1
      ORDER BY r.referred_at DESC`,
      [doctorId]
    );

    return res.json({ success: true, data: patientsResult.rows });
  } catch (err) {
    console.error("[doctor/me/patients] Error:", err);
    return res.status(500).json({ error: "Failed to fetch doctor patients" });
  }
});

// Get patients referred by the current doctor (no /api prefix)
app.get("/doctor/me/patients", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    if (!["doctor", "assistant"].includes(auth.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    let doctorId = null;
    if (auth.role === "doctor") {
      const doctorResult = await query(
        "SELECT id FROM dietbyrd_doctors WHERE user_id = $1",
        [auth.userId]
      );
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      doctorId = doctorResult.rows[0].id;
    } else {
      const assistantResult = await query(
        "SELECT doctor_id FROM dietbyrd_assistants WHERE user_id = $1",
        [auth.userId]
      );
      if (assistantResult.rows.length === 0) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      doctorId = assistantResult.rows[0].doctor_id;
    }

    const patientsResult = await query(
      `SELECT
        p.id,
        p.name,
        p.improvement_score,
        p.improvement_updated_at,
        p.phone                       AS phone,
        r.referred_at                 AS referral_date,
        COALESCE(c.status::text, 'pending') AS consultation_status,
        (CASE WHEN pay.id IS NOT NULL THEN 'paid' ELSE 'unpaid' END)::text AS payment_status,
        c.scheduled_at                AS next_consultation_at,
        rd.name                       AS assigned_dietitian_name
      FROM dietbyrd_referrals r
      JOIN dietbyrd_patients p ON p.id = r.patient_id
      LEFT JOIN LATERAL (
        SELECT c2.id, c2.status, c2.scheduled_at, c2.rd_id
        FROM dietbyrd_consultations c2
        JOIN dietbyrd_registered_patients rp ON rp.id = c2.registered_patient_id
        WHERE rp.patient_id = p.id
        ORDER BY c2.scheduled_at DESC NULLS LAST, c2.created_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN dietbyrd_registered_dietitians rd ON rd.id = c.rd_id
      LEFT JOIN dietbyrd_payments pay
        ON pay.patient_id = p.id AND pay.status = 'success'
      WHERE r.doctor_id = $1
      ORDER BY r.referred_at DESC`,
      [doctorId]
    );

    return res.json({ success: true, data: patientsResult.rows });
  } catch (err) {
    console.error("[doctor/me/patients] Error:", err);
    return res.status(500).json({ error: "Failed to fetch doctor patients" });
  }
});

// â”€â”€â”€ Admin Staff Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Get staff members by role (mlt_intern or support_intern)
app.get("/api/admin/staff/:role", async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    if (!['mlt_intern', 'support_intern'].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role. Must be mlt_intern or support_intern" });
    }

    const result = await query(
      `SELECT id, phone, name, role, plain_password, is_active, created_at, last_login_at
       FROM dietbyrd_users
       WHERE role = $1
       ORDER BY created_at DESC`,
      [role]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[admin/staff] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create staff account with random 8-digit password
app.post("/api/admin/staff/create", async (req, res) => {
  try {
    const { phone, role, name } = req.body;

    if (!phone || !role || !name) {
      return res.status(400).json({ success: false, error: "Phone, role, and name are required" });
    }

    // Validate role
    if (!['mlt_intern', 'support_intern'].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role. Must be mlt_intern or support_intern" });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "User with this phone number already exists" });
    }

    // Generate random 8-digit password
    const plainPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
    const hashedStaffPw = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

    // Create user account â€” store hash for auth, plain_password for admin visibility
    const userResult = await query(
      `INSERT INTO dietbyrd_users(phone, role, password, plain_password, name, is_active, is_verified)
       VALUES($1, $2, $3, $4, $5, true, true)
       RETURNING id, phone, role, name`,
      [phone, role, hashedStaffPw, plainPassword, name]
    );

    const newUser = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: newUser.id,
        phone: newUser.phone,
        role: newUser.role,
        name: newUser.name,
        password: plainPassword,
      },
    });
  } catch (err) {
    console.error("[admin/staff/create] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset password for a staff member (admin only)
app.post("/api/admin/staff/:userId/reset-password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    const hashed = await bcrypt.hash(new_password.trim(), BCRYPT_ROUNDS);
    const result = await query(
      `UPDATE dietbyrd_users SET password = $1, plain_password = $2 WHERE id = $3 RETURNING id`,
      [hashed, new_password.trim(), userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, data: { message: "Password updated" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a staff member (admin only)
app.delete("/api/admin/staff/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `DELETE FROM dietbyrd_users WHERE id = $1 AND role IN('mlt_intern', 'support_intern') RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Staff member not found" });
    }
    res.json({ success: true, data: { message: "Staff member deleted" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SUPPORT TEAM ENDPOINTS
// ==========================================

// Get all doctors for support team
app.get("/api/support/doctors", async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.is_active, u.created_at
       FROM dietbyrd_users u
       WHERE u.role = 'doctor'
       ORDER BY u.name ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[support/doctors] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all patients for support team
app.get("/api/support/patients", async (req, res) => {
  try {
    const rawPage = parseInt(String(req.query.page || "1"), 10);
    const rawPageSize = parseInt(String(req.query.page_size || "50"), 10);
    const rawQuery = String(req.query.query || req.query.q || "").trim();
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 200) : 50;
    const offset = (page - 1) * pageSize;
    const params = [];
    const whereClauses = [];

    if (rawQuery) {
      params.push(`% ${rawQuery} % `);
      whereClauses.push(
        `(COALESCE(p.name, u.name) ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length})`
      );
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*):: int AS total
       FROM dietbyrd_patients p
       JOIN dietbyrd_users u ON u.id = p.user_id
       ${whereSql}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const listParams = [...params, pageSize, offset];
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;

    const result = await query(
      `SELECT p.id,
      COALESCE(p.name, u.name) AS name,
      u.phone,
      u.email,
      p.gender,
      p.age,
      rp.state_region AS state,
      u.is_active,
      p.created_at,
      p.diagnosis,
      p.diagnosis_description,
      rp.dietary_preference,
      p.referral_source AS "referredBy",
      (SELECT COUNT(*)
       FROM dietbyrd_consultations c
       JOIN dietbyrd_registered_patients rp2 ON rp2.id = c.registered_patient_id
       WHERE rp2.patient_id = p.id) as appointment_count
       FROM dietbyrd_patients p
       JOIN dietbyrd_users u ON u.id = p.user_id
       LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
       ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      listParams
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
        has_more: offset + pageSize < total,
      },
    });
  } catch (err) {
    console.error("[support/patients] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all dieticians for support team
app.get("/api/support/dieticians", async (req, res) => {
  try {
    const result = await query(
      `SELECT d.id, u.name, u.phone, u.email, d.specializations as specialization, d.qualification,
      d.is_active, d.created_at,
      (SELECT COUNT(*) FROM dietbyrd_consultations WHERE rd_id = d.id) as appointment_count
       FROM dietbyrd_registered_dietitians d
       JOIN dietbyrd_users u ON u.id = d.user_id
       ORDER BY u.name ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[support/dieticians] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/support/patients/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const patientResult = await query(
      `SELECT p.*, u.name, u.phone, u.email, u.is_active, rp.state_region as state, p.referral_source as "referredBy"
       FROM dietbyrd_patients p
       JOIN dietbyrd_users u ON u.id = p.user_id
       LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
       WHERE p.id = $1`,
      [id]
    );
    if (patientResult.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
    const patient = patientResult.rows[0];

    const apptResult = await query(
      `SELECT c.id, c.scheduled_at, c.status, u.name AS dietitian_name, rd.qualification, 60 AS duration_minutes
       FROM dietbyrd_consultations c
       JOIN dietbyrd_registered_dietitians rd ON rd.id = c.rd_id
       JOIN dietbyrd_users u ON u.id = rd.user_id
       JOIN dietbyrd_registered_patients rp ON rp.id = c.registered_patient_id
       WHERE rp.patient_id = $1
       ORDER BY c.scheduled_at DESC`,
      [id]
    );

    const dietitianResult = await query(
      `SELECT u.name, rd.qualification, dp.created_at as assigned_at
       FROM dietbyrd_diet_plans dp
       JOIN dietbyrd_registered_dietitians rd ON rd.id = dp.rd_id
       JOIN dietbyrd_users u ON u.id = rd.user_id
       JOIN dietbyrd_registered_patients rp ON rp.id = dp.registered_patient_id
       WHERE rp.patient_id = $1
       ORDER BY dp.created_at DESC LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        patient,
        appointments: apptResult.rows,
        assigned_dietitian: dietitianResult.rows[0] || null
      }
    });
  } catch (err) {
    console.error("[support/patients/details] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/support/patients/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    const pRes = await query("SELECT user_id FROM dietbyrd_patients WHERE id = $1", [id]);
    if (pRes.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
    const userId = pRes.rows[0].user_id;

    const docResult = await query(
      `SELECT id, original_filename, mime_type, file_size_bytes, created_at
       FROM dietbyrd_patient_documents
       WHERE patient_id = $1 OR patient_profile_id = $2
       ORDER BY created_at DESC`,
      [userId, id]
    );
    res.json({ success: true, data: docResult.rows });
  } catch (err) {
    console.error("[support/patients/documents] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/support/doctors/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const docResult = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.is_active, u.created_at
       FROM dietbyrd_users u
       WHERE u.id = $1 AND u.role = 'doctor'`,
      [id]
    );
    if (docResult.rows.length === 0) return res.status(404).json({ success: false, error: "Doctor not found" });

    res.json({
      success: true,
      data: { doctor: docResult.rows[0], appointments: [] }
    });
  } catch (err) {
    console.error("[support/doctors/details] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/support/dieticians/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const dietResult = await query(
      `SELECT d.id, u.name, u.phone, u.email, d.specializations as specialization, d.qualification, d.is_active, d.created_at
       FROM dietbyrd_registered_dietitians d
       JOIN dietbyrd_users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [id]
    );
    if (dietResult.rows.length === 0) return res.status(404).json({ success: false, error: "Dietician not found" });

    const apptResult = await query(
      `SELECT c.id, c.scheduled_at, c.status, COALESCE(p.name, u2.name) as patient_name
       FROM dietbyrd_consultations c
       JOIN dietbyrd_registered_patients rp ON rp.id = c.registered_patient_id
       JOIN dietbyrd_patients p ON p.id = rp.patient_id
       JOIN dietbyrd_users u2 ON u2.id = p.user_id
       WHERE c.rd_id = $1
       ORDER BY c.scheduled_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        dietician: dietResult.rows[0],
        appointments: apptResult.rows
      }
    });
  } catch (err) {
    console.error("[support/dieticians/details] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


let supportCommunicationsTableInitialized = false;
const ensureSupportCommunicationsTable = async () => {
  if (supportCommunicationsTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS dietbyrd_support_communications (
        id SERIAL PRIMARY KEY,
        target_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        sent_by_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_support_comms_email ON dietbyrd_support_communications(target_email)`);
    supportCommunicationsTableInitialized = true;
  } catch (err) {
    console.error("Error creating support communications table:", err.message);
  }
};

app.get("/api/support/communications", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });
    
    await ensureSupportCommunicationsTable();
    
    const result = await query(
      `SELECT * FROM dietbyrd_support_communications WHERE target_email = $1 ORDER BY created_at DESC`,
      [email]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[support/communications get] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/support/communications", async (req, res) => {
  try {
    const { target_email, subject, body } = req.body;
    if (!target_email || !subject || !body) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Try to send email using existing sendJoinRequestMessageEmail logic
    const emailResult = await sendJoinRequestMessageEmail({
      recipientEmail: target_email,
      recipientName: "Patient", 
      senderName: "DietByRD Support",
      message: body,
      subject: subject,
    });

    if (!emailResult.sent && emailResult.reason !== "missing_email") {
       console.error("Email sending failed or skipped:", emailResult.reason);
    }

    await ensureSupportCommunicationsTable();

    const insertResult = await query(
      `INSERT INTO dietbyrd_support_communications (target_email, subject, body) 
       VALUES ($1, $2, $3) RETURNING *`,
      [target_email, subject, body]
    );

    res.json({ success: true, data: insertResult.rows[0] });
  } catch (err) {
    console.error("[support/communications post] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all tickets
app.get("/api/support/tickets", async (req, res) => {
  try {
    const { status, priority, patient_id } = req.query;

    let queryText = `
      SELECT t.*,
  u_patient.name as patient_name, u_patient.phone as patient_phone,
  u_assigned.name as assigned_to_name,
  u_created.name as created_by_name,
  (SELECT COUNT(*) FROM dietbyrd_ticket_comments WHERE ticket_id = t.id) as comment_count
      FROM dietbyrd_tickets t
      LEFT JOIN dietbyrd_patients p ON p.id = t.patient_id
      LEFT JOIN dietbyrd_users u_patient ON u_patient.id = p.user_id
      LEFT JOIN dietbyrd_users u_assigned ON u_assigned.id = t.assigned_to
      JOIN dietbyrd_users u_created ON u_created.id = t.created_by
      WHERE 1 = 1
  `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND t.status = $${paramIndex} `;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      queryText += ` AND t.priority = $${paramIndex} `;
      params.push(priority);
      paramIndex++;
    }

    if (patient_id) {
      queryText += ` AND t.patient_id = $${paramIndex} `;
      params.push(patient_id);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC`;

    const result = await query(queryText, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[support/tickets] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get tickets for current patient
app.get("/api/patient/me/tickets", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (auth.role !== "patient") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const patient = await getPatientProfileForAuth(auth);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const patientId = patient.id;

    const result = await query(
      `SELECT t.*,
  u_patient.name as patient_name, u_patient.phone as patient_phone,
  u_assigned.name as assigned_to_name,
  u_created.name as created_by_name,
  (SELECT COUNT(*)
               FROM dietbyrd_ticket_comments c
               WHERE c.ticket_id = t.id AND c.is_internal = false) as comment_count
       FROM dietbyrd_tickets t
       LEFT JOIN dietbyrd_patients p ON p.id = t.patient_id
       LEFT JOIN dietbyrd_users u_patient ON u_patient.id = p.user_id
       LEFT JOIN dietbyrd_users u_assigned ON u_assigned.id = t.assigned_to
       JOIN dietbyrd_users u_created ON u_created.id = t.created_by
       WHERE t.patient_id = $1
       ORDER BY t.created_at DESC`,
      [patientId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[patient/me/tickets] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single ticket for current patient with public comments
app.get("/api/patient/me/tickets/:id", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    if (auth.role !== "patient") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const patient = await getPatientProfileForAuth(auth);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    const patientId = patient.id;
    const { id } = req.params;

    const ticketResult = await query(
      `SELECT t.*,
  u_patient.name as patient_name, u_patient.phone as patient_phone,
  u_assigned.name as assigned_to_name,
  u_created.name as created_by_name
       FROM dietbyrd_tickets t
       LEFT JOIN dietbyrd_patients p ON p.id = t.patient_id
       LEFT JOIN dietbyrd_users u_patient ON u_patient.id = p.user_id
       LEFT JOIN dietbyrd_users u_assigned ON u_assigned.id = t.assigned_to
       JOIN dietbyrd_users u_created ON u_created.id = t.created_by
       WHERE t.id = $1 AND t.patient_id = $2`,
      [id, patientId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const commentsResult = await query(
      `SELECT c.*, u.name as user_name, u.role as user_role
       FROM dietbyrd_ticket_comments c
       JOIN dietbyrd_users u ON u.id = c.user_id
       WHERE c.ticket_id = $1 AND c.is_internal = false
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        comments: commentsResult.rows,
      },
    });
  } catch (err) {
    console.error("[patient/me/tickets/:id] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single ticket with comments
app.get("/api/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await query(
      `SELECT t.*,
  u_patient.name as patient_name, u_patient.phone as patient_phone,
  u_assigned.name as assigned_to_name,
  u_created.name as created_by_name
       FROM dietbyrd_tickets t
       LEFT JOIN dietbyrd_patients p ON p.id = t.patient_id
       LEFT JOIN dietbyrd_users u_patient ON u_patient.id = p.user_id
       LEFT JOIN dietbyrd_users u_assigned ON u_assigned.id = t.assigned_to
       JOIN dietbyrd_users u_created ON u_created.id = t.created_by
       WHERE t.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const commentsResult = await query(
      `SELECT c.*, u.name as user_name, u.role as user_role
       FROM dietbyrd_ticket_comments c
       JOIN dietbyrd_users u ON u.id = c.user_id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        comments: commentsResult.rows,
      },
    });
  } catch (err) {
    console.error("[support/tickets/:id] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new ticket
app.post("/api/support/tickets", async (req, res) => {
  try {
    const { patient_id, subject, title, description, category, priority, created_by } = req.body;
    const ticketTitle = String(subject || title || "").trim();
    const ticketDescription = String(description || "").trim();
    const rawPriority = String(priority || "medium").toLowerCase();
    const ticketPriority = rawPriority === "normal" ? "medium" : rawPriority;
    const ticketCategory = category || "general";

    if (!ticketTitle || !ticketDescription || !created_by) {
      return res.status(400).json({
        success: false,
        error: "Subject, description, and created_by are required"
      });
    }

    const result = await query(
      `INSERT INTO dietbyrd_tickets(
    patient_id, title, description, category, priority, created_by
  ) VALUES($1, $2, $3, $4, $5, $6)
RETURNING * `,
      [patient_id || null, ticketTitle, ticketDescription, ticketCategory, ticketPriority || 'medium', created_by]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[support/tickets create] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update ticket
app.patch("/api/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, resolution_notes } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex} `);
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      updates.push(`priority = $${paramIndex} `);
      params.push(priority);
      paramIndex++;
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex} `);
      params.push(assigned_to);
      paramIndex++;
    }

    if (resolution_notes) {
      updates.push(`resolution_notes = $${paramIndex} `);
      params.push(resolution_notes);
      paramIndex++;
    }

    if (status === 'resolved' || status === 'closed') {
      updates.push(`resolved_at = NOW()`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No updates provided" });
    }

    params.push(id);
    const queryText = `
      UPDATE dietbyrd_tickets 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
RETURNING *
  `;

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[support/tickets update] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add comment to ticket
app.post("/api/support/tickets/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, comment, is_internal } = req.body;

    if (!user_id || !comment) {
      return res.status(400).json({
        success: false,
        error: "User ID and comment are required"
      });
    }

    const result = await query(
      `INSERT INTO dietbyrd_ticket_comments(ticket_id, user_id, comment, is_internal)
VALUES($1, $2, $3, $4)
RETURNING * `,
      [id, user_id, comment, is_internal || false]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[support/tickets/:id/comments] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Unassigned appointments (pending dietitian allocation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/appointments/unassigned", async (_req, res) => {
  try {
    const result = await query(
      `SELECT
c.id,
  c.scheduled_at,
  c.consultation_type,
  c.status,
  c.created_at,
  p.id AS patient_id,
    p.name AS patient_name,
      p.phone AS patient_phone,
        p.diagnosis AS patient_diagnosis
       FROM dietbyrd_consultations c
       LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
       LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
       WHERE c.rd_id IS NULL
         AND c.status = 'scheduled'
       ORDER BY c.scheduled_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// â”€â”€â”€ Core auto-assign logic (shared by scheduler and HTTP endpoint) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runAutoAssign() {
  const pending = await query(
    `SELECT
c.id AS consultation_id,
  c.scheduled_at,
  c.registered_patient_id,
  p.name AS patient_name
     FROM dietbyrd_consultations c
     LEFT JOIN dietbyrd_registered_patients rp ON c.registered_patient_id = rp.id
     LEFT JOIN dietbyrd_patients p ON rp.patient_id = p.id
     WHERE c.rd_id IS NULL
       AND c.status = 'scheduled'
       AND c.scheduled_at > NOW()
       AND c.scheduled_at <= NOW() + INTERVAL '48 hours'
     ORDER BY c.scheduled_at ASC`
  );

  if (pending.rows.length === 0) {
    return { assigned: 0, total_pending: 0, details: [] };
  }

  let assignedCount = 0;
  const details = [];

  for (const consultation of pending.rows) {
    const { consultation_id, scheduled_at, patient_name } = consultation;

    const bestRd = await query(
      `SELECT
rd.id,
  rd.name,
  (
    SELECT COUNT(*)
          FROM dietbyrd_consultations c2
          WHERE c2.rd_id = rd.id
            AND c2.scheduled_at >= date_trunc('week', $1:: timestamp)
            AND c2.scheduled_at < date_trunc('week', $1:: timestamp) + INTERVAL '7 days'
            AND c2.status NOT IN('cancelled', 'no_show')
        ) AS week_bookings
       FROM dietbyrd_registered_dietitians rd
       WHERE rd.is_active = true
         AND NOT EXISTS(
      SELECT 1 FROM dietbyrd_consultations cx
           WHERE cx.rd_id = rd.id
             AND cx.scheduled_at = $1:: timestamp
             AND cx.status NOT IN('cancelled', 'no_show')
    )
         AND EXISTS(
      SELECT 1 FROM dietbyrd_dietician_availability da
           WHERE da.rd_id = rd.id
             AND da.is_active = true
             AND da.day_of_week = EXTRACT(DOW FROM $1:: timestamp):: int
             AND $1:: time >= da.start_time
             AND $1:: time < da.end_time
    )
         AND NOT EXISTS(
      SELECT 1 FROM dietbyrd_dietician_blocked_slots bs
           WHERE bs.rd_id = rd.id
             AND bs.blocked_date = $1:: date
             AND(
        bs.start_time IS NULL
               OR($1:: time >= bs.start_time AND $1:: time < bs.end_time)
      )
    )
       ORDER BY week_bookings ASC
       LIMIT 1`,
      [scheduled_at]
    );

    if (bestRd.rows.length === 0) {
      details.push({ consultation_id, scheduled_at, patient_name, assigned: false, reason: "No available dietitian found" });
      continue;
    }

    const rd = bestRd.rows[0];

    await query(
      `UPDATE dietbyrd_consultations
       SET rd_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [rd.id, consultation_id]
    );

    assignedCount++;
    details.push({ consultation_id, scheduled_at, patient_name, assigned: true, rd_id: rd.id, rd_name: rd.name });
  }

  return { assigned: assignedCount, total_pending: pending.rows.length, details };
}

// â”€â”€â”€ Staff plain_password column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureStaffPlainPasswordColumn = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_users ADD COLUMN IF NOT EXISTS plain_password TEXT`);
    console.log('[migration] plain_password column ready');
  } catch (err) {
    console.error('[migration] plain_password column error:', err.message);
  }
};

// â”€â”€â”€ Join request about_yourself column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureJoinRequestAboutYourselfColumn = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_join_requests ADD COLUMN IF NOT EXISTS about_yourself TEXT`);
    console.log('[migration] about_yourself column ready');
  } catch (err) {
    console.error('[migration] about_yourself column error:', err.message);
  }
};

// â”€â”€â”€ Doctor commission_rate column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureDoctorCommissionRateColumn = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_doctors ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 0`);
    console.log('[migration] commission_rate column ready');
  } catch (err) {
    console.error('[migration] commission_rate column error:', err.message);
  }
};

// â”€â”€â”€ Consultation meeting_link column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureConsultationMeetingLinkColumn = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_consultations ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500) NULL`);
    console.log('[migration] consultation meeting_link column ready');
  } catch (err) {
    console.error('[migration] consultation meeting_link column error:', err.message);
  }
};

// â”€â”€â”€ Dietician clinic_address / clinic_name column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureDieticianClinicColumns = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_registered_dietitians ADD COLUMN IF NOT EXISTS clinic_address TEXT`);
    await query(`ALTER TABLE dietbyrd_registered_dietitians ADD COLUMN IF NOT EXISTS clinic_name TEXT`);
    console.log('[migration] dietician clinic columns ready');
  } catch (err) {
    console.error('[migration] dietician clinic columns error:', err.message);
  }
};

// â”€â”€â”€ Patient diagnoses array column migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensurePatientDiagnosesColumn = async () => {
  try {
    await query(`ALTER TABLE dietbyrd_patients ADD COLUMN IF NOT EXISTS diagnoses JSONB DEFAULT '[]'`);
    // Back-fill from existing diagnosis column
    await query(`
      UPDATE dietbyrd_patients
      SET diagnoses = jsonb_build_array(diagnosis)
      WHERE diagnosis IS NOT NULL
AND(diagnoses IS NULL OR diagnoses = '[]':: jsonb)
  `);
    console.log('[migration] diagnoses column ready');
  } catch (err) {
    console.error('[migration] diagnoses column error:', err.message);
  }
};

// â”€â”€â”€ Food library modulator columns migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureFoodLibraryModulatorColumns = async () => {
  try {
    await query(`
      ALTER TABLE dietbyrd_food_library
        ADD COLUMN IF NOT EXISTS oxalate_eee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phytate_eee NUMERIC DEFAULT 0
    `);

    if (process.env.RUN_FOOD_LIBRARY_SEED_ON_STARTUP !== "true") {
      console.log('[migration] oxalate_eee / phytate_eee columns ready; seed skipped');
      return;
    }

    // Batch update existing items by ID with correct modulator values
    const modulatorUpdates = [
      // [id, oxalate_eee, phytate_eee]
      // Vegetables
      ['SPINACH', 130, 0], ['BHINDI', 30, 0], ['BRINJAL', 20, 0],
      ['SWEET_POTATO', 40, 0], ['GREEN_PEAS', 5, 100],
      ['BITTER_GOURD', 5, 0], ['BOTTLE_GOURD', 5, 0], ['CABBAGE', 5, 0],
      ['CARROT', 5, 0], ['CAULIFLOWER', 5, 0], ['CUCUMBER', 5, 0],
      ['DRUMSTICK', 5, 0], ['METHI', 10, 0], ['ONION', 5, 0],
      ['POTATO', 10, 0], ['PUMPKIN', 5, 0], ['RIDGE_GOURD', 5, 0], ['TOMATO', 5, 0],
      // Nuts & Seeds
      ['ALMONDS', 230, 520], ['CASHEWS', 120, 360], ['CHIA_SEEDS', 95, 750],
      ['COCONUT_DRY', 10, 100], ['FLAXSEEDS', 55, 650], ['PEANUTS', 70, 390],
      ['SESAME', 200, 900], ['WALNUTS', 45, 260],
      // Fruits
      ['APPLE', 5, 0], ['BANANA', 5, 0], ['GRAPES', 5, 0], ['GUAVA', 5, 0],
      ['AMLA', 15, 0], ['MANGO', 5, 0], ['ORANGE', 5, 0], ['PAPAYA', 5, 0],
      ['POMEGRANATE', 5, 0], ['WATERMELON', 5, 0],
      // Cereals
      ['RICE_BROWN', 0, 200], ['RAGI', 0, 360], ['POHA', 0, 140],
      ['BAJRA', 0, 420], ['MAIDA', 0, 80], ['OATS', 0, 280],
      ['SEMOLINA', 0, 180], ['JOWAR', 0, 390], ['RICE_WHITE', 0, 60],
      ['WHEAT_FLOUR', 0, 350],
      // Pulses
      ['CHANA_DAL', 0, 420], ['RAJMA', 0, 420], ['MOONG_DAL', 0, 360],
      ['MASOOR_DAL', 0, 360], ['SOYA_CHUNKS', 0, 420], ['TOOR_DAL', 0, 360],
      ['URAD_DAL', 0, 360], ['CHANA_WHOLE', 0, 390], ['MOONG_WHOLE', 0, 360],
      // Prepared foods
      ['CHAPATI', 0, 280], ['KHICHDI', 0, 150], ['IDLI', 0, 120],
      ['DOSA', 0, 130], ['SAMBAR', 0, 100], ['UPMA', 0, 80],
      // Spices (minor oxalate)
      ['CORIANDER_SEEDS', 5, 0], ['CUMIN', 5, 0], ['GARLIC', 5, 0],
      ['GINGER', 5, 0], ['GREEN_CHILI', 5, 0], ['TURMERIC', 5, 0],
    ];
    if (modulatorUpdates.length > 0) {
      const valuesList = modulatorUpdates.map(([id, ox, ph]) => `('${id}', ${ox}, ${ph})`).join(', ');
      await query(`
        UPDATE dietbyrd_food_library AS t
        SET oxalate_eee = v.ox, phytate_eee = v.ph
FROM(VALUES ${valuesList}) AS v(id, ox, ph)
        WHERE t.id = v.id
  `);
    }
    console.log('[migration] modulator values updated for existing items');

    // Insert new food items (ON CONFLICT DO NOTHING for idempotency)
    const newFoods = [
      // Fruits
      {
        id: 'KIWI', name_en: 'Kiwi', name_hi: 'à¤•à¥€à¤µà¥€', category: 'Fruits',
        calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5, fiber: 3.0,
        iron: 0.3, calcium: 34, magnesium: 17, zinc: 0.1, potassium: 312, sodium: 3, phosphorus: 34, iodine: 0, selenium: 0.2, copper: 0.1,
        vitamin_a: 4, vitamin_b1: 0.02, vitamin_b2: 0.04, vitamin_b3: 0.3, vitamin_b6: 0.06, vitamin_b9: 25, vitamin_b12: 0, vitamin_c: 92, vitamin_d: 0, vitamin_e: 1.5, vitamin_k: 40,
        oxalate_eee: 5, phytate_eee: 0, yield_factor: 0.87, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'vitamin_c', 'green']
      },

      {
        id: 'PEAR', name_en: 'Pear', name_hi: 'à¤¨à¤¾à¤¶à¤ªà¤¾à¤¤à¥€', category: 'Fruits',
        calories: 57, protein: 0.4, carbs: 15.5, fat: 0.1, fiber: 3.1,
        iron: 0.2, calcium: 9, magnesium: 7, zinc: 0.1, potassium: 116, sodium: 1, phosphorus: 12, iodine: 0, selenium: 0.1, copper: 0.1,
        vitamin_a: 1, vitamin_b1: 0.01, vitamin_b2: 0.03, vitamin_b3: 0.2, vitamin_b6: 0.03, vitamin_b9: 7, vitamin_b12: 0, vitamin_c: 4.3, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 4.5,
        oxalate_eee: 5, phytate_eee: 0, yield_factor: 0.9, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'fiber']
      },

      {
        id: 'DATES_DRIED', name_en: 'Dates (Khajur)', name_hi: 'à¤–à¤œà¥‚à¤°', category: 'Fruits',
        calories: 277, protein: 1.8, carbs: 75.0, fat: 0.2, fiber: 6.7,
        iron: 0.9, calcium: 64, magnesium: 54, zinc: 0.4, potassium: 696, sodium: 1, phosphorus: 62, iodine: 0, selenium: 3.0, copper: 0.4,
        vitamin_a: 7, vitamin_b1: 0.05, vitamin_b2: 0.07, vitamin_b3: 1.6, vitamin_b6: 0.2, vitamin_b9: 15, vitamin_b12: 0, vitamin_c: 0.4, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 2.7,
        oxalate_eee: 25, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'dried', 'natural_sugar', 'energy']
      },

      {
        id: 'FIG_DRIED', name_en: 'Fig (Anjeer, dried)', name_hi: 'à¤…à¤‚à¤œà¥€à¤°', category: 'Fruits',
        calories: 249, protein: 3.3, carbs: 63.9, fat: 0.9, fiber: 9.8,
        iron: 2.0, calcium: 162, magnesium: 68, zinc: 0.5, potassium: 680, sodium: 10, phosphorus: 67, iodine: 0, selenium: 0.6, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.1, vitamin_b2: 0.08, vitamin_b3: 0.6, vitamin_b6: 0.1, vitamin_b9: 9, vitamin_b12: 0, vitamin_c: 1.2, vitamin_d: 0, vitamin_e: 0.4, vitamin_k: 15.6,
        oxalate_eee: 65, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'dried', 'fiber', 'calcium']
      },

      {
        id: 'LEMON', name_en: 'Lemon (Nimbu)', name_hi: 'à¤¨à¥€à¤‚à¤¬à¥‚', category: 'Fruits',
        calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8,
        iron: 0.6, calcium: 26, magnesium: 8, zinc: 0.1, potassium: 138, sodium: 2, phosphorus: 16, iodine: 0, selenium: 0.4, copper: 0.1,
        vitamin_a: 1, vitamin_b1: 0.04, vitamin_b2: 0.02, vitamin_b3: 0.1, vitamin_b6: 0.08, vitamin_b9: 11, vitamin_b12: 0, vitamin_c: 53, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 0,
        oxalate_eee: 5, phytate_eee: 0, yield_factor: 0.55, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'vitamin_c', 'alkalizing']
      },

      {
        id: 'CHIKOO', name_en: 'Chikoo (Sapodilla)', name_hi: 'à¤šà¥€à¤•à¥‚', category: 'Fruits',
        calories: 83, protein: 0.4, carbs: 20.0, fat: 1.1, fiber: 5.3,
        iron: 0.8, calcium: 21, magnesium: 12, zinc: 0.1, potassium: 193, sodium: 12, phosphorus: 12, iodine: 0, selenium: 0.6, copper: 0.1,
        vitamin_a: 3, vitamin_b1: 0.0, vitamin_b2: 0.02, vitamin_b3: 0.2, vitamin_b6: 0.04, vitamin_b9: 14, vitamin_b12: 0, vitamin_c: 14.7, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 0.82, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'fiber', 'tropical']
      },

      {
        id: 'STRAWBERRY', name_en: 'Strawberry', name_hi: 'à¤¸à¥à¤Ÿà¥à¤°à¥‰à¤¬à¥‡à¤°à¥€', category: 'Fruits',
        calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0,
        iron: 0.4, calcium: 16, magnesium: 13, zinc: 0.1, potassium: 153, sodium: 1, phosphorus: 24, iodine: 0, selenium: 0.4, copper: 0.05,
        vitamin_a: 1, vitamin_b1: 0.02, vitamin_b2: 0.02, vitamin_b3: 0.4, vitamin_b6: 0.05, vitamin_b9: 24, vitamin_b12: 0, vitamin_c: 58.8, vitamin_d: 0, vitamin_e: 0.3, vitamin_k: 2.2,
        oxalate_eee: 10, phytate_eee: 0, yield_factor: 0.93, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'vitamin_c', 'antioxidant']
      },

      {
        id: 'COCONUT_FRESH', name_en: 'Coconut (Fresh)', name_hi: 'à¤¨à¤¾à¤°à¤¿à¤¯à¤²', category: 'Fruits',
        calories: 354, protein: 3.3, carbs: 15.2, fat: 33.5, fiber: 9.0,
        iron: 2.4, calcium: 14, magnesium: 32, zinc: 1.1, potassium: 356, sodium: 20, phosphorus: 113, iodine: 0, selenium: 10.1, copper: 0.4,
        vitamin_a: 0, vitamin_b1: 0.07, vitamin_b2: 0.02, vitamin_b3: 0.5, vitamin_b6: 0.05, vitamin_b9: 26, vitamin_b12: 0, vitamin_c: 3.3, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 0,
        oxalate_eee: 10, phytate_eee: 100, yield_factor: 0.53, food_type: 'CORE', caution_level: 'NONE',
        tags: ['fruit', 'fat', 'fiber', 'mcfa']
      },

      // Vegetables
      {
        id: 'BEETROOT', name_en: 'Beetroot (Chukandar)', name_hi: 'à¤šà¥à¤•à¤‚à¤¦à¤°', category: 'Vegetables',
        calories: 43, protein: 1.6, carbs: 9.6, fat: 0.2, fiber: 2.8,
        iron: 0.8, calcium: 16, magnesium: 23, zinc: 0.3, potassium: 325, sodium: 78, phosphorus: 40, iodine: 0, selenium: 0.7, copper: 0.1,
        vitamin_a: 2, vitamin_b1: 0.03, vitamin_b2: 0.04, vitamin_b3: 0.3, vitamin_b6: 0.07, vitamin_b9: 109, vitamin_b12: 0, vitamin_c: 4.9, vitamin_d: 0, vitamin_e: 0.0, vitamin_k: 0.2,
        oxalate_eee: 85, phytate_eee: 0, yield_factor: 0.88, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'folate', 'nitrate', 'oxalate']
      },

      {
        id: 'BROCCOLI', name_en: 'Broccoli', name_hi: 'à¤¬à¥à¤°à¥‹à¤•à¤²à¥€', category: 'Vegetables',
        calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6,
        iron: 0.7, calcium: 47, magnesium: 21, zinc: 0.4, potassium: 316, sodium: 33, phosphorus: 66, iodine: 0, selenium: 2.5, copper: 0.05,
        vitamin_a: 31, vitamin_b1: 0.07, vitamin_b2: 0.12, vitamin_b3: 0.6, vitamin_b6: 0.18, vitamin_b9: 63, vitamin_b12: 0, vitamin_c: 89.2, vitamin_d: 0, vitamin_e: 0.8, vitamin_k: 102,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 0.88, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'vitamin_c', 'vitamin_k', 'cruciferous']
      },

      {
        id: 'BELL_PEPPER_RED', name_en: 'Red Bell Pepper (Capsicum)', name_hi: 'à¤²à¤¾à¤² à¤¶à¤¿à¤®à¤²à¤¾ à¤®à¤¿à¤°à¥à¤š', category: 'Vegetables',
        calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1,
        iron: 0.4, calcium: 7, magnesium: 12, zinc: 0.3, potassium: 211, sodium: 4, phosphorus: 26, iodine: 0, selenium: 0.1, copper: 0.02,
        vitamin_a: 157, vitamin_b1: 0.05, vitamin_b2: 0.09, vitamin_b3: 1.0, vitamin_b6: 0.29, vitamin_b9: 46, vitamin_b12: 0, vitamin_c: 127.7, vitamin_d: 0, vitamin_e: 1.6, vitamin_k: 4.9,
        oxalate_eee: 5, phytate_eee: 0, yield_factor: 0.85, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'vitamin_c', 'vitamin_a', 'antioxidant']
      },

      {
        id: 'MUSHROOM', name_en: 'Mushroom (Button)', name_hi: 'à¤®à¤¶à¤°à¥‚à¤®', category: 'Vegetables',
        calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1.0,
        iron: 0.5, calcium: 3, magnesium: 9, zinc: 0.5, potassium: 318, sodium: 5, phosphorus: 86, iodine: 0, selenium: 9.3, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.08, vitamin_b2: 0.4, vitamin_b3: 3.6, vitamin_b6: 0.1, vitamin_b9: 17, vitamin_b12: 0, vitamin_c: 2.1, vitamin_d: 0.2, vitamin_e: 0.0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 0.97, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'protein', 'vitamin_d', 'selenium']
      },

      {
        id: 'CORN', name_en: 'Corn (Bhutta)', name_hi: 'à¤®à¤•à¥à¤•à¤¾', category: 'Vegetables',
        calories: 86, protein: 3.3, carbs: 19.0, fat: 1.4, fiber: 2.7,
        iron: 0.5, calcium: 2, magnesium: 37, zinc: 0.5, potassium: 270, sodium: 15, phosphorus: 89, iodine: 0, selenium: 0.6, copper: 0.05,
        vitamin_a: 10, vitamin_b1: 0.2, vitamin_b2: 0.07, vitamin_b3: 1.8, vitamin_b6: 0.09, vitamin_b9: 42, vitamin_b12: 0, vitamin_c: 6.8, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 0.3,
        oxalate_eee: 0, phytate_eee: 100, yield_factor: 0.72, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'starch', 'fiber']
      },

      {
        id: 'GREEN_BEANS', name_en: 'Green Beans (Sem)', name_hi: 'à¤¸à¥‡à¤®', category: 'Vegetables',
        calories: 31, protein: 1.8, carbs: 7.1, fat: 0.1, fiber: 3.4,
        iron: 1.0, calcium: 37, magnesium: 25, zinc: 0.2, potassium: 209, sodium: 6, phosphorus: 38, iodine: 0, selenium: 0.6, copper: 0.07,
        vitamin_a: 35, vitamin_b1: 0.08, vitamin_b2: 0.1, vitamin_b3: 0.7, vitamin_b6: 0.14, vitamin_b9: 33, vitamin_b12: 0, vitamin_c: 12.2, vitamin_d: 0, vitamin_e: 0.4, vitamin_k: 43,
        oxalate_eee: 5, phytate_eee: 0, yield_factor: 0.88, food_type: 'CORE', caution_level: 'NONE',
        tags: ['vegetable', 'fiber', 'vitamin_k']
      },

      // Cereals & Grains
      {
        id: 'QUINOA', name_en: 'Quinoa', name_hi: 'à¤•à¥à¤µà¤¿à¤¨à¥‹à¤†', category: 'Cereals',
        calories: 368, protein: 14.1, carbs: 64.2, fat: 6.1, fiber: 7.0,
        iron: 4.6, calcium: 47, magnesium: 197, zinc: 3.1, potassium: 563, sodium: 5, phosphorus: 457, iodine: 0, selenium: 8.5, copper: 0.6,
        vitamin_a: 1, vitamin_b1: 0.36, vitamin_b2: 0.32, vitamin_b3: 1.5, vitamin_b6: 0.49, vitamin_b9: 184, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 2.4, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 350, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['grain', 'complete_protein', 'gluten_free', 'phytate']
      },

      {
        id: 'BARLEY', name_en: 'Barley (Jau)', name_hi: 'à¤œà¥Œ', category: 'Cereals',
        calories: 354, protein: 12.5, carbs: 73.5, fat: 2.3, fiber: 17.3,
        iron: 3.6, calcium: 33, magnesium: 133, zinc: 2.8, potassium: 452, sodium: 12, phosphorus: 264, iodine: 0, selenium: 37.7, copper: 0.5,
        vitamin_a: 1, vitamin_b1: 0.65, vitamin_b2: 0.28, vitamin_b3: 4.6, vitamin_b6: 0.32, vitamin_b9: 19, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.6, vitamin_k: 2.2,
        oxalate_eee: 5, phytate_eee: 300, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['grain', 'fiber', 'beta_glucan', 'phytate']
      },

      {
        id: 'BREAD_WHEAT', name_en: 'Bread (Whole Wheat)', name_hi: 'à¤—à¥‡à¤¹à¥‚à¤‚ à¤•à¥€ à¤°à¥‹à¤Ÿà¥€ (à¤¬à¥à¤°à¥‡à¤¡)', category: 'Cereals',
        calories: 247, protein: 9.0, carbs: 41.3, fat: 3.4, fiber: 6.8,
        iron: 2.7, calcium: 107, magnesium: 76, zinc: 1.5, potassium: 248, sodium: 472, phosphorus: 215, iodine: 0, selenium: 30.5, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.34, vitamin_b2: 0.15, vitamin_b3: 4.5, vitamin_b6: 0.1, vitamin_b9: 43, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.4, vitamin_k: 3.4,
        oxalate_eee: 0, phytate_eee: 280, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        unit_name: 'slice', unit_weight_g: 30,
        tags: ['grain', 'fiber', 'wholegrain', 'phytate']
      },

      {
        id: 'BREAD_WHITE', name_en: 'Bread (White)', name_hi: 'à¤¸à¤«à¥‡à¤¦ à¤¬à¥à¤°à¥‡à¤¡', category: 'Cereals',
        calories: 265, protein: 9.0, carbs: 51.2, fat: 3.2, fiber: 2.3,
        iron: 2.7, calcium: 182, magnesium: 26, zinc: 0.8, potassium: 116, sodium: 491, phosphorus: 108, iodine: 0, selenium: 27.9, copper: 0.2,
        vitamin_a: 0, vitamin_b1: 0.31, vitamin_b2: 0.19, vitamin_b3: 4.8, vitamin_b6: 0.04, vitamin_b9: 91, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.3, vitamin_k: 1.8,
        oxalate_eee: 0, phytate_eee: 120, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        unit_name: 'slice', unit_weight_g: 30,
        tags: ['grain', 'refined']
      },

      {
        id: 'MAKHANA', name_en: 'Makhana (Fox Nuts, roasted)', name_hi: 'à¤®à¤–à¤¾à¤¨à¤¾', category: 'Cereals',
        calories: 347, protein: 9.7, carbs: 76.9, fat: 0.1, fiber: 14.5,
        iron: 1.4, calcium: 60, magnesium: 67, zinc: 0.6, potassium: 500, sodium: 70, phosphorus: 180, iodine: 0, selenium: 0, copper: 0.2,
        vitamin_a: 0, vitamin_b1: 0.4, vitamin_b2: 0.0, vitamin_b3: 1.0, vitamin_b6: 0.0, vitamin_b9: 0, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 15, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['grain', 'snack', 'low_fat', 'fiber']
      },

      {
        id: 'PUFFED_RICE', name_en: 'Puffed Rice (Murmura)', name_hi: 'à¤®à¥à¤°à¤®à¥à¤°à¤¾', category: 'Cereals',
        calories: 402, protein: 6.3, carbs: 89.0, fat: 0.5, fiber: 1.0,
        iron: 5.0, calcium: 5, magnesium: 35, zinc: 1.2, potassium: 115, sodium: 12, phosphorus: 130, iodine: 0, selenium: 15.1, copper: 0.2,
        vitamin_a: 0, vitamin_b1: 0.07, vitamin_b2: 0.05, vitamin_b3: 4.1, vitamin_b6: 0.1, vitamin_b9: 8, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 50, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['grain', 'snack', 'low_fat']
      },

      // Nuts & Seeds
      {
        id: 'PISTACHIOS', name_en: 'Pistachios (Pista)', name_hi: 'à¤ªà¤¿à¤¸à¥à¤¤à¤¾', category: 'Nuts & Seeds',
        calories: 562, protein: 20.2, carbs: 27.5, fat: 45.4, fiber: 10.3,
        iron: 3.9, calcium: 105, magnesium: 121, zinc: 2.2, potassium: 1025, sodium: 1, phosphorus: 490, iodine: 0, selenium: 7.0, copper: 1.3,
        vitamin_a: 26, vitamin_b1: 0.87, vitamin_b2: 0.16, vitamin_b3: 1.3, vitamin_b6: 1.7, vitamin_b9: 51, vitamin_b12: 0, vitamin_c: 5.6, vitamin_d: 0, vitamin_e: 2.3, vitamin_k: 13.2,
        oxalate_eee: 65, phytate_eee: 280, yield_factor: 0.55, food_type: 'CORE', caution_level: 'NONE',
        tags: ['nut', 'protein', 'fat', 'phytate']
      },

      {
        id: 'PUMPKIN_SEEDS', name_en: 'Pumpkin Seeds (Kaddu ke Beej)', name_hi: 'à¤•à¤¦à¥à¤¦à¥‚ à¤•à¥‡ à¤¬à¥€à¤œ', category: 'Nuts & Seeds',
        calories: 559, protein: 30.2, carbs: 10.7, fat: 49.1, fiber: 6.0,
        iron: 8.8, calcium: 46, magnesium: 592, zinc: 7.8, potassium: 809, sodium: 7, phosphorus: 1233, iodine: 0, selenium: 9.4, copper: 1.3,
        vitamin_a: 16, vitamin_b1: 0.27, vitamin_b2: 0.15, vitamin_b3: 4.4, vitamin_b6: 0.14, vitamin_b9: 57, vitamin_b12: 0, vitamin_c: 1.9, vitamin_d: 0, vitamin_e: 2.2, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 820, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['seed', 'protein', 'zinc', 'magnesium', 'phytate']
      },

      {
        id: 'SUNFLOWER_SEEDS', name_en: 'Sunflower Seeds', name_hi: 'à¤¸à¥‚à¤°à¤œà¤®à¥à¤–à¥€ à¤•à¥‡ à¤¬à¥€à¤œ', category: 'Nuts & Seeds',
        calories: 584, protein: 20.8, carbs: 20.0, fat: 51.5, fiber: 8.6,
        iron: 5.3, calcium: 78, magnesium: 325, zinc: 5.0, potassium: 645, sodium: 9, phosphorus: 660, iodine: 0, selenium: 53.0, copper: 1.8,
        vitamin_a: 3, vitamin_b1: 1.48, vitamin_b2: 0.36, vitamin_b3: 8.3, vitamin_b6: 1.35, vitamin_b9: 227, vitamin_b12: 0, vitamin_c: 1.4, vitamin_d: 0, vitamin_e: 35.2, vitamin_k: 0,
        oxalate_eee: 5, phytate_eee: 500, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['seed', 'vitamin_e', 'selenium', 'phytate']
      },

      {
        id: 'PEANUT_BUTTER', name_en: 'Peanut Butter (unsweetened)', name_hi: 'à¤®à¥‚à¤‚à¤—à¤«à¤²à¥€ à¤•à¤¾ à¤®à¤•à¥à¤–à¤¨', category: 'Nuts & Seeds',
        calories: 588, protein: 25.1, carbs: 20.0, fat: 49.9, fiber: 6.0,
        iron: 1.7, calcium: 49, magnesium: 168, zinc: 2.9, potassium: 558, sodium: 459, phosphorus: 335, iodine: 0, selenium: 4.1, copper: 0.6,
        vitamin_a: 0, vitamin_b1: 0.15, vitamin_b2: 0.13, vitamin_b3: 13.7, vitamin_b6: 0.44, vitamin_b9: 87, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 9.1, vitamin_k: 0.3,
        oxalate_eee: 55, phytate_eee: 300, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['nut', 'protein', 'fat', 'spread']
      },

      {
        id: 'COCONUT_MILK', name_en: 'Coconut Milk', name_hi: 'à¤¨à¤¾à¤°à¤¿à¤¯à¤² à¤•à¤¾ à¤¦à¥‚à¤§', category: 'Nuts & Seeds',
        calories: 230, protein: 2.3, carbs: 5.5, fat: 23.8, fiber: 2.2,
        iron: 1.6, calcium: 18, magnesium: 37, zinc: 0.7, potassium: 263, sodium: 15, phosphorus: 100, iodine: 0, selenium: 6.2, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.03, vitamin_b2: 0.0, vitamin_b3: 0.8, vitamin_b6: 0.03, vitamin_b9: 16, vitamin_b12: 0, vitamin_c: 2.8, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 50, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['dairy_alternative', 'fat', 'mcfa', 'vegan']
      },

      // Protein foods
      {
        id: 'TOFU', name_en: 'Tofu (Soy Paneer)', name_hi: 'à¤Ÿà¥‹à¤«à¥‚', category: 'Pulses',
        calories: 76, protein: 8.1, carbs: 1.9, fat: 4.8, fiber: 0.3,
        iron: 5.4, calcium: 350, magnesium: 30, zinc: 0.8, potassium: 121, sodium: 7, phosphorus: 97, iodine: 0, selenium: 8.9, copper: 0.2,
        vitamin_a: 0, vitamin_b1: 0.04, vitamin_b2: 0.05, vitamin_b3: 0.2, vitamin_b6: 0.05, vitamin_b9: 15, vitamin_b12: 0, vitamin_c: 0.1, vitamin_d: 0, vitamin_e: 0.0, vitamin_k: 2.0,
        oxalate_eee: 0, phytate_eee: 180, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'vegan', 'calcium', 'iron', 'phytate']
      },

      {
        id: 'EGG_YOLK', name_en: 'Egg Yolk', name_hi: 'à¤…à¤‚à¤¡à¥‡ à¤•à¥€ à¤œà¤°à¥à¤¦à¥€', category: 'Eggs & Non-Veg',
        calories: 322, protein: 15.9, carbs: 3.6, fat: 26.5, fiber: 0.0,
        iron: 2.7, calcium: 129, magnesium: 5, zinc: 2.3, potassium: 109, sodium: 48, phosphorus: 390, iodine: 0, selenium: 25.5, copper: 0.1,
        vitamin_a: 381, vitamin_b1: 0.18, vitamin_b2: 0.53, vitamin_b3: 0.0, vitamin_b6: 0.35, vitamin_b9: 146, vitamin_b12: 1.95, vitamin_c: 0, vitamin_d: 5.6, vitamin_e: 2.6, vitamin_k: 0.7,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        unit_name: 'yolk', unit_weight_g: 17,
        tags: ['protein', 'fat', 'vitamin_d', 'choline']
      },

      {
        id: 'FISH_POMFRET', name_en: 'Pomfret (Paplet)', name_hi: 'à¤ªà¤¾à¤ªà¤²à¥‡à¤Ÿ', category: 'Eggs & Non-Veg',
        calories: 97, protein: 20.6, carbs: 0.0, fat: 1.6, fiber: 0.0,
        iron: 0.5, calcium: 28, magnesium: 27, zinc: 0.4, potassium: 432, sodium: 74, phosphorus: 210, iodine: 0, selenium: 36.0, copper: 0.1,
        vitamin_a: 12, vitamin_b1: 0.04, vitamin_b2: 0.12, vitamin_b3: 5.0, vitamin_b6: 0.4, vitamin_b9: 12, vitamin_b12: 1.5, vitamin_c: 0, vitamin_d: 0.5, vitamin_e: 0.6, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 0.62, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'fish', 'seafood', 'lean']
      },

      {
        id: 'SALMON', name_en: 'Salmon', name_hi: 'à¤¸à¥ˆà¤²à¥à¤®à¤¨', category: 'Eggs & Non-Veg',
        calories: 208, protein: 20.4, carbs: 0.0, fat: 13.4, fiber: 0.0,
        iron: 0.3, calcium: 9, magnesium: 27, zinc: 0.4, potassium: 363, sodium: 59, phosphorus: 252, iodine: 0, selenium: 36.5, copper: 0.3,
        vitamin_a: 12, vitamin_b1: 0.23, vitamin_b2: 0.38, vitamin_b3: 8.0, vitamin_b6: 0.64, vitamin_b9: 26, vitamin_b12: 3.18, vitamin_c: 0, vitamin_d: 11.1, vitamin_e: 2.5, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 0.87, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'fish', 'omega3', 'vitamin_d']
      },

      {
        id: 'TUNA_CANNED', name_en: 'Tuna (Canned in water)', name_hi: 'à¤Ÿà¥à¤¯à¥‚à¤¨à¤¾', category: 'Eggs & Non-Veg',
        calories: 116, protein: 25.5, carbs: 0.0, fat: 0.8, fiber: 0.0,
        iron: 1.3, calcium: 11, magnesium: 31, zinc: 0.6, potassium: 237, sodium: 327, phosphorus: 194, iodine: 0, selenium: 80.4, copper: 0.1,
        vitamin_a: 20, vitamin_b1: 0.09, vitamin_b2: 0.1, vitamin_b3: 13.3, vitamin_b6: 0.45, vitamin_b9: 4, vitamin_b12: 2.5, vitamin_c: 0, vitamin_d: 5.4, vitamin_e: 0.6, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'fish', 'lean', 'omega3']
      },

      // Dairy
      {
        id: 'GREEK_YOGURT', name_en: 'Greek Yogurt (plain)', name_hi: 'à¤—à¥à¤°à¥€à¤• à¤¦à¤¹à¥€', category: 'Dairy',
        calories: 59, protein: 10.2, carbs: 3.6, fat: 0.4, fiber: 0.0,
        iron: 0.1, calcium: 110, magnesium: 11, zinc: 0.5, potassium: 141, sodium: 36, phosphorus: 135, iodine: 0, selenium: 9.7, copper: 0.0,
        vitamin_a: 0, vitamin_b1: 0.02, vitamin_b2: 0.28, vitamin_b3: 0.2, vitamin_b6: 0.06, vitamin_b9: 7, vitamin_b12: 0.75, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['dairy', 'protein', 'probiotic', 'calcium']
      },

      {
        id: 'WHEY_PROTEIN', name_en: 'Whey Protein (unflavoured)', name_hi: 'à¤µà¥à¤¹à¥‡ à¤ªà¥à¤°à¥‹à¤Ÿà¥€à¤¨', category: 'Dairy',
        calories: 352, protein: 75.0, carbs: 6.0, fat: 2.0, fiber: 0.0,
        iron: 0.4, calcium: 500, magnesium: 30, zinc: 1.0, potassium: 200, sodium: 100, phosphorus: 400, iodine: 0, selenium: 0, copper: 0.0,
        vitamin_a: 0, vitamin_b1: 0.0, vitamin_b2: 0.4, vitamin_b3: 0.0, vitamin_b6: 0.0, vitamin_b9: 0, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'TREAT', caution_level: 'NONE',
        tags: ['supplement', 'protein', 'dairy']
      },

      // Prepared foods
      {
        id: 'RAJMA_COOKED', name_en: 'Rajma (cooked)', name_hi: 'à¤°à¤¾à¤œà¤®à¤¾ (à¤ªà¤•à¤¾à¤¯à¤¾)', category: 'Prepared',
        calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4,
        iron: 2.5, calcium: 43, magnesium: 45, zinc: 1.0, potassium: 403, sodium: 2, phosphorus: 142, iodine: 0, selenium: 1.2, copper: 0.2,
        vitamin_a: 0, vitamin_b1: 0.16, vitamin_b2: 0.06, vitamin_b3: 0.6, vitamin_b6: 0.12, vitamin_b9: 130, vitamin_b12: 0, vitamin_c: 1.5, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 5.6,
        oxalate_eee: 0, phytate_eee: 210, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'fiber', 'iron', 'folate']
      },

      {
        id: 'CHOLE_COOKED', name_en: 'Chole / Chickpeas (cooked)', name_hi: 'à¤›à¥‹à¤²à¥‡', category: 'Prepared',
        calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6,
        iron: 2.9, calcium: 49, magnesium: 48, zinc: 1.5, potassium: 291, sodium: 24, phosphorus: 168, iodine: 0, selenium: 3.7, copper: 0.4,
        vitamin_a: 3, vitamin_b1: 0.12, vitamin_b2: 0.06, vitamin_b3: 0.5, vitamin_b6: 0.14, vitamin_b9: 172, vitamin_b12: 0, vitamin_c: 1.3, vitamin_d: 0, vitamin_e: 0.4, vitamin_k: 4.0,
        oxalate_eee: 0, phytate_eee: 200, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'fiber', 'folate', 'iron']
      },

      {
        id: 'POHA_COOKED', name_en: 'Poha (cooked)', name_hi: 'à¤ªà¥‹à¤¹à¤¾ (à¤ªà¤•à¤¾ à¤¹à¥à¤†)', category: 'Prepared',
        calories: 130, protein: 2.6, carbs: 28.1, fat: 1.5, fiber: 0.7,
        iron: 3.0, calcium: 7, magnesium: 18, zinc: 0.4, potassium: 98, sodium: 2, phosphorus: 55, iodine: 0, selenium: 5.0, copper: 0.1,
        vitamin_a: 0, vitamin_b1: 0.1, vitamin_b2: 0.03, vitamin_b3: 1.5, vitamin_b6: 0.05, vitamin_b9: 5, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 50, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['grain', 'iron', 'breakfast', 'snack']
      },

      {
        id: 'PARATHA', name_en: 'Paratha (plain)', name_hi: 'à¤ªà¤°à¤¾à¤‚à¤ à¤¾', category: 'Prepared',
        calories: 287, protein: 5.9, carbs: 42.3, fat: 10.6, fiber: 2.1,
        iron: 1.5, calcium: 31, magnesium: 22, zinc: 0.7, potassium: 126, sodium: 346, phosphorus: 75, iodine: 0, selenium: 14.0, copper: 0.1,
        vitamin_a: 0, vitamin_b1: 0.1, vitamin_b2: 0.04, vitamin_b3: 1.4, vitamin_b6: 0.05, vitamin_b9: 15, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 1.0, vitamin_k: 2.0,
        oxalate_eee: 0, phytate_eee: 150, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        unit_name: 'paratha', unit_weight_g: 80,
        tags: ['grain', 'fat', 'breakfast', 'wheat']
      },

      {
        id: 'MOONG_SPROUTS', name_en: 'Moong Sprouts', name_hi: 'à¤®à¥‚à¤‚à¤— à¤…à¤‚à¤•à¥à¤°à¤¿à¤¤', category: 'Pulses',
        calories: 30, protein: 3.0, carbs: 5.9, fat: 0.2, fiber: 1.8,
        iron: 0.9, calcium: 13, magnesium: 21, zinc: 0.4, potassium: 149, sodium: 6, phosphorus: 54, iodine: 0, selenium: 0.6, copper: 0.2,
        vitamin_a: 2, vitamin_b1: 0.08, vitamin_b2: 0.12, vitamin_b3: 0.7, vitamin_b6: 0.09, vitamin_b9: 60, vitamin_b12: 0, vitamin_c: 13.2, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 33,
        oxalate_eee: 0, phytate_eee: 80, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['protein', 'sprout', 'vitamin_c', 'folate']
      },

      // Treats
      {
        id: 'DARK_CHOCOLATE_70', name_en: 'Dark Chocolate (70%)', name_hi: 'à¤¡à¤¾à¤°à¥à¤• à¤šà¥‰à¤•à¤²à¥‡à¤Ÿ (70%)', category: 'Treats',
        calories: 598, protein: 7.8, carbs: 45.9, fat: 42.6, fiber: 10.9,
        iron: 11.9, calcium: 73, magnesium: 228, zinc: 3.3, potassium: 715, sodium: 20, phosphorus: 308, iodine: 0, selenium: 6.8, copper: 1.8,
        vitamin_a: 2, vitamin_b1: 0.03, vitamin_b2: 0.07, vitamin_b3: 1.1, vitamin_b6: 0.04, vitamin_b9: 6, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.6, vitamin_k: 7.3,
        oxalate_eee: 150, phytate_eee: 0, yield_factor: 1.0, food_type: 'TREAT', caution_level: 'MEDIUM',
        tags: ['treat', 'antioxidant', 'magnesium', 'iron', 'oxalate']
      },

      {
        id: 'HONEY', name_en: 'Honey (Shahad)', name_hi: 'à¤¶à¤¹à¤¦', category: 'Treats',
        calories: 304, protein: 0.3, carbs: 82.4, fat: 0.0, fiber: 0.2,
        iron: 0.4, calcium: 6, magnesium: 2, zinc: 0.2, potassium: 52, sodium: 4, phosphorus: 4, iodine: 0, selenium: 0.8, copper: 0.0,
        vitamin_a: 0, vitamin_b1: 0.0, vitamin_b2: 0.04, vitamin_b3: 0.1, vitamin_b6: 0.02, vitamin_b9: 2, vitamin_b12: 0, vitamin_c: 0.5, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'TREAT', caution_level: 'NONE',
        tags: ['treat', 'natural_sugar', 'sweetener']
      },

      {
        id: 'JAGGERY', name_en: 'Jaggery (Gud)', name_hi: 'à¤—à¥à¤¡à¤¼', category: 'Treats',
        calories: 383, protein: 0.4, carbs: 98.0, fat: 0.1, fiber: 0.0,
        iron: 11.0, calcium: 80, magnesium: 70, zinc: 0.3, potassium: 1056, sodium: 30, phosphorus: 20, iodine: 0, selenium: 0, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.01, vitamin_b2: 0.06, vitamin_b3: 0.5, vitamin_b6: 0.0, vitamin_b9: 0, vitamin_b12: 0, vitamin_c: 7.0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'TREAT', caution_level: 'NONE',
        tags: ['treat', 'natural_sugar', 'iron', 'sweetener']
      },

      {
        id: 'RAISINS', name_en: 'Raisins (Kishmish)', name_hi: 'à¤•à¤¿à¤¶à¤®à¤¿à¤¶', category: 'Treats',
        calories: 299, protein: 3.1, carbs: 79.2, fat: 0.5, fiber: 3.7,
        iron: 1.9, calcium: 50, magnesium: 32, zinc: 0.2, potassium: 749, sodium: 11, phosphorus: 101, iodine: 0, selenium: 0.6, copper: 0.3,
        vitamin_a: 0, vitamin_b1: 0.11, vitamin_b2: 0.13, vitamin_b3: 0.8, vitamin_b6: 0.17, vitamin_b9: 5, vitamin_b12: 0, vitamin_c: 2.3, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 3.5,
        oxalate_eee: 35, phytate_eee: 0, yield_factor: 1.0, food_type: 'TREAT', caution_level: 'NONE',
        tags: ['treat', 'dried_fruit', 'iron', 'potassium']
      },

      // Beverages
      {
        id: 'COFFEE_BLACK', name_en: 'Coffee (black)', name_hi: 'à¤•à¥‰à¤«à¥€ (à¤¬à¥à¤²à¥ˆà¤•)', category: 'Beverages',
        calories: 2, protein: 0.3, carbs: 0.0, fat: 0.0, fiber: 0.0,
        iron: 0.1, calcium: 5, magnesium: 8, zinc: 0.0, potassium: 92, sodium: 5, phosphorus: 7, iodine: 0, selenium: 0.0, copper: 0.0,
        vitamin_a: 0, vitamin_b1: 0.0, vitamin_b2: 0.01, vitamin_b3: 0.7, vitamin_b6: 0.0, vitamin_b9: 2, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['beverage', 'caffeine', 'zero_calorie']
      },

      {
        id: 'GREEN_TEA', name_en: 'Green Tea (brewed)', name_hi: 'à¤—à¥à¤°à¥€à¤¨ à¤Ÿà¥€', category: 'Beverages',
        calories: 1, protein: 0.2, carbs: 0.2, fat: 0.0, fiber: 0.0,
        iron: 0.0, calcium: 0, magnesium: 1, zinc: 0.0, potassium: 20, sodium: 1, phosphorus: 1, iodine: 0, selenium: 0.0, copper: 0.0,
        vitamin_a: 0, vitamin_b1: 0.0, vitamin_b2: 0.0, vitamin_b3: 0.0, vitamin_b6: 0.0, vitamin_b9: 5, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
        oxalate_eee: 0, phytate_eee: 0, yield_factor: 1.0, food_type: 'CORE', caution_level: 'NONE',
        tags: ['beverage', 'antioxidant', 'caffeine', 'zero_calorie']
      },
    ];

    for (const f of newFoods) {
      await query(`
        INSERT INTO dietbyrd_food_library(
    id, name_en, name_hi, category,
    calories, protein, carbs, fat, fiber,
    iron, calcium, magnesium, zinc, potassium, sodium, phosphorus, iodine, selenium, copper,
    vitamin_a, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, vitamin_b9, vitamin_b12,
    vitamin_c, vitamin_d, vitamin_e, vitamin_k,
    oxalate_eee, phytate_eee,
    yield_factor, image_url, tags, food_type, dietitian_visibility, caution_level
  ) VALUES(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
    $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, '', $34, $35, true, $36
  ) ON CONFLICT(id) DO NOTHING
    `, [
        f.id, f.name_en, f.name_hi, f.category,
        f.calories, f.protein, f.carbs, f.fat, f.fiber,
        f.iron, f.calcium, f.magnesium, f.zinc, f.potassium, f.sodium, f.phosphorus, f.iodine, f.selenium, f.copper,
        f.vitamin_a, f.vitamin_b1, f.vitamin_b2, f.vitamin_b3, f.vitamin_b6, f.vitamin_b9, f.vitamin_b12,
        f.vitamin_c, f.vitamin_d, f.vitamin_e, f.vitamin_k,
        f.oxalate_eee, f.phytate_eee,
        f.yield_factor || 1.0, f.tags || [], f.food_type || 'CORE', f.caution_level || 'NONE',
      ]);
    }
    console.log(`[migration] inserted ${newFoods.length} new food items(skipped existing)`);

    console.log('[migration] oxalate_eee / phytate_eee columns ready');
  } catch (err) {
    console.error('[migration] modulator columns error:', err.message);
  }
};

// â”€â”€â”€ Support ticket sequence and generator migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ensureTicketNumberSequence = async () => {
  try {
    await query(`CREATE SEQUENCE IF NOT EXISTS dietbyrd_tickets_seq`);

    const maxRes = await query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM dietbyrd_tickets`);
    const maxId = parseInt(maxRes.rows[0].max_id);

    if (maxId > 0) {
      const seqRes = await query(`SELECT last_value, is_called FROM dietbyrd_tickets_seq`);
      const lastValue = parseInt(seqRes.rows[0].last_value);
      const isCalled = seqRes.rows[0].is_called;
      const nextValWillBe = isCalled ? lastValue + 1 : lastValue;

      if (nextValWillBe <= maxId) {
        await query(`SELECT setval('dietbyrd_tickets_seq', $1, false)`, [maxId + 1]);
      }
    }

    await query(`
      CREATE OR REPLACE FUNCTION generate_ticket_number()
      RETURNS VARCHAR(20) AS $$
      DECLARE
        new_number VARCHAR(20);
        seq_val BIGINT;
      BEGIN
        seq_val := nextval('dietbyrd_tickets_seq');
        new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 4, '0');
        RETURN new_number;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('[migration] ticket number sequence ready');
  } catch (err) {
    console.error('[migration] ticket number sequence error:', err.message);
  }
};

let startupMaintenancePromise = null;
const runStartupMaintenance = () => {
  if (!isDatabaseConfigured) return Promise.resolve();
  if (!startupMaintenancePromise) {
    startupMaintenancePromise = (async () => {
      await ensureStaffPlainPasswordColumn();
      await ensureJoinRequestAboutYourselfColumn();
      await ensureDoctorCommissionRateColumn();
      await ensureDieticianClinicColumns();
      await ensureConsultationMeetingLinkColumn();
      await ensurePatientDiagnosesColumn();
      await ensureFoodLibraryModulatorColumns();
      await ensureTicketNumberSequence();
    })();
  }
  return startupMaintenancePromise;
};

if (process.env.RUN_STARTUP_MAINTENANCE === "true" || IS_DEV) {
  runStartupMaintenance().catch((err) => console.error("[startup-maintenance] error:", err.message));
}

// Scheduler is opt-in for long-lived local/worker processes; Netlify functions should stay request-driven.
if (process.env.ENABLE_AUTO_ASSIGN_SCHEDULER === "true" || IS_DEV) {
  runAutoAssign()
    .then(({ assigned, total_pending }) => {
      if (total_pending > 0) {
        console.log(`[auto-assign] startup run: assigned ${assigned}/${total_pending}`);
      }
    })
    .catch((err) => console.error("[auto-assign] startup error:", err.message));

  setInterval(() => {
    runAutoAssign()
      .then(({ assigned, total_pending }) => {
        if (total_pending > 0) {
          console.log(`[auto-assign] hourly run: assigned ${assigned}/${total_pending}`);
        }
      })
      .catch((err) => console.error("[auto-assign] hourly error:", err.message));
  }, 60 * 60 * 1000);
}

// â”€â”€â”€ Manual trigger endpoint (for the dashboard "Auto-Assign Now" button) â”€â”€â”€â”€â”€â”€
app.post("/api/appointments/trigger-auto-assign", async (_req, res) => {
  try {
    const result = await runAutoAssign();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const getPatientProfileForAuth = async (auth) => {
  if (!auth || !["patient", "admin", "rd"].includes(auth.role)) return null;

  if (auth.patientProfileId) {
    const byProfileId = await query(
      `SELECT id, phone, name, user_id
       FROM dietbyrd_patients
       WHERE id = $1
       LIMIT 1`,
      [auth.patientProfileId]
    );

    const patient = byProfileId.rows[0];
    if (patient) {
      if (!patient.user_id) {
        await query("UPDATE dietbyrd_patients SET user_id = $1 WHERE id = $2", [auth.userId, patient.id]);
      }
      if (!patient.user_id || patient.user_id === auth.userId) {
        return { ...patient, user_id: auth.userId };
      }
    }
  }

  const byUserId = await query(
    "SELECT id, phone, name, user_id FROM dietbyrd_patients WHERE user_id = $1 LIMIT 1",
    [auth.userId]
  );
  if (byUserId.rows[0]) return byUserId.rows[0];

  const phoneVariants = buildPhoneVariants(auth.user?.phone || "");
  if (phoneVariants.length > 0) {
    const byPhone = await query(
      `SELECT id, phone, name, user_id
       FROM dietbyrd_patients
       WHERE phone = ANY($1::text[])
       ORDER BY CASE WHEN user_id IS NULL THEN 0 ELSE 1 END, id DESC
       LIMIT 1`,
      [phoneVariants]
    );

    const patient = byPhone.rows[0];
    if (patient) {
      if (!patient.user_id) {
        await query("UPDATE dietbyrd_patients SET user_id = $1 WHERE id = $2", [auth.userId, patient.id]);
      }
      return { ...patient, user_id: auth.userId };
    }
  }

  const normalizedPhone = normalizePhoneForStorage(auth.user?.phone || "");
  if (!normalizedPhone) return null;

  const created = await query(
    `INSERT INTO dietbyrd_patients (user_id, phone, name, referral_source)
     VALUES ($1, $2, $3, 'content')
     RETURNING id, phone, name, user_id`,
    [auth.userId, normalizedPhone, auth.user?.name || "Patient"]
  );

  return created.rows[0] || null;
};

const getPatientProfileForUser = async (userId) => {
  const userResult = await query(
    "SELECT id, role, email, phone, name FROM dietbyrd_users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return null;
  return getPatientProfileForAuth({ userId: user.id, role: user.role, user, patientProfileId: null });
};

const hasCompletedPaidConsultation = async (patientProfileId) => {
  // Check if they have any successful payment
  const result = await query(
    `SELECT 1 FROM dietbyrd_razorpay_payments WHERE patient_id = $1 AND status IN ('paid', 'captured', 'success') LIMIT 1`,
    [patientProfileId]
  );
  if (result.rows.length > 0) return true;

  // Fallback check for manual/legacy paid status
  const patientRes = await query(
    `SELECT payment_status FROM dietbyrd_patients WHERE id = $1 LIMIT 1`,
    [patientProfileId]
  );
  if (patientRes.rows[0] && patientRes.rows[0].payment_status === 'paid') return true;

  return false;
};

app.get("/api/reviews", async (req, res) => {
  try {
    const approvedOnly = req.query.approved === "1";
    const featuredOnly = req.query.featured === "1";
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
    const result = await query(
      `SELECT r.id, r.patient_id, 'Anonymous patient' AS patient_name, r.rating, r.body, r.condition_tag,
              r.is_approved, r.is_featured, r.created_at, r.approved_at
       FROM reviews r
       WHERE ($1::boolean = false OR r.is_approved = true)
         AND ($2::boolean = false OR r.is_featured = true)
       ORDER BY r.created_at DESC
       LIMIT $3 OFFSET $4`,
      [approvedOnly, featuredOnly, limit, offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/reviews/me/status", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can review." });

    const patient = await getPatientProfileForAuth(auth);
    const completed = patient ? await hasCompletedPaidConsultation(patient.id) : false;
    const phone = formatPhoneE164(auth.user.phone || patient?.phone || "");
    const existing = await query("SELECT 1 FROM reviews WHERE phone_e164 = $1 LIMIT 1", [phone]);
    const hasReviewed = existing.rows.length > 0;

    res.json({
      success: true,
      data: {
        eligible: completed && !hasReviewed,
        has_completed_paid_consultation: completed,
        has_reviewed: hasReviewed,
        reason: !completed ? "Only paid clients can submit a review." : hasReviewed ? "You have already posted a review." : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can post a review." });

    const patient = await getPatientProfileForUser(auth.userId);
    if (!patient || !(await hasCompletedPaidConsultation(patient.id))) {
      return res.status(403).json({ success: false, error: "Only paid patients can post a review." });
    }

    const rating = Number(req.body.rating);
    const body = String(req.body.body || "").trim();
    const conditionTag = req.body.condition_tag ? String(req.body.condition_tag).trim() : null;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 20 || body.length > 2000) {
      return res.status(400).json({ success: false, error: "Please provide a 1-5 rating and a review between 20 and 2000 characters." });
    }

    const blockedReviewPatterns = [
      /\b(fuck|shit|bitch|asshole|bastard|slut|whore)\b/i,
      /\b(kill|suicide|self[-\s]?harm|rape|molest)\b/i,
      /\b\d{10}\b/,
      /https?:\/\//i,
      /www\./i,
      /@[a-z0-9_.-]+\.[a-z]{2,}/i,
    ];
    if (blockedReviewPatterns.some((pattern) => pattern.test(body))) {
      return res.status(400).json({
        success: false,
        error: "This review violates our community guidelines and cannot be submitted.",
      });
    }

    const phone = formatPhoneE164(auth.user.phone || patient.phone || "");
    const result = await query(
      `INSERT INTO reviews (patient_id, phone_e164, rating, body, condition_tag)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [auth.userId, phone, rating, body, conditionTag || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, error: "You have already posted a review." });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/reviews/me", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can fetch their review." });

    const phone = formatPhoneE164(auth.user.phone || "");
    const result = await query(
      `SELECT * FROM reviews WHERE phone_e164 = $1 OR patient_id = $2 LIMIT 1`,
      [phone, auth.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/reviews/me", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can edit their review." });

    const rating = Number(req.body.rating);
    const body = String(req.body.body || "").trim();
    const conditionTag = req.body.condition_tag ? String(req.body.condition_tag).trim() : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 20 || body.length > 2000) {
      return res.status(400).json({ success: false, error: "Please provide a 1-5 rating and a review between 20 and 2000 characters." });
    }

    const blockedReviewPatterns = [
      /\b(fuck|shit|bitch|asshole|bastard|slut|whore)\b/i,
      /\b(kill|suicide|self[-\s]?harm|rape|molest)\b/i,
      /\b\d{10}\b/,
      /https?:\/\//i,
      /www\./i,
      /@[a-z0-9_.-]+\.[a-z]{2,}/i,
    ];
    if (blockedReviewPatterns.some((pattern) => pattern.test(body))) {
      return res.status(400).json({
        success: false,
        error: "This review violates our community guidelines and cannot be submitted.",
      });
    }

    const phone = formatPhoneE164(auth.user.phone || "");
    const result = await query(
      `UPDATE reviews 
       SET rating = $1, body = $2, condition_tag = $3, is_approved = false, approved_at = null
       WHERE phone_e164 = $4 OR patient_id = $5
       RETURNING *`,
      [rating, body, conditionTag, phone, auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/admin/reviews", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (!["ops_manager", "founder", "tech_lead"].includes(auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }
    const approved = req.query.approved === undefined ? null : req.query.approved === "1";
    const result = await query(
      `SELECT r.id, r.patient_id, u.name AS patient_name, r.rating, r.body, r.condition_tag,
              r.is_approved, r.is_featured, r.created_at, r.approved_at
       FROM reviews r
       LEFT JOIN dietbyrd_users u ON u.id = r.patient_id
       WHERE ($1::boolean IS NULL OR r.is_approved = $1)
       ORDER BY r.is_featured DESC NULLS LAST, r.created_at DESC`,
      [approved]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/reviews/:id", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (!["ops_manager", "founder", "tech_lead"].includes(auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }
    const isApproved = !!req.body.is_approved;
    const result = await query(
      `UPDATE reviews
       SET is_approved = $1, approved_at = CASE WHEN $1 THEN NOW() ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [isApproved, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle featured status for landing page testimonial section
app.patch("/api/admin/reviews/:id/feature", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (!["ops_manager", "founder", "tech_lead"].includes(auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }
    const isFeatured = !!req.body.is_featured;
    // Ensure is_featured column exists (safe migration)
    try {
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false`);
    } catch (_) {}
    const result = await query(
      `UPDATE reviews SET is_featured = $1 WHERE id = $2 RETURNING *`,
      [isFeatured, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const DOCUMENT_BUCKET = "patient-documents";
const DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const DOCUMENT_KIND_TYPES = new Set(["blood_report", "prescription", "other"]);
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
let patientDocumentsStorageInitialized = false;

const ensurePatientDocumentStorage = async () => {
  if (patientDocumentsStorageInitialized) return;
  await query(`ALTER TABLE dietbyrd_patient_documents ADD COLUMN IF NOT EXISTS file_data BYTEA`);
  patientDocumentsStorageInitialized = true;
};

const signedDocumentUrl = async (filePath) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${DOCUMENT_BUCKET}/${filePath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 72 * 60 * 60 }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.signedURL ? `${supabaseUrl}/storage/v1${data.signedURL}` : null;
};

const attachDocumentUrls = async (rows) =>
  Promise.all(rows.map(async (row) => {
    const { file_data, ...documentRow } = row;
    return {
      ...documentRow,
      signed_url: file_data
        ? `/api/patient/documents/${row.id}/download`
        : await signedDocumentUrl(row.file_path)
    };
  }));

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const parseMultipartUpload = async (req) => {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) throw new Error("Multipart boundary missing");
  const boundary = `--${boundaryMatch[1]}`;
  const raw = await readRawBody(req);
  const rawText = raw.toString("latin1");
  const parts = rawText.split(boundary).slice(1, -1);
  const fields = {};
  let file = null;

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;
    const header = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4, part.endsWith("\r\n") ? -2 : undefined);
    const nameMatch = header.match(/name="([^"]+)"/);
    const filenameMatch = header.match(/filename="([^"]*)"/);
    const typeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);
    if (!nameMatch) continue;
    if (filenameMatch) {
      file = {
        field: nameMatch[1],
        originalname: filenameMatch[1],
        mimetype: typeMatch?.[1]?.trim() || "application/octet-stream",
        buffer: Buffer.from(content, "latin1"),
      };
    } else {
      fields[nameMatch[1]] = content;
    }
  }
  return { fields, file };
};

const uploadToDocumentStorage = async (filePath, file) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { storedInDatabase: true };
  }
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${DOCUMENT_BUCKET}/${filePath}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.mimetype,
      "x-upsert": "false",
    },
    body: file.buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to upload document");
  }
  return { storedInDatabase: false };
};

app.post("/api/patient/me/documents", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (!["patient", "admin", "rd"].includes(auth.role)) return res.status(403).json({ success: false, error: "Only patients can upload documents." });

    const patient = await getPatientProfileForUser(auth.userId);
    if (!patient) return res.status(404).json({ success: false, error: "Patient profile not found" });

    const { fields, file } = await parseMultipartUpload(req);
    const kind = fields.kind || "blood_report";
    if (!DOCUMENT_KIND_TYPES.has(kind)) return res.status(400).json({ success: false, error: "Invalid document kind" });
    if (!file) return res.status(400).json({ success: false, error: "File is required" });
    if (!DOCUMENT_MIME_TYPES.has(file.mimetype)) return res.status(400).json({ success: false, error: "Only PDF, JPG, and PNG files are allowed" });
    if (file.buffer.length > DOCUMENT_MAX_BYTES) return res.status(400).json({ success: false, error: "File must be 10 MB or smaller" });

    const extension = file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
    const id = crypto.randomUUID();
    const filePath = `${auth.userId}/${id}.${extension}`;
    await ensurePatientDocumentStorage();
    const storageResult = await uploadToDocumentStorage(filePath, file);

    const result = await query(
      `INSERT INTO dietbyrd_patient_documents
       (id, patient_id, patient_profile_id, kind, file_path, original_filename, mime_type, size_bytes, uploaded_by, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $2, $9)
       RETURNING *`,
      [id, auth.userId, patient.id, kind, filePath, file.originalname, file.mimetype, file.buffer.length, storageResult.storedInDatabase ? file.buffer : null]
    );
    res.status(201).json({ success: true, data: (await attachDocumentUrls(result.rows))[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/patient/documents/:id/download", async (req, res) => {
  try {
    await ensurePatientDocumentStorage();
    const result = await query(
      "SELECT id, original_filename, mime_type, file_data FROM dietbyrd_patient_documents WHERE id = $1",
      [req.params.id]
    );
    const doc = result.rows[0];
    if (!doc?.file_data) return res.status(404).send("Document not found");

    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${String(doc.original_filename || "document").replace(/"/g, "")}"`);
    res.send(doc.file_data);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/patient/me/documents", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can view their documents." });
    const patient = await getPatientProfileForAuth(auth);
    if (!patient) return res.status(404).json({ success: false, error: "Patient profile not found" });
    const result = await query(
      "SELECT * FROM dietbyrd_patient_documents WHERE patient_id = $1 OR patient_profile_id = $2 ORDER BY created_at DESC",
      [auth.userId, patient.id]
    );
    res.json({ success: true, data: await attachDocumentUrls(result.rows) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/patient/me/documents/:id", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can delete documents." });
    const patient = await getPatientProfileForAuth(auth);
    if (!patient) return res.status(404).json({ success: false, error: "Patient profile not found" });
    const result = await query(
      "DELETE FROM dietbyrd_patient_documents WHERE id = $1 AND (patient_id = $2 OR patient_profile_id = $3) RETURNING id",
      [req.params.id, auth.userId, patient.id]
    );
    res.json({ success: true, data: result.rows[0] || { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/rd/patients/:patientId/documents", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json({ success: false, error: auth.error });
    if (["support", "support_intern"].includes(auth.role)) return res.status(403).json({ success: false, error: "Support cannot access patient documents." });
    if (!["rd", "mlt_intern"].includes(auth.role)) return res.status(403).json({ success: false, error: "Not authorized" });

    const patientProfileId = parseInt(req.params.patientId, 10);
    let regId = null;

    if (auth.role === "rd") {
      const rdResult = await query("SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1", [auth.userId]);
      const rdId = rdResult.rows[0]?.id;
      const assigned = await query(
        `SELECT rp.id FROM dietbyrd_registered_patients rp
         LEFT JOIN dietbyrd_consultations c ON rp.id = c.registered_patient_id
         WHERE rp.patient_id = $1 AND (rp.assigned_rd_id = $2 OR c.rd_id = $2) LIMIT 1`,
        [patientProfileId, rdId]
      );
      if (!rdId || assigned.rows.length === 0) return res.status(403).json({ success: false, error: "Not assigned to this patient" });
      regId = assigned.rows[0].id;
    } else {
      const rpRes = await query("SELECT id FROM dietbyrd_registered_patients WHERE patient_id = $1 LIMIT 1", [patientProfileId]);
      if (rpRes.rows.length === 0) return res.json({ success: true, data: [] });
      regId = rpRes.rows[0].id;
    }

    const result = await query(
      "SELECT * FROM dietbyrd_patient_documents WHERE patient_profile_id = $1 ORDER BY created_at DESC",
      [patientProfileId]
    );
    res.json({ success: true, data: await attachDocumentUrls(result.rows) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update patient improvement score
const updatePatientImprovementScoreHandler = async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    if (auth.role !== "rd" && auth.role !== "doctor") {
      return res.status(403).json({ error: "Only dietitians and doctors can update improvement scores" });
    }

    const { patientId } = req.params;
    const { score } = req.body;

    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return res.status(400).json({ error: "Score must be an integer between 1 and 10" });
    }

    const rdResult = await query(
      "SELECT id FROM dietbyrd_registered_dietitians WHERE user_id = $1 LIMIT 1",
      [auth.userId]
    );
    if (rdResult.rows.length === 0) {
      return res.status(403).json({ error: "You are not the assigned dietitian for this patient" });
    }

    const rdId = rdResult.rows[0].id;

    const verifyResult = await query(
      `SELECT rp.id FROM dietbyrd_registered_patients rp
       LEFT JOIN dietbyrd_consultations c ON rp.id = c.registered_patient_id
       WHERE rp.patient_id = $1 AND (rp.assigned_rd_id = $2 OR (c.rd_id = $2 AND c.status IN ('confirmed', 'scheduled', 'completed')))
       LIMIT 1`,
      [patientId, rdId]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: "You are not the assigned dietitian for this patient" });
    }

    const updateResult = await query(
      `UPDATE dietbyrd_patients 
       SET improvement_score = $1, improvement_updated_by = $2, improvement_updated_at = NOW() 
       WHERE id = $3 RETURNING improvement_score, improvement_updated_at`,
      [score, auth.userId, patientId]
    );

    const updated = updateResult.rows[0];
    res.json({
      success: true,
      data: {
        score: updated.improvement_score,
        updated_at: updated.improvement_updated_at,
      },
    });
  } catch (err) {
    console.error("[PATCH /dietitian/patients/:id/improvement-score] Error:", err);
    res.status(500).json({ error: "Failed to update improvement score" });
  }
};

app.patch("/api/dietitian/patients/:patientId/improvement-score", updatePatientImprovementScoreHandler);
app.patch("/api/dietitians/patients/:patientId/improvement-score", updatePatientImprovementScoreHandler);

// 404 handler
// Update patient profile (called during registration)
app.put("/api/patients/profile", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json(auth);
    if (auth.role !== "patient") return res.status(403).json({ success: false, error: "Only patients can update profile" });

    const { age, gender, dietary_preference, diagnosis, city } = req.body;

    const patientRes = await query("SELECT id FROM dietbyrd_patients WHERE user_id = $1", [auth.userId]);
    if (patientRes.rows.length === 0) return res.status(404).json({ success: false, error: "Patient profile not found" });

    const patientId = patientRes.rows[0].id;

    // Use primaryDiagnosis formatting like in PATCH /api/patients/:id
    let primaryDiagnosis = diagnosis || null;
    if (primaryDiagnosis) {
      primaryDiagnosis = primaryDiagnosis.toLowerCase();
      const validDiagnoses = ['diabetes', 'hypertension', 'obesity', 'other', 'pcos', 'thyroid'];
      if (!validDiagnoses.includes(primaryDiagnosis)) {
        primaryDiagnosis = 'other';
      }
    }

    const result = await query(
      `UPDATE dietbyrd_patients
       SET age = COALESCE($1, age),
           gender = COALESCE($2, gender),
           dietary_preference = COALESCE($3, dietary_preference),
           diagnosis = COALESCE($4, diagnosis),
           city = COALESCE($5, city),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [age, gender, dietary_preference, primaryDiagnosis, city, patientId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user password
app.put("/api/user/password", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json(auth);
    
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Invalid password data" });
    }

    const userRes = await query("SELECT password FROM dietbyrd_users WHERE id = $1", [auth.userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!isValid) return res.status(400).json({ success: false, error: "Incorrect current password" });

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query("UPDATE dietbyrd_users SET password = $1 WHERE id = $2", [hashed, auth.userId]);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update password" });
  }
});

// Admin Session Management
app.get("/api/admin/users/:id/sessions", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json(auth);
    if (auth.role !== 'admin' && auth.role !== 'owner') return res.status(403).json({ success: false, error: "Forbidden" });

    const userId = parseInt(req.params.id);
    const { rows } = await query("SELECT session_token, ip_address, user_agent, created_at, expires_at FROM dietbyrd_user_sessions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/users/:id/sessions/logout-all", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json(auth);
    if (auth.role !== 'admin' && auth.role !== 'owner') return res.status(403).json({ success: false, error: "Forbidden" });

    const userId = parseInt(req.params.id);
    await query("DELETE FROM dietbyrd_user_sessions WHERE user_id = $1", [userId]);
    res.json({ success: true, message: "All sessions terminated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/sessions/logout-device", async (req, res) => {
  try {
    const auth = await getAuthContextFromHeaders(req);
    if (auth.error) return res.status(401).json(auth);
    if (auth.role !== 'admin' && auth.role !== 'owner') return res.status(403).json({ success: false, error: "Forbidden" });

    const { session_token } = req.body;
    await query("DELETE FROM dietbyrd_user_sessions WHERE session_token = $1", [session_token]);
    res.json({ success: true, message: "Session terminated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global Error Handler to prevent app crashes
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ success: false, error: "Internal Server Error. Please try again later." });
});

export default app;





