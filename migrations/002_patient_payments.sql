-- Migration: Patient Payments table for payment status and history
-- Date: 2026-04-24

CREATE TABLE IF NOT EXISTS dietbyrd_payments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES dietbyrd_patients(id) ON DELETE SET NULL,
  registered_patient_id INTEGER REFERENCES dietbyrd_registered_patients(id) ON DELETE SET NULL,
  subscription_id INTEGER REFERENCES dietbyrd_subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  payment_type VARCHAR(20) NOT NULL DEFAULT 'manual',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  gateway_transaction_id VARCHAR(100),
  gateway_order_id VARCHAR(100),
  failure_reason VARCHAR(255),
  retry_count INTEGER NOT NULL DEFAULT 0,
  retry_scheduled_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dietbyrd_payments_payment_type_chk CHECK (payment_type IN ('initial', 'autopay', 'retry', 'manual')),
  CONSTRAINT dietbyrd_payments_status_chk CHECK (status IN ('pending', 'success', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON dietbyrd_payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_registered_patient_id ON dietbyrd_payments(registered_patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON dietbyrd_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON dietbyrd_payments(created_at DESC);
