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

async function removeConstraintsDirectly() {
  console.log('🔧 REMOVING DATABASE CONSTRAINTS DIRECTLY');
  console.log('==========================================\n');

  try {
    console.log('🔍 The foreign key constraints are preventing data insertion.');
    console.log('Since legacy users should NOT become auth users, we need to remove these constraints.\n');

    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('=========================');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Execute the following SQL commands:\n');

    console.log('-- Remove foreign key constraint from profiles table');
    console.log('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;');
    console.log('');
    console.log('-- Remove foreign key constraint from patients table to profiles');
    console.log('ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_profile_id_fkey;');
    console.log('');
    console.log('-- Make profile_id optional in patients table');
    console.log('ALTER TABLE patients ALTER COLUMN profile_id DROP NOT NULL;');
    console.log('');

    console.log('🔍 After running these commands, test with:');
    console.log('');
    console.log('-- Test profile insertion');
    console.log(`INSERT INTO profiles (id, email, first_name, last_name, role, created_at, updated_at) 
VALUES ('99999999-9999-9999-9999-999999999999', 'test@example.com', 'Test', 'User', 'technician', NOW(), NOW());`);
    console.log('');
    console.log('-- Test patient insertion');
    console.log(`INSERT INTO patients (id, practice_id, patient_number, first_name, last_name, created_at, updated_at) 
VALUES ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'TEST001', 'Test', 'Patient', NOW(), NOW());`);
    console.log('');
    console.log('-- Clean up test data');
    console.log(`DELETE FROM patients WHERE id = '88888888-8888-8888-8888-888888888888';`);
    console.log(`DELETE FROM profiles WHERE id = '99999999-9999-9999-9999-999999999999';`);
    console.log('');

    console.log('⚠️  ALTERNATIVE APPROACH:');
    console.log('If you cannot access the SQL Editor, we can modify the migration tool to:');
    console.log('1. Skip profiles table entirely (since legacy users should not be migrated as profiles)');
    console.log('2. Modify patients table to not require profile_id');
    console.log('3. Use a different approach for user data');
    console.log('');

    // Let's also try a different approach - checking what constraints actually exist
    console.log('🔍 Let me check what constraints currently exist...');
    
    // Try to get constraint information through a different method
    const { data: constraintCheck, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'profiles')
      .eq('constraint_type', 'FOREIGN KEY');

    if (constraintError) {
      console.log('❌ Could not query constraints:', constraintError.message);
    } else {
      console.log('📋 Current constraints on profiles table:', constraintCheck);
    }

  } catch (error) {
    console.error('❌ Constraint removal failed:', error);
  }
}

// Run the constraint removal
removeConstraintsDirectly().then(() => {
  console.log('\n🏁 Constraint removal instructions provided');
  process.exit(0);
}).catch(error => {
  console.error('💥 Process crashed:', error);
  process.exit(1);
});