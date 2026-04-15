import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── helpers ─── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const dur = 1800;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        setVal(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── main component ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [navBlur, setNavBlur] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);

  /* custom cursor */
  useEffect(() => {
    const move = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const over = () => { hovering.current = true; };
    const out = () => { hovering.current = false; };
    window.addEventListener('mousemove', move);
    document.querySelectorAll('button,a,.card-tilt').forEach(el => {
      el.addEventListener('mouseenter', over);
      el.addEventListener('mouseleave', out);
    });
    let raf: number;
    const tick = () => {
      pos.current.x = lerp(pos.current.x, mouse.current.x, 0.12);
      pos.current.y = lerp(pos.current.y, mouse.current.y, 0.12);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${mouse.current.x - 3}px,${mouse.current.y - 3}px)`;
      }
      if (followerRef.current) {
        const s = hovering.current ? 80 : 36;
        const o = hovering.current ? 0.12 : 0.25;
        followerRef.current.style.transform = `translate(${pos.current.x - s / 2}px,${pos.current.y - s / 2}px)`;
        followerRef.current.style.width = `${s}px`;
        followerRef.current.style.height = `${s}px`;
        followerRef.current.style.opacity = `${o}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', move); };
  }, []);

  /* scroll */
  useEffect(() => {
    const h = () => { setScrollY(window.scrollY); setNavBlur(window.scrollY > 60); };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* scroll reveals */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* testimonial auto-play */
  const testimonials = [
    { quote: "We cut our reporting time by 60%. The AI just gets it.", name: "Sarah Chen", role: "VP Analytics, Meridian" },
    { quote: "Finally, a tool that doesn't need a manual.", name: "James Okafor", role: "Data Lead, Stratos" },
    { quote: "Our team actually enjoys working with data now.", name: "Lena Müller", role: "Head of BI, Kova" },
    { quote: "The data quality pipeline alone saved us thousands.", name: "Raj Patel", role: "CTO, Lumina Health" },
  ];
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 4000);
    return () => clearInterval(t);
  }, []);

  /* card tilt */
  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 16;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -16;
    card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg) translateY(-4px)`;
  }, []);
  const resetTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) translateY(0)';
  }, []);

  const features = [
    { title: "Smart Dashboards", desc: "Drag, drop, done. Your data arranges itself.", icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" strokeWidth="1.5" stroke="currentColor" fill="none"/> , span: true },
    { title: "AI Copilot", desc: "Ask questions in plain English. Get charts back.", icon: <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7.5V18h-6v-2.5l-.7-.5A7 7 0 0 1 12 2zM9 21h6" strokeWidth="1.5" stroke="currentColor" fill="none"/> },
    { title: "Data Quality", desc: "11-step cleaning pipeline. Enterprise-grade.", icon: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 12c0 4.97 3.04 9.21 7.36 11a12.14 12.14 0 0 0 1.64.73c.32.11.66.11.98 0A12.14 12.14 0 0 0 21 12c0-1.39-.24-2.73-.68-3.97" strokeWidth="1.5" stroke="currentColor" fill="none"/> },
    { title: "3D Visuals", desc: "Particles, axes, depth. Data you can almost touch.", icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeWidth="1.5" stroke="currentColor" fill="none"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="1.5" stroke="currentColor" fill="none"/></> },
    { title: "One-Click Reports", desc: "PDF, PPTX, DOCX — beautiful, data-driven, instant.", icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" strokeWidth="1.5" stroke="currentColor" fill="none"/> },
  ];

  const stats = [
    { value: 10000000, suffix: '+', label: 'Rows processed daily' },
    { value: 99.9, suffix: '%', label: 'Platform uptime' },
    { value: 38, suffix: '+', label: 'Visualization types' },
    { value: 11, suffix: '', label: 'Quality checks' },
  ];

  return (
    <div className="apple-landing" style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#000', color: '#fff', overflowX: 'hidden' }}>
      {/* Custom cursor (hidden on touch) */}
      <div ref={cursorRef} className="cursor-dot" />
      <div ref={followerRef} className="cursor-follower" />

      {/* ─── NAV ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: navBlur ? 'blur(20px) saturate(180%)' : 'none',
        background: navBlur ? 'rgba(0,0,0,0.72)' : 'transparent',
        borderBottom: navBlur ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" stroke="#0071E3" strokeWidth="2"/><path d="M9 14l3 3 7-7" stroke="#0071E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em' }}>DataVora</span>
          </button>
          <div className="nav-links-desktop" style={{ display: 'flex', gap: 32 }}>
            {['Features', 'Pricing', 'About'].map(l => (
              <button key={l} onClick={() => document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign in</button>
            <button onClick={() => navigate('/signup')} className="apple-btn-sm">Get Started</button>
          </div>
          <button className="nav-hamburger" onClick={() => setMobileMenu(!mobileMenu)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={mobileMenu ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {['Features', 'Pricing', 'About'].map((l, i) => (
            <button key={l} onClick={() => { setMobileMenu(false); document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, fontWeight: 600, cursor: 'pointer', opacity: 0, animation: `appleFadeUp 0.5s ${i * 0.1}s forwards` }}>
              {l}
            </button>
          ))}
          <button onClick={() => { setMobileMenu(false); navigate('/login'); }} style={{ background: 'none', border: 'none', color: '#0071E3', fontSize: 20, fontWeight: 500, cursor: 'pointer', marginTop: 16 }}>Sign in →</button>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '120px 24px 80px' }}>
        {/* Orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(88,28,235,0.25), transparent 70%)', top: '-5%', left: '15%', animationDuration: '25s' }} />
          <div className="orb" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,113,227,0.2), transparent 70%)', top: '30%', right: '10%', animationDuration: '30s', animationDelay: '-8s' }} />
          <div className="orb" style={{ width: 350, height: 350, background: 'radial-gradient(circle, rgba(48,209,178,0.15), transparent 70%)', bottom: '10%', left: '35%', animationDuration: '22s', animationDelay: '-4s' }} />
        </div>

        {/* Parallax layer */}
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${scrollY * 0.3}px)`, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 2, height: 2, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', top: '20%', left: '10%' }} />
          <div style={{ position: 'absolute', width: 3, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', top: '60%', right: '20%' }} />
          <div style={{ position: 'absolute', width: 2, height: 2, background: 'rgba(255,255,255,0.12)', borderRadius: '50%', top: '40%', left: '70%' }} />
        </div>

        <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p className="hero-eyebrow" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0071E3', marginBottom: 24 }}>
            Introducing DataVora
          </p>
          <h1 className="hero-headline" style={{ fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 24px' }}>
            {'Your data tells a story.'.split('').map((c, i) => (
              <span key={i} className="hero-char" style={{ animationDelay: `${i * 0.03}s` }}>{c === ' ' ? '\u00A0' : c}</span>
            ))}
            <br />
            {'We help you hear it.'.split('').map((c, i) => (
              <span key={i} className="hero-char" style={{ animationDelay: `${(i + 22) * 0.03}s`, color: i < 20 ? undefined : '#0071E3' }}>{c === ' ' ? '\u00A0' : c}</span>
            ))}
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7, fontWeight: 400 }}>
            An analytics platform that's fast, clear, and built for teams who'd rather act than analyze.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signup')} className="apple-btn-primary">
              Get started free <span style={{ marginLeft: 4 }}>→</span>
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="apple-btn-ghost">
              See what's inside
            </button>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0071E3', marginBottom: 12 }}>Capabilities</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Everything you need. Nothing you don't.</h2>
        </div>
        <div className="feature-grid">
          {features.map((f, i) => (
            <div key={i} className={`card-tilt reveal ${f.span ? 'feature-span' : ''}`}
              onMouseMove={handleTilt} onMouseLeave={resetTilt}
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: 36,
                transition: 'transform 0.15s ease, box-shadow 0.3s ease',
                animationDelay: `${i * 0.08}s`,
              }}>
              <svg width="32" height="32" viewBox="0 0 24 24" style={{ color: '#0071E3', marginBottom: 16 }}>{f.icon}</svg>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>{f.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="stats-row reveal" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 40 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 140 }}>
              <div style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                {s.value >= 1000000 ? <><CountUp target={10} suffix="M" />{s.suffix}</> : <CountUp target={s.value} suffix={s.suffix} />}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ padding: '120px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0071E3', marginBottom: 12 }}>What teams say</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>Don't take our word for it.</h2>
        </div>
        <div className="reveal" style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', padding: '48px 40px', minHeight: 200 }}
          onMouseEnter={() => {}} /* pause handled via CSS */
        >
          {testimonials.map((t, i) => (
            <div key={i} style={{
              position: i === testimonialIdx ? 'relative' : 'absolute',
              opacity: i === testimonialIdx ? 1 : 0,
              transform: i === testimonialIdx ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              top: i === testimonialIdx ? undefined : 0,
              left: i === testimonialIdx ? undefined : 0,
              right: i === testimonialIdx ? undefined : 0,
            }}>
              <p style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.5, letterSpacing: '-0.02em', marginBottom: 24 }}>"{t.quote}"</p>
              <div style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{t.role}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)} style={{
                width: i === testimonialIdx ? 24 : 8, height: 8, borderRadius: 4,
                background: i === testimonialIdx ? '#0071E3' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: '120px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0071E3', marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>Start free. Scale when you're ready.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { name: 'Starter', price: 'Free', desc: 'For individuals exploring data.', items: ['5 dashboards', '3 data sources', 'Basic charts', 'CSV export'] },
            { name: 'Pro', price: '$29/mo', desc: 'For teams that move fast.', items: ['Unlimited dashboards', 'AI Copilot', '3D visuals', 'PDF & PPTX reports', 'Priority support'], featured: true },
            { name: 'Enterprise', price: 'Custom', desc: 'For orgs with big data needs.', items: ['Everything in Pro', 'SSO & RBAC', 'Dedicated support', 'Custom integrations', 'SLA guarantee'] },
          ].map((p, i) => (
            <div key={i} className="card-tilt reveal" onMouseMove={handleTilt} onMouseLeave={resetTilt}
              style={{
                background: p.featured ? 'rgba(0,113,227,0.08)' : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${p.featured ? 'rgba(0,113,227,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 18, padding: 36,
                transition: 'transform 0.15s ease, box-shadow 0.3s ease',
                animationDelay: `${i * 0.1}s`,
              }}>
              {p.featured && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0071E3', marginBottom: 8, display: 'block' }}>Most popular</span>}
              <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{p.name}</h3>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>{p.price}</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{p.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                {p.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/signup')} className={p.featured ? 'apple-btn-primary' : 'apple-btn-ghost'} style={{ width: '100%' }}>
                {p.price === 'Custom' ? 'Contact sales' : 'Get started'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', background: '#000', position: 'relative' }}>
        <div className="reveal" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 20 }}>Ready to see your data clearly?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 40, lineHeight: 1.7 }}>Join thousands of teams making better decisions, faster.</p>
          <button onClick={() => navigate('/signup')} className="apple-btn-primary apple-gradient-border">
            Start for free →
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, marginBottom: 40 }}>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
            { title: 'Resources', links: ['Documentation', 'API Reference', 'Community', 'Status'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
          ].map((col, i) => (
            <div key={i}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{col.title}</h4>
              {col.links.map(l => (
                <a key={l} href="#" style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>© 2026 DataVora. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Cookies'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
