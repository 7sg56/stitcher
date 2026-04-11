import Groq from "groq-sdk";

export interface ModerationResult {
    isFlagged: boolean;
    category: string;
    confidence: number;
    reasoning: string;
}

const SYSTEM_PROMPT = `You are a strict content moderation system for an academic platform (LMS).
Analyze the submitted text and determine if it violates community guidelines.

Flag content that contains:
- Profanity or vulgar language
- Harassment, bullying, or threats
- Hate speech or discrimination
- Sexually explicit content
- Spam or irrelevant promotional content
- Personal attacks against other students or teachers

Do NOT flag:
- Academic disagreements or debates
- Legitimate complaints about coursework
- Technical discussions even if they reference sensitive topics in an academic context
- Slang that is not offensive

Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{"isFlagged": true/false, "category": "profanity|harassment|hate_speech|sexual|spam|personal_attack|clean", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

let _client: Groq | null = null;

function getClient(): Groq {
    if (!_client) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY environment variable is not set");
        }
        _client = new Groq({ apiKey });
    }
    return _client;
}

export async function classifyContent(text: string): Promise<ModerationResult> {
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

    try {
        const client = getClient();
        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Analyze this text for policy violations:\n\n"${text}"` },
            ],
            model,
            temperature: 0.1,
            max_tokens: 256,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (!raw) {
            return { isFlagged: false, category: "clean", confidence: 0, reasoning: "No AI response" };
        }

        const parsed = JSON.parse(raw) as ModerationResult;
        return {
            isFlagged: Boolean(parsed.isFlagged),
            category: parsed.category || "clean",
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
            reasoning: parsed.reasoning || "",
        };
    } catch (err) {
        console.error("[ai-moderator] Classification failed:", err);
        // Fail open: if AI is unavailable, don't flag
        return { isFlagged: false, category: "error", confidence: 0, reasoning: "AI classification failed" };
    }
}
