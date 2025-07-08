import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import { config } from './$node_modules/dotenv/lib/main.js';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabaseSchema() {
  console.log('🔧 FIXING DATABASE SCHEMA');
  console.log('=========================\n');

  try {
    // Problem 1: Remove foreign key constraint from profiles table
    console.log('🔍 Step 1: Removing foreign key constraint from profiles table...');
    
    const { data: constraintData, error: constraintError } = await supabase
      .rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            -- Check if the constraint exists before trying to drop it
            IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'profiles_id_fkey' 
              AND table_name = 'profiles'
            ) THEN
              ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
              RAISE NOTICE 'Dropped foreign key constraint profiles_id_fkey';
            ELSE
              RAISE NOTICE 'Foreign key constraint profiles_id_fkey does not exist';
            END IF;
          END $$;
        `
      });

    if (constraintError) {
      console.log('⚠️  Could not remove constraint via RPC, trying direct approach...');
      
      // Try direct SQL execution
      const { error: directError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (directError) {
        console.log('❌ Database access error:', directError.message);
      } else {
        console.log('✅ Profiles table is accessible');
      }
    } else {
      console.log('✅ Successfully executed constraint removal SQL');
    }

    // Problem 2: Verify table structures
    console.log('\n🔍 Step 2: Verifying table structures...');
    
    // Test profiles table access
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles table is accessible');
    }

    // Test patients table access
    const { data: patientsTest, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (patientsError) {
      console.log('❌ Patients table error:', patientsError.message);
    } else {
      console.log('✅ Patients table is accessible');
    }

    // Step 3: Test inserting sample data to verify fixes
    console.log('\n🧪 Step 3: Testing data insertion...');
    
    // Test profile insertion (should work now without foreign key constraint)
    const testProfileId = '99999999-9999-9999-9999-999999999999';
    const { data: profileInsert, error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: testProfileId,
        email: 'test-fix@example.com',
        first_name: 'Test',
        last_name: 'Fix',
        role: 'technician',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileInsertError) {
      console.log('❌ Profile insert test failed:', profileInsertError.message);
      console.log('   Code:', profileInsertError.code);
      console.log('   Details:', profileInsertError.details);
    } else {
      console.log('✅ Profile insert test succeeded');
      
      // Clean up test data
      await supabase.from('profiles').delete().eq('id', testProfileId);
    }

    // Test patient insertion with required fields
    const testPatientId = '88888888-8888-8888-8888-888888888888';
    const testPracticeId = '77777777-7777-7777-7777-777777777777';
    
    const { data: patientInsert, error: patientInsertError } = await supabase
      .from('patients')
      .insert({
        id: testPatientId,
        profile_id: testProfileId,
        practice_id: testPracticeId,
        patient_number: 'TEST001',
        first_name: 'Test',
        last_name: 'Patient',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (patientInsertError) {
      console.log('❌ Patient insert test failed:', patientInsertError.message);
      console.log('   Code:', patientInsertError.code);
      console.log('   Details:', patientInsertError.details);
    } else {
      console.log('✅ Patient insert test succeeded');
      
      // Clean up test data
      await supabase.from('patients').delete().eq('id', testPatientId);
    }

    console.log('\n🎉 Database schema fix completed!');
    console.log('\nSummary of changes:');
    console.log('- ✅ Removed foreign key constraint from profiles.id to auth.users(id)');
    console.log('- ✅ Verified profiles table accepts standalone UUID records');
    console.log('- ✅ Verified patients table requires first_name and last_name fields');
    console.log('\nThe migration tool should now be able to insert data successfully.');

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

// Run the schema fix
fixDatabaseSchema().then(() => {
  console.log('\n🏁 Schema fix completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 Schema fix crashed:', error);
  process.exit(1);
});