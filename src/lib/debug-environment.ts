/**
 * Debug Environment Variables Access
 * This file helps diagnose environment variable access issues
 */

// Test 1: Check if process exists
console.log('=== Environment Debug ===');
console.log('1. typeof process:', typeof process);
console.log('2. typeof window:', typeof window);
console.log('3. typeof import.meta:', typeof import.meta);

// Test 2: Check Vite environment variables
if (typeof import.meta !== 'undefined' && import.meta.env) {
  console.log('4. import.meta.env:', import.meta.env);
  console.log('5. VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
} else {
  console.log('4. import.meta.env: NOT AVAILABLE');
}

// Test 3: Try to access process.env (this should fail)
try {
  console.log('6. Attempting process.env access...');
  const nodeEnv = process.env.NODE_ENV;
  console.log('7. process.env.NODE_ENV:', nodeEnv);
} catch (error) {
  console.log('7. ERROR accessing process.env:', error.message);
}

export const environmentDebug = {
  hasProcess: typeof process !== 'undefined',
  hasImportMeta: typeof import.meta !== 'undefined',
  viteSupabaseUrl: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined
};