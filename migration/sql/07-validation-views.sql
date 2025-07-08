-- =====================================================
-- Supabase Schema Creation: Validation Views and Functions
-- =====================================================
-- This script creates views and functions for migration validation and monitoring
-- Based on data quality requirements and migration success criteria

-- =====================================================
-- Migration Validation Views
-- =====================================================

-- View: Migration Summary Statistics
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_user_id) as records_with_legacy_id,
    COUNT(CASE WHEN profile_type = 'patient' THEN 1 END) as patient_records,
    COUNT(CASE WHEN profile_type = 'doctor' THEN 1 END) as doctor_records,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as records_with_email
FROM profiles
UNION ALL
SELECT 
    'offices' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_office_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    0 as doctor_records,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as records_with_email
FROM offices
UNION ALL
SELECT 
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_instruction_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_records,
    0 as doctor_records,
    0 as records_with_email
FROM orders
UNION ALL
SELECT 
    'projects' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_project_id) as records_with_legacy_id,
    COUNT(CASE WHEN status != 'deleted' THEN 1 END) as active_records,
    0 as doctor_records,
    0 as records_with_email
FROM projects
UNION ALL
SELECT 
    'messages' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_record_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_records,
    0 as doctor_records,
    0 as records_with_email
FROM messages
UNION ALL
SELECT 
    'instruction_states' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_state_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    0 as doctor_records,
    0 as records_with_email
FROM instruction_states;

-- View: Data Quality Issues
CREATE OR REPLACE VIEW data_quality_issues AS
SELECT 
    'profiles' as table_name,
    'missing_names' as issue_type,
    COUNT(*) as issue_count,
    'Profiles with empty first_name or last_name' as description
FROM profiles 
WHERE first_name = '' OR last_name = '' OR first_name IS NULL OR last_name IS NULL
UNION ALL
SELECT 
    'profiles' as table_name,
    'orphaned_patients' as issue_type,
    COUNT(*) as issue_count,
    'Patient profiles without legacy_patient_id' as description
FROM profiles 
WHERE profile_type = 'patient' AND legacy_patient_id IS NULL
UNION ALL
SELECT 
    'orders' as table_name,
    'missing_relationships' as issue_type,
    COUNT(*) as issue_count,
    'Orders with invalid patient or doctor references' as description
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.patient_id)
   OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.doctor_id)
   OR NOT EXISTS (SELECT 1 FROM offices of WHERE of.id = o.office_id)
UNION ALL
SELECT 
    'projects' as table_name,
    'missing_relationships' as issue_type,
    COUNT(*) as issue_count,
    'Projects with invalid creator or office references' as description
FROM projects pr
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = pr.creator_id)
   OR NOT EXISTS (SELECT 1 FROM offices of WHERE of.id = pr.office_id)
UNION ALL
SELECT 
    'messages' as table_name,
    'orphaned_messages' as issue_type,
    COUNT(*) as issue_count,
    'Messages without valid order or project reference' as description
FROM messages m
WHERE (m.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = m.order_id))
   OR (m.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = m.project_id));

