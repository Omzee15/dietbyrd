-- ============================================================================
-- Add Default Availability to Existing Dieticians
-- Adds Monday-Friday, 9 AM - 5 PM availability for dieticians without any slots
-- Generated: May 10, 2026
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- Insert default availability for dieticians who don't have any availability yet
INSERT INTO dietbyrd_dietician_availability (rd_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
SELECT 
    rd.id as rd_id,
    day_num as day_of_week,
    '09:00'::time as start_time,
    '17:00'::time as end_time,
    60 as slot_duration_minutes,
    true as is_active
FROM 
    dietbyrd_registered_dietitians rd
CROSS JOIN 
    generate_series(1, 5) as day_num  -- 1=Monday through 5=Friday
WHERE 
    rd.is_active = true
    AND NOT EXISTS (
        -- Only add if dietician has no availability at all
        SELECT 1 
        FROM dietbyrd_dietician_availability da 
        WHERE da.rd_id = rd.id
    );

-- Show summary
SELECT 
    'Dieticians with availability' AS status,
    COUNT(DISTINCT rd_id) AS count
FROM dietbyrd_dietician_availability
UNION ALL
SELECT 
    'Total active dieticians' AS status,
    COUNT(*) AS count
FROM dietbyrd_registered_dietitians
WHERE is_active = true;

-- Commit the transaction
COMMIT;

-- Display success message
SELECT '✓ Default availability (Mon-Fri, 9-5) added to dieticians without slots!' AS status;
