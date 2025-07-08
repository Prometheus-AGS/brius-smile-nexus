# Self-Hosted Supabase Setup Guide for Migration Tool

## Overview

Your self-hosted Supabase instance is missing the RPC functions that are typically available in Supabase Cloud. This guide provides the exact steps to configure your self-hosted instance for the migration tool.

## Step 1: Create Required RPC Functions

Execute the following SQL in your PostgreSQL database (via psql, pgAdmin, or your database management tool):

```sql
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
```

## Step 2: Verify RPC Functions

After executing the SQL above, verify the functions were created by running:

```sql
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('exec_sql', 'exec_ddl', 'table_exists', 'get_table_schema');
```

You should see 4 functions listed.

## Step 3: Environment Configuration

Ensure your `.env` file has the correct configuration:

```env
# Supabase Configuration
SUPABASE_URL=your_self_hosted_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Migration Configuration
NODE_ENV=production
DEV_SKIP_DB=false
```

## Step 4: Test RPC Functions

Run the test script to verify RPC functions are working:

```bash
cd migration_tool
yarn tsx comprehensive-diagnosis.ts
```

## Step 5: Create Database Schema

Once RPC functions are working, create the AI-ready schema:

```bash
cd migration_tool
yarn tsx setup-schema.ts
```

## Step 6: Run Migration

After schema is created, run the migration:

```bash
cd migration_tool
yarn migrate:full
```

## Troubleshooting

### Issue: "Could not find the function public.exec_sql"

**Solution**: The RPC functions haven't been created yet. Execute Step 1 above.

### Issue: Permission denied when executing RPC functions

**Solution**: Ensure you're connecting as a superuser or database owner when creating the functions.

### Issue: Functions exist but still getting PGRST202 errors

**Solution**: 
1. Restart your Supabase services
2. Clear any schema cache
3. Verify the functions have proper permissions

### Issue: Schema creation fails

**Solution**: 
1. Check that required PostgreSQL extensions are installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```

## Self-Hosted Supabase Configuration Notes

For self-hosted Supabase instances, you may also need to configure:

1. **PostgREST Configuration**: Ensure your PostgREST configuration allows RPC calls
2. **Database Roles**: Verify that `authenticated` and `service_role` roles exist
3. **Extensions**: Install required PostgreSQL extensions
4. **Permissions**: Ensure proper database permissions for your service role

## Next Steps

After completing this setup:

1. The migration tool will be able to use RPC functions
2. Schema creation will work properly
3. Migration can proceed with proper database operations
4. All diagnostic tools will function correctly

## Support

If you encounter issues:

1. Check PostgreSQL logs for detailed error messages
2. Verify your Supabase configuration matches your database setup
3. Ensure all required extensions are installed
4. Test database connectivity with a simple query first