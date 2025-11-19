-- Schema updates for permissions and enhanced team management

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';
-- Roles: 'admin', 'team_admin', 'member'

-- Create user_team_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS user_team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  can_view_reports BOOLEAN DEFAULT true,
  can_create_reports BOOLEAN DEFAULT true,
  can_edit_reports BOOLEAN DEFAULT false,
  can_delete_reports BOOLEAN DEFAULT false,
  can_upload_files BOOLEAN DEFAULT true,
  can_delete_files BOOLEAN DEFAULT false,
  can_share_files BOOLEAN DEFAULT true,
  can_manage_team BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, team_id)
);

-- Create indexes for user_team_permissions
CREATE INDEX IF NOT EXISTS idx_user_team_permissions_user_id ON user_team_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_team_permissions_team_id ON user_team_permissions(team_id);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_team_permissions_updated_at ON user_team_permissions;
CREATE TRIGGER update_user_team_permissions_updated_at BEFORE UPDATE ON user_team_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add row_count column to uploaded_files if it doesn't exist
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS row_count INTEGER;

-- Add share_token column to reports table for public sharing
ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token) WHERE share_token IS NOT NULL;

