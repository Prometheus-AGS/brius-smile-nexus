import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

/**
 * Setup RPC Functions for Self-Hosted Supabase
 * 
 * Creates the necessary RPC functions that are typically available in Supabase Cloud
 * but need to be manually created in self-hosted instances.
 */

async function setupRPCFunctions() {
  console.log('🔧 Setting up RPC functions for self-hosted Supabase...\n');

  const sqlStatements = [
    // 1. Create exec_sql function for executing arbitrary SQL
    `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'OK';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN SQLERRM;
    END;
    $$;
    `,

    // 2. Grant execute permission to authenticated users
    `GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;`,

    // 3. Grant execute permission to service role
    `GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;`,

    // 4. Create a safer version that only allows DDL operations
    `
    CREATE OR REPLACE FUNCTION exec_ddl(sql text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Only allow CREATE, ALTER, DROP statements
      IF sql ~* '^\\s*(CREATE|ALTER|DROP)\\s+' THEN
        EXECUTE sql;
        RETURN 'DDL executed successfully';
      ELSE
        RAISE EXCEPTION 'Only DDL statements (CREATE, ALTER, DROP) are allowed';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
    END;
    $$;
    `,

    // 5. Grant permissions for DDL function
    `GRANT EXECUTE ON FUNCTION exec_ddl(text) TO authenticated;`,
    `GRANT EXECUTE ON FUNCTION exec_ddl(text) TO service_role;`,

    // 6. Create a function to check if tables exist
    `
    CREATE OR REPLACE FUNCTION table_exists(table_name text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    END;
    $$;
    `,

    // 7. Grant permissions for table_exists function
    `GRANT EXECUTE ON FUNCTION table_exists(text) TO authenticated;`,
    `GRANT EXECUTE ON FUNCTION table_exists(text) TO service_role;`,

    // 8. Create a function to get table schema info
    `
    CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
    RETURNS TABLE(column_name text, data_type text, is_nullable text)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = $1
      ORDER BY c.ordinal_position;
    END;
    $$;
    `,

    // 9. Grant permissions for schema function
    `GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;`,
    `GRANT EXECUTE ON FUNCTION get_table_schema(text) TO service_role;`
  ];

  console.log('📝 Creating RPC functions...');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i].trim();
    if (!sql) continue;

    try {
      console.log(`   ${i + 1}/${sqlStatements.length}: ${sql.split('\n')[0].substring(0, 50)}...`);
      
      // For self-hosted Supabase, we need to use direct PostgreSQL connection
      // Since we can't execute these via the REST API, we'll output them for manual execution
      
    } catch (error) {
      console.error(`   ❌ Failed to execute statement ${i + 1}:`, error);
    }
  }

  return sqlStatements;
}

function generateRPCSetupSQL() {
  return `
-- RPC Functions Setup for Self-Hosted Supabase
-- Execute this SQL in your PostgreSQL database directly

-- 1. Create exec_sql function for executing arbitrary SQL
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'OK';
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- 3. Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- 4. Create a safer version that only allows DDL operations
CREATE OR REPLACE FUNCTION exec_ddl(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow CREATE, ALTER, DROP statements
  IF sql ~* '^\\\\s*(CREATE|ALTER|DROP)\\\\s+' THEN
    EXECUTE sql;
    RETURN 'DDL executed successfully';
  ELSE
    RAISE EXCEPTION 'Only DDL statements (CREATE, ALTER, DROP) are allowed';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- 5. Grant permissions for DDL function
GRANT EXECUTE ON FUNCTION exec_ddl(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_ddl(text) TO service_role;

-- 6. Create a function to check if tables exist
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$;

-- 7. Grant permissions for table_exists function
GRANT EXECUTE ON FUNCTION table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists(text) TO service_role;

-- 8. Create a function to get table schema info
CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
  AND c.table_name = $1
  ORDER BY c.ordinal_position;
END;
$$;

-- 9. Grant permissions for schema function
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO service_role;

-- 10. Verify functions were created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('exec_sql', 'exec_ddl', 'table_exists', 'get_table_schema');
`;
}

// Main execution
if (require.main === module) {
  console.log('\n📋 SELF-HOSTED SUPABASE RPC SETUP\n');
  console.log('For self-hosted Supabase instances, you need to manually create RPC functions.');
  console.log('Please execute the following SQL directly in your PostgreSQL database:\n');
  console.log('=' .repeat(80));
  console.log(generateRPCSetupSQL());
  console.log('=' .repeat(80));
  console.log('\n🔧 ALTERNATIVE: If you have direct PostgreSQL access, you can also:');
  console.log('1. Connect to your PostgreSQL database using psql or pgAdmin');
  console.log('2. Execute the SQL above as a superuser or database owner');
  console.log('3. Verify the functions were created by running the SELECT query at the end');
  console.log('\nAfter setting up the RPC functions, you can run the schema setup script.\n');
  
  setupRPCFunctions();
}

export { setupRPCFunctions, generateRPCSetupSQL };