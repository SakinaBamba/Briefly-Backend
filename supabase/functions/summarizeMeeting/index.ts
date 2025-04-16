import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { transcript, user_id } = await req.json();

    const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
      },
      body: JSON.stringify({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes meetings and extracts proposal items."
          },
          {
            role: "user",
            content: `Here's the meeting transcript:\n\n${transcript}\n\nPlease provide a short summary of the meeting and a bullet point list of any proposal items discussed.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await openAIRes.json();
    console.log("OpenAI raw response:", data);

    if (!data.choices || !data.choices[0]?.message?.content) {
      return new Response(JSON.stringify({
        error: "Invalid response from OpenAI",
        details: data
      }), { status: 500 });
    }

    const gptMessage = data.choices[0].message.content;
    const [summaryPart, itemsPart] = gptMessage.split("Proposal items:");
    const summary = summaryPart?.trim() || "Summary unavailable.";
    const proposal_items = itemsPart
      ? itemsPart.split("\n").filter(line => line.trim().startsWith("-"))
      : [];

    // Insert into Supabase
    const { error: insertError } = await supabaseClient
      .from("meetings")
      .insert([
        {
          user_id,
          transcript,
          summary,
          proposal_items,
          title: "Untitled Meeting" // You can improve this later using Graph API titles
        }
      ]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({
        error: "Failed to insert into Supabase",
        details: insertError
      }), { status: 500 });
    }

    return new Response(JSON.stringify({ summary, proposal_items }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({
      error: "Failed to parse or insert",
      details: err.message
    }), { status: 500 });
  }
});
