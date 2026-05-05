-- Migration: Food Library and Coupon Codes System
-- Database: PostgreSQL (Neon)
-- Date: 2024-04-21

-- ============================================================================
-- Food Library Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dietbyrd_food_library (
  id VARCHAR(50) PRIMARY KEY,
  name_en VARCHAR(200) NOT NULL,
  name_hi VARCHAR(200),
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
  
  -- Additional attributes
  yield_factor DECIMAL(5, 2) DEFAULT 1.0,
  image_url TEXT,
  tags TEXT[],
  food_type VARCHAR(20) DEFAULT 'CORE' CHECK (food_type IN ('CORE', 'PREPARED', 'TREAT')),
  dietitian_visibility BOOLEAN DEFAULT TRUE,
  caution_level VARCHAR(20) DEFAULT 'NONE' CHECK (caution_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH')),
  notes TEXT,
  
  -- Metadata
  created_by_user_id INTEGER REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for food library
CREATE INDEX IF NOT EXISTS idx_food_library_category ON dietbyrd_food_library(category);
CREATE INDEX IF NOT EXISTS idx_food_library_type ON dietbyrd_food_library(food_type);
CREATE INDEX IF NOT EXISTS idx_food_library_created_by ON dietbyrd_food_library(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_food_library_name_en ON dietbyrd_food_library(name_en);

-- ============================================================================
-- Coupon Codes Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dietbyrd_coupon_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2),
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Usage limits
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Applicable plans (JSON array of plan IDs or plan types)
  applicable_plans JSONB,
  
  -- Internal notes
  notes TEXT,
  
  -- Metadata
  created_by_user_id INTEGER REFERENCES dietbyrd_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for coupon codes
CREATE INDEX IF NOT EXISTS idx_coupon_code ON dietbyrd_coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_active ON dietbyrd_coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_validity ON dietbyrd_coupon_codes(valid_from, valid_until);

-- ============================================================================
-- Coupon Usage Tracking Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dietbyrd_coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES dietbyrd_coupon_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
  subscription_id INTEGER REFERENCES dietbyrd_subscriptions(id) ON DELETE SET NULL,
  
  -- Usage details
  discount_applied DECIMAL(10, 2) NOT NULL,
  order_amount DECIMAL(10, 2) NOT NULL,
  
  -- Timestamp
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for coupon usage
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON dietbyrd_coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON dietbyrd_coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_date ON dietbyrd_coupon_usage(used_at);

-- ============================================================================
-- Update trigger for updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_food_library_updated_at ON dietbyrd_food_library;
CREATE TRIGGER update_food_library_updated_at
    BEFORE UPDATE ON dietbyrd_food_library
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupon_codes_updated_at ON dietbyrd_coupon_codes;
CREATE TRIGGER update_coupon_codes_updated_at
    BEFORE UPDATE ON dietbyrd_coupon_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data (Optional - some common food items)
-- ============================================================================
INSERT INTO dietbyrd_food_library (id, name_en, name_hi, category, calories, protein, carbs, fat, fiber, iron, calcium, food_type) VALUES
  ('rice-white', 'White Rice (Cooked)', 'सफेद चावल', 'Cereals', 130, 2.7, 28.2, 0.3, 0.4, 0.2, 10, 'CORE'),
  ('roti-wheat', 'Wheat Roti', 'गेहूं की रोटी', 'Cereals', 264, 9.6, 55.0, 1.2, 11.2, 3.2, 23, 'CORE'),
  ('dal-toor', 'Toor Dal (Cooked)', 'अरहर दाल', 'Pulses', 343, 22.3, 62.0, 1.5, 15.0, 3.1, 73, 'CORE'),
  ('chicken-breast', 'Chicken Breast', 'चिकन ब्रेस्ट', 'Meat', 165, 31.0, 0, 3.6, 0, 0.9, 15, 'CORE'),
  ('paneer', 'Paneer', 'पनीर', 'Dairy', 265, 18.3, 3.4, 20.8, 0, 0.3, 480, 'CORE'),
  ('milk-full', 'Full Cream Milk', 'फुल क्रीम दूध', 'Dairy', 60, 3.2, 4.8, 3.2, 0, 0.1, 120, 'CORE'),
  ('banana', 'Banana', 'केला', 'Fruits', 89, 1.1, 22.8, 0.3, 2.6, 0.3, 5, 'CORE'),
  ('spinach', 'Spinach (Raw)', 'पालक', 'Vegetables', 23, 2.9, 3.6, 0.4, 2.2, 2.7, 99, 'CORE'),
  ('egg-whole', 'Whole Egg', 'अंडा', 'Eggs', 155, 12.6, 1.1, 10.6, 0, 1.8, 50, 'CORE'),
  ('almonds', 'Almonds', 'बादाम', 'Nuts', 579, 21.2, 21.6, 49.9, 12.5, 3.7, 269, 'CORE')
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Food Library and Coupon Codes tables created';
END $$;
