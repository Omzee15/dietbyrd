-- Support Tickets System
-- Create tickets table for patient support

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM ('technical', 'billing', 'appointment', 'diet_plan', 'general', 'complaint');

CREATE TABLE dietbyrd_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES dietbyrd_patients(id),
  assigned_to INTEGER REFERENCES dietbyrd_users(id),
  created_by INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL DEFAULT 'general',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tickets_patient_id ON dietbyrd_tickets(patient_id);
CREATE INDEX idx_tickets_assigned_to ON dietbyrd_tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON dietbyrd_tickets(created_by);
CREATE INDEX idx_tickets_status ON dietbyrd_tickets(status);
CREATE INDEX idx_tickets_priority ON dietbyrd_tickets(priority);
CREATE INDEX idx_tickets_created_at ON dietbyrd_tickets(created_at DESC);

-- Create ticket comments table
CREATE TABLE dietbyrd_ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES dietbyrd_tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES dietbyrd_users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket_id ON dietbyrd_ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_created_at ON dietbyrd_ticket_comments(created_at);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  counter INTEGER;
BEGIN
  -- Get the count of existing tickets
  SELECT COUNT(*) + 1 INTO counter FROM dietbyrd_tickets;
  
  -- Generate ticket number in format: TKT-YYYYMMDD-XXXX
  new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON dietbyrd_tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_updated_at
BEFORE UPDATE ON dietbyrd_tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticket_updated_at();

COMMENT ON TABLE dietbyrd_tickets IS 'Support tickets for patient issues and requests';
COMMENT ON COLUMN dietbyrd_tickets.ticket_number IS 'Unique ticket identifier in format TKT-YYYYMMDD-XXXX';
COMMENT ON COLUMN dietbyrd_tickets.patient_id IS 'Patient who raised the ticket (nullable for general inquiries)';
COMMENT ON COLUMN dietbyrd_tickets.assigned_to IS 'Support team member assigned to handle the ticket';
COMMENT ON COLUMN dietbyrd_tickets.created_by IS 'User who created the ticket (can be patient or support staff)';
