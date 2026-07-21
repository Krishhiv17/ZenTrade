'use client'

import { useEffect, useState } from 'react'

/**
 * Renders a legal document exported from Termly (or any HTML) that lives as a
 * static file under /public/legal/<slug>.html. Kept out of the JS bundle and
 * fetched at runtime; drawn on a light "paper" surface so the (light-themed)
 * Termly markup stays readable against the app's dark background.
 */
export default function LegalDoc({ slug }: { slug: string }) {
    const [html, setHtml] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let active = true
        fetch(`/legal/${slug}.html`)
            .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text() })
            .then(t => { if (active) setHtml(t) })
            .catch(() => { if (active) setFailed(true) })
        return () => { active = false }
    }, [slug])

    if (failed) {
        return <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>This document isn&rsquo;t available yet. Please check back soon.</p>
    }
    if (html === null) {
        return <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading…</p>
    }
    return <div className="legal-paper" dangerouslySetInnerHTML={{ __html: html }} />
}
