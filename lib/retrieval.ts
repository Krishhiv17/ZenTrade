// ============================================================
// Retrieval — SERVER-ONLY.
//
// Embeds a question and pulls the most relevant ICT/SMC concept
// chunks from the knowledge base via the `match_knowledge` RPC
// (pgvector, HNSW). Used by the coach route to ground answers.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { embed } from '@/lib/embeddings'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface KnowledgeChunk {
  id: string
  concept: string
  category: string
  content: string
  similarity: number
}

// Retrieval tunables — see IMPLEMENTATION_PLAN.md §1.3 / §5.3.
// k=6 gives the model a few *related* concepts to synthesize (e.g. FVG +
// order block + liquidity + confluence) rather than a single definition.
export const DEFAULT_MATCH_COUNT = 6
export const DEFAULT_MATCH_THRESHOLD = 0.5

interface MatchOptions {
  /** Reuse an existing (authenticated) server client instead of creating one. */
  client?: SupabaseClient
  k?: number
  threshold?: number
}

/**
 * Return up to `k` concept chunks most similar to `question`,
 * filtered to those above `threshold` cosine similarity.
 * Never throws to the caller — retrieval is best-effort context;
 * on failure the coach simply answers without extra grounding.
 */
export async function matchKnowledge(
  question: string,
  { client, k = DEFAULT_MATCH_COUNT, threshold = DEFAULT_MATCH_THRESHOLD }: MatchOptions = {},
): Promise<KnowledgeChunk[]> {
  try {
    const supabase = client ?? (await createClient())
    const queryEmbedding = await embed(question)

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: k,
    })

    if (error) {
      console.error('matchKnowledge RPC error:', error.message)
      return []
    }

    return (data as KnowledgeChunk[]) ?? []
  } catch (err) {
    console.error('matchKnowledge failed:', (err as Error).message)
    return []
  }
}
