-- =====================================================
-- Supabase Schema Creation: Performance Indexes
-- =====================================================
-- This script creates additional performance indexes for production workloads
-- Based on expected query patterns and data access requirements

-- =====================================================
-- Composite Indexes for Common Query Patterns
-- =====================================================

-- Profile search and filtering
CREATE INDEX idx_profiles_type_active ON profiles(profile_type, is_active);
CREATE INDEX idx_profiles_email_active ON profiles(email, is_active) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_legacy_mapping ON profiles(legacy_user_id, legacy_patient_id);

-- Office and doctor relationships
CREATE INDEX idx_doctor_offices_office_active ON doctor_offices(office_id, is_active);
CREATE INDEX idx_doctor_offices_doctor_primary ON doctor_offices(doctor_id, is_primary);

-- Order management and workflow
CREATE INDEX idx_orders_office_state ON orders(office_id, current_state_id);
CREATE INDEX idx_orders_doctor_created ON orders(doctor_id, created_at DESC);
CREATE INDEX idx_orders_patient_created ON orders(patient_id, created_at DESC);
CREATE INDEX idx_orders_type_state ON orders(order_type_id, current_state_id);
CREATE INDEX idx_orders_submitted_state ON orders(submitted_at, current_state_id) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_orders_active_orders ON orders(current_state_id, created_at DESC) WHERE is_deleted = false;

-- Project management
CREATE INDEX idx_projects_office_status ON projects(office_id, status);
CREATE INDEX idx_projects_creator_created ON projects(creator_id, created_at DESC);
CREATE INDEX idx_projects_order_status ON projects(order_id, status) WHERE order_id IS NOT NULL;
CREATE INDEX idx_projects_type_status ON projects(project_type, status);

