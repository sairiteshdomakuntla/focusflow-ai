import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const MOTIVATION_FROM_EMAIL = Deno.env.get("MOTIVATION_FROM_EMAIL");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase environment is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (!MOTIVATION_FROM_EMAIL) throw new Error("MOTIVATION_FROM_EMAIL not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.email) throw new Error("Unable to resolve authenticated user email");

    const {
      reason,
      taskTitle,
      priority,
      difficulty,
      category,
      complexity,
      predictedFocusMinutes,
      predictedStatus,
      motivationReason,
      motivationSources,
    } = await req.json();

    const sourcesText = Array.isArray(motivationSources) && motivationSources.length > 0
      ? `User motivation sources: ${motivationSources.join(", ")}.`
      : "No explicit motivation sources provided by the user.";

    const prompt = `You are a concise motivational coach inside FocusFlow.
The user triggered a motivation email with reason "${reason}" for task "${taskTitle}".
Task details: priority=${priority}, difficulty=${difficulty}, category=${category}, complexity=${complexity}.
Predicted focus duration: ${predictedFocusMinutes} minutes.
Predicted status: ${predictedStatus}.
Trigger explanation: ${motivationReason}.
${sourcesText}

Generate a short motivational email body in 2-3 sentences max.
It should be encouraging, personal, and actionable.
Respond with plain text only, no markdown.`;

    const lovableResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You write concise motivational email content." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!lovableResponse.ok) {
      throw new Error(`Lovable AI gateway error: ${lovableResponse.status}`);
    }

    const lovableData = await lovableResponse.json();
    const motivationMessage = lovableData.choices?.[0]?.message?.content?.trim() ||
      "You're making progress one step at a time. Start with a focused block now and build momentum.";

    const subject = `FocusFlow motivation for: ${taskTitle}`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827;">
        <h2 style="margin:0 0 12px 0;">FocusFlow Motivation Trigger</h2>
        <p style="margin:0 0 10px 0;"><strong>Task:</strong> ${taskTitle}</p>
        <p style="margin:0 0 10px 0;"><strong>Predicted focus time:</strong> ${predictedFocusMinutes} minutes</p>
        <p style="margin:0 0 10px 0;"><strong>Predicted status:</strong> ${predictedStatus === "completed" ? "Completed" : "In Progress"}</p>
        <p style="margin:12px 0 0 0;">${motivationMessage}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MOTIVATION_FROM_EMAIL,
        to: [user.email],
        subject,
        html,
        text: `Task: ${taskTitle}\nPredicted focus: ${predictedFocusMinutes} minutes\nPredicted status: ${predictedStatus}\n\n${motivationMessage}`,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      throw new Error(`Email send failed: ${resendResponse.status} ${resendError}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Motivation email sent", motivationMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("send-motivation-email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
