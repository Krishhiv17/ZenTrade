// ============================================================
// Supabase Edge Function: embed
// Generates a 384-dim embedding for a text input using the
// built-in `gte-small` model. Runs on Supabase's edge runtime
// (Deno) — keeps embedding compute off Vercel and stays $0.
//
// Deploy:  supabase functions deploy embed
// Auth:    verify_jwt is ON (default). Callers must send a valid
//          JWT — the app calls this server-side with the service
//          -role key (a valid signed JWT), so only our backend
//          reaches it.
//
// Contract:
//   POST { "input": "some text" }  ->  200 { "embedding": number[384] }
//   Errors -> { "error": string } with 400/500.
// ============================================================

// The `Supabase.ai` global is injected by the edge runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Supabase: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let input: unknown
  try {
    const body = await req.json()
    input = body?.input
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof input !== 'string' || input.trim().length === 0) {
    return json({ error: 'Body must include a non-empty string `input`.' }, 400)
  }

  try {
    // mean_pool + normalize → a single unit-length 384-dim sentence vector,
    // which is what cosine similarity (vector_cosine_ops) expects.
    const embedding: number[] = await model.run(input, {
      mean_pool: true,
      normalize: true,
    })

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      return json({ error: `Unexpected embedding shape (len=${(embedding as number[])?.length}).` }, 500)
    }

    return json({ embedding })
  } catch (err) {
    return json({ error: (err as Error)?.message ?? 'Embedding failed' }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
