# Plan: Memorizer Flashcard Feature with AI-Assisted Study

## TL;DR

Add an `is_memorizer` toggle to the flashcard editor, then build an AI-powered study flow for memorizer cards where users write bullet-point answers, submit them for AI comparison (via OpenRouter/DeepSeek V4 Flash), and receive a list of AI-generated hints or Socratic questions for missing points — iterating until satisfied before rating.

---

## Steps

### Phase A — Category Editor: `is_memorizer` toggle

**A1. Add toggle UI to the editor form** (`src/app/category/[id]/page.tsx`)
- Add a toggle switch (styled checkbox or button group) between the Answer textarea and the Save button
- Label: "Card Type" with options "Normal" / "Memorizer"
- When "Memorizer" is selected, show a hint below the Answer textarea: *"Answer should be in bullet points using Markdown dashes (`-`). Indent sub-points with one tab."*
- State variable: `formIsMemorizer` (boolean, default `false`)

**A2. Wire `is_memorizer` into save/update logic** (`src/app/category/[id]/page.tsx`)
- On **create** (INSERT): include `is_memorizer: formIsMemorizer` in the Supabase payload
- On **update**: include `is_memorizer: formIsMemorizer` in the `.update()` call
- On **select card** (`handleSelectCard`): set `formIsMemorizer = card.is_memorizer`
- On **prepare new card** (`handlePrepareNewCard`): reset `formIsMemorizer = false`

**A2b. Validate bullet-point format before saving** (`src/app/category/[id]/page.tsx`)
- In `handleSaveCard`, if `formIsMemorizer === true`, validate the answer before submitting to Supabase:
  - **Each top-level bullet point** must start with `- ` (dash followed by space) on its own line
  - **Sub-points** (one level of indent) must start with `  - ` (two spaces, dash, space)
  - Empty bullet points or lines without `- ` prefix are flagged
- If validation fails, show a feedback error: *"Memorizer answer must use bullet points. Start each point with a dash (-). Indent sub-points with two spaces."*
- Do NOT proceed with the save if validation fails

**A3. Show memorizer badge in card list** (`src/app/category/[id]/page.tsx`)
- In the left-column card list items, if `card.is_memorizer`, show a small badge/tag (e.g., "MEMORIZER" with a distinct color) next to the card number

---

### Phase B — API Route: AI comparison endpoint

**B1. Create API route** (`src/app/api/ai/compare/route.ts`)
- POST endpoint accepting JSON body:
  ```typescript
  {
    userAnswer: string;       // User's bullet-point answer
    correctAnswer: string;    // Saved correct answer (bullet points)
    action: "compare";       // Single action for comparison
  }
  ```
- For `action: "compare"`: AI compares user's bullet points against correct answer and returns:
  - `missingClues: { type: 'hint' | 'socratic'; clue: string }[]` — For each missed point, the AI decides whether a cryptic hint (🧩) or a Socratic question (❓) is more helpful and provides it.
  - `feedback: string` — summary sentence (e.g., "You got 2 out of 4 points. Let's work on the rest!")
- Uses OpenRouter API with DeepSeek V4 Flash model
- Reads API key from `process.env.OPENROUTER_API_KEY`
- Returns JSON response

**B2. Add environment variable**
- Document `OPENROUTER_API_KEY` in `.env.local` (user has the key)

---

### Phase C — Study Mode: Memorizer card flow

**C1. Detect memorizer card & branch UI** (`src/app/study/[id]/page.tsx`)
- In the active study section, check `sessionCards[currentIndex].is_memorizer`
- If `true`, render the **Memorizer Study UI** instead of the normal flow
- If `false`, keep existing normal flow unchanged

**C2. Memorizer Study UI — Answer input & AI comparison**
- Show the question (same as normal)
- Show a textarea labeled "Write your bullet points here" with placeholder hint: *"Use dashes (-) for each point. Indent sub-points with a tab."*
- Below the textarea, a "Check My Answer" button that calls the API (`/api/ai/compare` with `action: "compare"`)
- On response, display a **comparison result panel**:
  - ❌ **Missing Points/Clues** — Render each clue as a styled card with a 🧩 (hint) or ❓ (Socratic) icon and the clue text.
  - User can update their answer in the textarea and click "Check Again" to re-compare
  - A "I'm satisfied, rate this card" button appears once user has reviewed all feedback

**C3. Rating after memorizer flow**
- Once user clicks "I'm satisfied", show the same 1-5 rating buttons as the normal flow
- On rating, same Supabase logic (insert review + update last_rating)
- Move to next card or finish session

**C4. Loading & error states**
- Show a spinner/loading state while AI API is processing
- Handle API errors gracefully — show error message, allow retry
- Disable buttons during API call to prevent double-submit

---

### Phase D — Polish & edge cases

**D1. Empty/malformed bullet points**
- If user submits empty answer or answer without bullet points, show a warning: *"Please write your answer in bullet points using dashes (-)."*
- Don't call the API if validation fails

**D2. Rate limiting / API cost consideration**
- Add a note in the UI: "AI comparison uses OpenRouter credits"
- Add a cooldown (e.g., 3s between API calls) to prevent spam

**D3. Mobile responsiveness**
- Ensure the memorizer UI (comparison panel with clue cards) works on mobile viewports

---

## Relevant files

| File | What to modify |
|------|---------------|
| `src/app/category/[id]/page.tsx` | Add `formIsMemorizer` state, toggle UI, wire into create/update/select/reset, show badge in card list |
| `src/app/study/[id]/page.tsx` | Branch UI for memorizer cards, AI comparison panel, streamlined clue display, iterative check flow |
| `src/app/api/ai/compare/route.ts` | **New file** — POST endpoint calling OpenRouter DeepSeek V4 Flash with clue-generation prompt |
| `.env.local` | Add `OPENROUTER_API_KEY` (user has the key) |
| `src/lib/supabaseClient.ts` | Already has `is_memorizer: boolean` — no change needed |

---

## Verification

1. **Editor toggle**: Create a new card with "Memorizer" selected → verify `is_memorizer = true` in DB.
2. **Bullet validation hint**: Toggle memorizer ON → verify hint text appears below Answer textarea.
3. **Card list badge**: Verify "MEMORIZER" badge appears on memorizer cards in the left column.
4. **Study mode — normal cards**: Verify normal cards still use the existing flow unchanged.
5. **Study mode — memorizer cards**: Start a session with memorizer cards → verify different UI appears.
6. **AI comparison**: Write bullet points → click "Check My Answer" → verify API returns clues as hints or Socratic questions in a single call.
7. **No per-point buttons**: Verify that there are no separate "Hint" or "Socratic" buttons per missing point.
8. **Iterative check**: Update answer → click "Check Again" → verify re-comparison works.
9. **Rating after memorizer**: Click "I'm satisfied" → verify rating buttons appear → rate → verify next card loads.
10. **Error handling**: Disconnect network → verify graceful error message with retry option.

---

## Decisions

- **AI interaction model**: User submits all bullet points at once → AI compares and generates clues directly → user iterates with these clues → rates when satisfied. This reduces API calls and improves UX.
- **Study session mixing**: Memorizer and normal cards are mixed in the same session — UI branches per-card based on `is_memorizer`
- **API routing**: Next.js API route (`/api/ai/compare`) — keeps API key server-side
- **Model**: DeepSeek V4 Flash via OpenRouter — model name configurable in the API route