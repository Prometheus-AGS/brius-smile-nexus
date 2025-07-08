-- Create Test Legacy Data for Migration Testing
-- This creates sample Django-style legacy data to test the migration tool

-- Create legacy Django tables with sample data
-- Based on the legacy database structure documentation

-- 1. Create auth_user table (Django's default user table)
CREATE TABLE IF NOT EXISTS auth_user (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) UNIQUE NOT NULL,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create dispatch_office table (practices)
CREATE TABLE IF NOT EXISTS dispatch_office (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(254),
    license_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create dispatch_client table (patients)
CREATE TABLE IF NOT EXISTS dispatch_client (
    id SERIAL PRIMARY KEY,
    office_id INTEGER REFERENCES dispatch_office(id),
    client_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    medical_history TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create dispatch_patient table (cases)
CREATE TABLE IF NOT EXISTS dispatch_patient (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES dispatch_client(id),
    office_id INTEGER REFERENCES dispatch_office(id),
    case_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(50) NOT NULL DEFAULT 'initial_consultation',
    priority VARCHAR(20) DEFAULT 'medium',
    current_state VARCHAR(50) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create dispatch_order table (orders)
CREATE TABLE IF NOT EXISTS dispatch_order (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES dispatch_patient(id),
    office_id INTEGER REFERENCES dispatch_office(id),
    order_number VARCHAR(50) NOT NULL,
    current_state VARCHAR(50) NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample test data

-- Sample users
INSERT INTO auth_user (username, first_name, last_name, email, password) VALUES
('dr_smith', 'John', 'Smith', 'john.smith@example.com', 'pbkdf2_sha256$test'),
('dr_jones', 'Sarah', 'Jones', 'sarah.jones@example.com', 'pbkdf2_sha256$test'),
('tech_mike', 'Mike', 'Johnson', 'mike.johnson@example.com', 'pbkdf2_sha256$test')
ON CONFLICT (username) DO NOTHING;

-- Sample practices/offices
INSERT INTO dispatch_office (name, address, phone, email, license_number) VALUES
('Smile Dental Practice', '123 Main St, Anytown, ST 12345', '555-0123', 'info@smiledental.com', 'LIC001'),
('Perfect Teeth Clinic', '456 Oak Ave, Somewhere, ST 67890', '555-0456', 'contact@perfectteeth.com', 'LIC002')
ON CONFLICT DO NOTHING;

-- Sample clients/patients
INSERT INTO dispatch_client (office_id, client_number, first_name, last_name, email, phone, date_of_birth, gender, address) VALUES
(1, 'PAT001', 'Alice', 'Johnson', 'alice.johnson@email.com', '555-1001', '1985-03-15', 'female', '789 Pine St, Anytown, ST 12345'),
(1, 'PAT002', 'Bob', 'Williams', 'bob.williams@email.com', '555-1002', '1978-07-22', 'male', '321 Elm St, Anytown, ST 12345'),
(2, 'PAT003', 'Carol', 'Davis', 'carol.davis@email.com', '555-1003', '1992-11-08', 'female', '654 Maple Ave, Somewhere, ST 67890'),
(1, 'PAT004', 'David', 'Miller', 'david.miller@email.com', '555-1004', '1980-05-30', 'male', '987 Cedar Ln, Anytown, ST 12345'),
(2, 'PAT005', 'Emma', 'Wilson', 'emma.wilson@email.com', '555-1005', '1995-09-12', 'female', '147 Birch Dr, Somewhere, ST 67890')
ON CONFLICT DO NOTHING;

-- Sample cases/patients
INSERT INTO dispatch_patient (client_id, office_id, case_number, title, description, case_type, priority, current_state) VALUES
(1, 1, 'CASE001', 'Initial Consultation - Alice Johnson', 'Initial orthodontic consultation and treatment planning', 'initial_consultation', 'medium', 'submitted'),
(2, 1, 'CASE002', 'Active Treatment - Bob Williams', 'Clear aligner treatment in progress', 'active_treatment', 'high', 'in_production'),
(3, 2, 'CASE003', 'Treatment Planning - Carol Davis', 'Comprehensive treatment plan development', 'treatment_planning', 'medium', 'planning'),
(4, 1, 'CASE004', 'Refinement - David Miller', 'Mid-course correction and refinement', 'refinement', 'low', 'approved'),
(5, 2, 'CASE005', 'Retention - Emma Wilson', 'Post-treatment retention phase', 'retention', 'medium', 'completed')
ON CONFLICT DO NOTHING;

-- Sample orders
INSERT INTO dispatch_order (patient_id, office_id, order_number, current_state, subtotal, tax_amount, total_amount, notes) VALUES
(1, 1, 'ORD001', 'pending', 2500.00, 200.00, 2700.00, 'Initial aligner set order'),
(2, 1, 'ORD002', 'in_production', 3000.00, 240.00, 3240.00, 'Full treatment aligner series'),
(3, 2, 'ORD003', 'confirmed', 2800.00, 224.00, 3024.00, 'Comprehensive treatment package'),
(4, 1, 'ORD004', 'shipped', 800.00, 64.00, 864.00, 'Refinement aligner set'),
(5, 2, 'ORD005', 'delivered', 400.00, 32.00, 432.00, 'Retention appliances')
ON CONFLICT DO NOTHING;

-- Verify data was inserted
SELECT 'Test legacy data created successfully!' as status;

-- Show record counts
SELECT 
    'auth_user' as table_name, COUNT(*) as record_count FROM auth_user
UNION ALL
SELECT 
    'dispatch_office' as table_name, COUNT(*) as record_count FROM dispatch_office
UNION ALL
SELECT 
    'dispatch_client' as table_name, COUNT(*) as record_count FROM dispatch_client
UNION ALL
SELECT 
    'dispatch_patient' as table_name, COUNT(*) as record_count FROM dispatch_patient
UNION ALL
SELECT 
    'dispatch_order' as table_name, COUNT(*) as record_count FROM dispatch_order
ORDER BY table_name;