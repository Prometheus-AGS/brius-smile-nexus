#!/usr/bin/env node

import './$node_modules/dotenv/config.js';
import { getSupabaseClient } from './src/services/db.service';
import { createComponentLogger } from './src/utils/logger';

const logger = createComponentLogger('schema-setup');

async function setupSchema() {
  try {
    const supabase = getSupabaseClient();
    
    logger.info('🚀 Setting up database schema...');

    // Create the profiles table first (simplified version without RLS conflicts)
    const profilesSQL = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'technician',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    logger.info('📝 Creating profiles table...');
    const { error: profilesError } = await supabase.rpc('exec_sql', { sql: profilesSQL });
    if (profilesError) {
      console.log('Profiles table creation result:', profilesError);
    } else {
      logger.info('✅ Profiles table created successfully');
    }

    // Create the practices table
    const practicesSQL = `
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
    `;

    logger.info('📝 Creating practices table...');
    const { error: practicesError } = await supabase.rpc('exec_sql', { sql: practicesSQL });
    if (practicesError) {
      console.log('Practices table creation result:', practicesError);
    } else {
      logger.info('✅ Practices table created successfully');
    }

    // Create the patients table (simplified version)
    const patientsSQL = `
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        practice_id UUID REFERENCES practices(id) ON DELETE CASCADE,
        patient_number TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        date_of_birth DATE,
        gender TEXT,
        phone TEXT,
        medical_history JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        emergency_contact JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(practice_id, patient_number)
      );
    `;

    logger.info('📝 Creating patients table...');
    const { error: patientsError } = await supabase.rpc('exec_sql', { sql: patientsSQL });
    if (patientsError) {
      console.log('Patients table creation result:', patientsError);
    } else {
      logger.info('✅ Patients table created successfully');
    }

    // Create the cases table (simplified version)
    const casesSQL = `
      CREATE TABLE IF NOT EXISTS cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        practice_id UUID REFERENCES practices(id) ON DELETE CASCADE,
        case_number TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        case_type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        current_state TEXT NOT NULL DEFAULT 'submitted',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(practice_id, case_number)
      );
    `;

    logger.info('📝 Creating cases table...');
    const { error: casesError } = await supabase.rpc('exec_sql', { sql: casesSQL });
    if (casesError) {
      console.log('Cases table creation result:', casesError);
    } else {
      logger.info('✅ Cases table created successfully');
    }

    logger.info('🎉 Schema setup completed!');

    // Verify tables were created
    const { data: tables, error: listError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'practices', 'patients', 'cases']);

    if (listError) {
      logger.error('Error checking created tables:', listError);
    } else {
      logger.info('📋 Created tables:', tables?.map(t => t.table_name));
    }

  } catch (error) {
    logger.error('💥 Schema setup failed:', error);
    process.exit(1);
  }
}

setupSchema().catch(console.error);