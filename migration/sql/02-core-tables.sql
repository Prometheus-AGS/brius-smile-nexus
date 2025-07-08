-- =====================================================
-- Supabase Schema Creation: Core Tables
-- =====================================================
-- This script creates the core tables: profiles, offices, order_types, order_states
-- Based on legacy database analysis with corrected constraints for data migration

-- =====================================================
-- Profiles Table (Users + Patients)
-- =====================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id INTEGER UNIQUE, -- Maps to auth_user.id from legacy
    legacy_patient_id INTEGER, -- Maps to dispatch_patient.id for patients
    profile_type profile_type NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    email TEXT, -- NULLABLE: 87% of users have no email address
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Patient-specific fields (populated for profile_type = 'patient')
    insurance_provider TEXT,
    insurance_id TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_history TEXT,
    allergies TEXT,
    medications TEXT,
    
    -- Professional fields (for doctors, technicians, etc.)
    license_number TEXT,
    specialties TEXT[],
    credentials JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles indexes
CREATE INDEX idx_profiles_legacy_user_id ON profiles(legacy_user_id);
CREATE INDEX idx_profiles_legacy_patient_id ON profiles(legacy_patient_id);
CREATE INDEX idx_profiles_profile_type ON profiles(profile_type);
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL; -- Partial index for non-null emails
CREATE INDEX idx_profiles_name_search ON profiles USING gin(
    (first_name || ' ' || last_name) gin_trgm_ops
);
CREATE INDEX idx_profiles_active ON profiles(is_active);
CREATE INDEX idx_profiles_created ON profiles(created_at);

-- =====================================================
-- Offices Table
-- =====================================================

CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_office_id INTEGER UNIQUE, -- Maps to dispatch_office.id
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    phone TEXT,
    email TEXT,
    website TEXT,
    license_number TEXT,
    tax_rate DECIMAL(5,4) DEFAULT 0.0000, -- Maps to dispatch_office.tax_rate
    square_customer_id TEXT, -- Maps to dispatch_office.sq_customer_id
    emails_enabled BOOLEAN DEFAULT true, -- Maps to dispatch_office.emails
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offices indexes
CREATE INDEX idx_offices_legacy_id ON offices(legacy_office_id);
CREATE INDEX idx_offices_is_active ON offices(is_active);
CREATE INDEX idx_offices_name ON offices(name);

-- =====================================================
-- Doctor-Office Relationships
-- =====================================================

CREATE TABLE doctor_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'doctor',
    permissions JSONB DEFAULT '{}',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, office_id),
    CONSTRAINT check_doctor_profile_type CHECK (
        (SELECT profile_type FROM profiles WHERE id = doctor_id) = 'doctor'
    )
);

-- Doctor-Office indexes
CREATE INDEX idx_doctor_offices_doctor ON doctor_offices(doctor_id);
CREATE INDEX idx_doctor_offices_office ON doctor_offices(office_id);
CREATE INDEX idx_doctor_offices_active ON doctor_offices(is_active);
CREATE INDEX idx_doctor_offices_primary ON doctor_offices(is_primary);

-- =====================================================
-- Order Types (Course Types from Legacy)
-- =====================================================

CREATE TABLE order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_course_id INTEGER UNIQUE, -- Maps to dispatch_course.id
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE, -- kebab-case identifier
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2) DEFAULT 0.00, -- Base pricing for order type
    schema JSONB, -- JSON schema for data validation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Types indexes
CREATE INDEX idx_order_types_legacy_id ON order_types(legacy_course_id);
CREATE INDEX idx_order_types_key ON order_types(key);
CREATE INDEX idx_order_types_active ON order_types(is_active);

-- =====================================================
-- Order States (Workflow States)
-- =====================================================

CREATE TABLE order_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_state_id INTEGER UNIQUE, -- Maps to dispatch_state status codes
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT, -- for UI representation
    sequence_order INTEGER, -- for workflow ordering
    is_initial BOOLEAN DEFAULT false,
    is_final BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order States indexes
CREATE INDEX idx_order_states_sequence ON order_states(sequence_order);
CREATE INDEX idx_order_states_legacy_id ON order_states(legacy_state_id);
CREATE INDEX idx_order_states_key ON order_states(key);
CREATE INDEX idx_order_states_active ON order_states(is_active);

-- =====================================================
-- Insert Default Order States
-- =====================================================
-- Based on legacy dispatch_state analysis

INSERT INTO order_states (name, key, description, sequence_order, legacy_state_id, color, is_initial, is_final) VALUES
    ('Submitted', 'submitted', 'Order has been submitted', 1, 1, '#3B82F6', true, false),
    ('Under Review', 'under_review', 'Order is being reviewed', 2, 2, '#F59E0B', false, false),
    ('Planning', 'planning', 'Treatment planning in progress', 3, 3, '#8B5CF6', false, false),
    ('Approved', 'approved', 'Order has been approved', 4, 4, '#10B981', false, false),
    ('In Production', 'in_production', 'Order is being manufactured', 5, 5, '#F97316', false, false),
    ('Quality Check', 'quality_check', 'Quality assurance review', 6, 6, '#06B6D4', false, false),
    ('Shipped', 'shipped', 'Order has been shipped', 7, 7, '#84CC16', false, false),
    ('Delivered', 'delivered', 'Order has been delivered', 8, 8, '#22C55E', false, false),
    ('Completed', 'completed', 'Order is complete', 9, 9, '#059669', false, true),
    ('On Hold', 'on_hold', 'Order is temporarily paused', 10, 10, '#6B7280', false, false),
    ('Cancelled', 'cancelled', 'Order has been cancelled', 11, 11, '#EF4444', false, true);

-- =====================================================
-- Insert Default Order Types
-- =====================================================
-- Based on legacy dispatch_course analysis

INSERT INTO order_types (name, key, description, category, base_price) VALUES
    ('Main Treatment', 'main', 'Primary orthodontic treatment', 'treatment', 2500.00),
    ('Refinement', 'refinement', 'Treatment refinement and adjustments', 'treatment', 500.00),
    ('Replacement', 'replacement', 'Replacement of orthodontic appliances', 'replacement', 300.00),
    ('Retainer', 'retainer', 'Post-treatment retention phase', 'retention', 200.00),
    ('Emergency', 'emergency', 'Emergency orthodontic care', 'emergency', 150.00),
    ('Consultation', 'consultation', 'Initial consultation and assessment', 'consultation', 100.00);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE profiles IS 'Unified user profiles combining auth_user and dispatch_patient data with nullable email constraint';
COMMENT ON TABLE offices IS 'Dental/orthodontic office information with legacy mapping';
COMMENT ON TABLE doctor_offices IS 'Many-to-many relationship between doctors and offices';
COMMENT ON TABLE order_types IS 'Order/course types defining treatment categories';
COMMENT ON TABLE order_states IS 'Workflow states for order processing with sequence ordering';

COMMENT ON COLUMN profiles.email IS 'Nullable email field - 87% of legacy users have no email address';
COMMENT ON COLUMN profiles.legacy_user_id IS 'Maps to auth_user.id for backward compatibility';
COMMENT ON COLUMN profiles.legacy_patient_id IS 'Maps to dispatch_patient.id for patient records';