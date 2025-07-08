import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import dotenv from './$node_modules/dotenv/lib/main.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMigrationErrors() {
  console.log('🔍 Debugging Migration Database Errors...\n');

  // Test 1: Check RLS policies
  console.log('📋 1. Checking RLS Policies:');
  try {
    const { data: policies, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'patients', 'practices')
        ORDER BY tablename, policyname;
      `
    });
    
    if (error) {
      console.log('❌ Error checking policies:', error.message);
    } else {
      console.log('✅ RLS Policies found:', policies?.length || 0);
      if (policies && policies.length > 0) {
        policies.forEach((policy: any) => {
          console.log(`   - ${policy.tablename}.${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
        });
      } else {
        console.log('⚠️  No RLS policies found - this could be the issue!');
      }
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  console.log('\n📋 2. Testing Sample Insert into profiles:');
  try {
    const testProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'technician',
      is_active: true
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(testProfile)
      .select();

    if (error) {
      console.log('❌ Insert failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log('✅ Insert successful:', data);
      
      // Clean up test data
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testProfile.id);
    }
  } catch (err) {
    console.log('❌ Insert error:', err);
  }

  console.log('\n📋 3. Testing Sample Insert into patients:');
  try {
    const testPatient = {
      practice_id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
      patient_number: 'TEST001',
      first_name: 'Test',
      last_name: 'Patient',
      email: 'patient@example.com'
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select();

    if (error) {
      console.log('❌ Insert failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log('✅ Insert successful:', data);
      
      // Clean up test data
      await supabase
        .from('patients')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (err) {
    console.log('❌ Insert error:', err);
  }

  console.log('\n📋 4. Checking Table Constraints:');
  try {
    const { data: constraints, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('profiles', 'patients', 'practices')
        ORDER BY tc.table_name, tc.constraint_type;
      `
    });

    if (error) {
      console.log('❌ Error checking constraints:', error.message);
    } else {
      console.log('✅ Table constraints:');
      constraints?.forEach((constraint: any) => {
        console.log(`   - ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`);
        if (constraint.foreign_table_name) {
          console.log(`     References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        }
      });
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  console.log('\n📋 5. Checking Service Role Permissions:');
  try {
    const { data: currentUser, error } = await supabase.auth.getUser();
    console.log('Current auth user:', currentUser?.user?.id || 'No authenticated user');
    
    // Check if we're using service role
    const isServiceRole = supabaseServiceKey.includes('service_role') || supabaseServiceKey.length > 100;
    console.log('Using service role key:', isServiceRole ? 'Yes' : 'No (using anon key)');
    
  } catch (err) {
    console.log('Auth check error:', err);
  }

  console.log('\n================================================================================');
  console.log('DEBUGGING SUMMARY');
  console.log('================================================================================');
  console.log('Check the results above to identify the root cause of migration failures.');
  console.log('Common issues:');
  console.log('1. RLS policies blocking service role inserts');
  console.log('2. Missing foreign key references (practice_id, etc.)');
  console.log('3. Required field violations');
  console.log('4. UUID format issues');
}

debugMigrationErrors().catch(console.error);