-- View: Legacy ID Mapping Validation
CREATE OR REPLACE VIEW legacy_mapping_validation AS
SELECT 
    'profiles' as table_name,
    COUNT(DISTINCT legacy_user_id) as unique_legacy_ids,
    COUNT(*) as total_records,
    COUNT(CASE WHEN legacy_user_id IS NOT NULL THEN 1 END) as mapped_records,
    ROUND(
        (COUNT(CASE WHEN legacy_user_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as mapping_percentage
FROM profiles
UNION ALL
SELECT 
    'orders' as table_name,
    COUNT(DISTINCT legacy_instruction_id) as unique_legacy_ids,
    COUNT(*) as total_records,
    COUNT(CASE WHEN legacy_instruction_id IS NOT NULL THEN 1 END) as mapped_records,
    ROUND(
        (COUNT(CASE WHEN legacy_instruction_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as mapping_percentage
FROM orders
UNION ALL
SELECT 
    'projects' as table_name,
    COUNT(DISTINCT legacy_project_id) as unique_legacy_ids,
    COUNT(*) as total_records,
    COUNT(CASE WHEN legacy_project_id IS NOT NULL THEN 1 END) as mapped_records,
    ROUND(
        (COUNT(CASE WHEN legacy_project_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as mapping_percentage
FROM projects
UNION ALL
SELECT 
    'messages' as table_name,
    COUNT(DISTINCT legacy_record_id) as unique_legacy_ids,
    COUNT(*) as total_records,
    COUNT(CASE WHEN legacy_record_id IS NOT NULL THEN 1 END) as mapped_records,
    ROUND(
        (COUNT(CASE WHEN legacy_record_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as mapping_percentage
FROM messages;

-- View: Workflow State Distribution
CREATE OR REPLACE VIEW workflow_state_distribution AS
SELECT 
    os.name as state_name,
    os.key as state_key,
    os.sequence_order,
    COUNT(o.id) as order_count,
    ROUND((COUNT(o.id)::DECIMAL / (SELECT COUNT(*) FROM orders)) * 100, 2) as percentage
FROM order_states os
LEFT JOIN orders o ON o.current_state_id = os.id
GROUP BY os.id, os.name, os.key, os.sequence_order
ORDER BY os.sequence_order;

-- View: Office Activity Summary
CREATE OR REPLACE VIEW office_activity_summary AS
SELECT 
    of.name as office_name,
    of.id as office_id,
    COUNT(DISTINCT do.doctor_id) as doctor_count,
    COUNT(DISTINCT o.patient_id) as patient_count,
    COUNT(o.id) as total_orders,
    COUNT(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
    COUNT(p.id) as total_projects,
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as projects_last_30_days
FROM offices of
LEFT JOIN doctor_offices do ON do.office_id = of.id AND do.is_active = true
LEFT JOIN orders o ON o.office_id = of.id AND o.is_deleted = false
LEFT JOIN projects p ON p.office_id = of.id AND p.status != 'deleted'
GROUP BY of.id, of.name
ORDER BY total_orders DESC;

-- =====================================================
-- Migration Validation Functions
-- =====================================================

-- Function: Validate Migration Completeness
CREATE OR REPLACE FUNCTION validate_migration_completeness()
RETURNS TABLE(
    validation_name TEXT,
    expected_count BIGINT,
    actual_count BIGINT,
    status TEXT,
    notes TEXT
) AS $$
BEGIN
    -- Note: Expected counts should be updated based on actual legacy database analysis
    RETURN QUERY
    SELECT 
        'Total Profiles'::TEXT,
        9101::BIGINT, -- Expected from legacy analysis
        (SELECT COUNT(*) FROM profiles)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM profiles) >= 9101 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Should have migrated all 9,101 users from auth_user'::TEXT
    UNION ALL
    SELECT 
        'Patient Profiles'::TEXT,
        7849::BIGINT, -- Expected from legacy analysis
        (SELECT COUNT(*) FROM profiles WHERE profile_type = 'patient')::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM profiles WHERE profile_type = 'patient') >= 7849 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Should have migrated all 7,849 patients from dispatch_patient'::TEXT
    UNION ALL
    SELECT 
        'Total Orders'::TEXT,
        23265::BIGINT, -- Expected from legacy analysis
        (SELECT COUNT(*) FROM orders)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM orders) >= 23265 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Should have migrated all 23,265 instructions from dispatch_instruction'::TEXT
    UNION ALL
    SELECT 
        'Legacy ID Mapping - Profiles'::TEXT,
        100::BIGINT,
        (SELECT ROUND((COUNT(CASE WHEN legacy_user_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100) FROM profiles)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(CASE WHEN legacy_user_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*) FROM profiles) >= 0.95 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'At least 95% of profiles should have legacy_user_id mapping'::TEXT
    UNION ALL
    SELECT 
        'Email Field Handling'::TEXT,
        13::BIGINT, -- Expected percentage with emails
        (SELECT ROUND((COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100) FROM profiles)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*) FROM profiles) BETWEEN 0.10 AND 0.20 THEN 'PASS'
            ELSE 'WARNING'
        END::TEXT,
        'Should reflect legacy pattern: ~13% of users have email addresses'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function: Check Data Integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    table_name TEXT,
    issue_count BIGINT,
    status TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Foreign Key Integrity - Orders to Profiles'::TEXT,
        'orders'::TEXT,
        (SELECT COUNT(*) FROM orders o 
         WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.patient_id)
            OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.doctor_id))::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM orders o 
                  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.patient_id)
                     OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.doctor_id)) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'All orders should have valid patient and doctor references'::TEXT
    UNION ALL
    SELECT 
        'Foreign Key Integrity - Orders to Offices'::TEXT,
        'orders'::TEXT,
        (SELECT COUNT(*) FROM orders o 
         WHERE NOT EXISTS (SELECT 1 FROM offices of WHERE of.id = o.office_id))::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM orders o 
                  WHERE NOT EXISTS (SELECT 1 FROM offices of WHERE of.id = o.office_id)) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'All orders should have valid office references'::TEXT
    UNION ALL
    SELECT 
        'Profile Type Consistency'::TEXT,
        'profiles'::TEXT,
        (SELECT COUNT(*) FROM profiles 
         WHERE profile_type = 'patient' AND legacy_patient_id IS NULL)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM profiles 
                  WHERE profile_type = 'patient' AND legacy_patient_id IS NULL) = 0 THEN 'PASS'
            ELSE 'WARNING'
        END::TEXT,
        'Patient profiles should have legacy_patient_id'::TEXT
    UNION ALL
    SELECT 
        'Order Number Uniqueness'::TEXT,
        'orders'::TEXT,
        (SELECT COUNT(*) - COUNT(DISTINCT order_number) FROM orders)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) - COUNT(DISTINCT order_number) FROM orders) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'All orders should have unique order numbers'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Migration Report
CREATE OR REPLACE FUNCTION generate_migration_report()
RETURNS TABLE(
    section TEXT,
    metric TEXT,
    value TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Summary Statistics
    SELECT 
        'Summary'::TEXT,
        'Total Profiles Migrated'::TEXT,
        (SELECT COUNT(*)::TEXT FROM profiles),
        'INFO'::TEXT
    UNION ALL
    SELECT 
        'Summary'::TEXT,
        'Total Orders Migrated'::TEXT,
        (SELECT COUNT(*)::TEXT FROM orders),
        'INFO'::TEXT
    UNION ALL
    SELECT 
        'Summary'::TEXT,
        'Total Projects Migrated'::TEXT,
        (SELECT COUNT(*)::TEXT FROM projects),
        'INFO'::TEXT
    UNION ALL
    SELECT 
        'Summary'::TEXT,
        'Total Messages Migrated'::TEXT,
        (SELECT COUNT(*)::TEXT FROM messages),
        'INFO'::TEXT
    UNION ALL
    -- Data Quality
    SELECT 
        'Data Quality'::TEXT,
        'Profiles with Email'::TEXT,
        (SELECT ROUND((COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 1)::TEXT || '%' FROM profiles),
        'INFO'::TEXT
    UNION ALL
    SELECT 
        'Data Quality'::TEXT,
        'Orders with Legacy Mapping'::TEXT,
        (SELECT ROUND((COUNT(CASE WHEN legacy_instruction_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 1)::TEXT || '%' FROM orders),
        CASE 
            WHEN (SELECT COUNT(CASE WHEN legacy_instruction_id IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*) FROM orders) >= 0.95 THEN 'PASS'
            ELSE 'WARNING'
        END::TEXT
    UNION ALL
    -- Performance Metrics
    SELECT 
        'Performance'::TEXT,
        'Active Offices'::TEXT,
        (SELECT COUNT(*)::TEXT FROM offices WHERE is_active = true),
        'INFO'::TEXT
    UNION ALL
    SELECT 
        'Performance'::TEXT,
        'Active Orders (Non-Deleted)'::TEXT,
        (SELECT COUNT(*)::TEXT FROM orders WHERE is_deleted = false),
        'INFO'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Materialized Views for Performance
-- =====================================================

-- Materialized View: Daily Order Statistics
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as orders_created,
    COUNT(DISTINCT patient_id) as unique_patients,
    COUNT(DISTINCT doctor_id) as unique_doctors,
    COUNT(DISTINCT office_id) as unique_offices
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- Index for materialized view
CREATE INDEX idx_daily_order_stats_date ON daily_order_stats(order_date);

-- Materialized View: Office Performance Metrics
CREATE MATERIALIZED VIEW office_performance_metrics AS
SELECT 
    of.id as office_id,
    of.name as office_name,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT o.patient_id) as total_patients,
    COUNT(DISTINCT do.doctor_id) as total_doctors,
    AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/86400) as avg_order_duration_days,
    COUNT(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as orders_last_30_days
FROM offices of
LEFT JOIN orders o ON o.office_id = of.id AND o.is_deleted = false
LEFT JOIN doctor_offices do ON do.office_id = of.id AND do.is_active = true
GROUP BY of.id, of.name;

-- Index for office performance
CREATE INDEX idx_office_performance_office_id ON office_performance_metrics(office_id);

-- =====================================================
-- Refresh Functions for Materialized Views
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS TEXT AS $$
BEGIN
    REFRESH MATERIALIZED VIEW daily_order_stats;
    REFRESH MATERIALIZED VIEW office_performance_metrics;
    RETURN 'Performance views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON VIEW migration_summary IS 'High-level migration statistics for all major tables';
COMMENT ON VIEW data_quality_issues IS 'Identifies data quality problems that need attention';
COMMENT ON VIEW legacy_mapping_validation IS 'Validates legacy ID mapping completeness';
COMMENT ON VIEW workflow_state_distribution IS 'Shows distribution of orders across workflow states';
COMMENT ON VIEW office_activity_summary IS 'Office-level activity and performance metrics';

COMMENT ON FUNCTION validate_migration_completeness() IS 'Validates migration against expected record counts from legacy analysis';
COMMENT ON FUNCTION check_data_integrity() IS 'Performs comprehensive data integrity checks';
COMMENT ON FUNCTION generate_migration_report() IS 'Generates comprehensive migration success report';
COMMENT ON FUNCTION refresh_performance_views() IS 'Refreshes all materialized views for performance monitoring';

COMMENT ON MATERIALIZED VIEW daily_order_stats IS 'Daily aggregated order statistics for performance monitoring';
COMMENT ON MATERIALIZED VIEW office_performance_metrics IS 'Office-level performance and activity metrics';