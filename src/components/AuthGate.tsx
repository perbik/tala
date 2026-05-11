import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BRAND } from '../constants/moods';

type Mode = 'signin' | 'signup';

export const AuthGate: React.FC = () => {
  const [mode,     setMode]     = useState<Mode>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const switchMode = (m: Mode) => {
    setMode(m); setError(''); setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! You can sign in now.');
        switchMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App.tsx picks up the session via onAuthStateChange automatically
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F4F6FB',
      fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        border: `2px solid ${BRAND.navy}`,
        padding: '44px 40px 36px',
        width: 380,
        maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(2,52,148,0.10)',
      }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display:'inline-flex', background:BRAND.navy, padding:'10px 16px', marginBottom: 8 }}>
            <img src="/Tala - Logo.svg" alt="Tala" style={{ height: 52, width: 'auto' }} />
          </div>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(2,52,148,0.40)',
          }}>
            {mode === 'signin' ? 'Sign in to your journal' : 'Create your journal'}
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={13} color={BRAND.navy}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} />
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={13} color={BRAND.navy}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} />
              <input
                type={showPw ? 'text' : 'password'} required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                style={{ ...inputStyle, paddingLeft: 32, paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: BRAND.navy, opacity: 0.45, display: 'flex', alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fff0f0', border: `2px solid ${BRAND.red}`,
              padding: '8px 12px', fontSize: 12, fontWeight: 600, color: BRAND.red,
            }}>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              background: '#f0fff4', border: '2px solid #00DE30',
              padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#006614',
            }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background:    BRAND.navy,
              color:         '#fff',
              border:        'none',
              padding:       '13px',
              fontFamily:    'inherit',
              fontSize:      13,
              fontWeight:    900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor:        loading ? 'not-allowed' : 'pointer',
              opacity:       loading ? 0.7 : 1,
              marginTop:     4,
              transition:    'opacity 0.15s',
            }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* ── Toggle ── */}
        <p style={{
          textAlign: 'center', marginTop: 22, marginBottom: 0,
          fontSize: 12, fontWeight: 600, color: 'rgba(2,52,148,0.50)',
        }}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: BRAND.navy, fontWeight: 900, fontSize: 12,
              fontFamily: 'inherit', padding: 0, textDecoration: 'underline',
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      10,
  fontWeight:    800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color:         BRAND.navy,
  marginBottom:  5,
};

const inputStyle: React.CSSProperties = {
  width:       '100%',
  border:      `2px solid ${BRAND.navy}`,
  padding:     '9px 12px',
  fontSize:    14,
  fontWeight:  500,
  fontFamily:  'Helvetica, "Helvetica Neue", Arial, sans-serif',
  color:       BRAND.navy,
  outline:     'none',
  background:  '#fff',
  boxSizing:   'border-box',
};
