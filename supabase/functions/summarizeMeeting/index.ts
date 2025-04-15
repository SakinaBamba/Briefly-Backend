import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const { transcript, user_id } = await req.json()

    const summary = `Auto-generated summary for: ${transcript}`
    const proposal_items = ["Item 1", "Item 2"]

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

    return new Response(JSON.stringify({ summary }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse or insert", details: e }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    })
  }
})
