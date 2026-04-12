import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

// Database connection (lazy initialization for serverless)
let pool;
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
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

    // Find user by phone (now includes name)
    const userResult = await query(
      "SELECT id, phone, role, name, password, is_active FROM dietbyrd_users WHERE phone = $1",
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

    if (user.role === "doctor") {
      const doctorResult = await query(
        "SELECT id FROM dietbyrd_doctors WHERE user_id = $1",
        [user.id]
      );
      if (doctorResult.rows.length > 0) {
        profileId = doctorResult.rows[0].id;
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
      "SELECT id FROM dietbyrd_users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Phone number already registered" });
    }

    // Check if pending request exists
    const existingRequest = await query(
      "SELECT id FROM dietbyrd_join_requests WHERE phone = $1 AND status = 'pending'",
      [phone]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({ success: false, error: "A pending request already exists for this phone number" });
    }

    // Create join request
    const result = await query(
      `INSERT INTO dietbyrd_join_requests 
        (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, phone, name, requested_role, status, created_at`,
      [phone, password, name, role, qualification, clinic_name || null, clinic_address || null, specializations ? JSON.stringify(specializations) : null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        // Retry the insert
        const result = await query(
          `INSERT INTO dietbyrd_join_requests 
            (phone, password, name, requested_role, qualification, clinic_name, clinic_address, specializations, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
           RETURNING id, phone, name, requested_role, status, created_at`,
          [req.body.phone, req.body.password, req.body.name, req.body.role, req.body.qualification, req.body.clinic_name || null, req.body.clinic_address || null, req.body.specializations ? JSON.stringify(req.body.specializations) : null]
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
      // Reject the request
      await query(
        `UPDATE dietbyrd_join_requests 
         SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [reviewed_by || null, rejection_reason || null, id]
      );
      return res.json({ success: true, message: "Request rejected" });
    }

    // Approve: Create the user and profile
    const userResult = await query(
      `INSERT INTO dietbyrd_users (phone, password, role, name, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [joinRequest.phone, joinRequest.password, joinRequest.requested_role, joinRequest.name]
    );
    const userId = userResult.rows[0].id;

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

    res.json({ success: true, message: `${joinRequest.requested_role === "doctor" ? "Doctor" : "Dietician"} account created successfully` });
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
        rd.name AS assigned_dietician_name
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      LEFT JOIN dietbyrd_registered_dietitians rd ON rp.assigned_rd_id = rd.id
      ORDER BY p.created_at DESC
      LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/patients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        p.*,
        u.phone AS user_phone,
        rp.dietary_preference,
        rp.food_restrictions
      FROM dietbyrd_patients p
      LEFT JOIN dietbyrd_users u ON p.user_id = u.id
      LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id
      WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
    res.json({ success: true, data: result.rows[0] });
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

app.patch("/api/patients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, gender, diagnosis, diagnosis_description } = req.body;
    const result = await query(
      `UPDATE dietbyrd_patients
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           diagnosis = COALESCE($4, diagnosis),
           diagnosis_description = COALESCE($5, diagnosis_description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, age, gender, diagnosis, diagnosis_description, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Patient not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign dietician to patient
app.post("/api/patients/:id/assign-dietician", async (req, res) => {
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

app.post("/api/referrals", async (req, res) => {
  try {
    const { patient_name, phone, diagnosis, diagnosis_description, doctor_id } = req.body;
    if (!phone || !doctor_id) {
      return res.status(400).json({ success: false, error: "phone and doctor_id are required" });
    }

    let patientId;
    const existingPatient = await query(`SELECT id FROM dietbyrd_patients WHERE phone = $1`, [phone]);

    if (existingPatient.rows.length > 0) {
      patientId = existingPatient.rows[0].id;
    } else {
      const newPatient = await query(
        `INSERT INTO dietbyrd_patients (name, phone, diagnosis, diagnosis_description, referral_source)
         VALUES ($1, $2, $3, $4, 'doctor')
         RETURNING id`,
        [patient_name, phone, diagnosis, diagnosis_description]
      );
      patientId = newPatient.rows[0].id;
    }

    const referral = await query(
      `INSERT INTO dietbyrd_referrals (patient_id, doctor_id, source)
       VALUES ($1, $2, 'doctor_portal')
       RETURNING *`,
      [patientId, doctor_id]
    );

    res.status(201).json({ success: true, data: referral.rows[0], patient_id: patientId });
  } catch (err) {
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
app.get("/api/patients/:id/diet-plans", async (req, res) => {
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

export default app;
