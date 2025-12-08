import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetUserRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    console.log("Received request body:", body);
    
    const { userId }: GetUserRequest = body;

    if (!userId) {
      console.error("Missing userId in request");
      throw new Error("User ID is required");
    }

    console.log("Getting user:", userId);

    // Get user with admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error("Supabase admin get user error:", error);
      throw error;
    }

    console.log("User retrieved successfully:", data?.user?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: data?.user?.id,
          email: data?.user?.email,
          phone: data?.user?.phone,
          email_confirmed_at: data?.user?.email_confirmed_at,
          created_at: data?.user?.created_at
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-get-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);