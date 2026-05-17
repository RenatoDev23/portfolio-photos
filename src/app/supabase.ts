import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://stnrdvhlevymguwkhdbm.supabase.co';

const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bnJkdmhsZXZ5bWd1d2toZGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Njc5MDQsImV4cCI6MjA5NDU0MzkwNH0.Li34cr9IVXeU0Vf4rDgJk1mcEb9L6VU60zH2tv4sAvo';

export const supabase =
  createClient(
    supabaseUrl,
    supabaseKey
  );