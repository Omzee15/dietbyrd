-- Migration: Add modulator EEE columns and patient messages
-- Database: PostgreSQL (Neon)
-- Date: 2026-04-29

BEGIN;

-- Add modulator columns to food library
ALTER TABLE dietbyrd_food_library
  ADD COLUMN IF NOT EXISTS oxalate_eee DECIMAL(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phytate_eee DECIMAL(8, 2) DEFAULT 0;

-- Add patient messages column
ALTER TABLE dietbyrd_patients
  ADD COLUMN IF NOT EXISTS patient_messages JSONB DEFAULT '[]'::jsonb;

-- Populate oxalate EEE values
UPDATE dietbyrd_food_library
SET oxalate_eee = CASE name_en
  WHEN 'Almonds' THEN 230
  WHEN 'Cashew' THEN 120
  WHEN 'Pistachio' THEN 65
  WHEN 'Walnut' THEN 45
  WHEN 'Peanuts' THEN 70
  WHEN 'Peanut Butter (standard, unsweetened)' THEN 55
  WHEN 'Chia seeds' THEN 95
  WHEN 'Flaxseeds' THEN 55
  WHEN 'Sesame Seeds' THEN 200
  WHEN 'Beetroot' THEN 85
  WHEN 'Sweet potato (boiled)' THEN 40
  WHEN 'Dark Chocolate (60%)' THEN 150
  WHEN 'Dark Chocolate (70%)' THEN 150
  WHEN 'Dark Chocolate (80%)' THEN 150
  WHEN 'Raisins' THEN 35
  WHEN 'Dates (dried)' THEN 25
  WHEN 'Fig (dried)' THEN 65
  WHEN 'Bhindi (Lady finger)' THEN 30
  WHEN 'Baingan (Brinjal)' THEN 20
  WHEN 'Makhana (Fox nuts, roasted)' THEN 15
  WHEN 'Spinach (cooked wt.)' THEN 260
  WHEN 'Spinach (raw wt.)' THEN 130
  ELSE oxalate_eee
END
WHERE name_en IN (
  'Almonds',
  'Cashew',
  'Pistachio',
  'Walnut',
  'Peanuts',
  'Peanut Butter (standard, unsweetened)',
  'Chia seeds',
  'Flaxseeds',
  'Sesame Seeds',
  'Beetroot',
  'Sweet potato (boiled)',
  'Dark Chocolate (60%)',
  'Dark Chocolate (70%)',
  'Dark Chocolate (80%)',
  'Raisins',
  'Dates (dried)',
  'Fig (dried)',
  'Bhindi (Lady finger)',
  'Baingan (Brinjal)',
  'Makhana (Fox nuts, roasted)',
  'Spinach (cooked wt.)',
  'Spinach (raw wt.)'
);

-- Populate phytate EEE values
UPDATE dietbyrd_food_library
SET phytate_eee = CASE name_en
  WHEN 'Wheat flour (whole)' THEN 350
  WHEN 'Bread (whole wheat)' THEN 280
  WHEN 'Bread (white)' THEN 120
  WHEN 'Bajra flour' THEN 420
  WHEN 'Jowar flour' THEN 390
  WHEN 'Ragi flour' THEN 360
  WHEN 'Maize flour (Makki)' THEN 320
  WHEN 'Barley (raw)' THEN 300
  WHEN 'Oats (rolled, raw)' THEN 280
  WHEN 'Oats (cooked)' THEN 280
  WHEN 'Alpino High Protein Oats' THEN 280
  WHEN 'Pintola High Protein Oats / Muesli' THEN 280
  WHEN 'Semolina (Rava)' THEN 180
  WHEN 'Vermicelli (wheat)' THEN 160
  WHEN 'Poha (raw)' THEN 140
  WHEN 'Quinoa (raw)' THEN 350
  WHEN 'Chana dal (raw)' THEN 420
  WHEN 'Chickpeas (Kabuli / Chole)' THEN 390
  WHEN 'Toor dal (raw)' THEN 360
  WHEN 'Moong dal (raw)' THEN 360
  WHEN 'Lentils (Generic)' THEN 360
  WHEN 'Moong Dal (Raw)' THEN 360
  WHEN 'Masoor Dal (Raw)' THEN 360
  WHEN 'Toor Dal (Raw)' THEN 360
  WHEN 'Urad Dal (Raw)' THEN 360
  WHEN 'Rajma (raw)' THEN 420
  WHEN 'Rajma (Kidney Beans, Raw)' THEN 420
  WHEN 'Roasted Chana' THEN 310
  WHEN 'Almonds' THEN 520
  WHEN 'Cashew' THEN 360
  WHEN 'Pistachio' THEN 280
  WHEN 'Walnut' THEN 260
  WHEN 'Peanuts' THEN 390
  WHEN 'Peanut Butter (standard, unsweetened)' THEN 300
  WHEN 'Chia seeds' THEN 750
  WHEN 'Flaxseeds' THEN 650
  WHEN 'Pumpkin seeds' THEN 820
  WHEN 'Sesame Seeds' THEN 900
  WHEN 'Soy protein isolate' THEN 180
  WHEN 'Soya chunks' THEN 420
  WHEN 'Tofu (Soy paneer)' THEN 180
  WHEN 'Seitan (wheat gluten)' THEN 40
  ELSE phytate_eee
END
WHERE name_en IN (
  'Wheat flour (whole)',
  'Bread (whole wheat)',
  'Bread (white)',
  'Bajra flour',
  'Jowar flour',
  'Ragi flour',
  'Maize flour (Makki)',
  'Barley (raw)',
  'Oats (rolled, raw)',
  'Oats (cooked)',
  'Alpino High Protein Oats',
  'Pintola High Protein Oats / Muesli',
  'Semolina (Rava)',
  'Vermicelli (wheat)',
  'Poha (raw)',
  'Quinoa (raw)',
  'Chana dal (raw)',
  'Chickpeas (Kabuli / Chole)',
  'Toor dal (raw)',
  'Moong dal (raw)',
  'Lentils (Generic)',
  'Moong Dal (Raw)',
  'Masoor Dal (Raw)',
  'Toor Dal (Raw)',
  'Urad Dal (Raw)',
  'Rajma (raw)',
  'Rajma (Kidney Beans, Raw)',
  'Roasted Chana',
  'Almonds',
  'Cashew',
  'Pistachio',
  'Walnut',
  'Peanuts',
  'Peanut Butter (standard, unsweetened)',
  'Chia seeds',
  'Flaxseeds',
  'Pumpkin seeds',
  'Sesame Seeds',
  'Soy protein isolate',
  'Soya chunks',
  'Tofu (Soy paneer)',
  'Seitan (wheat gluten)'
);

COMMIT;
