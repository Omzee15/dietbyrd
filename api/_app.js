import express from "express";
import cors from "cors";
import pg from "pg";
import twilio from "twilio";
import crypto from "crypto";

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
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Template SIDs for WhatsApp messages (approved by Meta)
const TWILIO_TEMPLATE_WELCOME_SID = process.env.TWILIO_TEMPLATE_WELCOME_SID || "HX328f4bea0c71b8a51ca4dc299ebec18c";
const TWILIO_TEMPLATE_REFERRAL_SID = process.env.TWILIO_TEMPLATE_REFERRAL_SID || "HXa30600aedf64f90077f9bb14f2f30160";

// Send WhatsApp welcome message using approved template (best effort - doesn't fail if message fails)
const sendWelcomeWhatsApp = async (phone, name, patientId = null) => {
  const messageBody = `Hi ${name || 'there'}! 👋\n\nThank you for joining DietByRD! 🎉\n\nOur team will contact you shortly to guide you through the onboarding process and help you get started on your health journey.\n\nIf you have any questions, feel free to reach out!\n\n- Team DietByRD`;
  
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

// Format phone number for E.164 (assumes Indian numbers if no country code)
const formatPhoneE164 = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
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
let pool;
const getPool = () => {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || '';
    const useSSL = dbUrl.includes('sslmode=require') || dbUrl.includes('.neon.tech');
    
    pool = new Pool({
      connectionString: dbUrl,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
};

const query = async (text, params) => {
  const res = await getPool().query(text, params);
  return res;
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

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await getPool().query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

// ─── Authentication ───────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password required" });
    }

    // Find user by phone (now includes name and is_verified)
    const userResult = await query(
      "SELECT id, phone, role, name, password, is_active, is_verified FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    // For demo purposes, accept "helloworld" as password for accounts without password set
    // In production, use bcrypt.compare()
    const isValidPassword = user.password 
      ? user.password === password 
      : password === "helloworld";

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: "Invalid phone number or password" });
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Patient Signup ───────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Create user as patient
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, is_active)
       VALUES ($1, $2, 'patient', $3, true)
       RETURNING id, phone, role, name`,
      [phone, password, name || null]
    );
    const user = userResult.rows[0];

    // Create patient record
    const patientResult = await query(
      `INSERT INTO dietbyrd_patients (user_id, phone, name, referral_source)
       VALUES ($1, $2, $3, 'content')
       RETURNING id`,
      [user.id, phone, name || null]
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        profileId: patientResult.rows[0].id,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone is required" });
    }

    const input = String(phone).trim();
    const digits = input.replace(/\D/g, "");
    const lastTenDigits = digits.length >= 10 ? digits.slice(-10) : digits;

    const variants = [...new Set([
      input,
      digits,
      lastTenDigits,
      lastTenDigits ? `+91${lastTenDigits}` : "",
      lastTenDigits ? `91${lastTenDigits}` : "",
    ].filter(Boolean))];

    const existing = await query(
      "SELECT id, role, name FROM dietbyrd_users WHERE phone = ANY($1::text[]) LIMIT 1",
      [variants]
    );

    if (existing.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          exists: false,
          user_role: null,
          auth_flow: "phone-signin",
          is_referred_patient: false,
          referred_by_doctor_name: null,
        },
      });
    }

    const userId = existing.rows[0].id;
    const userRole = existing.rows[0].role;
    const userName = existing.rows[0].name || null;

    const referralInfo = await query(
      `SELECT d.name AS doctor_name
       FROM dietbyrd_patients p
       INNER JOIN dietbyrd_referrals r ON r.patient_id = p.id
       INNER JOIN dietbyrd_doctors d ON d.id = r.doctor_id
       WHERE p.user_id = $1 OR p.phone = ANY($2::text[])
       ORDER BY r.referred_at DESC
       LIMIT 1`,
      [userId, variants]
    );

    const referredByDoctorName = referralInfo.rows[0]?.doctor_name || null;

    return res.json({
      success: true,
      data: {
        exists: true,
        user_role: userRole,
        user_name: userName,
        auth_flow: userRole === "patient" ? "otp" : "password",
        is_referred_patient: Boolean(referredByDoctorName),
        referred_by_doctor_name: referredByDoctorName,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OTP Authentication ───────────────────────────────────────────────────────
// Send OTP via Twilio Verify (for login)
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { phone, channel = "sms" } = req.body; // channel: "sms" or "whatsapp"
    
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    // Check if user exists
    const userResult = await query(
      "SELECT id, phone, is_active FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "No account found with this phone number" });
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
        expiresIn: 600 // Twilio Verify OTPs expire in 10 minutes
      });
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
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
    const userResult = await query(
      "SELECT id, phone, role, name, is_active, is_verified FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP only (without login), used for referred-user password setup
app.post("/api/auth/verify-otp-only", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    try {
      const verificationCheck = await verifyOtpViaTwilio(phone, otp);

      if (verificationCheck.status !== "approved") {
        return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
      }
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
      return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
    }

    const userResult = await query(
      "SELECT id, is_active FROM dietbyrd_users WHERE phone = $1",
      [phone]
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

    try {
      const verificationCheck = await verifyOtpViaTwilio(phone, otp);

      if (verificationCheck.status !== "approved") {
        return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
      }
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
      return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
    }

    const userResult = await query(
      "SELECT id, phone, role, name, is_active, is_verified FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    await query(
      "UPDATE dietbyrd_users SET password = $1, last_login_at = CURRENT_TIMESTAMP WHERE id = $2",
      [password, user.id]
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

// ─── Signup with OTP ──────────────────────────────────────────────────────────
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

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Send OTP using Twilio Verify (or mock in dev mode)
    console.log(`[OTP] Sending signup OTP to ${phone} via ${channel}`);
    
    try {
      const result = await sendOtpViaTwilio(phone, channel);
      const { verification, toNumber, channel: normalizedChannel, devOtp } = result;
      
      // Store pending signup data (needed for verification step)
      const pendingData = { phone, password, name };
      // In dev mode, store the actual OTP; in production, Twilio handles it
      await storeOtp(phone, devOtp || "", 'signup', pendingData);
      
      console.log(`[OTP] Verification sent, SID: ${verification.sid}, Status: ${verification.status}`);
      return res.json({ 
        success: true, 
        message: normalizedChannel === "whatsapp" ? "OTP sent to your WhatsApp" : "OTP sent via SMS",
        to: toNumber,
        expiresIn: 600
      });
    } catch (twilioErr) {
      console.error("[OTP] Twilio Verify error:", twilioErr.message, twilioErr.code);
      await clearOtp(phone, 'signup');
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

    // Verify OTP - use local DB in dev mode, Twilio in production
    if (IS_DEV) {
      const verifyResult = await verifyOtpFromDb(phone, otp, 'signup');
      if (!verifyResult.valid) {
        return res.status(400).json({ success: false, error: verifyResult.error || "Invalid OTP." });
      }
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

    // Get pending signup data from our database
    await ensureOtpTable();
    const pendingResult = await query(
      "SELECT pending_data FROM dietbyrd_otps WHERE phone = $1 AND purpose = 'signup'",
      [phone]
    );
    
    if (pendingResult.rows.length === 0 || !pendingResult.rows[0].pending_data) {
      return res.status(400).json({ success: false, error: "Signup session expired. Please try again." });
    }
    
    const pendingData = pendingResult.rows[0].pending_data;
    if (!pendingData.phone || !pendingData.password) {
      await clearOtp(phone, 'signup');
      return res.status(400).json({ success: false, error: "Signup data not found. Please try again." });
    }

    // Clear pending data
    await clearOtp(phone, 'signup');

    // Double-check user doesn't exist (race condition protection)
    const existingUser = await query(
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Create user as patient
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

// ─── Join Requests (Doctor/Dietician) ─────────────────────────────────────────
// Create a join request
app.post("/api/join-requests", async (req, res) => {
  try {
    const { phone, password, name, role, qualification, clinic_name, clinic_address, specializations } = req.body;
    
    if (!phone || !password || !name || !role) {
      return res.status(400).json({ 
        success: false, 
        error: "Phone, password, name, and role are required" 
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
      "SELECT id, is_verified FROM dietbyrd_users WHERE phone = $1",
      [phone]
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
      "SELECT id FROM dietbyrd_join_requests WHERE phone = $1 AND status = 'pending'",
      [phone]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({ success: false, error: "A pending request already exists for this phone number" });
    }

    // Create user immediately with is_verified = false
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, is_active, is_verified)
       VALUES ($1, $2, $3, $4, true, false)
       RETURNING id`,
      [phone, password, role, name]
    );
    const userId = userResult.rows[0].id;

    // Create join request and link to user
    const result = await query(
      `INSERT INTO dietbyrd_join_requests 
        (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING id, phone, name, requested_role, status, created_at`,
      [phone, password, name, role, qualification, clinic_name || null, clinic_address || null, specializations ? JSON.stringify(specializations) : null, userId]
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
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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
        
        // Create user
        const userResult = await query(
          `INSERT INTO dietbyrd_users (phone, password, role, name, is_active, is_verified)
           VALUES ($1, $2, $3, $4, true, false)
           RETURNING id`,
          [phone, password, role, name]
        );
        const userId = userResult.rows[0].id;

        const result = await query(
          `INSERT INTO dietbyrd_join_requests 
            (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, status, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
           RETURNING id, phone, name, requested_role, status, created_at`,
          [phone, password, name, role, qualification, clinic_name || null, clinic_address || null, specializations ? JSON.stringify(specializations) : null, userId]
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
        reviewer.name AS reviewed_by_name
      FROM dietbyrd_join_requests jr
      LEFT JOIN dietbyrd_users reviewer ON jr.reviewed_by = reviewer.id
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

// Approve/Reject a join request (admin only)
app.patch("/api/join-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewed_by, rejection_reason } = req.body;
    
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

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ success: false, error: "Request has already been processed" });
    }

    if (action === "reject") {
      // Reject the request - also deactivate/delete the unverified user
      if (joinRequest.user_id) {
        await query("DELETE FROM dietbyrd_users WHERE id = $1 AND is_verified = false", [joinRequest.user_id]);
      }
      await query(
        `UPDATE dietbyrd_join_requests 
         SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [reviewed_by || null, rejection_reason || null, id]
      );
      return res.json({ success: true, message: "Request rejected" });
    }

    // Approve: Verify the user and create the profile
    let userId = joinRequest.user_id;
    
    if (userId) {
      // User was created at join request time - just verify them
      await query(
        "UPDATE dietbyrd_users SET is_verified = true WHERE id = $1",
        [userId]
      );
    } else {
      // Legacy: user wasn't created at join time, create now (for old requests)
      const userResult = await query(
        `INSERT INTO dietbyrd_users (phone, password, role, name, is_active, is_verified)
         VALUES ($1, $2, $3, $4, true, true)
         RETURNING id`,
        [joinRequest.phone, joinRequest.password, joinRequest.requested_role, joinRequest.name]
      );
      userId = userResult.rows[0].id;
      
      // Link user to join request
      await query("UPDATE dietbyrd_join_requests SET user_id = $1 WHERE id = $2", [userId, id]);
    }

    if (joinRequest.requested_role === "doctor") {
      await query(
        `INSERT INTO dietbyrd_doctors (user_id, name, qualification, clinic_name, clinic_address, is_verified)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [userId, joinRequest.name, joinRequest.qualification, joinRequest.clinic_name, joinRequest.clinic_address]
      );
    } else if (joinRequest.requested_role === "rd") {
      await query(
        `INSERT INTO dietbyrd_registered_dietitians (user_id, name, qualification, specializations, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [userId, joinRequest.name, joinRequest.qualification, joinRequest.specializations]
      );
    }

    // Update the join request
    await query(
      `UPDATE dietbyrd_join_requests 
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reviewed_by || null, id]
    );

    res.json({ success: true, message: `${joinRequest.requested_role === "doctor" ? "Doctor" : "Dietician"} account verified successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────
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

// ─── Patients ─────────────────────────────────────────────────────────────────
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
        COALESCE(payment_summary.payment_status, 'unpaid') AS payment_status,
        COALESCE(payment_summary.payment_history, '[]'::json) AS payment_history
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN COUNT(*) FILTER (WHERE pay.status = 'success') > 0 OR rp.dietary_preference IS NOT NULL THEN 'paid'
            ELSE 'unpaid'
          END AS payment_status,
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
        rp.dietary_preference,
        rp.food_restrictions,
        rp.assigned_rd_id,
        rd.name AS assigned_dietician_name,
        rd.qualification AS assigned_dietician_qualification,
        ref.doctor_id AS referring_doctor_id,
        d.name AS referring_doctor_name,
        d.qualification AS referring_doctor_qualification,
        d.clinic_name AS referring_doctor_clinic,
        COALESCE(payment_summary.payment_status, 'unpaid') AS payment_status,
        COALESCE(payment_summary.payment_history, '[]'::json) AS payment_history
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      LEFT JOIN dietbyrd_referrals ref ON ref.patient_id = p.id
      LEFT JOIN dietbyrd_doctors d ON ref.doctor_id = d.id
      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN COUNT(*) FILTER (WHERE pay.status = 'success') > 0 OR rp.dietary_preference IS NOT NULL THEN 'paid'
            ELSE 'unpaid'
          END AS payment_status,
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
      [name, phone, age, gender, diagnosis, diagnosis_description, referral_source]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/patients/:id(\\d+)", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, gender, diagnosis, diagnosis_description, height, weight, allergies, workout_frequency } = req.body;
    const result = await query(
      `UPDATE dietbyrd_patients
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           diagnosis = COALESCE($4, diagnosis),
           diagnosis_description = COALESCE($5, diagnosis_description),
           height = COALESCE($6, height),
           weight = COALESCE($7, weight),
           allergies = COALESCE($8, allergies),
           workout_frequency = COALESCE($9, workout_frequency),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, age, gender, diagnosis, diagnosis_description, height, weight, allergies, workout_frequency, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
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
    
    if (!dietician_id) {
      return res.status(400).json({ success: false, error: "dietician_id is required" });
    }

    // Check if patient exists
    const patientCheck = await query("SELECT id FROM dietbyrd_patients WHERE id = $1", [id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Patient not found" });
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
        [id, dietician_id]
      );
    } else {
      // Update existing record
      result = await query(
        `UPDATE dietbyrd_registered_patients
         SET assigned_rd_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $2
         RETURNING *`,
        [dietician_id, id]
      );
    }

    // Get dietician name for response
    const dieticianInfo = await query(
      "SELECT name FROM dietbyrd_registered_dietitians WHERE id = $1",
      [dietician_id]
    );

    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        dietician_name: dieticianInfo.rows[0]?.name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Doctors ──────────────────────────────────────────────────────────────────
app.get("/api/doctors", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        d.*,
        u.phone,
        u.is_active,
        COUNT(DISTINCT r.patient_id) AS total_referrals
      FROM dietbyrd_doctors d
      LEFT JOIN dietbyrd_users u ON d.user_id = u.id
      LEFT JOIN dietbyrd_referrals r ON r.doctor_id = d.id
      GROUP BY d.id, u.phone, u.is_active
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
      `SELECT d.*, u.phone, u.is_active
       FROM dietbyrd_doctors d
       LEFT JOIN dietbyrd_users u ON d.user_id = u.id
       WHERE d.id = $1`,
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

// ─── Dieticians ───────────────────────────────────────────────────────────────
app.get("/api/dieticians", async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        rd.*,
        u.phone,
        u.is_active,
        COUNT(DISTINCT rp.patient_id) AS active_patients
      FROM dietbyrd_registered_dietitians rd
      LEFT JOIN dietbyrd_users u ON rd.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.assigned_rd_id = rd.id
      GROUP BY rd.id, u.phone, u.is_active
      ORDER BY rd.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
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

// ─── Referrals ────────────────────────────────────────────────────────────────
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
        p.gender
      FROM dietbyrd_referrals r
      LEFT JOIN dietbyrd_patients p ON r.patient_id = p.id
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
      patientId = existingPatient.rows[0].id;
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

    const referral = await query(
      `INSERT INTO dietbyrd_referrals (patient_id, doctor_id, source)
       VALUES ($1, $2, 'doctor_portal')
       RETURNING *`,
      [patientId, doctor_id]
    );

    // Generate registration token and send WhatsApp message
    let referralMessageStatus = { sent: false, reason: "not_attempted" };
    try {
      const tokenData = {
        patient_name,
        phone,
        diagnosis,
        diagnosis_description,
        doctor_id,
        doctor_name: doctor.name
      };
      
      const registrationToken = generateRegistrationToken(tokenData);
      const registrationLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/register?token=${registrationToken}`;

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

// Verify registration token
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

// ─── Phone Number Lookup (for doctor referral autocomplete) ───────────────────
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

// ─── Consultations ────────────────────────────────────────────────────────────
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

// ─── Plans ────────────────────────────────────────────────────────────────────
app.get("/api/plans", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM dietbyrd_plans WHERE is_active = true ORDER BY price ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Diet Plans ───────────────────────────────────────────────────────────────
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

// ─── Doctor Stats ─────────────────────────────────────────────────────────────
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
      `SELECT COALESCE(SUM(amount), 0) as total_commission
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

// ─── Doctor Assistants ────────────────────────────────────────────────────────
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
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, name, password, role, is_active)
       VALUES ($1, $2, $3, 'assistant', true)
       RETURNING id`,
      [phone, name, password]
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

// ─── Food Library ─────────────────────────────────────────────────────────────

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
      return res.status(404).json({ success: false, error: "Food item not found" });
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
        yield_factor, image_url, tags, food_type, dietitian_visibility, caution_level, notes,
        created_by_user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38
      ) RETURNING *`,
      [
        id, name_en, name_hi, category,
        calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0,
        iron || 0, calcium || 0, magnesium || 0, zinc || 0, potassium || 0, sodium || 0,
        phosphorus || 0, iodine || 0, selenium || 0, copper || 0,
        vitamin_a || 0, vitamin_b1 || 0, vitamin_b2 || 0, vitamin_b3 || 0, vitamin_b6 || 0,
        vitamin_b9 || 0, vitamin_b12 || 0, vitamin_c || 0, vitamin_d || 0, vitamin_e || 0, vitamin_k || 0,
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

// ─── Coupon Codes ─────────────────────────────────────────────────────────────

// Get all coupons
app.get("/api/coupons", async (req, res) => {
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

// Get single coupon
app.get("/api/coupons/:id", async (req, res) => {
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
          error: `Minimum purchase amount of ₹${coupon.min_purchase_amount} required` 
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

// Create coupon
app.post("/api/coupons", async (req, res) => {
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

// Update coupon
app.put("/api/coupons/:id", async (req, res) => {
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

// Delete coupon
app.delete("/api/coupons/:id", async (req, res) => {
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

// ─── Appointment Booking System ───────────────────────────────────────────────

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

    // Start transaction
    await query("BEGIN");
    
    try {
      // Deactivate all existing schedules for this dietician
      await query(
        `UPDATE dietbyrd_dietician_availability 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP 
         WHERE rd_id = $1`,
        [id]
      );
      
      // Insert new schedules
      for (const schedule of schedules) {
        await query(
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
      
      await query("COMMIT");
      
      // Return updated schedules
      const result = await query(
        `SELECT * FROM dietbyrd_dietician_availability 
         WHERE rd_id = $1 AND is_active = true 
         ORDER BY day_of_week, start_time`,
        [id]
      );
      
      res.json({ success: true, data: result.rows });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
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
        b => b.blocked_date_str === dateStr && !b.start_time
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
          if (bookedSlots.has(slotDatetime)) {
            slotMinutes += slotDuration;
            continue;
          }
          
          // Check if slot is in a blocked time range for this specific date
          const timeBlocked = blockedResult.rows.find(b => {
            if (b.blocked_date_str !== dateStr) return false;
            if (!b.start_time) return false;
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
          
          // Slot is available - send datetime as local string (no Z suffix = no UTC conversion)
          availableSlots.push({
            date: dateStr,
            start_time: slotTimeStr,
            datetime: slotDatetime,
            duration_minutes: slotDuration
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
    const { patient_id, rd_id, scheduled_at, consultation_type, patient_notes } = req.body;
    
    if (!patient_id || !rd_id || !scheduled_at) {
      return res.status(400).json({ 
        success: false, 
        error: "patient_id, rd_id, and scheduled_at are required" 
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
        `INSERT INTO dietbyrd_registered_patients (patient_id, assigned_rd_id)
         VALUES ($1, $2) RETURNING id`,
        [patient_id, rd_id]
      );
      registeredPatientId = newRegPatient.rows[0].id;
    } else {
      registeredPatientId = regPatientResult.rows[0].id;
    }
    
    // Check if slot is still available
    const existingResult = await query(
      `SELECT id FROM dietbyrd_consultations 
       WHERE rd_id = $1 
       AND scheduled_at = $2::timestamp 
       AND status NOT IN ('cancelled', 'no_show')`,
      [rd_id, scheduled_at]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: "This time slot is no longer available" 
      });
    }
    
    // Determine consultation type (first or returning)
    const previousConsultations = await query(
      `SELECT COUNT(*) as count FROM dietbyrd_consultations 
       WHERE registered_patient_id = $1 AND status = 'completed'`,
      [registeredPatientId]
    );
    const type = consultation_type || (previousConsultations.rows[0].count > 0 ? 'returning' : 'first');
    
    // Create the consultation
    const result = await query(
      `INSERT INTO dietbyrd_consultations 
       (registered_patient_id, rd_id, scheduled_at, consultation_type, status, booked_by_patient, patient_notes)
       VALUES ($1, $2, $3::timestamp, $4, 'scheduled', true, $5)
       RETURNING *`,
      [registeredPatientId, rd_id, scheduled_at, type, patient_notes || null]
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

// Get blocked slots for a dietician
app.get("/api/dieticians/:id/blocked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let sql = `SELECT * FROM dietbyrd_dietician_blocked_slots WHERE rd_id = $1`;
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

// ─── Dietician Appointments (Calendar View) ───────────────────────────────────

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

// ─── Consultation Packages & Razorpay Payments ────────────────────────────────

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Get all consultation packages
app.get("/api/consultation-packages", async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM dietbyrd_consultation_packages WHERE is_active = true ORDER BY num_consultations ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Razorpay payment order
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { patient_id, package_id, amount } = req.body;
    
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
    
    const pkg = pkgResult.rows[0];
    
    // Create or get Razorpay order
    let razorpayOrderId;
    
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      // Real Razorpay integration
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      });
      
      const order = await razorpay.orders.create({
        amount: pkg.price, // Amount in paise
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
    const paymentResult = await query(
      `INSERT INTO dietbyrd_razorpay_payments 
       (patient_id, razorpay_order_id, amount, currency, consultations_purchased, status)
       VALUES ($1, $2, $3, 'INR', $4, 'created')
       RETURNING *`,
      [patient_id, razorpayOrderId, pkg.price, pkg.num_consultations]
    );
    
    res.json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrderId,
        amount: pkg.price,
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

export default app;
