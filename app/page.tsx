import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Activity, Brain, Globe, MessageSquare } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/zentrade_logo.png" alt="ZenTrade Logo" width={32} height={32} style={{ borderRadius: 8 }} />
          <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>ZenTrade</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'color 0.2s' }} className="hover:text-white">
            <MessageSquare size={16} /> Community
          </Link>
          <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, padding: '0.5rem 1rem' }} className="hover:text-white">
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ padding: '8rem 2rem 6rem', textAlign: 'center', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

        <h1 style={{ fontSize: '4.5rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
          Stop blowing evaluations. <br />
          <span style={{ background: 'linear-gradient(to right, #a855f7, #60a5fa)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Master your edge.</span>
        </h1>

        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 3rem', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
          ZenTrade is the ultimate, free trading journal for modern futures and forex traders. It actively monitors your psychology and enforces your Prop Firm risk rules in real-time.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', gap: 8 }}>
            Start Journaling Free <ArrowRight size={18} />
          </Link>
          <Link href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', backgroundColor: '#5865F2', color: 'white', border: 'none', gap: 8 }}>
            <MessageSquare size={18} /> Join the Discord
          </Link>
        </div>
      </header>

      {/* Features Grid */}
      <section style={{ padding: '4rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>The AI Guard</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your safety net. ZenTrade automatically flags revenge trading, daily loss limit breaches, and oversized positions the second you log them.
            </p>
          </div>

          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(168,85,247,0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Activity size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Prop Firm Automation</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tracks Peak EOD balances to strictly enforce your trailing drawdown locks. Never get blindsided by a blown evaluation again.
            </p>
          </div>

          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Brain size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Llama 3 AI Coach</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Chat with an elite AI performance coach that has deep access to your real win rates, risk multiples, and daily psychology notes.
            </p>
          </div>

          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Globe size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Futures & Forex</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The UI instantly adapts. Log ES contracts or EURUSD lots with custom pip calculations and session-based edge analytics.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>Professional Grade. <span style={{ color: 'var(--green)' }}>100% Free.</span></h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 2.5rem' }}>
          ZenTrade is built by traders, for traders. No subscriptions, no paywalls, just pure edge maximization.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
          Create Your Account Now
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: '1rem' }}>
          <Link href="https://discord.gg/P39EYFmFFJ" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Discord</Link>
          <Link href="/login" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Sign In</Link>
          <Link href="/signup" className="hover:text-white" style={{ textDecoration: 'none', color: 'inherit' }}>Sign Up</Link>
        </div>
        <p>© {new Date().getFullYear()} ZenTrade Journal</p>
      </footer>
    </div>
  )
}
