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

async function diagnoseSchemaIssues() {
  console.log('🔍 SCHEMA DIAGNOSIS TOOL');
  console.log('=======================\n');

  try {
    // 1. Check if tables exist and get their structure
    const tables = ['practices', 'profiles', 'patients', 'cases'];
    
    for (const tableName of tables) {
      console.log(`📋 Analyzing table: ${tableName}`);
      console.log('─'.repeat(50));
      
      // Get table structure using information_schema
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

      if (columnsError) {
        console.log(`❌ Error getting columns for ${tableName}:`, columnsError.message);
        continue;
      }

      if (!columns || columns.length === 0) {
        console.log(`⚠️  Table ${tableName} does not exist or has no columns`);
        continue;
      }

      console.log(`✅ Table ${tableName} exists with ${columns.length} columns:`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });

      // Try a simple insert to see what happens
      console.log(`\n🧪 Testing insert into ${tableName}...`);
      
      let testData: Record<string, unknown> = {};
      
      if (tableName === 'practices') {
        testData = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Test Practice',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else if (tableName === 'profiles') {
        testData = {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'technician',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else if (tableName === 'patients') {
        testData = {
          id: '00000000-0000-0000-0000-000000000003',
          profile_id: '00000000-0000-0000-0000-000000000002',
          practice_id: '00000000-0000-0000-0000-000000000001',
          patient_number: 'TEST001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (Object.keys(testData).length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert(testData)
          .select();

        if (insertError) {
          console.log(`❌ Insert test failed for ${tableName}:`);
          console.log(`   Error Code: ${insertError.code}`);
          console.log(`   Error Message: ${insertError.message}`);
          console.log(`   Error Details:`, insertError.details);
          console.log(`   Error Hint:`, insertError.hint);
          console.log(`   Test Data:`, JSON.stringify(testData, null, 2));
        } else {
          console.log(`✅ Insert test succeeded for ${tableName}`);
          // Clean up test data
          await supabase.from(tableName).delete().eq('id', testData.id);
        }
      }

      console.log('\n');
    }

    // 2. Check RLS policies
    console.log('🔒 Checking RLS Policies');
    console.log('─'.repeat(50));
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, permissive, roles, cmd, qual')
      .in('tablename', tables);

    if (policiesError) {
      console.log('❌ Error getting RLS policies:', policiesError.message);
    } else if (policies && policies.length > 0) {
      console.log('📋 RLS Policies found:');
      policies.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
      });
    } else {
      console.log('⚠️  No RLS policies found for these tables');
    }

    // 3. Test service role permissions
    console.log('\n🔑 Testing Service Role Permissions');
    console.log('─'.repeat(50));
    
    const { data: roleData, error: roleError } = await supabase
      .rpc('current_user');

    if (roleError) {
      console.log('❌ Error getting current user:', roleError.message);
    } else {
      console.log('✅ Current user/role:', roleData);
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseSchemaIssues().then(() => {
  console.log('🏁 Schema diagnosis completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Diagnosis crashed:', error);
  process.exit(1);
});