-- Migration 004: Dietician Availability and Appointment Booking System
-- Created: May 2026

-- ============================================
-- 1. DIETICIAN WEEKLY AVAILABILITY
-- ============================================
-- Stores recurring weekly availability slots for each dietician
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday

CREATE TABLE IF NOT EXISTS dietbyrd_dietician_availability (
    id SERIAL PRIMARY KEY,
    rd_id INTEGER NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    UNIQUE(rd_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_dietician_availability_rd_id ON dietbyrd_dietician_availability(rd_id);
CREATE INDEX IF NOT EXISTS idx_dietician_availability_day ON dietbyrd_dietician_availability(day_of_week);

-- ============================================
-- 2. BLOCKED/UNAVAILABLE TIME SLOTS
-- ============================================
-- For specific dates when dietician is unavailable (holidays, leave, etc.)

CREATE TABLE IF NOT EXISTS dietbyrd_dietician_blocked_slots (
    id SERIAL PRIMARY KEY,
    rd_id INTEGER NOT NULL REFERENCES dietbyrd_registered_dietitians(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    start_time TIME,  -- NULL means entire day is blocked
    end_time TIME,    -- NULL means entire day is blocked
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rd_id, blocked_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_rd_date ON dietbyrd_dietician_blocked_slots(rd_id, blocked_date);

-- ============================================
-- 3. UPDATE CONSULTATIONS TABLE
-- ============================================
-- Add columns if they don't exist for better appointment tracking

DO $$
BEGIN
    -- Add booked_by_patient column to track patient-initiated bookings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_consultations' AND column_name = 'booked_by_patient'
    ) THEN
        ALTER TABLE dietbyrd_consultations ADD COLUMN booked_by_patient BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add patient_notes column for notes from patient when booking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_consultations' AND column_name = 'patient_notes'
    ) THEN
        ALTER TABLE dietbyrd_consultations ADD COLUMN patient_notes TEXT;
    END IF;

    -- Add cancelled_at and cancelled_by columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_consultations' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE dietbyrd_consultations ADD COLUMN cancelled_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dietbyrd_consultations' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE dietbyrd_consultations ADD COLUMN cancelled_by VARCHAR(50);
    END IF;
END
$$;

-- ============================================
-- 4. SAMPLE DEFAULT AVAILABILITY
-- ============================================
-- Insert default availability for all existing dieticians (Mon-Fri, 9 AM to 6 PM)
-- This creates 30-minute slots from 9 AM to 6 PM

-- Note: Run this only once for existing dieticians
INSERT INTO dietbyrd_dietician_availability (rd_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT 
    rd.id,
    d.day_of_week,
    '09:00'::TIME as start_time,
    '18:00'::TIME as end_time,
    60 as slot_duration_minutes
FROM dietbyrd_registered_dietitians rd
CROSS JOIN (SELECT generate_series(1, 5) as day_of_week) d  -- Monday to Friday
WHERE rd.is_active = TRUE
ON CONFLICT (rd_id, day_of_week, start_time) DO NOTHING;

-- ============================================
-- 5. HELPFUL INDEXES FOR APPOINTMENT QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON dietbyrd_consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_rd_scheduled ON dietbyrd_consultations(rd_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_scheduled ON dietbyrd_consultations(registered_patient_id, scheduled_at);
