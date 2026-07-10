-- ============================================================================
-- DietbyRD Complete Database Schema (PostgreSQL)
-- All tables prefixed with dietbyrd_
-- Generated: May 2026
-- ============================================================================

-- ============================================
-- DROP EXISTING TABLES (in reverse dependency order)
-- ============================================

DROP TABLE IF EXISTS dietbyrd_audit_log CASCADE;
DROP TABLE IF EXISTS dietbyrd_notifications CASCADE;
DROP TABLE IF EXISTS dietbyrd_whatsapp_messages CASCADE;
DROP TABLE IF EXISTS dietbyrd_patient_logs CASCADE;
DROP TABLE IF EXISTS dietbyrd_documents CASCADE;
DROP TABLE IF EXISTS dietbyrd_doctor_earnings CASCADE;
DROP TABLE IF EXISTS dietbyrd_refunds CASCADE;
DROP TABLE IF EXISTS dietbyrd_payouts CASCADE;
DROP TABLE IF EXISTS dietbyrd_payments CASCADE;
DROP TABLE IF EXISTS dietbyrd_coupon_usage CASCADE;
DROP TABLE IF EXISTS dietbyrd_coupon_codes CASCADE;
DROP TABLE IF EXISTS dietbyrd_food_library CASCADE;
DROP TABLE IF EXISTS dietbyrd_food_database CASCADE;
DROP TABLE IF EXISTS dietbyrd_diet_plans CASCADE;
DROP TABLE IF EXISTS dietbyrd_consultation_notes CASCADE;
DROP TABLE IF EXISTS dietbyrd_consultations CASCADE;
DROP TABLE IF EXISTS dietbyrd_dietician_blocked_slots CASCADE;
DROP TABLE IF EXISTS dietbyrd_dietician_availability CASCADE;
DROP TABLE IF EXISTS dietbyrd_referrals CASCADE;
DROP TABLE IF EXISTS dietbyrd_subscriptions CASCADE;
DROP TABLE IF EXISTS dietbyrd_registered_patients CASCADE;
DROP TABLE IF EXISTS dietbyrd_plans CASCADE;
DROP TABLE IF EXISTS dietbyrd_patients CASCADE;
DROP TABLE IF EXISTS dietbyrd_join_requests CASCADE;
DROP TABLE IF EXISTS dietbyrd_staff CASCADE;
DROP TABLE IF EXISTS dietbyrd_registered_dietitians CASCADE;
DROP TABLE IF EXISTS dietbyrd_assistants CASCADE;
DROP TABLE IF EXISTS dietbyrd_doctors CASCADE;
DROP TABLE IF EXISTS dietbyrd_users CASCADE;

-- ============================================
-- DROP EXISTING ENUM TYPES
-- ============================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS diagnosis_type CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS referral_source_type CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;
DROP TYPE IF EXISTS dietary_preference_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS cancellation_reason_type CASCADE;
DROP TYPE IF EXISTS referral_source CASCADE;
DROP TYPE IF EXISTS consultation_type CASCADE;
DROP TYPE IF EXISTS consultation_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payout_status CASCADE;
DROP TYPE IF EXISTS refund_type CASCADE;
DROP TYPE IF EXISTS refund_status CASCADE;
DROP TYPE IF EXISTS earnings_payout_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS whatsapp_message_type CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
DROP TYPE IF EXISTS audit_action_category CASCADE;
DROP TYPE IF EXISTS join_request_status CASCADE;
DROP TYPE IF EXISTS join_request_role CASCADE;
DROP TYPE IF EXISTS food_type CASCADE;
DROP TYPE IF EXISTS caution_level CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM (
    'doctor', 'assistant', 'patient', 'rd', 
    'mlt_intern', 'support_intern', 'ops_manager', 'founder', 'tech_lead'
);

CREATE TYPE diagnosis_type AS ENUM (
    'diabetes', 'pcos', 'thyroid', 'hypertension', 'obesity', 'other'
);

CREATE TYPE staff_role AS ENUM (
    'mlt_intern', 'support_intern', 'senior_intern', 'ops_manager', 'founder', 'tech_lead'
);

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

CREATE TYPE referral_source_type AS ENUM (
    'doctor', 'assistant', 'missed_call', 'inbound_whatsapp', 'content'
);

CREATE TYPE plan_type AS ENUM ('by_days', 'by_consultations');

CREATE TYPE dietary_preference_type AS ENUM (
    'vegetarian', 'non_vegetarian', 'vegan', 'eggetarian'
);

CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

CREATE TYPE cancellation_reason_type AS ENUM (
    'too_expensive', 'no_time', 'goal_achieved', 'switching_service', 'other'
);

