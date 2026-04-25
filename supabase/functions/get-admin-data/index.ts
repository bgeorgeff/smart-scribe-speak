import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only allow Bob's account (bgeorgeff@gmail.com) to access this endpoint
const ADMIN_EMAIL = 'bgeorgeff@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Server configuration error');
    }

    // Verify the requesting user is the admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check the user's identity with the anon client (their token)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the service role client to read admin-only data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get all users from auth.users
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const users = usersData.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
    }));

    // 2. Get all search logs
    const { data: searchLogs, error: searchError } = await adminClient
      .from('search_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (searchError) throw searchError;

    // 3. Get all saved content
    const { data: savedContent, error: savedError } = await adminClient
      .from('saved_content')
      .select('id, user_id, topic, grade_level, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (savedError) throw savedError;

    // Build a map of user_id -> email for enriching logs
    const userEmailMap: Record<string, string> = {};
    for (const u of users) {
      if (u.id && u.email) userEmailMap[u.id] = u.email;
    }

    // Enrich search logs and saved content with email
    const enrichedSearchLogs = (searchLogs || []).map((log: any) => ({
      ...log,
      user_email: userEmailMap[log.user_id] || 'Unknown',
    }));

    const enrichedSavedContent = (savedContent || []).map((item: any) => ({
      ...item,
      user_email: userEmailMap[item.user_id] || 'Unknown',
    }));

    return new Response(
      JSON.stringify({
        users,
        searchLogs: enrichedSearchLogs,
        savedContent: enrichedSavedContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-admin-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
