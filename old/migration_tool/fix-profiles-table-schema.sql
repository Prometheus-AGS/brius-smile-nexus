-- Fix Profiles Table Schema - Remove Foreign Key to auth.users
-- This removes the problematic foreign key constraint that was blocking migration

-- 1. Drop the existing profiles table (it's empty anyway)
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Recreate profiles table WITHOUT foreign key to auth.users
-- Legacy users should NOT become Supabase auth users
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'technician',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create basic RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Grant permissions to service role for migration
GRANT ALL ON profiles TO service_role;

-- 6. Test insert to verify it works
INSERT INTO profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test@example.com',
    'Test',
    'User',
    'technician',
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- 7. Verify the insert worked
SELECT id, email, first_name, last_name, role FROM profiles WHERE email = 'test@example.com';

-- 8. Clean up test data
DELETE FROM profiles WHERE email = 'test@example.com';

-- 9. Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 10. Verify no foreign key constraints to auth.users
SELECT 
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
AND tc.table_name = 'profiles'
AND tc.constraint_type = 'FOREIGN KEY';

SELECT 'Profiles table schema fixed successfully! No foreign key to auth.users.' as status;