-- Message and communication
CREATE INDEX idx_messages_order_created ON messages(order_id, created_at DESC) WHERE order_id IS NOT NULL;
CREATE INDEX idx_messages_project_created ON messages(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_messages_type_created ON messages(message_type_id, created_at DESC);

-- State tracking and audit
CREATE INDEX idx_order_state_history_order_created ON order_state_history(order_id, created_at DESC);
CREATE INDEX idx_instruction_states_order_status ON instruction_states(order_id, status_code, is_active);
CREATE INDEX idx_instruction_states_legacy_mapping ON instruction_states(legacy_instruction_id, legacy_actor_id);

-- Activity logging
CREATE INDEX idx_activity_log_entity_created ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_log_actor_created ON activity_log(actor_id, created_at DESC);

-- File management
CREATE INDEX idx_file_attachments_entity_created ON file_attachments(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_file_attachments_uploader_created ON file_attachments(uploaded_by_id, created_at DESC);

-- =====================================================
-- Partial Indexes for Specific Conditions
-- =====================================================

-- Active records only
CREATE INDEX idx_profiles_active_email ON profiles(email) WHERE is_active = true AND email IS NOT NULL;
CREATE INDEX idx_offices_active_name ON offices(name) WHERE is_active = true;
CREATE INDEX idx_order_types_active_key ON order_types(key) WHERE is_active = true;
CREATE INDEX idx_order_states_active_sequence ON order_states(sequence_order) WHERE is_active = true;

-- Non-deleted orders
CREATE INDEX idx_orders_active_patient ON orders(patient_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_orders_active_doctor ON orders(doctor_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_orders_active_office ON orders(office_id, created_at DESC) WHERE is_deleted = false;

-- Unread messages
CREATE INDEX idx_messages_unread_recipient ON messages(recipient_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_messages_unread_order ON messages(order_id, created_at DESC) WHERE is_read = false AND order_id IS NOT NULL;

-- Public projects
CREATE INDEX idx_projects_public_created ON projects(created_at DESC) WHERE is_public = true;

-- =====================================================
-- Full-Text Search Indexes
-- =====================================================

-- Profile name search (already created in core tables, but adding variations)
CREATE INDEX idx_profiles_full_name_gin ON profiles USING gin(
    (COALESCE(first_name, '') || ' ' || COALESCE(middle_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops
);

-- Order content search
CREATE INDEX idx_orders_content_search ON orders USING gin(
    (COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')) gin_trgm_ops
);

-- Project name and description search
CREATE INDEX idx_projects_content_search ON projects USING gin(
    (COALESCE(name, '') || ' ' || COALESCE(description, '')) gin_trgm_ops
);

-- Message content search
CREATE INDEX idx_messages_content_search ON messages USING gin(
    (COALESCE(subject, '') || ' ' || COALESCE(body, '')) gin_trgm_ops
);

-- =====================================================
-- JSON/JSONB Indexes for Metadata
-- =====================================================

-- Profile metadata search
CREATE INDEX idx_profiles_metadata_gin ON profiles USING gin(metadata);
CREATE INDEX idx_profiles_credentials_gin ON profiles USING gin(credentials);

-- Order data search
CREATE INDEX idx_orders_data_gin ON orders USING gin(data);
CREATE INDEX idx_orders_metadata_gin ON orders USING gin(metadata);

-- Project metadata search
CREATE INDEX idx_projects_metadata_gin ON projects USING gin(metadata);

-- Message attachments
CREATE INDEX idx_messages_attachments_gin ON messages USING gin(attachments);

-- System config values
CREATE INDEX idx_system_config_value_gin ON system_config USING gin(config_value);

-- =====================================================
-- Time-based Indexes for Analytics
-- =====================================================

-- Daily/monthly aggregations
CREATE INDEX idx_orders_created_date ON orders(DATE(created_at));
CREATE INDEX idx_orders_submitted_date ON orders(DATE(submitted_at)) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_projects_created_date ON projects(DATE(created_at));
CREATE INDEX idx_messages_created_date ON messages(DATE(created_at));

-- State change analytics
CREATE INDEX idx_order_state_history_date ON order_state_history(DATE(created_at));
CREATE INDEX idx_instruction_states_changed_date ON instruction_states(DATE(changed_at));

-- Activity analytics
CREATE INDEX idx_activity_log_date_action ON activity_log(DATE(created_at), action_type);

-- =====================================================
-- Legacy ID Mapping Indexes
-- =====================================================

-- Comprehensive legacy mapping for migration validation
CREATE INDEX idx_profiles_all_legacy ON profiles(legacy_user_id, legacy_patient_id) WHERE legacy_user_id IS NOT NULL;
CREATE INDEX idx_orders_legacy_complete ON orders(legacy_instruction_id) WHERE legacy_instruction_id IS NOT NULL;
CREATE INDEX idx_projects_legacy_complete ON projects(legacy_project_id, legacy_uid) WHERE legacy_project_id IS NOT NULL;
CREATE INDEX idx_messages_legacy_complete ON messages(legacy_record_id) WHERE legacy_record_id IS NOT NULL;
CREATE INDEX idx_instruction_states_legacy_complete ON instruction_states(legacy_state_id, legacy_instruction_id) WHERE legacy_state_id IS NOT NULL;

-- =====================================================
-- Workflow and State Machine Indexes
-- =====================================================

-- Workflow template performance
CREATE INDEX idx_workflow_tasks_template_order ON workflow_tasks(workflow_template_id, task_order);
CREATE INDEX idx_workflow_tasks_function_roles ON workflow_tasks USING gin(required_roles);

-- State transition performance
CREATE INDEX idx_order_states_workflow ON order_states(sequence_order, is_initial, is_final);

-- =====================================================
-- Data Quality and Migration Indexes
-- =====================================================

-- Migration tracking
CREATE INDEX idx_migration_log_phase_status ON migration_log(phase_number, status);
CREATE INDEX idx_migration_log_entity_status ON migration_log(entity_type, status);

-- Data quality monitoring
CREATE INDEX idx_data_quality_checks_entity_status ON data_quality_checks(entity_type, status);
CREATE INDEX idx_data_quality_checks_name_checked ON data_quality_checks(check_name, checked_at DESC);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON INDEX idx_profiles_type_active IS 'Composite index for profile filtering by type and active status';
COMMENT ON INDEX idx_orders_office_state IS 'Composite index for office-specific order state queries';
COMMENT ON INDEX idx_messages_unread_recipient IS 'Partial index for unread messages per recipient';
COMMENT ON INDEX idx_profiles_full_name_gin IS 'Full-text search index for complete profile names';
COMMENT ON INDEX idx_orders_content_search IS 'Full-text search index for order content';
COMMENT ON INDEX idx_profiles_metadata_gin IS 'GIN index for profile metadata JSON queries';
COMMENT ON INDEX idx_orders_created_date IS 'Date-based index for daily order analytics';
COMMENT ON INDEX idx_profiles_all_legacy IS 'Comprehensive legacy ID mapping for migration validation';