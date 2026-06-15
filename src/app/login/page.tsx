'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Lock, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    router.push('/');
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '3rem 1rem' }}>
      <div className="glass-card auth-card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>Sign in to AetherFlash</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Use your email and password or continue with a provider. Your notes and flashcards will stay synced with Supabase.
          </p>
        </div>

        {error ? (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSignIn();
          }}
        >
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <div className="input-group">
            <Mail size={16} />
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="input-group">
            <Lock size={16} />
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Processing...' : 'Sign in'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>or continue with</span>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => handleOAuth('github')} disabled={loading}>
            <ArrowRight size={18} /> Continue with GitHub
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleOAuth('google')} disabled={loading}>
            <ArrowRight size={18} /> Continue with Google
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>
            New here?{' '}
            <button
              type="button"
              className="btn btn-link"
              onClick={handleSignUp}
              disabled={loading}
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
