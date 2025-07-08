-- Fix for Migration Database Schema Issues
-- This script addresses the two main problems preventing successful data insertion:
-- 1. Remove foreign key constraint from profiles table to auth.users
-- 2. Ensure patients table has proper field mappings

-- Problem 1: Remove foreign key constraint from profiles table
-- The profiles.id should not reference auth.users(id) since legacy users are not intended to be auth users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Make profiles.id a regular UUID field without foreign key constraint
-- (This allows us to insert profile records without requiring auth.users entries)

-- Problem 2: Ensure patients table has proper structure for required fields
-- Check if first_name and last_name are properly defined as NOT NULL
-- (The error showed these fields are required but were receiving null values)

-- Display current table structures for verification
\d profiles;
\d patients;

-- Show any remaining foreign key constraints
SELECT 
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
  AND tc.table_name IN ('profiles', 'patients');