CREATE TYPE referral_source AS ENUM ('doctor_portal', 'assistant_portal', 'missed_call');

CREATE TYPE consultation_type AS ENUM ('first', 'returning');

CREATE TYPE consultation_status AS ENUM (
    'scheduled', 'confirmed', 'documents_pending', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE payment_type AS ENUM ('initial', 'autopay', 'retry', 'manual');

CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE refund_type AS ENUM ('full', 'partial');

CREATE TYPE refund_status AS ENUM ('pending', 'processed', 'failed');

CREATE TYPE earnings_payout_status AS ENUM ('pending', 'processing', 'paid');

CREATE TYPE document_type AS ENUM ('blood_report', 'prescription', 'other');

CREATE TYPE whatsapp_message_type AS ENUM (
    'consent_payment', 'payment_confirmation', 'document_request', 
    'consultation_reminder', 'followup', 'rebooking', 
    'subscription_renewal', 'cancellation', 'payment_retry'
);

CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

CREATE TYPE audit_action_category AS ENUM (
    'consent', 'login', 'note_edit', 'payment', 'booking', 
    'data_export', 'deletion', 'refund', 'assignment'
);

CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE join_request_role AS ENUM ('doctor', 'rd');

CREATE TYPE food_type AS ENUM ('CORE', 'PREPARED', 'TREAT');

CREATE TYPE caution_level AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

CREATE TABLE dietbyrd_users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(100) NULL,
    password VARCHAR(255) NULL,
    role user_role NOT NULL,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_users IS 'Base authentication table for all system users';
COMMENT ON COLUMN dietbyrd_users.phone IS 'Phone number used as login identifier';
COMMENT ON COLUMN dietbyrd_users.is_verified IS 'For doctors/RDs - false until admin approves join request';

-- ============================================
-- 2. DOCTORS & ASSISTANTS
-- ============================================

CREATE TABLE dietbyrd_doctors (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    clinic_name VARCHAR(150) NULL,
    clinic_address TEXT NULL,
    default_diagnosis diagnosis_type DEFAULT 'diabetes',
    missed_call_number VARCHAR(15) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_doctors IS 'Partner doctors who refer patients';
COMMENT ON COLUMN dietbyrd_doctors.missed_call_number IS 'Unique virtual number for missed-call referrals';

CREATE TABLE dietbyrd_assistants (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    doctor_id INT NOT NULL REFERENCES dietbyrd_doctors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_assistants IS 'Clinic assistants linked to doctors';

-- ============================================
-- 3. REGISTERED DIETITIANS & STAFF
-- ============================================

CREATE TABLE dietbyrd_registered_dietitians (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    qualification VARCHAR(150) NOT NULL,
    specializations JSONB NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_registered_dietitians IS 'RDs who conduct consultations';
COMMENT ON COLUMN dietbyrd_registered_dietitians.specializations IS 'JSON array of specialization areas';

CREATE TABLE dietbyrd_staff (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    role staff_role NOT NULL,
    permissions JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_staff IS 'MLT interns, Support interns, Ops Manager, etc.';
COMMENT ON COLUMN dietbyrd_staff.permissions IS 'Role-specific permissions override';

-- ============================================
-- 4. JOIN REQUESTS
-- ============================================

CREATE TABLE dietbyrd_join_requests (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    requested_role VARCHAR(20) NOT NULL CHECK (requested_role IN ('doctor', 'rd')),
    qualification VARCHAR(150) NULL,
    clinic_name VARCHAR(150) NULL,
    clinic_address TEXT NULL,
    specializations JSONB NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'interview_sent', 'approved', 'rejected')),
    reviewed_by INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    user_id INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_join_requests IS 'Applications from doctors/RDs wanting to join the platform';

-- ============================================
-- 5. PATIENTS
-- ============================================

CREATE TABLE dietbyrd_patients (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    name VARCHAR(100) NULL,
    phone VARCHAR(15) NOT NULL,
    age INT NULL,
    gender gender_type NULL,
    diagnosis diagnosis_type NULL,
    diagnosis_description TEXT NULL,
    allergies JSONB NULL,
    referral_source referral_source_type NOT NULL,
    payment_link_sent_at TIMESTAMP NULL,
    -- Additional patient attributes
    height DECIMAL(5,2) NULL,                    -- Height in cm
    weight DECIMAL(5,2) NULL,                    -- Weight in kg
    workout_frequency INT NULL CHECK (workout_frequency >= 0 AND workout_frequency <= 7),  -- 0-7 times per week
    patient_messages JSONB DEFAULT '[]'::jsonb,  -- Array of message history
    improvement_score SMALLINT NULL CHECK (improvement_score >= 1 AND improvement_score <= 10),
    improvement_updated_by INT NULL REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    improvement_updated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_patients IS 'Pre-payment patient records (in consent buffer until payment)';
COMMENT ON COLUMN dietbyrd_patients.allergies IS 'JSON array of patient allergies';
COMMENT ON COLUMN dietbyrd_patients.patient_messages IS 'JSON array of SMS/WhatsApp messages sent to patient';

-- ============================================
-- 6. SUBSCRIPTION PLANS
-- ============================================

CREATE TABLE dietbyrd_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plan_type plan_type NOT NULL,
    duration_days INT NULL,
    num_consultations INT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_autopay BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_plans IS 'Available subscription offerings';
COMMENT ON COLUMN dietbyrd_plans.duration_days IS 'Number of days (if by_days plan type)';
COMMENT ON COLUMN dietbyrd_plans.num_consultations IS 'Number of consultations (if by_consultations plan type)';

-- ============================================
-- 7. REGISTERED PATIENTS (Post-payment)
-- ============================================

CREATE TABLE dietbyrd_registered_patients (
    id SERIAL PRIMARY KEY,
    patient_id INT UNIQUE NOT NULL REFERENCES dietbyrd_patients(id) ON DELETE CASCADE,
    subscription_id INT NULL,  -- FK added after subscriptions table
    assigned_rd_id INT REFERENCES dietbyrd_registered_dietitians(id) ON DELETE SET NULL,
    city VARCHAR(100) NULL,
    state_region VARCHAR(100) NULL,
    dietary_preference dietary_preference_type NULL,
    food_restrictions JSONB NULL,
    health_goal TEXT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_registered_patients IS 'Post-payment patients with active subscriptions';
COMMENT ON COLUMN dietbyrd_registered_patients.state_region IS 'State/region for cultural food profile';
COMMENT ON COLUMN dietbyrd_registered_patients.food_restrictions IS 'JSON array of restrictions (gluten-free, dairy-free, etc.)';
COMMENT ON COLUMN dietbyrd_registered_patients.is_recurring IS 'Has completed 2+ months';

-- ============================================
-- 8. SUBSCRIPTIONS
-- ============================================

CREATE TABLE dietbyrd_subscriptions (
    id SERIAL PRIMARY KEY,
    registered_patient_id INT NOT NULL REFERENCES dietbyrd_registered_patients(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES dietbyrd_plans(id) ON DELETE RESTRICT,
    status subscription_status DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE NULL,
    next_billing_date DATE NULL,
    autopay_mandate_id VARCHAR(100) NULL,
    consultations_used INT DEFAULT 0,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason cancellation_reason_type NULL,
    cancellation_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_subscriptions IS 'Patient subscriptions linking to plans';
COMMENT ON COLUMN dietbyrd_subscriptions.autopay_mandate_id IS 'Payment gateway mandate reference';

-- Add subscription_id FK to registered_patients
ALTER TABLE dietbyrd_registered_patients
ADD CONSTRAINT fk_registered_patients_subscription
FOREIGN KEY (subscription_id) REFERENCES dietbyrd_subscriptions(id) ON DELETE SET NULL;

-- ============================================
-- 9. REFERRALS
-- ============================================

CREATE TABLE dietbyrd_referrals (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES dietbyrd_patients(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES dietbyrd_doctors(id) ON DELETE CASCADE,
    assistant_id INT REFERENCES dietbyrd_assistants(id) ON DELETE SET NULL,
    source referral_source NOT NULL,
    notes TEXT NULL,
    referred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_referrals IS 'Tracks who referred whom (for earnings calculation)';

-- ============================================
-- 10. DIETICIAN AVAILABILITY & SCHEDULING
-- ============================================

CREATE TABLE dietbyrd_dietician_availability (
    id SERIAL PRIMARY KEY,
    rd_id INT NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    UNIQUE(rd_id, day_of_week, start_time)
);

COMMENT ON TABLE dietbyrd_dietician_availability IS 'Recurring weekly availability slots for each dietician';

CREATE TABLE dietbyrd_dietician_blocked_slots (
    id SERIAL PRIMARY KEY,
    rd_id INT NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    start_time TIME NULL,  -- NULL means entire day is blocked
    end_time TIME NULL,    -- NULL means entire day is blocked
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rd_id, blocked_date, start_time)
);

COMMENT ON TABLE dietbyrd_dietician_blocked_slots IS 'Specific dates when dietician is unavailable (holidays, leave, etc.)';

-- ============================================
-- 11. CONSULTATIONS
-- ============================================

CREATE TABLE dietbyrd_consultations (
    id SERIAL PRIMARY KEY,
    registered_patient_id INT NOT NULL REFERENCES dietbyrd_registered_patients(id) ON DELETE CASCADE,
    rd_id INT NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE RESTRICT,
    scheduled_at TIMESTAMP NOT NULL,
    consultation_type consultation_type NOT NULL,
    status consultation_status DEFAULT 'scheduled',
    completed_at TIMESTAMP NULL,
    notes_locked BOOLEAN DEFAULT FALSE,
    notes_locked_at TIMESTAMP NULL,
    notes_unlocked_by INT REFERENCES dietbyrd_staff(id) ON DELETE SET NULL,
    meeting_link VARCHAR(500) NULL,
    -- Appointment booking fields
    booked_by_patient BOOLEAN DEFAULT FALSE,
    patient_notes TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    cancelled_by VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_consultations IS 'Scheduled appointments between patients and RDs';
COMMENT ON COLUMN dietbyrd_consultations.booked_by_patient IS 'True if patient-initiated booking';

CREATE TABLE dietbyrd_consultation_notes (
    id SERIAL PRIMARY KEY,
    consultation_id INT NOT NULL REFERENCES dietbyrd_consultations(id) ON DELETE CASCADE,
    rd_id INT NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE RESTRICT,
    notes_content TEXT NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_consultation_notes IS 'Versioned clinical notes (append-only for history)';

-- ============================================
-- 12. DIET PLANS
-- ============================================

CREATE TABLE dietbyrd_diet_plans (
    id SERIAL PRIMARY KEY,
    registered_patient_id INT NOT NULL REFERENCES dietbyrd_registered_patients(id) ON DELETE CASCADE,
    rd_id INT NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE RESTRICT,
    consultation_id INT REFERENCES dietbyrd_consultations(id) ON DELETE SET NULL,
    plan_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    sent_to_portal BOOLEAN DEFAULT FALSE,
    sent_to_doctor BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    total_view_time_seconds INT DEFAULT 0,
    pdf_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_diet_plans IS 'Diet plans issued to patients (stores complete plan as JSON)';
COMMENT ON COLUMN dietbyrd_diet_plans.plan_json IS 'Complete diet plan structure with meals, targets, etc.';

-- ============================================
-- 13. FOOD DATABASE (Legacy)
-- ============================================

CREATE TABLE dietbyrd_food_database (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    calories DECIMAL(8,2) NULL,
    protein DECIMAL(8,2) NULL,
    carbohydrates DECIMAL(8,2) NULL,
    fibre DECIMAL(8,2) NULL,
    fat DECIMAL(8,2) NULL,
    saturated_fat DECIMAL(8,2) NULL,
    sodium DECIMAL(8,2) NULL,
    glycaemic_index INT NULL,
    state_region VARCHAR(100) NULL,
    is_fodmap_friendly BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_dairy_free BOOLEAN DEFAULT FALSE,
    is_diabetic_friendly BOOLEAN DEFAULT FALSE,
    is_high_protein BOOLEAN DEFAULT FALSE,
    is_low_sodium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_food_database IS 'Indian clinical food database with ICMR values (legacy)';

-- ============================================
-- 14. FOOD LIBRARY (Enhanced)
-- ============================================

CREATE TABLE dietbyrd_food_library (
    id VARCHAR(50) PRIMARY KEY,
    name_en VARCHAR(200) NOT NULL,
    name_hi VARCHAR(200) NULL,
    category VARCHAR(100) NOT NULL,
    
    -- Macronutrients (per 100g/100ml)
    calories DECIMAL(10, 2) DEFAULT 0,
    protein DECIMAL(10, 2) DEFAULT 0,
    carbs DECIMAL(10, 2) DEFAULT 0,
    fat DECIMAL(10, 2) DEFAULT 0,
    fiber DECIMAL(10, 2) DEFAULT 0,
    
    -- Minerals (mg per 100g)
    iron DECIMAL(10, 2) DEFAULT 0,
    calcium DECIMAL(10, 2) DEFAULT 0,
    magnesium DECIMAL(10, 2) DEFAULT 0,
    zinc DECIMAL(10, 2) DEFAULT 0,
    potassium DECIMAL(10, 2) DEFAULT 0,
    sodium DECIMAL(10, 2) DEFAULT 0,
    phosphorus DECIMAL(10, 2) DEFAULT 0,
    iodine DECIMAL(10, 2) DEFAULT 0,
    selenium DECIMAL(10, 2) DEFAULT 0,
    copper DECIMAL(10, 2) DEFAULT 0,
    
    -- Vitamins
    vitamin_a DECIMAL(10, 2) DEFAULT 0,      -- mcg RAE
    vitamin_b1 DECIMAL(10, 2) DEFAULT 0,     -- mg (Thiamine)
    vitamin_b2 DECIMAL(10, 2) DEFAULT 0,     -- mg (Riboflavin)
    vitamin_b3 DECIMAL(10, 2) DEFAULT 0,     -- mg (Niacin)
    vitamin_b6 DECIMAL(10, 2) DEFAULT 0,     -- mg
    vitamin_b9 DECIMAL(10, 2) DEFAULT 0,     -- mcg (Folate)
    vitamin_b12 DECIMAL(10, 2) DEFAULT 0,    -- mcg
    vitamin_c DECIMAL(10, 2) DEFAULT 0,      -- mg
    vitamin_d DECIMAL(10, 2) DEFAULT 0,      -- mcg
    vitamin_e DECIMAL(10, 2) DEFAULT 0,      -- mg
    vitamin_k DECIMAL(10, 2) DEFAULT 0,      -- mcg
    
    -- Modulators / Anti-nutrients
    oxalate_eee DECIMAL(8, 2) DEFAULT 0,     -- Oxalate EEE value
    phytate_eee DECIMAL(8, 2) DEFAULT 0,     -- Phytate EEE value
    
    -- Additional attributes
    yield_factor DECIMAL(5, 2) DEFAULT 1.0,
    image_url TEXT NULL,
    tags TEXT[] NULL,
    food_type VARCHAR(20) DEFAULT 'CORE' CHECK (food_type IN ('CORE', 'PREPARED', 'TREAT')),
    dietitian_visibility BOOLEAN DEFAULT TRUE,
    caution_level VARCHAR(20) DEFAULT 'NONE' CHECK (caution_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH')),
    notes TEXT NULL,
    
    -- Metadata
    created_by_user_id INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_food_library IS 'Enhanced food library with comprehensive nutritional data';
COMMENT ON COLUMN dietbyrd_food_library.yield_factor IS 'Cooking yield factor (1.0 = no change)';
COMMENT ON COLUMN dietbyrd_food_library.oxalate_eee IS 'Oxalate Estimated Equivalent Excretion value';
COMMENT ON COLUMN dietbyrd_food_library.phytate_eee IS 'Phytate Estimated Equivalent Excretion value';

-- ============================================
-- 15. COUPON CODES
-- ============================================

CREATE TABLE dietbyrd_coupon_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2) NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    usage_limit INT NULL,
    usage_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_plans JSONB NULL,  -- JSON array of plan IDs or plan types
    notes TEXT NULL,
    created_by_user_id INT REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_coupon_codes IS 'Discount coupon codes for subscriptions';

CREATE TABLE dietbyrd_coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INT NOT NULL REFERENCES dietbyrd_coupon_codes(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
    patient_id INT REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
    subscription_id INT REFERENCES dietbyrd_subscriptions(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    order_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_coupon_usage IS 'Tracks coupon usage by users';

-- ============================================
-- 16. PAYMENTS
-- ============================================

CREATE TABLE dietbyrd_payments (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
    registered_patient_id INT REFERENCES dietbyrd_registered_patients(id) ON DELETE SET NULL,
    subscription_id INT REFERENCES dietbyrd_subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_type payment_type NOT NULL,
    status payment_status DEFAULT 'pending',
    gateway_transaction_id VARCHAR(100) NULL,
    gateway_order_id VARCHAR(100) NULL,
    failure_reason VARCHAR(255) NULL,
    retry_count INT DEFAULT 0,
    retry_scheduled_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_payments IS 'All payment transactions';

CREATE TABLE dietbyrd_payouts (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES dietbyrd_doctors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    month DATE NOT NULL,
    status payout_status DEFAULT 'pending',
    transaction_reference VARCHAR(100) NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_payouts IS 'Doctor payout history';

CREATE TABLE dietbyrd_refunds (
    id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL REFERENCES dietbyrd_payments(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    refund_type refund_type NOT NULL,
    reason TEXT NULL,
    processed_by INT NOT NULL REFERENCES dietbyrd_staff(id) ON DELETE RESTRICT,
    gateway_refund_id VARCHAR(100) NULL,
    status refund_status DEFAULT 'pending',
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_refunds IS 'Refund records';

CREATE TABLE dietbyrd_doctor_earnings (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES dietbyrd_doctors(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_referrals INT DEFAULT 0,
    converted_referrals INT DEFAULT 0,
    total_consultations INT DEFAULT 0,
    earnings_amount DECIMAL(10,2) DEFAULT 0,
    payout_status earnings_payout_status DEFAULT 'pending',
    payout_id INT REFERENCES dietbyrd_payouts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_doctor_earnings IS 'Monthly earnings per doctor';

-- ============================================
-- 17. DOCUMENTS
-- ============================================

CREATE TABLE dietbyrd_documents (
    id SERIAL PRIMARY KEY,
    registered_patient_id INT NOT NULL REFERENCES dietbyrd_registered_patients(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT NULL,
    secure_upload_link VARCHAR(500) NULL,
    upload_link_expires_at TIMESTAMP NULL,
    uploaded_at TIMESTAMP NULL,
    verified_by_mlt_id INT REFERENCES dietbyrd_staff(id) ON DELETE SET NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_documents IS 'Uploaded patient reports/documents';
COMMENT ON COLUMN dietbyrd_documents.secure_upload_link IS 'Temporary 72hr upload link';

-- ============================================
-- 18. PATIENT LOGS
-- ============================================

CREATE TABLE dietbyrd_patient_logs (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
    registered_patient_id INT REFERENCES dietbyrd_registered_patients(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    screen VARCHAR(100) NULL,
    metadata JSONB NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_patient_logs IS 'Activity tracking for patients';

-- ============================================
-- 19. COMMUNICATIONS
-- ============================================

CREATE TABLE dietbyrd_whatsapp_messages (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
    registered_patient_id INT REFERENCES dietbyrd_registered_patients(id) ON DELETE SET NULL,
    phone VARCHAR(15) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    message_type whatsapp_message_type NOT NULL,
    status message_status DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    failure_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_whatsapp_messages IS 'WhatsApp message log';

CREATE TABLE dietbyrd_notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_notifications IS 'Push notifications log';

-- ============================================
-- 20. AUDIT & COMPLIANCE
-- ============================================

CREATE TABLE dietbyrd_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    action_category audit_action_category NOT NULL,
    actor_user_id INT NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id INT NULL,
    metadata JSONB NULL,
    ip_address VARCHAR(45) NULL,
    prev_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dietbyrd_audit_log IS 'Append-only audit log with hash chain (DPDPA compliance). NO UPDATE or DELETE permitted.';

-- ============================================
-- 21. INDEXES
-- ============================================

-- Users & Authentication
CREATE INDEX idx_dietbyrd_users_phone ON dietbyrd_users(phone);
CREATE INDEX idx_dietbyrd_users_role ON dietbyrd_users(role);

-- Doctors & Assistants
CREATE INDEX idx_dietbyrd_doctors_missed_call ON dietbyrd_doctors(missed_call_number);
CREATE INDEX idx_dietbyrd_doctors_verified ON dietbyrd_doctors(is_verified);
CREATE INDEX idx_dietbyrd_assistants_doctor ON dietbyrd_assistants(doctor_id);

-- Patients
CREATE INDEX idx_dietbyrd_patients_phone ON dietbyrd_patients(phone);
CREATE INDEX idx_dietbyrd_patients_referral_source ON dietbyrd_patients(referral_source);

-- Registered Patients
CREATE INDEX idx_dietbyrd_registered_patients_rd ON dietbyrd_registered_patients(assigned_rd_id);

-- Subscriptions
CREATE INDEX idx_dietbyrd_subscriptions_status ON dietbyrd_subscriptions(status);
CREATE INDEX idx_dietbyrd_subscriptions_billing ON dietbyrd_subscriptions(next_billing_date);
CREATE INDEX idx_dietbyrd_subscriptions_patient ON dietbyrd_subscriptions(registered_patient_id);

-- Referrals
CREATE INDEX idx_dietbyrd_referrals_doctor ON dietbyrd_referrals(doctor_id);
CREATE INDEX idx_dietbyrd_referrals_patient ON dietbyrd_referrals(patient_id);
CREATE INDEX idx_dietbyrd_referrals_date ON dietbyrd_referrals(referred_at);

-- Dietician Availability
CREATE INDEX idx_dietician_availability_rd_id ON dietbyrd_dietician_availability(rd_id);
CREATE INDEX idx_dietician_availability_day ON dietbyrd_dietician_availability(day_of_week);
CREATE INDEX idx_blocked_slots_rd_date ON dietbyrd_dietician_blocked_slots(rd_id, blocked_date);

-- Consultations
CREATE INDEX idx_dietbyrd_consultations_rd_date ON dietbyrd_consultations(rd_id, scheduled_at);
CREATE INDEX idx_dietbyrd_consultations_patient ON dietbyrd_consultations(registered_patient_id);
CREATE INDEX idx_dietbyrd_consultations_status ON dietbyrd_consultations(status);
CREATE INDEX idx_dietbyrd_consultations_scheduled ON dietbyrd_consultations(scheduled_at);

-- Diet Plans
CREATE INDEX idx_dietbyrd_diet_plans_patient ON dietbyrd_diet_plans(registered_patient_id);
CREATE INDEX idx_dietbyrd_diet_plans_active ON dietbyrd_diet_plans(is_active);
CREATE INDEX idx_dietbyrd_diet_plans_rd ON dietbyrd_diet_plans(rd_id);

-- Food Library
CREATE INDEX idx_food_library_category ON dietbyrd_food_library(category);
CREATE INDEX idx_food_library_type ON dietbyrd_food_library(food_type);
CREATE INDEX idx_food_library_created_by ON dietbyrd_food_library(created_by_user_id);
CREATE INDEX idx_food_library_name_en ON dietbyrd_food_library(name_en);

-- Food Database (Legacy)
CREATE INDEX idx_dietbyrd_food_region ON dietbyrd_food_database(state_region);
CREATE INDEX idx_dietbyrd_food_category ON dietbyrd_food_database(category);

-- Coupon Codes
CREATE INDEX idx_coupon_code ON dietbyrd_coupon_codes(code);
CREATE INDEX idx_coupon_active ON dietbyrd_coupon_codes(is_active);
CREATE INDEX idx_coupon_validity ON dietbyrd_coupon_codes(valid_from, valid_until);
CREATE INDEX idx_coupon_usage_coupon ON dietbyrd_coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON dietbyrd_coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_date ON dietbyrd_coupon_usage(used_at);

-- Payments
CREATE INDEX idx_dietbyrd_payments_status ON dietbyrd_payments(status);
CREATE INDEX idx_dietbyrd_payments_patient ON dietbyrd_payments(registered_patient_id);
CREATE INDEX idx_dietbyrd_payments_patient_id ON dietbyrd_payments(patient_id);
CREATE INDEX idx_dietbyrd_payments_created ON dietbyrd_payments(created_at DESC);

-- Patient Logs
CREATE INDEX idx_dietbyrd_patient_logs_patient ON dietbyrd_patient_logs(patient_id);
CREATE INDEX idx_dietbyrd_patient_logs_registered ON dietbyrd_patient_logs(registered_patient_id);
CREATE INDEX idx_dietbyrd_patient_logs_created ON dietbyrd_patient_logs(created_at);

-- Audit Log
CREATE INDEX idx_dietbyrd_audit_actor ON dietbyrd_audit_log(actor_user_id);
CREATE INDEX idx_dietbyrd_audit_target ON dietbyrd_audit_log(target_type, target_id);
CREATE INDEX idx_dietbyrd_audit_created ON dietbyrd_audit_log(created_at);
CREATE INDEX idx_dietbyrd_audit_category ON dietbyrd_audit_log(action_category);

-- Join Requests
CREATE INDEX idx_join_requests_phone ON dietbyrd_join_requests(phone);
CREATE INDEX idx_join_requests_status ON dietbyrd_join_requests(status);

-- ============================================
-- 22. UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================
-- 23. APPLY TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_dietbyrd_users_updated_at 
    BEFORE UPDATE ON dietbyrd_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_doctors_updated_at 
    BEFORE UPDATE ON dietbyrd_doctors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_assistants_updated_at 
    BEFORE UPDATE ON dietbyrd_assistants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_registered_dietitians_updated_at 
    BEFORE UPDATE ON dietbyrd_registered_dietitians 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_staff_updated_at 
    BEFORE UPDATE ON dietbyrd_staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_join_requests_updated_at 
    BEFORE UPDATE ON dietbyrd_join_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_patients_updated_at 
    BEFORE UPDATE ON dietbyrd_patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_plans_updated_at 
    BEFORE UPDATE ON dietbyrd_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_registered_patients_updated_at 
    BEFORE UPDATE ON dietbyrd_registered_patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_subscriptions_updated_at 
    BEFORE UPDATE ON dietbyrd_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_dietician_availability_updated_at 
    BEFORE UPDATE ON dietbyrd_dietician_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_consultations_updated_at 
    BEFORE UPDATE ON dietbyrd_consultations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_diet_plans_updated_at 
    BEFORE UPDATE ON dietbyrd_diet_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_food_database_updated_at 
    BEFORE UPDATE ON dietbyrd_food_database 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_food_library_updated_at 
    BEFORE UPDATE ON dietbyrd_food_library 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_coupon_codes_updated_at 
    BEFORE UPDATE ON dietbyrd_coupon_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_payments_updated_at 
    BEFORE UPDATE ON dietbyrd_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietbyrd_doctor_earnings_updated_at 
    BEFORE UPDATE ON dietbyrd_doctor_earnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- Summary of Tables Created:
-- 1.  dietbyrd_users                    - User authentication
-- 2.  dietbyrd_doctors                  - Partner doctors
-- 3.  dietbyrd_assistants               - Clinic assistants
-- 4.  dietbyrd_registered_dietitians    - RDs/Dieticians
-- 5.  dietbyrd_staff                    - Internal staff
-- 6.  dietbyrd_join_requests            - Doctor/RD applications
-- 7.  dietbyrd_patients                 - Pre-payment patients
-- 8.  dietbyrd_registered_patients      - Post-payment patients
-- 9.  dietbyrd_plans                    - Subscription plans
-- 10. dietbyrd_subscriptions            - Patient subscriptions
-- 11. dietbyrd_referrals                - Doctor referrals
-- 12. dietbyrd_dietician_availability   - Weekly availability
-- 13. dietbyrd_dietician_blocked_slots  - Blocked/unavailable slots
-- 14. dietbyrd_consultations            - Appointments
-- 15. dietbyrd_consultation_notes       - Clinical notes
-- 16. dietbyrd_diet_plans               - Diet plans
-- 17. dietbyrd_food_database            - Legacy food database
-- 18. dietbyrd_food_library             - Enhanced food library
-- 19. dietbyrd_coupon_codes             - Discount coupons
-- 20. dietbyrd_coupon_usage             - Coupon usage tracking
-- 21. dietbyrd_payments                 - Payment transactions
-- 22. dietbyrd_payouts                  - Doctor payouts
-- 23. dietbyrd_refunds                  - Refund records
-- 24. dietbyrd_doctor_earnings          - Monthly earnings
-- 25. dietbyrd_documents                - Patient documents
-- 26. dietbyrd_patient_logs             - Activity logs
-- 27. dietbyrd_whatsapp_messages        - WhatsApp messages
-- 28. dietbyrd_notifications            - Push notifications
-- 29. dietbyrd_audit_log                - Audit trail (DPDPA)
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   S E S S I O N S   A N D   C O N S E N T 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 C R E A T E   T A B L E   d i e t b y r d _ u s e r _ s e s s i o n s   ( 
     i d   S E R I A L   P R I M A R Y   K E Y , 
     u s e r _ i d   I N T E G E R   N O T   N U L L   R E F E R E N C E S   d i e t b y r d _ u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
     s e s s i o n _ t o k e n   U U I D   N O T   N U L L   U N I Q U E , 
     d e v i c e _ f i n g e r p r i n t   V A R C H A R ( 2 5 5 )   N U L L , 
     i p _ a d d r e s s   V A R C H A R ( 4 5 )   N U L L , 
     e x p i r e s _ a t   T I M E S T A M P   N O T   N U L L , 
     i s _ a c t i v e   B O O L E A N   D E F A U L T   T R U E , 
     c r e a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P 
 ) ; 
 
 C R E A T E   I N D E X   i d x _ d i e t b y r d _ s e s s i o n s _ t o k e n   O N   d i e t b y r d _ u s e r _ s e s s i o n s ( s e s s i o n _ t o k e n ) ; 
 C R E A T E   I N D E X   i d x _ d i e t b y r d _ s e s s i o n s _ u s e r   O N   d i e t b y r d _ u s e r _ s e s s i o n s ( u s e r _ i d ) ; 
 
 C R E A T E   T A B L E   d i e t b y r d _ u s e r _ c o n s e n t s   ( 
     i d   S E R I A L   P R I M A R Y   K E Y , 
     u s e r _ i d   I N T E G E R   N O T   N U L L   R E F E R E N C E S   d i e t b y r d _ u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
     c o n s e n t _ t e x t _ v e r s i o n   T E X T   N O T   N U L L , 
     i p _ a d d r e s s   V A R C H A R ( 4 5 )   N U L L , 
     a c c e p t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P 
 ) ; 
 
 C R E A T E   I N D E X   i d x _ d i e t b y r d _ c o n s e n t s _ u s e r   O N   d i e t b y r d _ u s e r _ c o n s e n t s ( u s e r _ i d ) ; 
  
 CREATE TABLE IF NOT EXISTS dietbyrd_user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
    consent_version TEXT NOT NULL,
    ip_address TEXT,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
