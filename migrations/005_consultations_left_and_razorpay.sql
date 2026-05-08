-- Migration 005: Add consultations_left to patients and Razorpay payment support
-- Created: May 2026

-- ============================================
-- 1. ADD CONSULTATIONS_LEFT TO PATIENTS
-- ============================================
-- Track remaining consultations for each patient

DO $$
BEGIN
    -- Add consultations_left column to dietbyrd_patients
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_patients' AND column_name = 'consultations_left'
    ) THEN
        ALTER TABLE dietbyrd_patients ADD COLUMN consultations_left INTEGER DEFAULT 0;
    END IF;

    -- Add last_payment_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_patients' AND column_name = 'last_payment_at'
    ) THEN
        ALTER TABLE dietbyrd_patients ADD COLUMN last_payment_at TIMESTAMP;
    END IF;

    -- Add razorpay_customer_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_patients' AND column_name = 'razorpay_customer_id'
    ) THEN
        ALTER TABLE dietbyrd_patients ADD COLUMN razorpay_customer_id VARCHAR(100);
    END IF;
END
$$;

-- ============================================
-- 2. CREATE RAZORPAY PAYMENTS TABLE
-- ============================================
-- Track all Razorpay payments

CREATE TABLE IF NOT EXISTS dietbyrd_razorpay_payments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES dietbyrd_patients(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in paise (100 = Rs 1)
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'pending', 'success', 'failed', 'refunded')),
    consultations_purchased INTEGER NOT NULL DEFAULT 1,
    payment_method VARCHAR(50),
    error_code VARCHAR(50),
    error_description TEXT,
    notes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_razorpay_payments_patient ON dietbyrd_razorpay_payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_order ON dietbyrd_razorpay_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_status ON dietbyrd_razorpay_payments(status);

-- ============================================
-- 3. CREATE CONSULTATION PACKAGES TABLE
-- ============================================
-- Define available consultation packages

CREATE TABLE IF NOT EXISTS dietbyrd_consultation_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    num_consultations INTEGER NOT NULL,
    price INTEGER NOT NULL, -- Price in paise
    discount_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default packages
INSERT INTO dietbyrd_consultation_packages (name, num_consultations, price, discount_percentage, description)
VALUES 
    ('Single Consultation', 1, 49900, 0, 'One personalized diet consultation'),
    ('3 Consultation Pack', 3, 129900, 13, 'Best for initial weight loss journey'),
    ('5 Consultation Pack', 5, 199900, 20, 'Most popular - complete diet program'),
    ('10 Consultation Pack', 10, 349900, 30, 'Premium package for long-term goals')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE dietbyrd_razorpay_payments IS 'Tracks all Razorpay payments for consultation purchases';
COMMENT ON TABLE dietbyrd_consultation_packages IS 'Available consultation packages for purchase';
