import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is called by a Supabase Auth webhook when a new user signs up.
// Webhook payload: { type: "INSERT", table: "users", record: { email, id, created_at, ... } }
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook payload received:', JSON.stringify(body));

    // Supabase auth webhook sends the new user record
    const userEmail = body?.record?.email ?? body?.email ?? 'Unknown email';
    const userId = body?.record?.id ?? body?.id ?? 'Unknown ID';
    const createdAt = body?.record?.created_at ?? new Date().toISOString();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      // If no Resend key, fall back to a log — we'll still return success so the webhook doesn't fail
      console.log(`NEW USER SIGNED UP: ${userEmail} (id: ${userId}) at ${createdAt}`);
      return new Response(
        JSON.stringify({ success: true, note: 'No RESEND_API_KEY configured — logged to console only' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailBody = {
      from: 'LearnAnything <onboarding@resend.dev>',
      to: ['bgeorgeff@protonmail.com'],
      subject: `New LearnAnything signup: ${userEmail}`,
      html: `
        <h2>New user signed up for LearnAnything!</h2>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Signed up at:</strong> ${new Date(createdAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
        <hr />
        <p><small>This notification was sent automatically by LearnAnything (learnanything.us)</small></p>
      `,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      throw new Error(`Resend API error: ${resendRes.status} ${errText}`);
    }

    const resendData = await resendRes.json();
    console.log('Notification email sent successfully:', resendData.id);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-new-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
