'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user.email ?? null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (!email) {
    return null;
  }

  return (
    <div className="auth-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
        Signed in as <strong>{email}</strong>
      </span>
      <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  );
}
