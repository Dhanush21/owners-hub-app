-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_number ON otp_verifications(phone_number);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to manage OTPs
CREATE POLICY "Service role can manage OTPs" ON otp_verifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to automatically clean up expired OTPs (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

