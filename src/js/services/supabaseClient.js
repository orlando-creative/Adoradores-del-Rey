import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon public key
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;