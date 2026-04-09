import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, reason, taskTitle, motivationSources } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sourcesText = motivationSources?.length
      ? `The user's motivation sources: ${motivationSources.join(", ")}`
      : "The user hasn't shared specific motivation sources yet.";

    const prompt = `You are a concise motivational coach inside a productivity app called FocusFlow. 
The user ${reason === 'abandoned' ? 'just abandoned a focus session' : 'is delaying starting'} on their task: "${taskTitle}".
${sourcesText}

Generate a SHORT (1-2 sentences max) motivational message that:
- Is context-aware based on the task and reason
- References their motivation sources if available
- Is encouraging but not preachy
- Is non-repetitive and fresh
- Feels personal, not generic

Respond with ONLY the motivational message, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a motivational coach. Be brief and impactful." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Stay focused — every small step counts!";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-motivation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", message: "Keep pushing forward — you've got this!" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
