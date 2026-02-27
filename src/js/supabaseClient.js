import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Reemplaza con tus credenciales reales
const supabaseUrl = 'https://pmqwanlsdnzdfqkxjppa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcXdhbmxzZG56ZGZxa3hqcHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzI3MzAsImV4cCI6MjA4NzY0ODczMH0.0aIlN5Zzp7OIkwfse1S1yjscK3O-rAsnRQFMz7y6dhA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);