import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  userId: string;
  email?: string;
  password?: string;
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
    
    const { userId, email, password }: UpdateUserRequest = body;

    if (!userId) {
      console.error("Missing userId in request");
      throw new Error("User ID is required");
    }

    console.log("Updating user:", { userId, email: !!email, password: !!password });

    // Update user with admin privileges
    const updateData: any = {};
    if (email && email.trim()) {
      updateData.email = email.trim();
      console.log("Setting email to:", email.trim());
    }
    if (password && password.trim()) {
      updateData.password = password.trim();
      console.log("Setting new password");
    }

    if (Object.keys(updateData).length === 0) {
      console.log("No auth data to update");
      return new Response(
        JSON.stringify({ success: true, message: "No auth changes requested" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error) {
      console.error("Supabase admin update error:", error);
      throw error;
    }

    console.log("User updated successfully:", data?.user?.id);

    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully", user: data?.user }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-update-user function:", error);
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