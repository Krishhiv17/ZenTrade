// ============================================================
// Embeddings seam — SERVER-ONLY.
//
// Single choke point for turning text into a vector. The rest of
// the app (retrieval, ingestion) depends ONLY on `embed()` and is
// agnostic to the provider behind it. To swap gte-small → OpenAI,
// change this file (and the vector(384) column dimension).
//
// Default provider: `gte-small` (384-dim) via the Supabase
// `embed` Edge Function. Called with the service-role key so it
// works identically from the coach route handler and the seeder
// (both server-side) without any user/request context.
// ============================================================

export const EMBEDDING_DIM = 384

/**
 * Embed a single string into a 384-dim unit vector.
 * Throws on network error, non-2xx, or dimension mismatch — a
 * silent dimension mismatch would corrupt every similarity search.
 */
export async function embed(text: string): Promise<number[]> {
  // Read env at call time (not module load) so import order never matters
  // for standalone scripts (the seeder) that populate env before running.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
  if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')

  const input = text.trim()
  if (!input) throw new Error('embed() received empty text.')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`embed() failed (${res.status}): ${detail || res.statusText}`)
  }

  const data = (await res.json()) as { embedding?: unknown; error?: string }
  if (data.error) throw new Error(`embed() edge error: ${data.error}`)

  const embedding = data.embedding
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `embed() dimension mismatch: expected ${EMBEDDING_DIM}, got ${
        Array.isArray(embedding) ? embedding.length : typeof embedding
      }.`,
    )
  }

  return embedding as number[]
}
