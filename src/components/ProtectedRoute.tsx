'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Checking authentication…</p>
      </div>
    );
  }

  return <>{children}</>;
}
