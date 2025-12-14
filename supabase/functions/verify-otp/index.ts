import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, otp } = await req.json();
    
    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Phone number and OTP are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OTP from database
    const { data, error: dbError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .single();

    if (dbError || !data) {
      return new Response(JSON.stringify({ 
        error: 'Invalid OTP or OTP not found',
        verified: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if OTP is expired
    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
      // Delete expired OTP
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('phone_number', formattedPhone);
      
      return new Response(JSON.stringify({ 
        error: 'OTP has expired. Please request a new one.',
        verified: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify OTP
    if (data.otp !== otp) {
      return new Response(JSON.stringify({ 
        error: 'Invalid OTP code',
        verified: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OTP is valid - delete it to prevent reuse
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('phone_number', formattedPhone);

    return new Response(JSON.stringify({ 
      success: true,
      verified: true,
      message: 'OTP verified successfully',
      phoneNumber: formattedPhone
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-otp function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      verified: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

