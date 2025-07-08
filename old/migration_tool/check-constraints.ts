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

async function checkConstraints() {
  console.log('🔍 Checking current database constraints...\n');

  try {
    // Check for foreign key constraints on profiles table in public schema
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT
              tc.table_schema,
              tc.table_name,
              tc.constraint_name,
              tc.constraint_type,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
          FROM
              information_schema.table_constraints AS tc
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name IN ('profiles', 'patients')
          ORDER BY tc.table_name, tc.constraint_name;
        `
      });

    if (constraintsError) {
      console.error('❌ Error checking constraints:', constraintsError);
    } else {
      console.log('📋 Current Foreign Key Constraints:');
      if (constraints && constraints.length > 0) {
        constraints.forEach((constraint: Record<string, string>) => {
          console.log(`  - Schema: ${constraint.table_schema}`);
          console.log(`    Table: ${constraint.table_name}`);
          console.log(`    Constraint: ${constraint.constraint_name}`);
          console.log(`    Column: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
          console.log('');
        });
      } else {
        console.log('  ✅ No foreign key constraints found on profiles or patients tables');
      }
    }

    // Test actual profile insertion to get real error
    console.log('🧪 Testing profile insertion to get actual error...\n');
    
    const testProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '555-0123',
      practice_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select();

    if (insertError) {
      console.log('❌ Profile insertion error details:');
      console.log('  Error Code:', insertError.code);
      console.log('  Error Message:', insertError.message);
      console.log('  Error Details:', insertError.details);
      console.log('  Error Hint:', insertError.hint);
    } else {
      console.log('✅ Profile insertion successful:', insertResult);
      
      // Clean up test record
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testProfile.id);
      console.log('🧹 Test record cleaned up');
    }

    // Check profiles table structure in public schema
    console.log('\n📋 Checking profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'profiles'
          ORDER BY ordinal_position;
        `
      });

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
    } else {
      console.log('Profiles table columns:');
      tableInfo?.forEach((col: Record<string, string>) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) default: ${col.column_default || 'none'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkConstraints();