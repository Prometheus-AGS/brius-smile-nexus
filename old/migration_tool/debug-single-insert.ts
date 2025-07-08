#!/usr/bin/env node

import './$node_modules/dotenv/config.js';
import { getSupabaseClient } from './src/services/db.service';
import { createComponentLogger } from './src/utils/logger';

const logger = createComponentLogger('debug-insert');

async function testSingleInsert() {
  try {
    const supabase = getSupabaseClient();
    
    // Test a simple profiles insert
    const testProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    logger.info('🧪 Testing single profile insert...');
    logger.info('📝 Test record:', testProfile);

    const { data, error } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select();

    if (error) {
      console.log('❌ PROFILES INSERT ERROR DETAILS:');
      console.log('Message:', error.message);
      console.log('Code:', error.code);
      console.log('Details:', error.details);
      console.log('Hint:', error.hint);
      console.log('Full Error Object:', JSON.stringify(error, null, 2));
      logger.error('❌ Insert failed with detailed error:', error);
    } else {
      logger.info('✅ Insert successful:', data);
    }

    // Test a simple patients insert
    const testPatient = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      practice_id: '123e4567-e89b-12d3-a456-426614174003',
      first_name: 'Test',
      last_name: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'M',
      phone: '555-1234',
      email: 'patient@example.com',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    logger.info('🧪 Testing single patient insert...');
    logger.info('📝 Test record:', testPatient);

    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .insert([testPatient])
      .select();

    if (patientError) {
      console.log('❌ PATIENTS INSERT ERROR DETAILS:');
      console.log('Message:', patientError.message);
      console.log('Code:', patientError.code);
      console.log('Details:', patientError.details);
      console.log('Hint:', patientError.hint);
      console.log('Full Error Object:', JSON.stringify(patientError, null, 2));
      logger.error('❌ Patient insert failed with detailed error:', patientError);
    } else {
      logger.info('✅ Patient insert successful:', patientData);
    }

  } catch (error) {
    logger.error('💥 Unexpected error:', error);
  }
}

testSingleInsert().catch(console.error);