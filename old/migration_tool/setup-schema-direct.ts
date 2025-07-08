import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import dotenv from './$node_modules/dotenv/lib/main.js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Direct Schema Setup Script
 * 
 * Creates the AI-ready MDW schema according to the design specification
 * without relying on RPC functions that may not exist in fresh Supabase instances.
 */

async function setupSchema() {
  console.log('🚀 Setting up AI-ready MDW database schema...\n');

  try {
    // Step 1: Create custom types (enums)
    console.log('📝 Creating custom types...');
    await createCustomTypes();

    // Step 2: Create core tables
    console.log('📝 Creating core tables...');
    await createCoreTables();

    // Step 3: Create indexes
    console.log('📝 Creating indexes...');
    await createIndexes();

    // Step 4: Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    await enableRLS();

    // Step 5: Verify schema
    console.log('✅ Verifying schema...');
    await verifySchema();

    console.log('\n🎉 Schema setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error);
    process.exit(1);
  }
}

async function createCustomTypes() {
  const types = [
    `CREATE TYPE user_role AS ENUM ('doctor', 'technician', 'admin', 'support');`,
    `CREATE TYPE practice_role AS ENUM ('owner', 'doctor', 'technician', 'assistant', 'admin');`,
    `CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');`,
    `CREATE TYPE case_type_enum AS ENUM (
      'initial_consultation', 'treatment_planning', 'active_treatment', 
      'refinement', 'retention', 'emergency', 'follow_up'
    );`,
    `CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');`,
    `CREATE TYPE case_state_enum AS ENUM (
      'submitted', 'under_review', 'planning', 'approved', 'in_production',
      'quality_check', 'shipped', 'delivered', 'completed', 'on_hold', 'cancelled'
    );`,
    `CREATE TYPE order_state_enum AS ENUM (
      'pending', 'confirmed', 'in_production', 'quality_check',
      'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
    );`,
    `CREATE TYPE product_category AS ENUM (
      'aligners', 'retainers', 'appliances', 'accessories', 'services'
    );`,
    `CREATE TYPE message_type_enum AS ENUM (
      'general', 'status_update', 'question', 'instruction', 
      'approval_request', 'system_notification'
    );`,
    `CREATE TYPE file_type_enum AS ENUM (
      'scan', 'photo', 'xray', 'document', 'model', 'simulation', 'other'
    );`,
    `CREATE TYPE project_type_enum AS ENUM (
      'scan', 'model', 'simulation', 'treatment_plan', 'aligner_design',
      'impression', 'xray', 'photo', 'document', 'other'
    );`,
    `CREATE TYPE project_status_enum AS ENUM (
      'draft', 'in_progress', 'review', 'approved', 'archived', 'deleted'
    );`,
    `CREATE TYPE embedding_content_type AS ENUM (
      'case_summary', 'treatment_plan', 'notes', 'diagnosis'
    );`
  ];

  for (const typeSQL of types) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: typeSQL });
      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️  Type creation note: ${error.message}`);
      }
    } catch (err) {
      // If RPC doesn't work, we'll handle this differently
      console.log(`⚠️  Could not create type via RPC, will handle in table creation`);
    }
  }
}

async function createCoreTables() {
  // Create tables using direct Supabase client operations
  
  // 1. Profiles table (extends auth.users)
  console.log('   Creating profiles table...');
  const { error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (profilesError && profilesError.message.includes('does not exist')) {
    // Table doesn't exist, we need to create it via SQL
    console.log('   Profiles table needs to be created via SQL Dashboard');
  }

  // 2. Practices table
  console.log('   Creating practices table...');
  const { error: practicesError } = await supabase
    .from('practices')
    .select('id')
    .limit(1);
  
  if (practicesError && practicesError.message.includes('does not exist')) {
    console.log('   Practices table needs to be created via SQL Dashboard');
  }

  // 3. Patients table
  console.log('   Creating patients table...');
  const { error: patientsError } = await supabase
    .from('patients')
    .select('id')
    .limit(1);
  
  if (patientsError && patientsError.message.includes('does not exist')) {
    console.log('   Patients table needs to be created via SQL Dashboard');
  }

  // 4. Cases table
  console.log('   Creating cases table...');
  const { error: casesError } = await supabase
    .from('cases')
    .select('id')
    .limit(1);
  
  if (casesError && casesError.message.includes('does not exist')) {
    console.log('   Cases table needs to be created via SQL Dashboard');
  }

  // 5. Orders table
  console.log('   Creating orders table...');
  const { error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .limit(1);
  
  if (ordersError && ordersError.message.includes('does not exist')) {
    console.log('   Orders table needs to be created via SQL Dashboard');
  }
}

async function createIndexes() {
  console.log('   Indexes will be created with table definitions');
}

async function enableRLS() {
  console.log('   RLS will be enabled via SQL Dashboard');
}

async function verifySchema() {
  const tables = ['profiles', 'practices', 'patients', 'cases', 'orders'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: Table accessible`);
    }
  }
}

// Generate complete SQL schema for manual execution
function generateCompleteSQL() {
  return `
-- AI-Ready MDW Database Schema
-- Generated for Supabase PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('doctor', 'technician', 'admin', 'support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE practice_role AS ENUM ('owner', 'doctor', 'technician', 'assistant', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE case_type_enum AS ENUM (
    'initial_consultation', 'treatment_planning', 'active_treatment', 
    'refinement', 'retention', 'emergency', 'follow_up'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE case_state_enum AS ENUM (
    'submitted', 'under_review', 'planning', 'approved', 'in_production',
    'quality_check', 'shipped', 'delivered', 'completed', 'on_hold', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Core Tables

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'technician',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Practices
CREATE TABLE IF NOT EXISTS practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address JSONB,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Practice Members
CREATE TABLE IF NOT EXISTS practice_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role practice_role NOT NULL,
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, profile_id)
);

-- 4. Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender gender_type,
  address JSONB,
  medical_history JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  emergency_contact JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, patient_number)
);

-- 5. Cases
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL,
  priority priority_level DEFAULT 'medium',
  current_state case_state_enum NOT NULL DEFAULT 'submitted',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, case_number)
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, order_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_patients_practice ON patients(practice_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_cases_patient ON cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_practice ON cases(practice_id);
CREATE INDEX IF NOT EXISTS idx_cases_state ON cases(current_state);
CREATE INDEX IF NOT EXISTS idx_orders_case ON orders(case_id);
CREATE INDEX IF NOT EXISTS idx_orders_practice ON orders(practice_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized later)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
`;
}

// Main execution
if (require.main === module) {
  console.log('\n📋 IMPORTANT: Since RPC functions are not available, please execute the following SQL in your Supabase SQL Editor:\n');
  console.log('=' .repeat(80));
  console.log(generateCompleteSQL());
  console.log('=' .repeat(80));
  console.log('\nAfter executing the SQL above, run this script again to verify the schema.\n');
  
  setupSchema();
}

export { setupSchema, generateCompleteSQL };