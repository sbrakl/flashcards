import { NextRequest, NextResponse } from 'next/server';

// ---------- Types ----------

type CompareAction = 'compare' | 'hint' | 'socratic';

interface CompareRequest {
  userAnswer: string;
  correctAnswer: string;
  action: CompareAction;
  missingPoint?: string;
}

interface CompareResponse {
  matchedPoints?: string[];
  missingPoints?: string[];
  feedback?: string;
  hint?: string;
  socraticQuestion?: string;
  error?: string;
}

// ---------- Helpers ----------

function validateRequest(body: unknown): body is CompareRequest {
  if (!body || typeof body !== 'object') return false;
  const r = body as Record<string, unknown>;
  if (typeof r.userAnswer !== 'string' || typeof r.correctAnswer !== 'string') return false;
  if (!['compare', 'hint', 'socratic'].includes(r.action as string)) return false;
  if ((r.action === 'hint' || r.action === 'socratic') && typeof r.missingPoint !== 'string') return false;
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

Respond with valid JSON only (no markdown fences, no extra text):
{
  "matchedPoints": ["point 1", "point 2", ...],
  "missingPoints": ["point 3", ...],
  "feedback": "Brief encouraging summary of how they did."
}`;
}

function buildHintPrompt(missingPoint: string): string {
  return `You are a flashcard study assistant. The user missed a bullet point in their answer. Give them 2-3 key words (NOT the full point) from the missing point below to jog their memory. Be cryptic but helpful.

**Missing point:** ${missingPoint}

Respond with valid JSON only:
{
  "hint": "keyword1, keyword2, keyword3"
}`;
}

function buildSocraticPrompt(missingPoint: string): string {
  return `You are a flashcard study assistant using the Socratic method. The user missed a bullet point. Ask a guiding question that leads them to recall the missing point on their own — never reveal the answer directly.

**Missing point:** ${missingPoint}

Respond with valid JSON only:
{
  "socraticQuestion": "Your guiding question here?"
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

    const { userAnswer, correctAnswer, action, missingPoint } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    // Build the system + user message pair based on action
    let systemPrompt = 'You are a helpful flashcard study assistant. Always respond with valid JSON only, no markdown fences.';
    let userPrompt: string;

    switch (action) {
      case 'compare':
        userPrompt = buildComparePrompt(userAnswer, correctAnswer);
        break;
      case 'hint':
        userPrompt = buildHintPrompt(missingPoint!);
        break;
      case 'socratic':
        userPrompt = buildSocraticPrompt(missingPoint!);
        break;
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

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
          model: 'deepseek/deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent structured output
          max_tokens: 1024,
        }),
      }
    );

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

    // Build the response based on action
    let result: CompareResponse = {};

    switch (action) {
      case 'compare':
        result = {
          matchedPoints: Array.isArray(parsed.matchedPoints) ? parsed.matchedPoints as string[] : [],
          missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints as string[] : [],
          feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        };
        break;
      case 'hint':
        result = { hint: typeof parsed.hint === 'string' ? parsed.hint : '' };
        break;
      case 'socratic':
        result = { socraticQuestion: typeof parsed.socraticQuestion === 'string' ? parsed.socraticQuestion : '' };
        break;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Unexpected error in /api/ai/compare:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}