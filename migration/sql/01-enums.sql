-- =====================================================
-- Supabase Schema Creation: Enums and Types
-- =====================================================
-- This script creates all custom types and enums required for the migration
-- Based on legacy Django system analysis and finalized schema design

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- Profile System Enums
-- =====================================================

-- Profile types based on legacy user analysis
CREATE TYPE profile_type AS ENUM (
    'patient',      -- Maps to dispatch_patient records
    'doctor',       -- Detected from user roles and office relationships
    'technician',   -- Staff users with technical roles
    'master',       -- Superuser accounts
    'sales_person', -- Sales team members
    'agent',        -- External agents
    'client'        -- General client accounts
);

-- =====================================================
-- Order Management Enums
-- =====================================================

-- Project types for 3D file management
CREATE TYPE project_type_enum AS ENUM (
    'scan',
    'model', 
    'simulation',
    'treatment_plan',
    'aligner_design',
    'impression',
    'xray',
    'photo',
    'document',
    'other'
);

-- Project status workflow
CREATE TYPE project_status_enum AS ENUM (
    'draft',
    'in_progress',
    'review',
    'approved',
    'archived',
    'deleted'
);

-- Task function types for workflow automation
CREATE TYPE task_function_enum AS ENUM (
    'submit',
    'review',
    'approve',
    'process',
    'notify',
    'archive',
    'scan',
    'model',
    'manufacture',
    'quality_check',
    'ship'
);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TYPE profile_type IS 'User profile types based on legacy system analysis - supports all discovered user categories';
COMMENT ON TYPE project_type_enum IS '3D project types for orthodontic workflow management';
COMMENT ON TYPE project_status_enum IS 'Project lifecycle status for workflow tracking';
COMMENT ON TYPE task_function_enum IS 'Workflow task functions for automation and state transitions';