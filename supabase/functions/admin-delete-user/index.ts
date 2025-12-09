import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
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
    
    const { userId }: DeleteUserRequest = body;

    if (!userId) {
      console.error("Missing userId in request");
      return new Response(
        JSON.stringify({ 
          error: "User ID is required",
          success: false
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Deleting user:", userId);

    // Verify user exists first
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError && getUserError.message?.includes('not found')) {
      console.log("User not found in auth, checking if profile exists");
      // User doesn't exist in auth, but might have a profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      if (profileError) {
        console.error("Error deleting profile:", profileError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User was already deleted or never existed in auth",
          warning: "User not found in authentication system"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // First, delete the profile from the database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      // Continue anyway, as the profile might not exist
    } else {
      console.log("Profile deleted successfully");
    }

    // Then delete user from auth with admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Supabase admin delete error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // If profile was deleted but auth deletion failed, return partial success
      if (!profileError) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Profile deleted, but auth deletion failed",
            warning: error.message || "Unknown error during auth deletion"
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
      
      // If both failed, return error
      throw error;
    }

    console.log("User deleted successfully:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-user function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Unknown error",
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

