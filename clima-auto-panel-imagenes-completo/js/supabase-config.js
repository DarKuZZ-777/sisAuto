const SUPABASE_URL = "https://kpegtxtmgclkwdomtgsq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZWd0eHRtZ2Nsa3dkb210Z3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjExNzYsImV4cCI6MjEwMDczNzE3Nn0.Sn_Jz2HxJXg7N7tM-7iplQ-ric6D6Tcq1AaEh02wwOU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;