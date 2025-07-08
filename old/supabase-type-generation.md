# Supabase Type Generation for Self-Hosted Instance

## Overview

This document explains the TypeScript type generation setup for our self-hosted Supabase instance at `https://supabase.brius.com`.

## Challenge

Unlike Supabase Cloud projects, self-hosted instances present unique challenges for type generation:

1. **No Direct Database Access**: The PostgreSQL database is not exposed directly
2. **Limited Swagger Schema**: The REST API only exposes minimal OpenAPI schema
3. **No Project Reference**: Cannot use `supabase link` without a valid project ref
4. **Schema Format**: API returns Swagger 2.0, not OpenAPI 3.x

## Current Solution

### Type Generation Script

The `yarn gen:types` command in `package.json` uses the following approach:

```bash
yarn gen:types
```

This script:
1. Loads environment variables from `.env`
2. Fetches Swagger 2.0 schema from the Supabase REST API
3. Uses `swagger-typescript-api` to generate TypeScript types
4. Outputs to `src/types/database.ts`

### Environment Variables Required

```env
VITE_SUPABASE_URL=https://supabase.brius.com
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

### Generated Types Structure

The generated `database.ts` file provides:

- **Database Interface**: Main schema structure
- **Helper Types**: `Tables`, `TableRow`, `TableInsert`, `TableUpdate`
- **View Types**: For database views
- **Function Types**: For RPC functions
- **Enum Types**: For database enums

## Limitations

### Current Limitations

1. **Minimal Schema**: The Swagger schema only contains:
   - Introspection endpoint (`/`)
   - RPC function `pgrst_watch`
   - Generic parameter definitions

2. **No Table Definitions**: Database tables are not exposed in the API schema

3. **Manual Maintenance**: Table types must be manually defined and maintained

### Example Table Definition

To add table types, manually update `src/types/database.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add more tables here...
    };
    // ... rest of schema
  };
}
```

## Alternative Solutions

### Option 1: Local Database Sync

Sync a local PostgreSQL database with the production schema:

```bash
# Hypothetical approach
pg_dump production_db | psql local_db
supabase gen types typescript --db-url postgresql://localhost:5432/local_db
```

### Option 2: Server-Side Generation

Run type generation on the server with direct database access:

```bash
# On server with DB access
supabase gen types typescript --db-url $DATABASE_URL > database.ts
# Transfer file to local development
```

### Option 3: Custom Schema Introspection

Create custom scripts to introspect database schema via RPC functions:

```sql
-- Create RPC function to expose schema info
CREATE OR REPLACE FUNCTION get_table_schema()
RETURNS json AS $$
-- Implementation to return table definitions
$$ LANGUAGE plpgsql;
```

## Dependencies

The current setup requires:

- `dotenv`: Environment variable loading
- `swagger-typescript-api`: Swagger 2.0 to TypeScript conversion

Install with:
```bash
yarn add -D dotenv swagger-typescript-api
```

## Usage in Code

Import and use the generated types:

```typescript
import { Database, TableRow } from '@/types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Type-safe database operations
type User = TableRow<'users'>;
const { data: users } = await supabase
  .from('users')
  .select('*');
```

## Future Improvements

1. **Enhanced Schema Endpoint**: Request Supabase to expose detailed schema via API
2. **CLI Enhancement**: Contribute to Supabase CLI for API-only type generation
3. **Automated Sync**: Set up CI/CD pipeline for type generation from production
4. **Schema Validation**: Add runtime schema validation to catch type mismatches

## Troubleshooting

### Common Issues

1. **Empty Types File**: Check if Swagger schema contains table definitions
2. **Authentication Errors**: Verify `SUPABASE_SERVICE_KEY` is correct
3. **Network Issues**: Ensure `VITE_SUPABASE_URL` is accessible

### Debug Commands

```bash
# Check Swagger schema content
curl "$VITE_SUPABASE_URL/rest/v1/?apikey=$SUPABASE_SERVICE_KEY" \
  -H "Accept: application/openapi+json" | jq

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env.VITE_SUPABASE_URL)"
```

## Conclusion

While the current solution provides a foundation for type generation from self-hosted Supabase, it requires manual maintenance of table definitions. This approach balances the constraints of self-hosted instances with the need for type safety in development.

For production applications, consider implementing one of the alternative solutions for more automated type generation.
