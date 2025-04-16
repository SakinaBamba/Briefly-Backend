import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"


serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

  try {
    const { transcript, user_id } = await req.json()

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes sales meetings and extracts proposal items."
          },
          {
            role: "user",
            content: `Here's the meeting transcript:\n\n${transcript}\n\nPlease provide a short summary of the meeting and a bullet point list of any proposal items discussed.`
          }
        ],
        temperature: 0.3
      })
    })

    const openaiData = await openaiRes.json()
    console.log("OpenAI raw response:", JSON.stringify(openaiData, null, 2)) // 🧠 DEBUG LOG

    if (!openaiData.choices || !openaiData.choices[0]?.message?.content) {
      return new Response(JSON.stringify({
        error: "OpenAI response error",
        details: openaiData
      }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      })
    }

    const gptMessage = openaiData.choices[0].message.content

    // 🧠 Parse the message into summary and proposal items
    const [summaryPart, itemsPart] = gptMessage.split("Proposal items:")
    const summary = summaryPart?.trim() || "Summary unavailable."
    const proposal_items = itemsPart
      ? itemsPart.split("\n").filter(line => line.trim().startsWith("-"))
      : []

    const { error } = await supabase.from("meetings").insert({
      user_id,
      transcript,
      summary,
      proposal_items,
      created_at: new Date().toISOString()
    })

    if (error) {
      return new Response(JSON.stringify({ error: "Insert failed", details: error }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      })
    }

    return new Response(JSON.stringify({ summary, proposal_items }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (e) {
    console.error("Function error:", e)
    return new Response(JSON.stringify({ error: "Failed to parse or insert", details: e }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    })
  }
})

