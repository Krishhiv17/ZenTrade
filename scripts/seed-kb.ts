// ============================================================
// KB seeder — populates `knowledge_chunks` with the Phase 1
// hand-written ICT/SMC concept notes so retrieval has something
// to return. Idempotent: upserts on (concept, version).
//
// Run:
//   npm run seed:kb
//   (which is: tsx --env-file=.env.local scripts/seed-kb.ts)
//
// Requires in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (writes bypass RLS)
// and the `embed` Edge Function must be deployed
// (supabase functions deploy embed).
// ============================================================

import { SEED_CONCEPTS } from './seed/concepts'
import { embed, EMBEDDING_DIM } from '../lib/embeddings'
import { createAdminClient } from '../lib/supabase/admin'

// Rough token estimate — ~4 chars/token. Good enough for the column;
// exact counts aren't needed for retrieval.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

async function main() {
  console.log(`\n🌱 Seeding ${SEED_CONCEPTS.length} concept notes (dim=${EMBEDDING_DIM})…\n`)

  const supabase = createAdminClient()
  let ok = 0
  let failed = 0

  for (const c of SEED_CONCEPTS) {
    try {
      const embedding = await embed(c.content)

      const { error } = await supabase
        .from('knowledge_chunks')
        .upsert(
          {
            concept: c.concept,
            category: c.category,
            content: c.content,
            source: c.source ?? 'internal-paraphrase',
            token_count: estimateTokens(c.content),
            embedding,
            version: 1,
          },
          { onConflict: 'concept,version' },
        )

      if (error) {
        failed++
        console.error(`  ✗ ${c.concept} — ${error.message}`)
      } else {
        ok++
        console.log(`  ✓ ${c.concept}  (${c.category})`)
      }
    } catch (err) {
      failed++
      console.error(`  ✗ ${c.concept} — ${(err as Error).message}`)
    }
  }

  console.log(`\nDone. ${ok} upserted, ${failed} failed.\n`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('\nSeeder crashed:', err)
  process.exit(1)
})
