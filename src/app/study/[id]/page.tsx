'use client';

import React, { useState, useEffect, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, Brain, Play, ChevronRight, Eye, RefreshCw, Loader2, Sparkles, SendHorizonal, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, Category, Flashcard } from '@/lib/supabaseClient';
import PieChart from '@/components/PieChart';
import ProtectedRoute from '@/components/ProtectedRoute';

interface StudyPageProps {
  params: Promise<{ id: string }>;
}

export default function StudyPage({ params }: StudyPageProps) {
  const { id: categoryId } = use(params);

  // Database details
  const [category, setCategory] = useState<Category | null>(null);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Study flow state
  // 'setup' | 'active' | 'finished'
  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'finished'>('setup');
  const [selectedCount, setSelectedCount] = useState<5 | 10 | 15>(5);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  
  // Active study state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Memorizer card study state
  const [memorizerPhase, setMemorizerPhase] = useState<'input' | 'result' | 'rating'>('input');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [missingClues, setMissingClues] = useState<{ type: 'hint' | 'socratic'; clue: string }[]>([]);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const lastApiCallTime = useRef(0);
  const [isCooldown, setIsCooldown] = useState(false);

  useEffect(() => {
    fetchCategoryAndCards();
  }, [categoryId]);

  const fetchCategoryAndCards = async () => {
    setLoading(true);
    try {
      // 1. Fetch category
      const { data: catData, error: catError } = await supabase
        .from('fc_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;
      setCategory(catData);

      // 2. Fetch all cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('fc_flashcards')
        .select('*')
        .eq('category_id', categoryId);

      if (cardsError) throw cardsError;
      setAllCards(cardsData || []);
    } catch (err) {
      console.error('Error fetching data for study setup:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fisher-Yates shuffle helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const startSession = () => {
    if (allCards.length === 0) return;

    const N = selectedCount;

    // Separate cards into Pool A (rating < 3) and Pool B (everything else)
    const poorCards = allCards.filter(
      (c) => c.last_rating !== null && c.last_rating < 3
    );
    const otherCards = allCards.filter(
      (c) => c.last_rating === null || c.last_rating >= 3
    );

    // Smart Selection algorithm:
    // Target 50% poor cards
    const targetPoorCount = Math.round(N / 2);

    // Shuffle both pools
    const shuffledPoor = shuffleArray(poorCards);
    const shuffledOther = shuffleArray(otherCards);

    // Select poor cards
    const selectedPoor = shuffledPoor.slice(0, targetPoorCount);
    
    // Select other cards to fill up the budget
    const neededOtherCount = N - selectedPoor.length;
    const selectedOther = shuffledOther.slice(0, neededOtherCount);

    let finalSelection = [...selectedPoor, ...selectedOther];

    // Edge case: If we still don't have enough cards (because one pool was too small)
    // we backfill from whatever is left in the other pool.
    if (finalSelection.length < N && finalSelection.length < allCards.length) {
      const remainingPoor = shuffledPoor.slice(targetPoorCount);
      const remainingOther = shuffledOther.slice(neededOtherCount);

      if (selectedPoor.length < targetPoorCount) {
        // Need to fill from remaining other cards
        const extra = remainingOther.slice(0, N - finalSelection.length);
        finalSelection = [...finalSelection, ...extra];
      } else {
        // Need to fill from remaining poor cards
        const extra = remainingPoor.slice(0, N - finalSelection.length);
        finalSelection = [...finalSelection, ...extra];
      }
    }

    // Shuffle the final selection to randomize study order
    const studySet = shuffleArray(finalSelection).slice(0, N);

    setSessionCards(studySet);
    setCurrentIndex(0);
    setUserAnswer('');
    setIsAnswerRevealed(false);
    setSessionRatings([]);
    resetMemorizerState();
    setSessionState('active');
  };

  const handleReveal = () => {
    setIsAnswerRevealed(true);
  };

  const handleRateAnswer = async (rating: number) => {
    if (submittingRating) return;

    setSubmittingRating(true);
    const activeCard = sessionCards[currentIndex];

    try {
      // 1. Insert review history record
      const { error: reviewError } = await supabase
        .from('fc_reviews')
        .insert([
          {
            flashcard_id: activeCard.id,
            rating: rating,
          },
        ]);

      if (reviewError) throw reviewError;

      // 2. Update card's latest rating
      const { error: cardError } = await supabase
        .from('fc_flashcards')
        .update({
          last_rating: rating,
        })
        .eq('id', activeCard.id);

      if (cardError) throw cardError;

      // Update local state
      setSessionRatings((prev) => [...prev, rating]);

      // Move to next card or end session
      if (currentIndex + 1 < sessionCards.length) {
        setCurrentIndex((prev) => prev + 1);
        setUserAnswer('');
        setIsAnswerRevealed(false);
        resetMemorizerState();
      } else {
        setSessionState('finished');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const restartSetup = () => {
    setUserAnswer('');
    setIsAnswerRevealed(false);
    setSessionRatings([]);
    setSessionState('setup');
    fetchCategoryAndCards(); // Refresh latest ratings for a new smart pick
  };

  // ---------- Memorizer card helpers ----------

  const isValidBulletAnswer = (answer: string): boolean => {
    const lines = answer.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      // Top-level: must start with "- "  |  Indented: must start with "  - "
      if (!/^-\s/.test(trimmed) && !/^  -\s/.test(line)) {
        return false;
      }
    }
    return lines.some((l) => l.trim().length > 0);
  };

  const resetMemorizerState = () => {
    setMemorizerPhase('input');
    setAiLoading(false);
    setAiError(null);
    setMissingClues([]);
    setAiFeedback('');
    setIsCooldown(false);
    lastApiCallTime.current = 0;
  };

  const handleMemorizerCheck = async () => {
    // D2: Cooldown check — 3s between API calls
    const now = Date.now();
    if (now - lastApiCallTime.current < 3000) {
      setAiError('Please wait a moment before checking again.');
      return;
    }

    if (!userAnswer.trim()) {
      setAiError('Please write your answer before checking.');
      return;
    }

    // D1: Validate bullet-point format before calling API
    if (!isValidBulletAnswer(userAnswer)) {
      setAiError('Please write your answer in bullet points using dashes (-).');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setIsCooldown(true);

    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: userAnswer.trim(),
          correctAnswer: sessionCards[currentIndex].answer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI comparison failed.');
      }

      setMissingClues(data.missingClues || []);
      setAiFeedback(data.feedback || '');
      setMemorizerPhase('result');
    } catch (err: any) {
      setAiError(err.message || 'Failed to check answer. Please try again.');
    } finally {
      setAiLoading(false);
      lastApiCallTime.current = Date.now();
      setTimeout(() => setIsCooldown(false), 3000);
    }
  };

  const handleMemorizerRate = () => {
    setMemorizerPhase('rating');
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
        <Loader2 size={36} className="text-primary" style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading study materials...</p>
      </div>
    );
  }


  return (
    <ProtectedRoute>
      <>
      {/* -------------------- STATE 1: SETUP SCREEN -------------------- */}
      {sessionState === 'setup' && (
        <>
          <div className="page-title-section">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} />
              <span>Back to Categories</span>
            </Link>
            <h2 className="page-title">Study: {category?.name}</h2>
            <p className="page-subtitle">
              Prepare for your review. AetherFlash will intelligently pick cards to focus on your weak points first.
            </p>
          </div>

          <div className="glass-card study-setup-container">
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: 'var(--primary)',
                boxShadow: '0 0 25px rgba(99, 102, 241, 0.2)',
              }}
            >
              <Brain size={24} />
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Configure Session Size</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              How many cards would you like to review?
            </p>

            <div className="study-options-grid">
              {([5, 10, 15] as const).map((num) => (
                <div
                  key={num}
                  className={`glass-card study-option-card ${selectedCount === num ? 'selected' : ''}`}
                  onClick={() => setSelectedCount(num)}
                >
                  <div className="option-number">{num}</div>
                  <div className="option-label">Cards</div>
                </div>
              ))}
            </div>

            {/* Smart Algorithm explanation */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                padding: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '2.5rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                🧠 Smart Selection Active:
              </span>
              Whenever possible, 50% of your selected cards will be those with previous scores below 3. This forces focused active recall on challenging materials!
            </div>

            {allCards.length === 0 ? (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.95rem' }}>
                This category does not contain any cards yet. Please add cards before starting a session!
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {allCards.length} cards available in this category.{' '}
                {allCards.length < selectedCount && (
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    (Will study all {allCards.length} available cards)
                  </span>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={startSession}
              disabled={allCards.length === 0}
              style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', justifyContent: 'center' }}
            >
              <Play size={18} />
              <span>Begin Study Session</span>
            </button>
          </div>
        </>
      )}

      {/* -------------------- STATE 2: ACTIVE STUDY SESSION -------------------- */}
      {sessionState === 'active' && sessionCards.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '1rem auto' }}>
          {/* Back button */}
          <button onClick={restartSetup} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
            <span>Abort Session</span>
          </button>

          {/* Progress bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Progress</span>
            <span>{currentIndex + 1} of {sessionCards.length} Cards</span>
          </div>
          <div className="study-progress-container">
            <div
              className="study-progress-bar"
              style={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
            />
          </div>

          {/* Main Flashcard Container */}
          <div className="glass-card study-card-view">
            {sessionCards[currentIndex].is_memorizer ? (
              /* ---------- MEMORIZER CARD UI ---------- */
              <>
                <div className="study-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="study-title">Memorizer Card</span>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                    }}>
                      MEMORIZER
                    </span>
                  </div>
                  <span className="study-step-counter">
                    {currentIndex + 1} / {sessionCards.length}
                  </span>
                </div>

                {/* Question */}
                <div style={{ margin: '1.5rem 0' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Question
                  </div>
                  <h3 className="question-display">
                    <ReactMarkdown>{sessionCards[currentIndex].question}</ReactMarkdown>
                  </h3>
                </div>

                {/* Answer Input - always editable in memorizer mode */}
                <div className="answer-input-container">
                  <label className="form-label" style={{ textAlign: 'left' }}>
                    Write your bullet points here
                  </label>
                  <textarea
                    className="form-input form-textarea answer-input-box"
                    placeholder="Use dashes (-) for each point. Indent sub-points with a tab."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={memorizerPhase === 'rating' || aiLoading}
                    style={{ minHeight: '120px' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    Use <code>- </code> for each point. Indent sub-points with two spaces <code>  - </code>.
                  </p>
                  {/* D2: OpenRouter credits note */}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.6 }}>
                    ⚡ AI comparison uses OpenRouter credits
                  </p>
                </div>

                {/* Memorizer error message */}
                {aiError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <AlertCircle size={16} />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Phase: Input — Show "Check My Answer" button */}
                {memorizerPhase === 'input' && (
                  <div className="reveal-action-container">
                    <button
                      className="btn btn-primary"
                      onClick={handleMemorizerCheck}
                      disabled={aiLoading || isCooldown || !userAnswer.trim()}
                      style={{ minWidth: '200px', padding: '0.9rem 2rem', fontSize: '1rem', justifyContent: 'center' }}
                    >
                      {aiLoading ? (
                        <><Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> <span>Checking...</span></>
                      ) : isCooldown ? (
                        <><Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> <span>Wait...</span></>
                      ) : (
                        <><SendHorizonal size={18} /> <span>Check My Answer</span></>
                      )}
                    </button>
                  </div>
                )}

                {/* Phase: Result — Show comparison panel */}
                {memorizerPhase === 'result' && (
                  <>
                    <div className="revealed-comparison" style={{ marginBottom: '1.5rem' }}>
                      <div className="comparison-box user" style={{ flex: '1 1 100%', marginBottom: '0' }}>
                        <div className="comparison-label">Your Answer</div>
                        <div className="comparison-text" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                          {userAnswer.trim() || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No answer typed.</span>}
                        </div>
                      </div>
                    </div>

                    {aiFeedback && (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                        {aiFeedback}
                      </p>
                    )}

                    {/* Missing Clues — hints & Socratic questions from AI */}
                    {missingClues.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={14} /> Points to Review ({missingClues.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {missingClues.map((clue, i) => (
                            <div key={i} style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: clue.type === 'hint'
                                ? 'rgba(250, 204, 21, 0.06)'
                                : 'rgba(168, 85, 247, 0.06)',
                              border: clue.type === 'hint'
                                ? '1px solid rgba(250, 204, 21, 0.2)'
                                : '1px solid rgba(168, 85, 247, 0.2)',
                              color: clue.type === 'hint' ? '#fde047' : '#d8b4fe',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                            }}>
                              <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                                {clue.type === 'hint' ? '🧩' : '❓'}
                              </span>
                              <span>{clue.clue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setMemorizerPhase('input')}
                        disabled={aiLoading}
                        style={{ justifyContent: 'center' }}
                      >
                        <RotateCcw size={16} />
                        <span>Edit & Check Again</span>
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleMemorizerRate}
                        disabled={aiLoading}
                        style={{ justifyContent: 'center' }}
                      >
                        <Sparkles size={16} />
                        <span>I'm satisfied, rate this card</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Phase: Rating */}
                {memorizerPhase === 'rating' && (
                  <div className="rating-section">
                    <div className="rating-prompt">
                      How well did you recall this answer?
                    </div>
                    <div className="rating-button-group">
                      {([1, 2, 3, 4, 5] as const).map((r) => {
                        const tooltips = {
                          1: 'Very Poor',
                          2: 'Poor',
                          3: 'Average',
                          4: 'Good',
                          5: 'Very Good',
                        };
                        return (
                          <button
                            key={r}
                            className={`rating-btn rating-btn-${r}`}
                            data-tooltip={tooltips[r]}
                            onClick={() => handleRateAnswer(r)}
                            disabled={submittingRating}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ---------- NORMAL CARD UI ---------- */
              <>
                <div className="study-header">
                  <span className="study-title">Recall Card</span>
                  <span className="study-step-counter">
                    {currentIndex + 1} / {sessionCards.length}
                  </span>
                </div>

                {/* Question */}
                <div style={{ margin: '1.5rem 0' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Question
                  </div>
                  <h3 className="question-display">
                    <ReactMarkdown>{sessionCards[currentIndex].question}</ReactMarkdown>
                  </h3>
                </div>

                {/* Answer Input */}
                <div className="answer-input-container">
                  <label className="form-label" style={{ textAlign: isAnswerRevealed ? 'left' : 'center' }}>
                    {isAnswerRevealed ? 'Your Drafted Answer' : 'Type Your Answer Below'}
                  </label>
                  <textarea
                    className="form-input form-textarea answer-input-box"
                    placeholder="Type your response here to test your memory..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={isAnswerRevealed}
                  />
                </div>

                {/* Comparative View when Revealed */}
                {isAnswerRevealed && (
                  <div className="revealed-comparison">
                    <div className="comparison-box user">
                      <div className="comparison-label">Your Answer</div>
                      <div className="comparison-text">
                        {userAnswer.trim() || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No answer typed.</span>}
                      </div>
                    </div>

                    <div className="comparison-box correct">
                      <div className="comparison-label">Official Answer</div>
                      <div className="comparison-text">
                        <ReactMarkdown>{sessionCards[currentIndex].answer}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isAnswerRevealed ? (
                  <div className="reveal-action-container">
                    <button
                      className="btn btn-primary"
                      onClick={handleReveal}
                      style={{ minWidth: '180px', padding: '0.9rem 2rem', fontSize: '1rem', justifyContent: 'center' }}
                    >
                      <Eye size={18} />
                      <span>Reveal Answer</span>
                    </button>
                  </div>
                ) : (
                  <div className="rating-section">
                    <div className="rating-prompt">
                      How well did you recall this answer?
                    </div>
                    <div className="rating-button-group">
                      {([1, 2, 3, 4, 5] as const).map((r) => {
                        const tooltips = {
                          1: 'Very Poor',
                          2: 'Poor',
                          3: 'Average',
                          4: 'Good',
                          5: 'Very Good',
                        };
                        return (
                          <button
                            key={r}
                            className={`rating-btn rating-btn-${r}`}
                            data-tooltip={tooltips[r]}
                            onClick={() => handleRateAnswer(r)}
                            disabled={submittingRating}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------- STATE 3: FINISHED SCREEN -------------------- */}
      {sessionState === 'finished' && (
        <div className="finished-container">
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: 'var(--rating-4)',
              boxShadow: '0 0 25px rgba(34, 197, 94, 0.2)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h2 className="finished-title">Session Complete!</h2>
          <p className="finished-subtitle">
            You reviewed {sessionCards.length} flashcards in this session. Here is your performance index:
          </p>

          {/* Animated custom Pie Chart */}
          <div className="glass-card" style={{ padding: '2.5rem 1.5rem', marginBottom: '3rem' }}>
            <PieChart ratings={sessionRatings} />
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
            <Link href="/" className="btn btn-secondary" style={{ minWidth: '160px' }}>
              <ArrowLeft size={16} />
              <span>Back to Library</span>
            </Link>

            <button className="btn btn-primary" onClick={restartSetup} style={{ minWidth: '160px' }}>
              <RefreshCw size={16} />
              <span>Study Again</span>
            </button>
          </div>
        </div>
      )}
    </>
    </ProtectedRoute>
  );
}
