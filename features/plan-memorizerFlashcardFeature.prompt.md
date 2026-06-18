# Plan: Memorizer Flashcard Feature with AI-Assisted Study

## TL;DR

Add an `is_memorizer` toggle to the flashcard editor, then build an AI-powered study flow for memorizer cards where users write bullet-point answers, submit them for AI comparison (via OpenRouter/DeepSeek V4 Flash), and receive hints or Socratic questions for missing points — iterating until satisfied before rating.

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
    action: "compare" | "hint" | "socratic";
    missingPoint?: string;    // The specific point to hint/question about (for hint/socratic actions)
  }
  ```
- For `action: "compare"`: AI compares user's bullet points against correct answer, returns:
  - `matchedPoints: string[]` — points user got right
  - `missingPoints: string[]` — points user missed
  - `feedback: string` — summary sentence
- For `action: "hint"`: AI returns 2-3 key words from the missing point (not the full text)
- For `action: "socratic"`: AI returns a Socratic guiding question that leads the user to recall the missing point
- Uses OpenRouter API with DeepSeek V4 Flash model
- Reads API key from `process.env.OPENROUTER_API_KEY`
- Returns JSON response

**B2. Add environment variable**
- Document `OPENROUTER_API_KEY` in `.env.local` (user has the key)
- Add to `next.config.ts` if needed for client-side exposure (not needed — API route is server-side only)

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
  - ✅ **Matched points** (green) — points user recalled correctly
  - ❌ **Missing points** (red) — points user missed, each with two action buttons:
    - *"Hint"* — calls API with `action: "hint"`, shows 2-3 key words inline
    - *"Socratic"* — calls API with `action: "socratic"`, shows a guiding question inline
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
- Consider adding a cooldown (e.g., 3s between API calls) to prevent spam

**D3. Mobile responsiveness**
- Ensure the memorizer UI (comparison panel with action buttons) works on mobile viewports

---

## Relevant files

| File | What to modify |
|------|---------------|
| `src/app/category/[id]/page.tsx` | Add `formIsMemorizer` state, toggle UI, wire into create/update/select/reset, show badge in card list |
| `src/app/study/[id]/page.tsx` | Branch UI for memorizer cards, AI comparison panel, hint/socratic interactions, iterative check flow |
| `src/app/api/ai/compare/route.ts` | **New file** — POST endpoint calling OpenRouter DeepSeek V4 Flash |
| `.env.local` | Add `OPENROUTER_API_KEY` (user has the key) |
| `src/lib/supabaseClient.ts` | Already has `is_memorizer: boolean` — no change needed |

---

## Verification

1. **Editor toggle**: Create a new card with "Memorizer" selected → verify `is_memorizer = true` in DB. Edit an existing card → toggle memorizer on/off → verify update in DB.
2. **Bullet validation hint**: Toggle memorizer ON → verify hint text appears below Answer textarea.
3. **Card list badge**: Verify "MEMORIZER" badge appears on memorizer cards in the left column.
4. **Study mode — normal cards**: Verify normal cards still use the existing flow unchanged.
5. **Study mode — memorizer cards**: Start a session with memorizer cards → verify different UI appears.
6. **AI comparison**: Write bullet points → click "Check My Answer" → verify API returns matched/missing points.
7. **Hint action**: Click "Hint" on a missing point → verify 2-3 key words appear.
8. **Socratic action**: Click "Socratic" → verify a guiding question appears.
9. **Iterative check**: Update answer → click "Check Again" → verify re-comparison works.
10. **Rating after memorizer**: Click "I'm satisfied" → verify rating buttons appear → rate → verify next card loads.
11. **Error handling**: Disconnect network → verify graceful error message with retry option.

---

## Decisions

- **DB migration**: Already done — `is_memorizer` column exists in production
- **OpenRouter API key**: User has one — will add to `.env.local`
- **AI interaction model**: User submits all bullet points at once → AI compares → user iterates with hints/Socratic help → rates when satisfied
- **Study session mixing**: Memorizer and normal cards are mixed in the same session — UI branches per-card based on `is_memorizer`
- **API routing**: Next.js API route (`/api/ai/compare`) — keeps API key server-side
- **Model**: DeepSeek V4 Flash via OpenRouter — model name configurable in the API route

---

## Further Considerations

1. **AI response caching**: For identical `correctAnswer` + `userAnswer` pairs, consider caching the comparison result to avoid repeated API costs. Out of scope for initial implementation.
2. **Offline fallback**: Without internet, AI features won't work. The UI should clearly indicate this and allow the user to proceed to manual self-assessment. Out of scope for initial implementation.
3. **Prompt engineering**: The quality of hints and Socratic questions depends heavily on the system prompt. May need tuning after initial testing.