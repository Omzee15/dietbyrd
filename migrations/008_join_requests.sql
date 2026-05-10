-- Join Requests System
-- Create join_requests table for doctor/dietician registration requests

CREATE TYPE join_request_role AS ENUM ('doctor', 'rd');
CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE dietbyrd_join_requests (
  id SERIAL PRIMARY KEY,
  
  -- Request details
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  role join_request_role NOT NULL,
  
  -- Doctor specific fields
  specialization VARCHAR(255),
  qualification VARCHAR(500),
  experience_years INTEGER,
  medical_license_number VARCHAR(100),
  
  -- Dietician specific fields (reusing specialization and qualification)
  -- consultation_fee will be set after approval
  
  -- Additional information
  clinic_name VARCHAR(255),
  clinic_address TEXT,
  about TEXT,
  
  -- Status tracking
  status join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES dietbyrd_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_doctor_fields CHECK (
    role != 'doctor' OR (
      specialization IS NOT NULL AND
      qualification IS NOT NULL AND
      experience_years IS NOT NULL
    )
  ),
  CONSTRAINT check_dietician_fields CHECK (
    role != 'rd' OR (
      qualification IS NOT NULL
    )
  )
);

-- Create indexes
CREATE INDEX idx_join_requests_phone ON dietbyrd_join_requests(phone);
CREATE INDEX idx_join_requests_email ON dietbyrd_join_requests(email);
CREATE INDEX idx_join_requests_role ON dietbyrd_join_requests(role);
CREATE INDEX idx_join_requests_status ON dietbyrd_join_requests(status);
CREATE INDEX idx_join_requests_created_at ON dietbyrd_join_requests(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_join_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_join_request_updated_at
BEFORE UPDATE ON dietbyrd_join_requests
FOR EACH ROW
EXECUTE FUNCTION update_join_request_updated_at();

COMMENT ON TABLE dietbyrd_join_requests IS 'Join requests from doctors and dieticians wanting to register';
COMMENT ON COLUMN dietbyrd_join_requests.role IS 'The role being requested: doctor or rd (dietician)';
COMMENT ON COLUMN dietbyrd_join_requests.status IS 'Current status of the join request';
COMMENT ON COLUMN dietbyrd_join_requests.reviewed_by IS 'Admin/MLT intern who reviewed the request';
