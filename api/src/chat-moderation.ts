export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

export async function callModerationAPI(apiKey: string, text: string, retries = 3): Promise<ModerationResult | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * 2 ** attempt;
      console.warn(`[moderation] rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`[moderation] OpenAI API error ${response.status}: ${body}`);
      return null;
    }

    const result = (await response.json()) as {
      results: Array<ModerationResult>;
    };
    return result.results?.[0] ?? null;
  }

  console.error("[moderation] exhausted retries after 429s");
  return null;
}
