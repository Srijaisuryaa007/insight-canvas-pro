import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { triggerShake(); setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const ok = await login(email, password);
      if (ok) {
        setSuccess(true);
        toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        triggerShake();
        setError('Wrong email or password. Try again.');
      }
    } catch {
      triggerShake();
      setError('Something went wrong. Please try again.');
    } finally {
      if (!success) setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try { await loginWithGoogle(); } catch { setError('Google sign-in failed.'); setLoading(false); }
  };

  const S: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative', overflow: 'hidden', padding: 24,
    },
    bg: {
      position: 'absolute', inset: 0, zIndex: 0,
      background: 'linear-gradient(135deg, #0a0a1a 0%, #000 40%, #0d0d2b 70%, #0a0014 100%)',
      backgroundSize: '400% 400%',
      animation: 'meshGradient 15s ease infinite',
    },
    card: {
      position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: 40,
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 18,
      animation: 'cardEntrance 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
    },
    logo: { textAlign: 'center' as const, marginBottom: 32 },
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px', color: '#fff' },
    sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 400 },
    field: { position: 'relative' as const, marginBottom: 28 },
    input: {
      width: '100%', background: 'none', border: 'none',
      borderBottom: '1px solid rgba(255,255,255,0.15)',
      padding: '12px 0 8px', fontSize: 16, color: '#fff', outline: 'none',
      fontFamily: 'inherit', transition: 'border-color 0.3s',
    },
    label: {
      position: 'absolute' as const, left: 0, top: 12, fontSize: 14,
      color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' as const,
      transition: 'all 0.2s ease',
    },
    labelUp: {
      position: 'absolute' as const, left: 0, top: -10, fontSize: 11,
      color: '#0071E3', pointerEvents: 'none' as const,
      transition: 'all 0.2s ease', fontWeight: 500,
    },
    focusLine: {
      position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 2,
      background: '#0071E3', transformOrigin: 'left',
      transition: 'transform 0.3s ease',
    },
    btn: {
      width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 600,
      background: '#fff', color: '#000', border: 'none', borderRadius: 12,
      cursor: 'pointer', position: 'relative' as const, overflow: 'hidden',
      transition: 'transform 0.12s ease, filter 0.12s ease',
      marginTop: 8,
    },
    divider: {
      display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0',
      fontSize: 13, color: 'rgba(255,255,255,0.3)',
    },
    socialBtn: {
      flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 500,
      background: 'none', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, color: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'background 0.2s, border-color 0.2s',
    },
    error: {
      fontSize: 13, color: '#ff453a', textAlign: 'center' as const,
      marginBottom: 16, padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,69,58,0.1)',
    },
    link: {
      fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
      position: 'relative' as const, display: 'inline-block',
    },
  };

  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  return (
    <div style={S.page}>
      <div style={S.bg} />
      {/* Ambient orbs */}
      <div className="orb" style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(88,28,235,0.2), transparent 70%)', top: '-10%', left: '-5%', animationDuration: '20s', zIndex: 0 }} />
      <div className="orb" style={{ position: 'absolute', width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,113,227,0.15), transparent 70%)', bottom: '0%', right: '-5%', animationDuration: '25s', animationDelay: '-6s', zIndex: 0 }} />

      <div style={S.card} className={shake ? 'shake-anim' : ''}>
        {/* Logo */}
        <div style={S.logo}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: '0 auto 20px' }}>
            <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
            <circle cx="22" cy="22" r="10" stroke="#0071E3" strokeWidth="2"/>
            <path d="M16 22l4 4 8-8" stroke="#0071E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 style={S.h1}>Welcome back.</h1>
          <p style={S.sub}>Good to see you again.</p>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={S.field}>
            <input ref={emailRef} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
              style={{ ...S.input, borderBottomColor: emailFocus ? 'transparent' : undefined }}
              autoComplete="email"
            />
            <label style={emailFocus || email ? S.labelUp : S.label}>Email address</label>
            <div style={{ ...S.focusLine, transform: emailFocus ? 'scaleX(1)' : 'scaleX(0)' }} />
          </div>

          {/* Password */}
          <div style={S.field}>
            <input ref={passRef} type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)}
              style={{ ...S.input, borderBottomColor: passFocus ? 'transparent' : undefined, paddingRight: 36 }}
              autoComplete="current-password"
            />
            <label style={passFocus || password ? S.labelUp : S.label}>Password</label>
            <div style={{ ...S.focusLine, transform: passFocus ? 'scaleX(1)' : 'scaleX(0)' }} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 0, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {showPass ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}
              </svg>
            </button>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <a href="#" style={S.link} className="underline-link">Forgot password?</a>
          </div>

          {/* CTA Button */}
          <button type="submit" disabled={loading} style={S.btn}
            className="shimmer-btn"
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading && !success ? (
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
              </svg>
            ) : success ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l4 4 6-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Welcome
              </span>
            ) : (
              'Continue →'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={S.divider}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span>or continue with</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Social */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={S.socialBtn} onClick={handleGoogle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button style={S.socialBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Apple
          </button>
        </div>

        {/* Sign up link */}
        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 28, marginBottom: 0 }}>
          New here? <Link to="/signup" style={{ color: '#0071E3', textDecoration: 'none', fontWeight: 500 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
