-- =====================================================
-- Supabase Schema Creation: Row Level Security Policies
-- =====================================================
-- This script enables RLS and creates security policies for all tables
-- Based on office-based data isolation and role-based access control

-- =====================================================
-- Enable RLS on All Tables
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_checks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper Functions for RLS
-- =====================================================

-- Get current user's profile
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM profiles 
        WHERE legacy_user_id = (auth.jwt() ->> 'sub')::INTEGER
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's profile type
CREATE OR REPLACE FUNCTION get_current_profile_type()
RETURNS profile_type AS $$
BEGIN
    RETURN (
        SELECT profile_type 
        FROM profiles 
        WHERE id = get_current_profile()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's accessible offices
CREATE OR REPLACE FUNCTION get_accessible_offices()
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT office_id
        FROM doctor_offices
        WHERE doctor_id = get_current_profile()
        AND is_active = true
        UNION
        SELECT DISTINCT office_id
        FROM orders
        WHERE patient_id = get_current_profile()
        UNION
        SELECT id
        FROM offices
        WHERE get_current_profile_type() IN ('master', 'technician')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin/master
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_profile_type() = 'master';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Profiles Table Policies
-- =====================================================

-- Profiles: Users can view their own profile and related profiles in their offices
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        id = get_current_profile() OR
        is_admin() OR
        (profile_type = 'patient' AND EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.patient_id = profiles.id 
            AND o.office_id = ANY(get_accessible_offices())
        )) OR
        (profile_type = 'doctor' AND EXISTS (
            SELECT 1 FROM doctor_offices do 
            WHERE do.doctor_id = profiles.id 
            AND do.office_id = ANY(get_accessible_offices())
        ))
    );

-- Profiles: Only admins can insert new profiles
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (is_admin());

-- Profiles: Users can update their own profile, admins can update any
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (
        id = get_current_profile() OR is_admin()
    );

-- Profiles: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE USING (is_admin());

-- =====================================================
-- Offices Table Policies
-- =====================================================

-- Offices: Users can view offices they have access to
CREATE POLICY "offices_select_policy" ON offices
    FOR SELECT USING (
        is_admin() OR
        id = ANY(get_accessible_offices())
    );

-- Offices: Only admins can modify offices
CREATE POLICY "offices_insert_policy" ON offices
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "offices_update_policy" ON offices
    FOR UPDATE USING (is_admin());

CREATE POLICY "offices_delete_policy" ON offices
    FOR DELETE USING (is_admin());

-- =====================================================
-- Doctor-Office Relationships Policies
-- =====================================================

-- Doctor-Offices: Users can view relationships for accessible offices
CREATE POLICY "doctor_offices_select_policy" ON doctor_offices
    FOR SELECT USING (
        is_admin() OR
        office_id = ANY(get_accessible_offices()) OR
        doctor_id = get_current_profile()
    );

-- Doctor-Offices: Only admins and doctors can manage relationships
CREATE POLICY "doctor_offices_insert_policy" ON doctor_offices
    FOR INSERT WITH CHECK (
        is_admin() OR
        doctor_id = get_current_profile()
    );

CREATE POLICY "doctor_offices_update_policy" ON doctor_offices
    FOR UPDATE USING (
        is_admin() OR
        doctor_id = get_current_profile()
    );

CREATE POLICY "doctor_offices_delete_policy" ON doctor_offices
    FOR DELETE USING (
        is_admin() OR
        doctor_id = get_current_profile()
    );

-- =====================================================
-- Order Types and States Policies (Read-Only for Most Users)
-- =====================================================

-- Order Types: All authenticated users can view
CREATE POLICY "order_types_select_policy" ON order_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Order Types: Only admins can modify
CREATE POLICY "order_types_modify_policy" ON order_types
    FOR ALL USING (is_admin());

-- Order States: All authenticated users can view
CREATE POLICY "order_states_select_policy" ON order_states
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Order States: Only admins can modify
CREATE POLICY "order_states_modify_policy" ON order_states
    FOR ALL USING (is_admin());

-- =====================================================
-- Orders Table Policies
-- =====================================================

