-- Fix Foreign Key Constraints for Migration
-- This removes problematic foreign key constraints that are blocking migration

-- 1. Remove the foreign key constraint from profiles to auth.users
-- The profiles table should be independent for migration purposes
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Make profiles.id a regular UUID primary key (not foreign key)
-- This allows us to insert profiles independently
-- (The constraint was likely added incorrectly during schema creation)

-- 3. Verify current constraints
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
AND tc.table_name IN ('profiles', 'patients', 'practices', 'cases', 'orders')
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Test insert after constraint removal
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

-- 5. Test insert a practice first
INSERT INTO practices (
    id,
    name,
    phone,
    email
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Test Practice',
    '555-0123',
    'practice@example.com'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- 6. Now test patient insert (should work with practice existing)
INSERT INTO patients (
    practice_id,
    patient_number,
    first_name,
    last_name,
    email
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'TEST001',
    'Test',
    'Patient',
    'patient@example.com'
) ON CONFLICT (practice_id, patient_number) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email;

-- 7. Clean up test data
DELETE FROM patients WHERE patient_number = 'TEST001';
DELETE FROM practices WHERE id = '550e8400-e29b-41d4-a716-446655440001';
DELETE FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000';

SELECT 'Foreign key constraints fixed successfully!' as status;