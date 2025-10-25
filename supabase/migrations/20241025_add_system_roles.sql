-- ============================================================================
-- System Roles Migration for Mastra Integration
-- ============================================================================
-- Adds system_roles and user_system_roles tables for role-based authentication
-- Based on brius-mastra-final reference project patterns
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- System Roles Table
-- ============================================================================

-- System roles definition table
CREATE TABLE IF NOT EXISTS system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT system_roles_name_check CHECK (name ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT system_roles_name_length CHECK (length(name) BETWEEN 2 AND 50)
);

-- ============================================================================
-- User System Roles Table
-- ============================================================================

-- User to system roles mapping table
CREATE TABLE IF NOT EXISTS user_system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, role_id),
  CONSTRAINT user_system_roles_user_id_check CHECK (user_id IS NOT NULL),
  CONSTRAINT user_system_roles_expires_check CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- System roles indexes
CREATE INDEX IF NOT EXISTS system_roles_name_idx ON system_roles(name);
CREATE INDEX IF NOT EXISTS system_roles_active_idx ON system_roles(is_active);
CREATE INDEX IF NOT EXISTS system_roles_created_at_idx ON system_roles(created_at DESC);

-- User system roles indexes
CREATE INDEX IF NOT EXISTS user_system_roles_user_id_idx ON user_system_roles(user_id);
CREATE INDEX IF NOT EXISTS user_system_roles_role_id_idx ON user_system_roles(role_id);
CREATE INDEX IF NOT EXISTS user_system_roles_active_idx ON user_system_roles(is_active);
CREATE INDEX IF NOT EXISTS user_system_roles_expires_idx ON user_system_roles(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_system_roles_user_active_idx ON user_system_roles(user_id, is_active);

-- ============================================================================
-- Triggers for Updated At
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_system_roles_updated_at ON system_roles;
CREATE TRIGGER update_system_roles_updated_at
    BEFORE UPDATE ON system_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_system_roles_updated_at ON user_system_roles;
CREATE TRIGGER update_user_system_roles_updated_at
    BEFORE UPDATE ON user_system_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_system_roles ENABLE ROW LEVEL SECURITY;

-- System roles policies
CREATE POLICY "system_roles_read_all" ON system_roles
    FOR SELECT USING (true);

CREATE POLICY "system_roles_admin_full" ON system_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_system_roles usr
            JOIN system_roles sr ON usr.role_id = sr.id
            WHERE usr.user_id = auth.uid()
            AND sr.name = 'admin'
            AND usr.is_active = true
            AND (usr.expires_at IS NULL OR usr.expires_at > NOW())
        )
    );

-- User system roles policies
CREATE POLICY "user_system_roles_read_own" ON user_system_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_system_roles_read_admin" ON user_system_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_system_roles usr
            JOIN system_roles sr ON usr.role_id = sr.id
            WHERE usr.user_id = auth.uid()
            AND sr.name = 'admin'
            AND usr.is_active = true
            AND (usr.expires_at IS NULL OR usr.expires_at > NOW())
        )
    );

CREATE POLICY "user_system_roles_admin_full" ON user_system_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_system_roles usr
            JOIN system_roles sr ON usr.role_id = sr.id
            WHERE usr.user_id = auth.uid()
            AND sr.name = 'admin'
            AND usr.is_active = true
            AND (usr.expires_at IS NULL OR usr.expires_at > NOW())
        )
    );

-- ============================================================================
-- Default System Roles
-- ============================================================================

-- Insert default roles
INSERT INTO system_roles (name, description, permissions) VALUES
('admin', 'Administrator with full system access', '{
  "system": ["read", "write", "delete", "manage_users", "manage_roles"],
  "mastra": ["orchestrator", "business_intelligence", "default", "all_agents"],
  "data": ["read", "write", "delete", "export", "import"],
  "ui": ["all_pages", "admin_panel"]
}'::jsonb),
('user', 'Standard user with basic access', '{
  "system": ["read"],
  "mastra": ["orchestrator", "business_intelligence"],
  "data": ["read"],
  "ui": ["library", "reports", "assistant"]
}'::jsonb),
('service_role', 'Service account for system integrations', '{
  "system": ["read", "write"],
  "mastra": ["orchestrator", "business_intelligence", "default"],
  "data": ["read", "write"],
  "api": ["full_access"]
}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE (
  role_name TEXT,
  role_description TEXT,
  permissions JSONB,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.name,
    sr.description,
    sr.permissions,
    usr.assigned_at,
    usr.expires_at
  FROM user_system_roles usr
  JOIN system_roles sr ON usr.role_id = sr.id
  WHERE usr.user_id = user_uuid
    AND usr.is_active = true
    AND sr.is_active = true
    AND (usr.expires_at IS NULL OR usr.expires_at > NOW())
  ORDER BY usr.assigned_at DESC;
END;
$$;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, role_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON usr.role_id = sr.id
    WHERE usr.user_id = user_uuid
      AND sr.name = role_name_param
      AND usr.is_active = true
      AND sr.is_active = true
      AND (usr.expires_at IS NULL OR usr.expires_at > NOW())
  );
END;
$$;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_user_role(
  user_uuid UUID,
  role_name_param TEXT,
  assigned_by_uuid UUID DEFAULT NULL,
  expires_at_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  role_uuid UUID;
  assignment_uuid UUID;
BEGIN
  -- Get role ID
  SELECT id INTO role_uuid
  FROM system_roles
  WHERE name = role_name_param AND is_active = true;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found or inactive', role_name_param;
  END IF;
  
  -- Insert or update assignment
  INSERT INTO user_system_roles (user_id, role_id, assigned_by, expires_at)
  VALUES (user_uuid, role_uuid, assigned_by_uuid, expires_at_param)
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    expires_at = EXCLUDED.expires_at,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO assignment_uuid;
  
  RETURN assignment_uuid;
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(UUID, TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Grant table permissions
GRANT SELECT ON system_roles TO authenticated;
GRANT SELECT ON user_system_roles TO authenticated;

-- Service role permissions
GRANT ALL ON system_roles TO service_role;
GRANT ALL ON user_system_roles TO service_role;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  roles_count INTEGER;
  functions_count INTEGER;
BEGIN
  -- Count roles
  SELECT COUNT(*) INTO roles_count FROM system_roles WHERE is_active = true;
  
  -- Count functions
  SELECT COUNT(*) INTO functions_count
  FROM information_schema.routines
  WHERE routine_name IN ('get_user_roles', 'user_has_role', 'assign_user_role')
    AND routine_schema = 'public';
  
  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SYSTEM ROLES MIGRATION COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  📊 System roles created: %', roles_count;
  RAISE NOTICE '  ⚙️  Helper functions: %', functions_count;
  RAISE NOTICE '  🔒 RLS policies enabled';
  RAISE NOTICE '  📈 Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Default Roles Available:';
  RAISE NOTICE '  👑 admin - Full system access';
  RAISE NOTICE '  👤 user - Standard user access (default)';
  RAISE NOTICE '  🔧 service_role - Service account access';
  RAISE NOTICE '';
END $$;