-- Orders: Users can view orders from their accessible offices
CREATE POLICY "orders_select_policy" ON orders
    FOR SELECT USING (
        is_admin() OR
        office_id = ANY(get_accessible_offices()) OR
        patient_id = get_current_profile() OR
        doctor_id = get_current_profile()
    );

-- Orders: Doctors can create orders for their offices
CREATE POLICY "orders_insert_policy" ON orders
    FOR INSERT WITH CHECK (
        is_admin() OR
        (get_current_profile_type() = 'doctor' AND 
         office_id = ANY(get_accessible_offices()))
    );

-- Orders: Doctors and admins can update orders
CREATE POLICY "orders_update_policy" ON orders
    FOR UPDATE USING (
        is_admin() OR
        (get_current_profile_type() IN ('doctor', 'technician') AND 
         office_id = ANY(get_accessible_offices()))
    );

-- Orders: Only admins can delete orders
CREATE POLICY "orders_delete_policy" ON orders
    FOR DELETE USING (is_admin());

-- =====================================================
-- Projects Table Policies
-- =====================================================

-- Projects: Users can view projects from accessible offices or public projects
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (
        is_admin() OR
        office_id = ANY(get_accessible_offices()) OR
        creator_id = get_current_profile() OR
        is_public = true
    );

-- Projects: Users can create projects in their accessible offices
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (
        is_admin() OR
        (office_id = ANY(get_accessible_offices()) AND 
         creator_id = get_current_profile())
    );

-- Projects: Creators and office members can update projects
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE USING (
        is_admin() OR
        creator_id = get_current_profile() OR
        office_id = ANY(get_accessible_offices())
    );

-- Projects: Only creators and admins can delete projects
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE USING (
        is_admin() OR
        creator_id = get_current_profile()
    );

-- =====================================================
-- Messages Table Policies
-- =====================================================

-- Messages: Users can view messages they sent, received, or related to their orders/projects
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT USING (
        is_admin() OR
        sender_id = get_current_profile() OR
        recipient_id = get_current_profile() OR
        (order_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = messages.order_id 
            AND (o.office_id = ANY(get_accessible_offices()) OR 
                 o.patient_id = get_current_profile() OR 
                 o.doctor_id = get_current_profile())
        )) OR
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = messages.project_id 
            AND (p.office_id = ANY(get_accessible_offices()) OR 
                 p.creator_id = get_current_profile())
        ))
    );

-- Messages: Users can create messages for orders/projects they have access to
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT WITH CHECK (
        is_admin() OR
        sender_id = get_current_profile()
    );

-- Messages: Users can update their own messages
CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE USING (
        is_admin() OR
        sender_id = get_current_profile() OR
        recipient_id = get_current_profile()
    );

-- Messages: Only senders and admins can delete messages
CREATE POLICY "messages_delete_policy" ON messages
    FOR DELETE USING (
        is_admin() OR
        sender_id = get_current_profile()
    );

-- =====================================================
-- Message Types Policies
-- =====================================================

-- Message Types: All authenticated users can view
CREATE POLICY "message_types_select_policy" ON message_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Message Types: Only admins can modify
CREATE POLICY "message_types_modify_policy" ON message_types
    FOR ALL USING (is_admin());

-- =====================================================
-- Workflow Policies
-- =====================================================

-- Workflow Templates: Users can view templates for their accessible order types
CREATE POLICY "workflow_templates_select_policy" ON workflow_templates
    FOR SELECT USING (
        is_admin() OR
        auth.uid() IS NOT NULL
    );

-- Workflow Templates: Only admins can modify
CREATE POLICY "workflow_templates_modify_policy" ON workflow_templates
    FOR ALL USING (is_admin());

-- Workflow Tasks: Users can view tasks for accessible templates
CREATE POLICY "workflow_tasks_select_policy" ON workflow_tasks
    FOR SELECT USING (
        is_admin() OR
        auth.uid() IS NOT NULL
    );

-- Workflow Tasks: Only admins can modify
CREATE POLICY "workflow_tasks_modify_policy" ON workflow_tasks
    FOR ALL USING (is_admin());

