import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, model = "groq", history = [] } = await req.json();

    console.log("BODY:", { message, model });

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (model === "groq" || model === "deepseek" || model === "gemini") {
  return await callGroq(message, history);
} else {
  return NextResponse.json({ error: "Invalid model" }, { status: 400 });
}

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GROQ - Free & Fast
async function callGroq(message: string, history: any[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Groq API key missing" }, { status: 500 });

  const messages = [
    { role: "system", content: "You are LifePilot AI, a smart and helpful assistant." },
    ...history,
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  console.log("GROQ RESPONSE:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message || "Groq failed" }, { status: 500 });
  }

  const reply = data.choices?.[0]?.message?.content || "No response";
  return NextResponse.json({ reply, model: "groq" });
}

// ✅ GEMINI - Fixed Model
async function callGemini(message: string, history: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });

  const contents = [
    ...history.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // ✅ gemini-2.0-flash - latest working model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;


  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  const data = await res.json();
  console.log("GEMINI RESPONSE:", JSON.stringify(data, null, 2));

  if (!res.ok || data.error) {
    return NextResponse.json(
      { error: data.error?.message || "Gemini failed" },
      { status: 500 }
    );
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  return NextResponse.json({ reply, model: "gemini" });
}