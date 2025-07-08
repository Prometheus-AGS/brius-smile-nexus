#!/usr/bin/env node

import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import * as dotenv from './$node_modules/dotenv/lib/main.js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseInsert() {
  console.log('🧪 Testing database insert with a single record...\n');

  // Test 1: Simple profiles insert
  console.log('📝 Testing profiles table insert...');
  const testProfile = {
    id: 'test-profile-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select();

    if (error) {
      console.error('❌ PROFILES INSERT ERROR:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Full Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Profiles insert successful:', data);
      
      // Clean up test data
      await supabase.from('profiles').delete().eq('id', 'test-profile-123');
      console.log('🧹 Test data cleaned up');
    }
  } catch (err) {
    console.error('❌ UNEXPECTED ERROR:', err);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Simple patients insert
  console.log('📝 Testing patients table insert...');
  const testPatient = {
    id: 'test-patient-123',
    first_name: 'Test',
    last_name: 'Patient',
    date_of_birth: '1990-01-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([testPatient])
      .select();

    if (error) {
      console.error('❌ PATIENTS INSERT ERROR:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Full Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Patients insert successful:', data);
      
      // Clean up test data
      await supabase.from('patients').delete().eq('id', 'test-patient-123');
      console.log('🧹 Test data cleaned up');
    }
  } catch (err) {
    console.error('❌ UNEXPECTED ERROR:', err);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Check RLS policies
  console.log('🔒 Testing RLS policy status...');
  try {
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'patients', 'cases', 'case_messages')
          ORDER BY tablename;
        `
      });

    if (rlsError) {
      console.error('❌ RLS Check Error:', rlsError);
    } else {
      console.log('📊 RLS Status:', rlsData);
    }
  } catch (err) {
    console.log('⚠️  Could not check RLS status via RPC (this is normal)');
  }
}

testDatabaseInsert().catch(console.error);