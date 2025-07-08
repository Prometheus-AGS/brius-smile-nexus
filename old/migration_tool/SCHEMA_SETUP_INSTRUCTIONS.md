# Schema Setup Instructions for Self-Hosted Supabase

## Current Status
❌ **Schema Not Yet Created** - The diagnostic shows all tables are missing.

## Required Action
You need to execute the SQL schema file in your PostgreSQL database.

## Step-by-Step Instructions

### Option 1: Using psql Command Line
```bash
# Replace with your actual database connection details
psql -h your-postgres-host -p 5432 -U your-username -d your-database-name -f migration_tool/create-complete-schema.sql
```

### Option 2: Using pgAdmin
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on your database → Query Tool
4. Open the file `migration_tool/create-complete-schema.sql`
5. Execute the SQL

### Option 3: Using Supabase Studio (if available)
1. Go to your Supabase Studio dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migration_tool/create-complete-schema.sql`
4. Paste and run the SQL

### Option 4: Copy and Paste Method
If you can't access the file directly, here's what the SQL contains:

**The SQL file creates:**
- ✅ All required PostgreSQL extensions (uuid-ossp, vector)
- ✅ Custom types/enums for the application
- ✅ RPC functions (exec_sql, exec_ddl, table_exists, get_table_schema)
- ✅ All core tables (profiles, practices, patients, cases, orders, etc.)
- ✅ AI/ML tables with vector embeddings
- ✅ Proper indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Sample data for testing

## After Executing the SQL

Once you've executed the schema SQL, run this command to verify:

```bash
cd migration_tool && yarn tsx comprehensive-diagnosis.ts
```

You should see:
- ✅ Target tables exist and are accessible
- ✅ RPC functions are available
- ✅ Sample insert test passes

## Troubleshooting

### If you get permission errors:
- Make sure you're connecting as a superuser or database owner
- The user needs CREATE privileges on the database

### If extensions fail to install:
- You may need to install PostgreSQL extensions manually
- For vector extension: `CREATE EXTENSION vector;`
- For uuid extension: `CREATE EXTENSION "uuid-ossp";`

### If RLS policies cause issues:
- The schema includes basic RLS policies
- You may need to adjust them based on your authentication setup

## Connection Details Needed

To execute the SQL, you'll need:
- **Host**: Your PostgreSQL server hostname
- **Port**: Usually 5432
- **Database**: Your database name
- **Username**: PostgreSQL username with CREATE privileges
- **Password**: PostgreSQL password

## Next Steps After Schema Creation

1. ✅ Execute the schema SQL
2. ✅ Verify with diagnostic script
3. ✅ Test RPC functions
4. ✅ Run migration tool
5. ✅ Import legacy data (if available)

## Need Help?

If you encounter issues:
1. Check PostgreSQL logs for detailed error messages
2. Verify your connection details are correct
3. Ensure your user has sufficient privileges
4. Try executing the SQL in smaller chunks if needed