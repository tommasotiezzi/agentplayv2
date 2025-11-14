/* ===================================
   SUPABASE CONFIGURATION
   =================================== */

const SUPABASE_URL = 'https://ifogoqdjojculwvstvtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmb2dvcWRqb2pjdWx3dnN0dnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDc0OTAsImV4cCI6MjA3Njg4MzQ5MH0.oZOBd0uVNJ3SJmpI4ObvUjnNa2w4iS0xREYo1UTi8ok';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client initialized');