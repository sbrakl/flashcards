'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Play, Edit3, Loader2, Wrench } from 'lucide-react';
import { supabase, Category } from '@/lib/supabase';
import CreateCategoryModal from '@/components/CreateCategoryModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthStatus from '@/components/AuthStatus';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('fc_categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (catError) throw catError;

      const { data: cardsData, error: cardsError } = await supabase
        .from('fc_flashcards')
        .select('category_id');

      if (cardsError) throw cardsError;

      const countsMap: Record<string, number> = {};
      cardsData?.forEach((card) => {
        countsMap[card.category_id] = (countsMap[card.category_id] || 0) + 1;
      });

      const enrichedCategories = (catData || []).map((cat) => ({
        ...cat,
        flashcard_count: countsMap[cat.id] || 0,
      }));

      setCategories(enrichedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('fc_categories')
      .insert([{ name }])
      .select();

    if (error) throw error;

    if (data && data[0]) {
      const newCat: Category = {
        ...data[0],
        flashcard_count: 0,
      };
      setCategories((prev) => [newCat, ...prev]);
    }
  };

  return (
    <ProtectedRoute>
      {/* Brand Header */}
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <Link href="/" className="logo-container">
          <div className="logo-icon">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="logo-text">AetherFlash</h1>
          </div>
          <span className="logo-badge">Smart Study</span>
        </Link>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AuthStatus />
          <Link href="/admin/maintenance" className="btn btn-ghost" title="Maintenance">
            <Wrench size={18} />
          </Link>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>New Category</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ minHeight: '60vh' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            Flashcard Categories
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Select a category to manage your learning materials or trigger a customized smart study session.
          </p>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '30vh',
              gap: '1rem',
            }}
          >
            <Loader2 size={36} className="text-primary" style={{ animation: 'spin 1.5s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <BookOpen size={48} />
            </div>
            <h3 className="empty-title">No categories yet</h3>
            <p className="empty-subtitle">
              Create your very first flashcard category to start writing questions and mastering content.
            </p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              <span>Create First Category</span>
            </button>
          </div>
        ) : (
          <div className="grid-container">
            {categories.map((cat) => (
              <div key={cat.id} className="glass-card category-card">
                <div>
                  <h3 className="category-title">
                    <BookOpen size={18} className="text-primary" style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                  </h3>
                  <span className="category-count">
                    {cat.flashcard_count === 1
                      ? '1 card'
                      : `${cat.flashcard_count || 0} cards`}
                  </span>
                </div>

                <div className="category-actions">
                  <Link href={`/category/${cat.id}`} className="btn btn-secondary">
                    <Edit3 size={16} />
                    <span>Edit Cards</span>
                  </Link>

                  {cat.flashcard_count && cat.flashcard_count > 0 ? (
                    <Link href={`/study/${cat.id}`} className="btn btn-primary">
                      <Play size={16} />
                      <span>Study</span>
                    </Link>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                      title="Add cards first before studying!"
                    >
                      <Play size={16} />
                      <span>Study</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCategory}
      />
    </ProtectedRoute>
  );
}

