import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file for Node-based scripts
dotenv.config();

const supabaseUrl = (import.meta.env?.SUPABASE_URL) || process.env.SUPABASE_URL;
const supabaseKey = (import.meta.env?.SUPABASE_KEY) || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in the environment variables (SUPABASE_URL, SUPABASE_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
