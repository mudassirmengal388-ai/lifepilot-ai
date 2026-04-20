import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, model = "groq", history = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return await streamGroq(message, history);
  } catch (err: any) {
    console.error("API Error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function streamGroq(message: string, history: any[]) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Groq API key missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = [
    {
      role: "system",
      content: `You are LifePilot AI, an advanced personal assistant.
Format your responses using markdown:
- Use **bold** for important points
- Use \`code\` for inline code
- Use triple backtick blocks for multi-line code with language name
- Use bullet points and numbered lists when helpful
- Use ## headings for sections when needed
Be concise, helpful, and professional.`,
    },
    ...history,
    { role: "user", content: message },
  ];

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    const err = await groqRes.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ error: err?.error?.message || "Groq request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(encoder.encode(token));
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}