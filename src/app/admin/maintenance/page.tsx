"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trash2, Database, BookOpen, Layers, Calendar, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Archive } from 'lucide-react';

type DbStats = {
  categories: number;
  flashcards: number;
  reviews: number;
};

export default function MaintenancePage() {
  const [stats, setStats] = useState<DbStats>({ categories: 0, flashcards: 0, reviews: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState<string>('30');
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const [
        { count: catCount, error: catErr },
        { count: cardCount, error: cardErr },
        { count: revCount, error: revErr },
      ] = await Promise.all([
        supabase.from('fc_categories').select('*', { count: 'exact', head: true }),
        supabase.from('fc_flashcards').select('*', { count: 'exact', head: true }),
        supabase.from('fc_reviews').select('*', { count: 'exact', head: true }),
      ]);

      if (catErr) throw catErr;
      if (cardErr) throw cardErr;
      if (revErr) throw revErr;

      setStats({
        categories: catCount ?? 0,
        flashcards: cardCount ?? 0,
        reviews: revCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatus({ type: 'error', message: 'Failed to load database statistics.' });
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleDeleteOldRecords() {
    const thresholdDays = parseInt(daysThreshold);
    if (isNaN(thresholdDays) || thresholdDays < 0) {
      setStatus({ type: 'error', message: 'Please enter a valid number of days.' });
      return;
    }

    setIsDeleting(true);
    setStatus(null);

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      const { count: deletedCount, error: countError } = await supabase
        .from('fc_reviews')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thresholdDate.toISOString());

      if (countError) throw countError;

      if (!deletedCount || deletedCount === 0) {
        setStatus({ type: 'info', message: 'No review records found older than the specified period.' });
        setIsDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('fc_reviews')
        .delete()
        .lt('created_at', thresholdDate.toISOString());

      if (deleteError) throw deleteError;

      setStatus({
        type: 'success',
        message: `Successfully deleted ${deletedCount} old review records.`,
      });

      await fetchStats();
    } catch (error: any) {
      console.error('Deletion error:', error);
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsDeleting(false);
    }
  }

  const statCards = [
    { label: 'Categories', value: stats.categories, icon: Layers, color: '#6366f1' },
    { label: 'Flashcards', value: stats.flashcards, icon: BookOpen, color: '#06b6d4' },
    { label: 'Reviews', value: stats.reviews, icon: Database, color: '#a855f7' },
  ];

  return (
    <div>
      {/* Back Navigation */}
      <Link href="/" className="back-link">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="page-title-section">
        <h1 className="page-title">Database Maintenance</h1>
        <p className="page-subtitle">Monitor your data and clean up old review records.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-container" style={{ marginBottom: '2rem' }}>
        {statCards.map((card) => (
          <div key={card.label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', height: 'auto', padding: '1.5rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `rgba(${parseInt(card.color.slice(1,3), 16)}, ${parseInt(card.color.slice(3,5), 16)}, ${parseInt(card.color.slice(5,7), 16)}, 0.15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {loadingStats ? <Loader2 size={22} style={{ animation: 'spin 1.5s linear infinite' }} /> : card.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cleanup Section */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.75rem', borderBottom: '1px solid var(--border-glow)' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Archive size={20} style={{ color: '#f87171' }} />
            Cleanup Review History
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Permanently delete review records older than a specific number of days.
          </p>
        </div>

        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Calendar size={14} />
                Days Threshold
              </label>
              <input
                type="number"
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(e.target.value)}
                className="form-input"
                placeholder="e.g. 30"
                style={{ width: '100%' }}
              />
            </div>
            <button
              onClick={handleDeleteOldRecords}
              disabled={isDeleting}
              className="btn btn-danger"
              style={{ height: 48, minWidth: 160 }}
            >
              {isDeleting ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Trash2 size={18} />}
              {isDeleting ? 'Deleting...' : 'Run Cleanup'}
            </button>
          </div>

          {/* Status Messages */}
          {status && (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                background:
                  status.type === 'success'
                    ? 'rgba(34, 197, 94, 0.1)'
                    : status.type === 'error'
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(59, 130, 246, 0.1)',
                color:
                  status.type === 'success'
                    ? '#4ade80'
                    : status.type === 'error'
                    ? '#f87171'
                    : '#60a5fa',
                border: `1px solid ${
                  status.type === 'success'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : status.type === 'error'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(59, 130, 246, 0.2)'
                }`,
              }}
            >
              {status.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : status.type === 'error' ? (
                <AlertTriangle size={18} />
              ) : null}
              <span>{status.message}</span>
            </div>
          )}

          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.875rem', color: '#fca5a5', lineHeight: 1.6 }}>
              <strong style={{ color: '#f87171' }}>Warning:</strong> This action is permanent.
              Once records are deleted, they cannot be recovered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}