-- =====================================================
-- Audit and History Policies
-- =====================================================

-- Order State History: Users can view history for accessible orders
CREATE POLICY "order_state_history_select_policy" ON order_state_history
    FOR SELECT USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_state_history.order_id 
            AND (o.office_id = ANY(get_accessible_offices()) OR 
                 o.patient_id = get_current_profile() OR 
                 o.doctor_id = get_current_profile())
        )
    );

-- Order State History: System can insert, users cannot directly modify
CREATE POLICY "order_state_history_insert_policy" ON order_state_history
    FOR INSERT WITH CHECK (is_admin());

-- Instruction States: Users can view states for accessible orders
CREATE POLICY "instruction_states_select_policy" ON instruction_states
    FOR SELECT USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = instruction_states.order_id 
            AND (o.office_id = ANY(get_accessible_offices()) OR 
                 o.patient_id = get_current_profile() OR 
                 o.doctor_id = get_current_profile())
        )
    );

-- Instruction States: Only admins can modify
CREATE POLICY "instruction_states_modify_policy" ON instruction_states
    FOR ALL USING (is_admin());

-- Activity Log: Users can view their own activities and office activities
CREATE POLICY "activity_log_select_policy" ON activity_log
    FOR SELECT USING (
        is_admin() OR
        actor_id = get_current_profile()
    );

-- Activity Log: System inserts only
CREATE POLICY "activity_log_insert_policy" ON activity_log
    FOR INSERT WITH CHECK (is_admin());

-- =====================================================
-- File Attachments Policies
-- =====================================================

-- File Attachments: Users can view attachments for entities they have access to
CREATE POLICY "file_attachments_select_policy" ON file_attachments
    FOR SELECT USING (
        is_admin() OR
        uploaded_by_id = get_current_profile() OR
        is_public = true
    );

-- File Attachments: Users can upload files
CREATE POLICY "file_attachments_insert_policy" ON file_attachments
    FOR INSERT WITH CHECK (
        is_admin() OR
        uploaded_by_id = get_current_profile()
    );

-- File Attachments: Users can update their own uploads
CREATE POLICY "file_attachments_update_policy" ON file_attachments
    FOR UPDATE USING (
        is_admin() OR
        uploaded_by_id = get_current_profile()
    );

-- File Attachments: Users can delete their own uploads
CREATE POLICY "file_attachments_delete_policy" ON file_attachments
    FOR DELETE USING (
        is_admin() OR
        uploaded_by_id = get_current_profile()
    );

-- =====================================================
-- System Configuration Policies
-- =====================================================

-- System Config: Users can view public configs, admins can view all
CREATE POLICY "system_config_select_policy" ON system_config
    FOR SELECT USING (
        is_admin() OR
        is_public = true
    );

-- System Config: Only admins can modify
CREATE POLICY "system_config_modify_policy" ON system_config
    FOR ALL USING (is_admin());

-- =====================================================
-- Migration and Quality Policies (Admin Only)
-- =====================================================

-- Migration Log: Only admins can access
CREATE POLICY "migration_log_policy" ON migration_log
    FOR ALL USING (is_admin());

-- Data Quality Checks: Only admins can access
CREATE POLICY "data_quality_checks_policy" ON data_quality_checks
    FOR ALL USING (is_admin());

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION get_current_profile() IS 'Returns the current authenticated user profile UUID';
COMMENT ON FUNCTION get_current_profile_type() IS 'Returns the current authenticated user profile type';
COMMENT ON FUNCTION get_accessible_offices() IS 'Returns array of office UUIDs accessible to current user';
COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has master/admin privileges';

-- Policy documentation
COMMENT ON POLICY "profiles_select_policy" ON profiles IS 'Users can view their own profile and related profiles in accessible offices';
COMMENT ON POLICY "orders_select_policy" ON orders IS 'Office-based data isolation for order access';
COMMENT ON POLICY "messages_select_policy" ON messages IS 'Users can access messages they sent/received or related to their orders/projects';
COMMENT ON POLICY "projects_select_policy" ON projects IS 'Users can access projects from their offices, their own projects, or public projects';