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

async function testDatabaseOperations() {
  console.log('🔍 SIMPLE DATABASE TEST');
  console.log('======================\n');

  try {
    // Test 1: Check if tables exist by trying to select from them
    console.log('📋 Testing table existence...');
    
    const tables = ['practices', 'profiles', 'patients'];
    
    for (const tableName of tables) {
      console.log(`\n🔍 Testing table: ${tableName}`);
      
      // Try to select from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Error accessing ${tableName}:`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Details: ${error.details}`);
        console.log(`   Hint: ${error.hint}`);
      } else {
        console.log(`✅ Table ${tableName} exists and is accessible`);
        console.log(`   Records found: ${data?.length || 0}`);
      }
    }

    // Test 2: Try inserting sample data to see what happens
    console.log('\n\n🧪 Testing data insertion...');
    
    // Test practices first (since it worked before)
    console.log('\n📝 Testing practices insert...');
    const practiceData = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test Practice',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: practiceResult, error: practiceError } = await supabase
      .from('practices')
      .insert(practiceData)
      .select();

    if (practiceError) {
      console.log('❌ Practice insert failed:');
      console.log(`   Code: ${practiceError.code}`);
      console.log(`   Message: ${practiceError.message}`);
      console.log(`   Details: ${practiceError.details}`);
      console.log(`   Hint: ${practiceError.hint}`);
      console.log(`   Data: ${JSON.stringify(practiceData, null, 2)}`);
    } else {
      console.log('✅ Practice insert succeeded');
      // Clean up
      await supabase.from('practices').delete().eq('id', practiceData.id);
    }

    // Test profiles insert (this is failing)
    console.log('\n📝 Testing profiles insert...');
    const profileData = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'technician',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select();

    if (profileError) {
      console.log('❌ Profile insert failed:');
      console.log(`   Code: ${profileError.code}`);
      console.log(`   Message: ${profileError.message}`);
      console.log(`   Details: ${profileError.details}`);
      console.log(`   Hint: ${profileError.hint}`);
      console.log(`   Data: ${JSON.stringify(profileData, null, 2)}`);
    } else {
      console.log('✅ Profile insert succeeded');
      // Clean up
      await supabase.from('profiles').delete().eq('id', profileData.id);
    }

    // Test patients insert (this is also failing)
    console.log('\n📝 Testing patients insert...');
    const patientData = {
      id: '33333333-3333-3333-3333-333333333333',
      profile_id: '22222222-2222-2222-2222-222222222222',
      practice_id: '11111111-1111-1111-1111-111111111111',
      patient_number: 'TEST001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: patientResult, error: patientError } = await supabase
      .from('patients')
      .insert(patientData)
      .select();

    if (patientError) {
      console.log('❌ Patient insert failed:');
      console.log(`   Code: ${patientError.code}`);
      console.log(`   Message: ${patientError.message}`);
      console.log(`   Details: ${patientError.details}`);
      console.log(`   Hint: ${patientError.hint}`);
      console.log(`   Data: ${JSON.stringify(patientData, null, 2)}`);
    } else {
      console.log('✅ Patient insert succeeded');
      // Clean up
      await supabase.from('patients').delete().eq('id', patientData.id);
    }

    // Test 3: Check authentication context
    console.log('\n\n🔑 Testing authentication context...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Auth context:', user ? `User ID: ${user.id}` : 'No user (service role)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDatabaseOperations().then(() => {
  console.log('\n🏁 Database test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});