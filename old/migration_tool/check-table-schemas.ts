import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import dotenv from './$node_modules/dotenv/lib/main.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchemas() {
  console.log('🔍 Checking Target Table Schemas...\n');

  const targetTables = ['profiles', 'patients', 'practices', 'cases', 'orders'];

  for (const tableName of targetTables) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log('─'.repeat(50));

    try {
      // Get a sample record to see actual structure
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log(`❌ Error accessing table: ${sampleError.message}`);
        continue;
      }

      if (sampleData && sampleData.length > 0) {
        console.log('✅ Sample record structure:');
        const record = sampleData[0];
        Object.keys(record).forEach(key => {
          const value = record[key];
          const type = typeof value;
          console.log(`   ${key}: ${type} = ${value}`);
        });
      } else {
        console.log('⚠️  Table exists but is empty');
        
        // Try to get column info by attempting an insert with known fields
        const testFields = getExpectedFields(tableName);
        console.log('🧪 Testing expected columns:');
        
        for (const field of testFields) {
          try {
            const testData = { [field]: getTestValue(field) };
            const { error } = await supabase
              .from(tableName)
              .insert(testData)
              .select();

            if (error) {
              if (error.message.includes('Could not find')) {
                console.log(`   ❌ ${field}: MISSING`);
              } else {
                console.log(`   ✅ ${field}: EXISTS (${error.message.substring(0, 50)}...)`);
              }
            } else {
              console.log(`   ✅ ${field}: EXISTS and accepts data`);
              // Clean up test record
              await supabase.from(tableName).delete().eq(field, getTestValue(field));
            }
          } catch (err) {
            console.log(`   ⚠️  ${field}: Test failed - ${err}`);
          }
        }
      }

    } catch (error) {
      console.log(`❌ Unexpected error: ${error}`);
    }
  }
}

function getExpectedFields(tableName: string): string[] {
  const fieldMap: Record<string, string[]> = {
    profiles: ['id', 'email', 'is_active', 'created_at', 'updated_at'],
    patients: ['id', 'name', 'email', 'phone', 'address', 'created_at'],
    practices: ['id', 'name', 'address', 'phone', 'email', 'created_at'],
    cases: ['id', 'patient_id', 'practice_id', 'status', 'created_at'],
    orders: ['id', 'case_id', 'status', 'total_amount', 'created_at']
  };
  return fieldMap[tableName] || ['id', 'created_at'];
}

function getTestValue(field: string): unknown {
  if (field.includes('id')) return `test-${Date.now()}`;
  if (field.includes('email')) return `test-${Date.now()}@example.com`;
  if (field.includes('phone')) return '+1234567890';
  if (field.includes('name')) return 'Test Name';
  if (field.includes('address')) return 'Test Address';
  if (field.includes('status')) return 'active';
  if (field.includes('amount')) return 100.00;
  if (field.includes('active')) return true;
  if (field.includes('created_at') || field.includes('updated_at')) return new Date().toISOString();
  return 'test-value';
}

checkTableSchemas().catch(console.error);