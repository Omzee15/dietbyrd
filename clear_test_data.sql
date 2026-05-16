-- ============================================================================
-- Clear Test Data from Database
-- Keeps: Consultation packages (dietbyrd_plans) and Admin user credentials ONLY
-- Admin: Phone 9999999999, Password: helloworld, Role: founder
-- Generated: May 10, 2026
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- Delete ALL data in dependency order (children first)
-- ============================================

-- Support tickets system
TRUNCATE TABLE dietbyrd_ticket_comments CASCADE;
TRUNCATE TABLE dietbyrd_tickets CASCADE;

-- Audit and notifications
TRUNCATE TABLE dietbyrd_audit_log CASCADE;
TRUNCATE TABLE dietbyrd_notifications CASCADE;
TRUNCATE TABLE dietbyrd_whatsapp_messages CASCADE;
TRUNCATE TABLE dietbyrd_patient_logs CASCADE;
TRUNCATE TABLE dietbyrd_documents CASCADE;

-- Financial records
TRUNCATE TABLE dietbyrd_doctor_earnings CASCADE;
TRUNCATE TABLE dietbyrd_refunds CASCADE;
TRUNCATE TABLE dietbyrd_payouts CASCADE;
TRUNCATE TABLE dietbyrd_payments CASCADE;

-- Coupon system
TRUNCATE TABLE dietbyrd_coupon_usage CASCADE;
TRUNCATE TABLE dietbyrd_coupon_codes CASCADE;

-- Food and diet data
TRUNCATE TABLE dietbyrd_food_database CASCADE;
TRUNCATE TABLE dietbyrd_diet_plans CASCADE;

-- Consultation records
TRUNCATE TABLE dietbyrd_consultation_notes CASCADE;
TRUNCATE TABLE dietbyrd_consultations CASCADE;

-- Dietician availability
TRUNCATE TABLE dietbyrd_dietician_blocked_slots CASCADE;
TRUNCATE TABLE dietbyrd_dietician_availability CASCADE;

-- Patient related data
TRUNCATE TABLE dietbyrd_referrals CASCADE;
TRUNCATE TABLE dietbyrd_subscriptions CASCADE;
TRUNCATE TABLE dietbyrd_registered_patients CASCADE;

-- ★ KEEP dietbyrd_plans (consultation packages) - DO NOT TRUNCATE

-- Patient data
TRUNCATE TABLE dietbyrd_patients CASCADE;

-- Join requests
TRUNCATE TABLE dietbyrd_join_requests CASCADE;

-- Staff records
TRUNCATE TABLE dietbyrd_staff CASCADE;

-- Dieticians and doctors (COMPLETELY CLEAR)
TRUNCATE TABLE dietbyrd_registered_dietitians CASCADE;
TRUNCATE TABLE dietbyrd_assistants CASCADE;
TRUNCATE TABLE dietbyrd_doctors CASCADE;

-- ★ Delete ALL users from dietbyrd_users, then re-insert ONLY the admin
TRUNCATE TABLE dietbyrd_users CASCADE;

-- Re-insert the single admin user
INSERT INTO dietbyrd_users (phone, name, password, role) 
VALUES ('9999999999', 'Admin User', 'helloworld', 'founder');

-- ============================================
-- All sequences are reset by TRUNCATE CASCADE
-- ============================================

-- ============================================
-- Summary of what's kept
-- ============================================

-- Check what remains in the database
SELECT 
    'Consultation Packages' AS item,
    COUNT(*) AS count
FROM dietbyrd_plans
UNION ALL
SELECT 
    'Admin Users' AS item,
    COUNT(*) AS count
FROM dietbyrd_users
UNION ALL
SELECT 
    'Total Patients' AS item,
    COUNT(*) AS count
FROM dietbyrd_patients
UNION ALL
SELECT 
    'Total Doctors' AS item,
    COUNT(*) AS count
FROM dietbyrd_doctors
UNION ALL
SELECT 
    'Total Dieticians' AS item,
    COUNT(*) AS count
FROM dietbyrd_registered_dietitians;

-- Commit the transaction
COMMIT;

-- Display success message
SELECT '✓ Database cleaned! Only consultation packages and admin user (9999999999) remain.' AS status;
