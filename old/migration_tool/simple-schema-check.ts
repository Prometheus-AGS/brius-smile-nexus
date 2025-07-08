import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import dotenv from './$node_modules/dotenv/lib/main.js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking actual database schema...\n');

  try {
    // Check what tables exist
    console.log('📋 Checking existing tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'patients', 'practices']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name) || []);
    }

    // Try to get a sample from profiles table to see actual structure
    console.log('\n🔍 Checking profiles table structure...');
    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message);
      console.log('Error details:', profileError);
    } else {
      if (profileSample && profileSample.length > 0) {
        console.log('✅ Profiles table exists. Sample record structure:');
        console.log(Object.keys(profileSample[0]));
      } else {
        console.log('✅ Profiles table exists but is empty');
        
        // Try to insert a minimal test record to see what fields are required
        console.log('\n🧪 Testing minimal profile insertion...');
        const minimalProfile = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          first_name: 'Test',
          last_name: 'User'
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('profiles')
          .insert([minimalProfile])
          .select();

        if (insertError) {
          console.log('❌ Minimal profile insertion failed:');
          console.log('  Error Code:', insertError.code);
          console.log('  Error Message:', insertError.message);
          console.log('  Error Details:', insertError.details);
          console.log('  Error Hint:', insertError.hint);
        } else {
          console.log('✅ Minimal profile insertion successful');
          // Clean up
          await supabase.from('profiles').delete().eq('id', minimalProfile.id);
        }
      }
    }

    // Check patients table
    console.log('\n🔍 Checking patients table structure...');
    const { data: patientSample, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (patientError) {
      console.log('❌ Patients table error:', patientError.message);
    } else {
      if (patientSample && patientSample.length > 0) {
        console.log('✅ Patients table exists. Sample record structure:');
        console.log(Object.keys(patientSample[0]));
      } else {
        console.log('✅ Patients table exists but is empty');
      }
    }

    // Check practices table
    console.log('\n🔍 Checking practices table structure...');
    const { data: practiceSample, error: practiceError } = await supabase
      .from('practices')
      .select('*')
      .limit(1);

    if (practiceError) {
      console.log('❌ Practices table error:', practiceError.message);
    } else {
      if (practiceSample && practiceSample.length > 0) {
        console.log('✅ Practices table exists. Sample record structure:');
        console.log(Object.keys(practiceSample[0]));
      } else {
        console.log('✅ Practices table exists but is empty');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema();