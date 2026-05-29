'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Plus, Trash2, Save, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, Category, Flashcard } from '@/lib/supabase';

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { id: categoryId } = use(params);

  const [category, setCategory] = useState<Category | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isEditing, setIsEditing] = useState(false); // true if editing, false if creating a new card
  
  // Form State
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  
  // Loading & UX State
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchCategoryData();
  }, [categoryId]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current category details
      const { data: catData, error: catError } = await supabase
        .from('fc_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;
      setCategory(catData);

      // 2. Fetch cards in this category
      const { data: cardsData, error: cardsError } = await supabase
        .from('fc_flashcards')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: true });

      if (cardsError) throw cardsError;
      setCards(cardsData || []);

      // Pre-select the first card if it exists, otherwise set to new card mode
      if (cardsData && cardsData.length > 0) {
        handleSelectCard(cardsData[0]);
      } else {
        handlePrepareNewCard();
      }
    } catch (err) {
      console.error('Error fetching category data:', err);
      showFeedback('error', 'Failed to load category details.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSelectCard = (card: Flashcard) => {
    setSelectedCard(card);
    setFormQuestion(card.question);
    setFormAnswer(card.answer);
    setIsEditing(true);
  };

  const handlePrepareNewCard = () => {
    setSelectedCard(null);
    setFormQuestion('');
    setFormAnswer('');
    setIsEditing(false);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      showFeedback('error', 'Question and Answer fields are required.');
      return;
    }

    setSaveLoading(true);
    try {
      if (isEditing && selectedCard) {
        // Update existing card
        const { data, error } = await supabase
          .from('fc_flashcards')
          .update({
            question: formQuestion.trim(),
            answer: formAnswer.trim(),
          })
          .eq('id', selectedCard.id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const updated = data[0] as Flashcard;
          setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCard(updated);
          showFeedback('success', 'Flashcard updated successfully!');
        }
      } else {
        // Insert new card
        const { data, error } = await supabase
          .from('fc_flashcards')
          .insert([
            {
              category_id: categoryId,
              question: formQuestion.trim(),
              answer: formAnswer.trim(),
            },
          ])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const created = data[0] as Flashcard;
          setCards((prev) => [...prev, created]);
          handleSelectCard(created);
          showFeedback('success', 'New flashcard created!');
        }
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to save flashcard.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCard) return;

    if (!confirm('Are you sure you want to delete this flashcard?')) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('fc_flashcards')
        .delete()
        .eq('id', selectedCard.id);

      if (error) throw error;

      const remaining = cards.filter((c) => c.id !== selectedCard.id);
      setCards(remaining);
      showFeedback('success', 'Flashcard deleted successfully.');

      if (remaining.length > 0) {
        handleSelectCard(remaining[0]);
      } else {
        handlePrepareNewCard();
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to delete flashcard.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          gap: '1rem',
        }}
      >
        <div className="btn-primary" style={{ borderRadius: '50%', width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
          <BookOpen size={24} style={{ animation: 'spin 3s linear infinite' }} />
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your workspace...</p>
      </div>
    );
  }


  return (
    <>
      {/* Header Info */}
      <div className="page-title-section">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Categories</span>
        </Link>
        <h2 className="page-title">{category?.name || 'Category'}</h2>
        <p className="page-subtitle">
          Add, edit, or remove flashcards. Cards are automatically updated in Supabase.
        </p>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: feedback.type === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            backdropFilter: 'blur(10px)',
            color: feedback.type === 'success' ? '#4ade80' : '#f87171',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{feedback.message}</span>
        </div>
      )}

      {/* Main Dual Column Layout */}
      <div className="cards-editor-container">
        {/* Left Column: Flashcards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <button
            className={`btn ${!isEditing ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handlePrepareNewCard}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Plus size={18} />
            <span>Create New Flashcard</span>
          </button>

          <div className="flashcard-list scrollable">
            {cards.length === 0 ? (
              <div
                className="empty-state"
                style={{ padding: '2.5rem 1rem', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.02)' }}
              >
                <Sparkles size={24} className="text-muted" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No cards created yet.</p>
              </div>
            ) : (
              cards.map((card, index) => {
                const isActive = selectedCard?.id === card.id;
                return (
                  <div
                    key={card.id}
                    className={`glass-card flashcard-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectCard(card)}
                    style={{ padding: '1.2rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        CARD {index + 1}
                      </span>
                      {card.last_rating ? (
                        <span className={`card-rating-badge rating-${card.last_rating}`} style={{ marginTop: 0 }}>
                          Rating: {card.last_rating}
                        </span>
                      ) : (
                        <span className="card-rating-badge rating-unrated" style={{ marginTop: 0 }}>
                          Unrated
                        </span>
                      )}
                    </div>

                    <div className="card-preview-question" style={{ marginTop: '0.5rem' }}>
                      {card.question}
                    </div>
                    <div className="card-preview-answer">
                      {card.answer}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Flashcard Editor Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>
              {isEditing ? 'Edit Flashcard' : 'Add New Flashcard'}
            </h3>
            {isEditing && (
              <button
                className="btn btn-danger"
                onClick={handleDeleteCard}
                disabled={deleteLoading}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveCard}>
            <div className="form-group">
              <label className="form-label">Question</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Type the flashcard question here..."
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                disabled={saveLoading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
              <label className="form-label">Answer</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Type the correct answer/explanation here..."
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                disabled={saveLoading}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {!isEditing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrepareNewCard}
                  disabled={saveLoading}
                >
                  Clear Fields
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saveLoading}
                style={{ minWidth: '130px' }}
              >
                <Save size={16} />
                <span>{saveLoading ? 'Saving...' : 'Save Card'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
