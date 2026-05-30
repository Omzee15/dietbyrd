UPDATE dietbyrd_consultation_packages
SET price = 99900
WHERE num_consultations = 1 AND price < 99900;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consultations_rd_slot_active
ON dietbyrd_consultations (rd_id, scheduled_at)
WHERE status IN ('confirmed', 'scheduled') AND rd_id IS NOT NULL;

-- Prompt 9 previously allowed NULL rd_id for pending assignment.
-- Booking now assigns before insert, so keep the clinical appointment contract strict.
ALTER TABLE dietbyrd_consultations
  ALTER COLUMN rd_id SET NOT NULL;
