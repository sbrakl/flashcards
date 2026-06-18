# Plan: C2 Update — Transform missing points into hints/Socratic clues

## TL;DR

Replace the current flow (raw missing points + per-point "Hint"/"Socratic" buttons → 3+ API calls) with a single AI call that returns each missing point **pre-formatted** as either a cryptic hint (🧩) or a Socratic question (❓) — AI decides per-point. Removes matched points display, cleanup frontend state.

---

## What & Why

Currently, when a user checks their memorizer answer:
1. The `compare` action returns raw `missingPoints` (plain text)
2. Each missing point has separate "Hint" and "Socratic" buttons that call additional API actions
3. This is slow (2 extra API calls per missing point) and clunky UX

**New behavior:**
- The `compare` action itself tells the AI to return missing points **already transformed** into either a hint (cryptic clue) or a Socratic question — the AI decides per-point which format is most helpful
- Matched points are hidden entirely (user only sees feedback + actionable clues)
- Removes the separate `hint`/`socratic` API actions and all per-point buttons
- Streamlines the "Result" phase: just feedback + list of clues + "Edit & Check Again" / "Rate"

## Example

> **Question:** Name four rocky planets?  
> **Correct answer:** Mercury, Venus, Earth and Mars  
> **User answer:** Earth and Mars  

**Before:** Missing points shown as raw text ["Mercury", "Venus"] with per-point [Hint] [Socratic] buttons

**After:**  
1. 🧩 Planet name with `_ER_CU_Y` *(hint type — fill-in-the-blank)*  
2. ❓ Which planet is also known as morning or evening star? *(Socratic type — guiding question)*

---

## Tasks

### Task 1: Update API route — new prompt & response shape

**File:** `src/app/api/ai/compare/route.ts`

**1a. Simplify types**
- Change `CompareAction` type from `'compare' | 'hint' | 'socratic'` to just `'compare'`
- Remove `missingPoint` from `CompareRequest`
- Replace `CompareResponse` — remove `matchedPoints`, `missingPoints`, `hint`, `socraticQuestion`. Add `missingClues: { type: 'hint' | 'socratic'; clue: string }[]`

**1b. Simplify `validateRequest`**
- Remove the `missingPoint` validation check (lines checking `r.action === 'hint' || r.action === 'socratic'`)
- Only validate that `action === 'compare'`

**1c. Rewrite `buildComparePrompt`**
- Modify the prompt to instruct the AI to:
  - Still analyze which points are matched vs missed (for internal reasoning)
  - For each **MISSED** point, decide whether a **cryptic hint** (fill-in-blank, word scramble, crossword-style clue) or a **Socratic question** (guiding question that leads to recall without revealing the answer) is more helpful
  - Return `missingClues` array instead of raw `missingPoints`
- Remove `buildHintPrompt` and `buildSocraticPrompt` functions entirely

Expected AI response format:
```json
{
  "matchedPoints": ["point 1", "point 2"],
  "missingClues": [
    { "type": "hint", "clue": "Planet name with _ER_CU_Y" },
    { "type": "socratic", "clue": "Which planet is also known as morning or evening star?" }
  ],
  "feedback": "You got 2 out of 4 points. Let's work on the rest!"
}
```

> Note: `matchedPoints` is still returned by AI but won't be displayed — it helps the AI generate better clues by understanding what the user already knows.

**1d. Simplify the response builder switch**
- Remove `case 'hint'` and `case 'socratic'` from the switch
- Only handle `case 'compare'` — map `missingClues` into the response

**1e. Update `max_tokens`** — bump from 1024 to 2048 since the response now includes richer structured data

---

### Task 2: Update frontend study page

**File:** `src/app/study/[id]/page.tsx`

**2a. Replace state variables**
- Remove: `matchedPoints`, `missingPoints`, `activeHint`, `activeSocratic`
- Add: `missingClues: { type: 'hint' | 'socratic'; clue: string }[]`

**2b. Update `resetMemorizerState`**
- Replace `setMatchedPoints([])`, `setMissingPoints([])` → `setMissingClues([])`
- Remove `setActiveHint(null)`, `setActiveSocratic(null)`

**2c. Simplify `handleMemorizerCheck`**
- Call API with only `action: 'compare'`
- On response: set `missingClues` from `data.missingClues`, set `aiFeedback` from `data.feedback`
- Remove `setMatchedPoints` call

**2d. Remove handler functions**
- Delete `handleMemorizerHint` entirely
- Delete `handleMemorizerSocratic` entirely

**2e. Remove matched points UI block**
- Remove the green "✅ Matched Points" section (the block with `CheckCircle2` icon + green styling)

**2f. Replace missing points UI block**
- **Before:** Each missing point shows raw text + [Hint] [Socratic] buttons + inline hint/socratic results
- **After:** Render each clue as a styled card with 🧩/❓ icon + clue text — no buttons, no loading states

**2g. Clean up unused imports**
- Remove `CheckCircle2` from the lucide-react import if no longer used

---

## Files to modify

| File | Change summary |
|------|----------------|
| `src/app/api/ai/compare/route.ts` | New prompt, new response shape, remove hint/socratic actions |
| `src/app/study/[id]/page.tsx` | Replace state/handlers/UI for missing points, remove matched points |

---

## What's NOT changing

- The `openRouterResponse` fetch call and model name (`deepseek/deepseek-v4-flash`)
- The feedback summary display in the result phase
- The "Edit & Check Again" and "I'm satisfied, rate this card" buttons
- The rating flow (insert `fc_reviews` + update `fc_flashcards.last_rating`)
- The card setup/selection logic (smart selection algorithm)
- Loading/error state handling
- Normal (non-memorizer) card flow — completely untouched

---

## Verification

1. **Single API call** — click "Check My Answer" → only ONE `/api/ai/compare` call fires
2. **Clue rendering** — missing points display as mixed 🧩 hints and ❓ Socratic questions, not raw text
3. **No per-point buttons** — no "Hint" or "Socratic" buttons appear per missing point
4. **Feedback still shows** — AI feedback summary appears at the top of the result panel
5. **Edit & Check Again** — user can edit answer, click "Check Again" → new comparison works
6. **Rate flow** — "I'm satisfied, rate this card" → rating buttons → rating submits to DB → next card loads
7. **No matched points** — green "✅ Matched Points" section is gone
8. **Error handling** — API errors show gracefully with retry
9. **Normal cards unaffected** — non-memorizer cards still use original reveal → rate flow