import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, MessageSquare, Brain, Target, CalendarCheck,
  Sparkles, Flame, ShieldCheck, Check,
} from 'lucide-react'
import IntroOverlay from '@/components/IntroOverlay'
import ComingSoon from '@/components/marketing/ComingSoon'

// ─── Small presentational helpers (server component — no client JS) ──────────

function DisciplineRing({ score }: { score: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
      <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="7" />
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--accent)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="tabnums" style={{ fontSize: '1.85rem', fontWeight: 700, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>Discipline</span>
      </div>
    </div>
  )
}

function FeatureCard({ icon, tint, title, body }: { icon: React.ReactNode; tint: string; title: string; body: string }) {
  return (
    <div className="card-elevated" style={{ padding: '2rem' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.7rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.98rem', margin: 0 }}>{body}</p>
    </div>
  )
}

function Step({ n, label, title, body }: { n: string; label: string; title: string; body: string }) {
  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span className="tabnums" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--border-strong)', borderRadius: 9, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{title}</h4>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.98rem', margin: 0 }}>{body}</p>
    </div>
  )
}

export default function LandingPage() {
  // Pre-launch: show only the coming-soon page at `/`. The full app stays on
  // main, dormant behind this flag — set PRELAUNCH=true in Vercel Production,
  // then delete it (and redeploy) on launch day to go live.
  if (process.env.PRELAUNCH === 'true') return <ComingSoon />

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <IntroOverlay />
      <div className="zen-grain" />

      {/* ── Nav ── */}
      <nav className="zen-rise" style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/zentrade_logo.png" alt="ZenTrade" width={34} height={34} style={{ borderRadius: 9 }} />
          <span style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>ZenTrade</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" className="hover:text-white" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
            <MessageSquare size={17} /> Community
          </Link>
          <Link href="/login" className="hover:text-white" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.6rem 1.3rem', fontSize: '0.95rem' }}>
            Start Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header style={{ position: 'relative', zIndex: 3, padding: '6.5rem 2.5rem 5rem', maxWidth: 1280, margin: '0 auto' }}>
        <div className="zen-glow zen-breathe" style={{ top: -140, left: '50%', transform: 'translateX(-50%)', width: 820, height: 600 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '3.5rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left — copy */}
          <div>
            <div className="zen-rise" style={{ animationDelay: '0.15s', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 9999, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              <Sparkles size={15} color="var(--accent)" /> AI trading psychology coach
            </div>

            <h1 className="zen-display zen-rise" style={{ animationDelay: '0.32s', fontSize: 'clamp(3.2rem, 6.5vw, 5.2rem)', marginBottom: '1.75rem' }}>
              Trade your plan.<br />
              <span style={{ color: 'var(--accent)' }}>Master your mind.</span>
            </h1>

            <p className="zen-rise" style={{ animationDelay: '0.5s', fontSize: '1.35rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 540, marginBottom: '2.5rem' }}>
              ZenTrade is the AI trading coach that keeps you disciplined — grounding every
              session in <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>your own playbook</strong>, not your P&amp;L.
            </p>

            <div className="zen-rise" style={{ animationDelay: '0.66s', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '1rem 2.1rem', fontSize: '1.1rem', gap: 9 }}>
                Start Free <ArrowRight size={19} />
              </Link>
              <Link href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '1rem 1.9rem', fontSize: '1.1rem', gap: 9, border: '1px solid var(--border-strong)' }}>
                <MessageSquare size={19} /> Join the Discord
              </Link>
            </div>

            <p className="zen-rise" style={{ animationDelay: '0.8s', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Free to start · Futures &amp; Forex · Built for ICT/SMC traders
            </p>
          </div>

          {/* Right — product glimpse */}
          <div className="card-elevated zen-rise" style={{ animationDelay: '0.42s', padding: '1.85rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Today</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 3 }}>Session review</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '5px 12px', borderRadius: 9999 }}>
                <Flame size={15} /> 4-day streak
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: '1.5rem' }}>
              <DisciplineRing score={82} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
                {[
                  { label: 'On-playbook', val: '3 / 3 trades' },
                  { label: 'Killzones respected', val: 'Yes' },
                  { label: 'A+ setups', val: '1' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span className="tabnums" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} color="var(--green)" /> {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.15rem', display: 'flex', gap: 11 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={15} color="var(--accent)" />
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                &ldquo;You waited for the sweep on every entry today — no anticipation, no revenge trade after the London loss. That&rsquo;s the rep that compounds.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Philosophy strip ── */}
      <section style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.4rem)', lineHeight: 1.4, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Every other app worships your P&amp;L — the exact thing that wrecks traders.
          <span style={{ color: 'var(--text-muted)' }}> ZenTrade judges your </span>
          <span style={{ color: 'var(--accent)' }}>process</span>
          <span style={{ color: 'var(--text-muted)' }}>, so the results follow.</span>
        </p>
      </section>

      {/* ── Features ── */}
      <section style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem 4.5rem', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
          <FeatureCard
            icon={<Brain size={26} color="var(--accent)" />} tint="var(--accent-glow)"
            title="An AI coach that knows you"
            body="Trained on ICT/SMC concepts and YOUR playbook. It reviews your trades, cites the exact setups you tag, and calls out where your discipline slips — no generic filler."
          />
          <FeatureCard
            icon={<Target size={26} color="var(--green)" />} tint="var(--green-muted)"
            title="Your model, enforced"
            body="Define your setups, killzones, and hard rules once. The coach holds every trade to them — flagging off-playbook entries and out-of-window trades against your own standard."
          />
          <FeatureCard
            icon={<CalendarCheck size={26} color="var(--yellow)" />} tint="var(--yellow-muted)"
            title="A daily discipline ritual"
            body="Plan the session, log fast, then a guided review scores your discipline and ends with an AI recap. Journaling stops being a chore and becomes the habit that makes you better."
          />
          <FeatureCard
            icon={<ShieldCheck size={26} color="var(--accent)" />} tint="var(--accent-glow)"
            title="Real prop-firm rules"
            body="Trailing, EOD, and intraday drawdown, daily loss limits, max trades — tracked automatically. An AI Guard flags revenge trades and rule breaches the moment you log them."
          />
        </div>
      </section>

      {/* ── The ritual ── */}
      <section style={{ position: 'relative', zIndex: 3, padding: '3.5rem 2.5rem 4.5rem', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="zen-display" style={{ fontSize: 'clamp(2.1rem, 4.5vw, 3rem)', marginBottom: '0.85rem' }}>One loop, every day</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem' }}>Plan it. Trade it. Review it. Improve. Repeat.</p>
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          <Step n="1" label="Plan" title="Set the intention" body="Your killzones, the day's news, your drawdown buffer, and a coach nudge from yesterday's leak — before the session starts." />
          <Step n="2" label="Execute" title="Log without friction" body="Fast logging seeded from your playbook, with a live view of your rules — how many trades left, how close to your daily stop." />
          <Step n="3" label="Review" title="Score your discipline" body="A guided end-of-day recap grades your process, updates your streak, and the coach gives you one thing to fix tomorrow." />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 3, padding: '5rem 2.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', maxWidth: 1280, margin: '3.5rem auto 0' }}>
        <h2 className="zen-display" style={{ fontSize: 'clamp(2.3rem, 5.5vw, 3.6rem)', marginBottom: '1.15rem' }}>
          Build the discipline that funds you.
        </h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 2.5rem' }}>
          Start free. Bring your model, log a few trades, and let the coach show you what your
          journal never could.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '1.05rem 2.5rem', fontSize: '1.15rem', gap: 9 }}>
            Start Free <ArrowRight size={20} />
          </Link>
          <Link href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '1.05rem 2.2rem', fontSize: '1.15rem', gap: 9, border: '1px solid var(--border-strong)' }}>
            <MessageSquare size={20} /> Join the Discord
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 3, padding: '3rem 2.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px 26px', marginBottom: '1.15rem' }}>
          <Link href="/privacy" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Privacy</Link>
          <Link href="/terms" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Terms</Link>
          <Link href="/contact" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</Link>
          <Link href="https://discord.gg/P39EYFmFFJ" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Discord</Link>
          <Link href="/login" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Sign In</Link>
          <Link href="/signup" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Sign Up</Link>
        </div>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} ZenTrade · Not financial advice.</p>
      </footer>
    </div>
  )
}
