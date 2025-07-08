import { createClient } from '../../$node_modules/@supabase/supabase-js/dist/module/index.js';
import '../../$node_modules/dotenv/config.js';

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseKey = process.env['SUPABASE_ANON_KEY'];

if (!supabaseUrl) {
  throw new Error('Supabase URL is not defined in environment variables.');
}

if (!supabaseKey) {
  throw new Error('Supabase ANON KEY is not defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
