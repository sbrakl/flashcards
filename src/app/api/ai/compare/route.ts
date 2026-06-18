import { NextRequest, NextResponse } from 'next/server';

// ---------- Types ----------

interface MissingClue {
  type: 'hint' | 'socratic';
  clue: string;
}

interface CompareRequest {
  userAnswer: string;
  correctAnswer: string;
}

interface CompareResponse {
  missingClues?: MissingClue[];
  feedback?: string;
  error?: string;
}

// ---------- Helpers ----------

function validateRequest(body: unknown): body is CompareRequest {
  if (!body || typeof body !== 'object') return false;
  const r = body as Record<string, unknown>;
  if (typeof r.userAnswer !== 'string' || typeof r.correctAnswer !== 'string') return false;
  return true;
}

// ---------- Prompt builders ----------

function buildComparePrompt(userAnswer: string, correctAnswer: string): string {
  return `You are a flashcard study assistant. Compare the user's bullet-point answer against the correct answer.

**Correct answer:**
${correctAnswer}

**User's answer:**
${userAnswer}

Analyze the user's answer and decide which bullet points from the correct answer the user has MATCHED versus MISSED.

Rules:
- A point is MATCHED if the user captured the same core idea, even if wording differs.
- A point is MISSED if the user omitted it or got it significantly wrong.
- Ignore trivial differences in phrasing.

For each MISSED point, create a learning clue. Decide per-point which format is most helpful:
- **Hint** (type: "hint"): A cryptic clue like a fill-in-the-blank, word scramble, crossword-style hint, or acronym hint. Be creative but never reveal the full answer directly.
- **Socratic question** (type: "socratic"): A guiding question that leads the user to recall the point on their own — never reveal the answer directly.

Respond with valid JSON only (no markdown fences, no extra text):
{
  "matchedPoints": ["point 1", "point 2", ...],
  "missingClues": [
    { "type": "hint", "clue": "Cryptic clue here" },
    { "type": "socratic", "clue": "Guiding question here?" }
  ],
  "feedback": "Brief encouraging summary of how they did."
}`;
}

// ---------- Route handler ----------

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const { userAnswer, correctAnswer } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const systemPrompt = 'You are a helpful flashcard study assistant. Always respond with valid JSON only, no markdown fences.';
    const userPrompt = buildComparePrompt(userAnswer, correctAnswer);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aetherflash.app', // OpenRouter requires this
          'X-Title': 'AetherFlash',
        },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent structured output
          max_tokens: 2048,
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeoutId));

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText);
      return NextResponse.json(
        { error: `AI service returned status ${openRouterResponse.status}.` },
        { status: 502 }
      );
    }

    const data = await openRouterResponse.json();
    const content: string = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'AI service returned an empty response.' },
        { status: 502 }
      );
    }

    // Parse the JSON response from the AI
    let parsed: Record<string, unknown>;
    try {
      // Strip any markdown code fences if the model wraps it anyway
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response as JSON:', content);
      return NextResponse.json(
        { error: 'AI service returned an unparseable response.' },
        { status: 502 }
      );
    }

    // Build the response
    const result: CompareResponse = {
      missingClues: Array.isArray(parsed.missingClues)
        ? (parsed.missingClues as Array<Record<string, unknown>>).map(
            (c) => ({
              type: c.type === 'socratic' ? 'socratic' as const : 'hint' as const,
              clue: typeof c.clue === 'string' ? c.clue : '',
            })
          ).filter((c) => c.clue.length > 0)
        : [],
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Unexpected error in /api/ai/compare:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}