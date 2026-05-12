import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Password strength: 0-4
  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthMeta = [
    { label: '', color: 'transparent' },
    { label: 'Weak', color: '#EF4444' },
    { label: 'Fair', color: '#F59E0B' },
    { label: 'Good', color: '#3B82F6' },
    { label: 'Strong', color: '#10B981' },
  ][strength];

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 480); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { triggerShake(); setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        toast({ title: 'Welcome back', description: 'Signed in successfully.' });
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        triggerShake();
        setError('Wrong email or password.');
        setLoading(false);
      }
    } catch {
      triggerShake();
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try { await loginWithGoogle(); } catch { setError('Google sign-in failed.'); setLoading(false); }
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px 13px 44px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 200ms ease',
  };
  const inputFocused: React.CSSProperties = {
    borderColor: 'rgba(59,130,246,0.6)',
    background: 'rgba(59,130,246,0.06)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.12), 0 0 20px rgba(59,130,246,0.08)',
  };
  const inputValid: React.CSSProperties = { borderColor: 'rgba(59,130,246,0.3)' };
  const inputError: React.CSSProperties = {
    borderColor: 'rgba(239,68,68,0.6)',
    boxShadow: '0 0 0 3px rgba(239,68,68,0.1)',
  };

  const getInputStyle = (focused: boolean, hasValue: boolean): React.CSSProperties => {
    if (error && !focused) return { ...inputBase, ...inputError };
    if (focused) return { ...inputBase, ...inputFocused };
    if (hasValue) return { ...inputBase, ...inputValid };
    return inputBase;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#020408',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Mesh gradient orbs */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'rgba(59,130,246,0.08)', filter: 'blur(120px)',
        top: '-10%', left: '-10%', borderRadius: '50%',
        animation: 'orbDrift 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        background: 'rgba(139,92,246,0.06)', filter: 'blur(100px)',
        bottom: '-8%', right: '-8%', borderRadius: '50%',
        animation: 'orbDrift 28s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300,
        background: 'rgba(6,182,212,0.04)', filter: 'blur(80px)',
        top: '40%', left: '50%', borderRadius: '50%',
        animation: 'orbDrift 32s ease-in-out infinite',
      }} />

      {/* Dot grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }} />

      <style>{`
        @keyframes orbDrift {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px,-30px) scale(1.1); }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-card { animation: cardEnter 500ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .login-card.shake { animation: shake 380ms ease; }
        .gradient-btn {
          background: linear-gradient(135deg, #2563EB, #7C3AED);
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms;
        }
        .gradient-btn:hover:not(:disabled) {
          transform: scale(1.01);
          box-shadow: 0 8px 32px rgba(37,99,235,0.4);
          filter: brightness(1.08);
        }
        .gradient-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .google-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 180ms ease;
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>

      <div className={`login-card ${shake ? 'shake' : ''}`} style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
        padding: '44px 48px',
        background: 'rgba(13, 25, 48, 0.7)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 24,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18, boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, margin: 0,
            background: 'linear-gradient(135deg, #fff, #94A3B8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>DataVora</h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: '6px 0 0', fontWeight: 400 }}>Welcome back</p>
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: '#FCA5A5', marginBottom: 16,
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, marginBottom: 8,
            }}>Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: emailFocus ? '#3B82F6' : '#334155',
                transition: 'color 200ms', pointerEvents: 'none',
              }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                placeholder="you@company.com"
                autoComplete="email"
                style={getInputStyle(emailFocus, !!email)}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{
              display: 'block', fontSize: 11, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, marginBottom: 8,
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: passFocus ? '#3B82F6' : '#334155',
                transition: 'color 200ms', pointerEvents: 'none',
              }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...getInputStyle(passFocus, !!password), paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                  color: '#64748B', display: 'flex',
                }}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Strength meter */}
          <div style={{ marginBottom: 20, minHeight: 22 }}>
            {password && (
              <>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength ? strengthMeta.color : 'rgba(255,255,255,0.06)',
                      transition: 'background 300ms ease',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: strengthMeta.color, margin: '6px 0 0', fontWeight: 500 }}>
                  {strengthMeta.label}
                </p>
              </>
            )}
          </div>

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <a href="#" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Forgot password?</a>
          </div>

          {/* Login button */}
          <button type="submit" disabled={loading} className="gradient-btn" style={{
            width: '100%', padding: 14, border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </>
            ) : (
              <>Sign in <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '24px 0', fontSize: 12, color: '#334155',
        }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span>or continue with email</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Google only */}
        <button onClick={handleGoogle} disabled={loading} className="google-btn" style={{
          width: '100%', padding: 12, borderRadius: 12, color: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, fontSize: 14, fontWeight: 500,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{
          textAlign: 'center', fontSize: 14, color: '#64748B',
          marginTop: 28, marginBottom: 0,
        }}>
          New here?{' '}
          <Link to="/signup" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
