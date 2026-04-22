"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type Message = { role: "user" | "ai"; content: string };
type Model = "groq" | "gemini";
type Conversation = { id: string; title: string; created_at: string };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text: string): string {
  let html = text;
  html = html.replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (_: string, lang: string, code: string) =>
      `<pre class="code-block"><div class="code-lang">${lang || "code"}</div><code>${escapeHtml(code.trim())}</code></pre>`
  );
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n\n/g, "<br/><br/>");
  html = html.replace(/\n/g, "<br/>");
  return html;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<Model>("groq");
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth"; return; }
      setUserId(user.id);
      setUserEmail(user.email || "");
      loadConversations(user.id);
    };
    init();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const loadConversations = async (uid: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (data) setConversations(data);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map((m) => ({ role: m.role, content: m.content })));
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConvId(conv.id);
    loadMessages(conv.id);
    setError(null);
    setStreamingText("");
  };

  const newChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setError(null);
    setInput("");
    setStreamingText("");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !userId) return;

    const userInput = input.trim();
    const userMsg: Message = { role: "user", content: userInput };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setStreamingText("");

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      let convId = currentConvId;
      if (!convId) {
        const { data: conv } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: userInput.slice(0, 45) })
          .select()
          .single();
        if (conv) {
          convId = conv.id;
          setCurrentConvId(conv.id);
          setConversations((prev) => [conv, ...prev]);
        }
      }

      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "user",
          content: userInput,
        });
      }

      const history = newMessages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, model, history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || "Request failed");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullReply = "";

      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullReply += chunk;
        setStreamingText(fullReply);
      }

      setMessages([...newMessages, { role: "ai", content: fullReply }]);
      setStreamingText("");

      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "ai",
          content: fullReply,
        });
      }
    } catch (err: unknown) {
      setLoading(false);
      setStreamingText("");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConvId === convId) newChat();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const copyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : "U";

  return (
    <div className="app">
      {/* Animated background */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">LifePilot</span>
          </div>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <button className="new-chat-btn" onClick={newChat}>
          <span>+</span> New Chat
        </button>

        <div className="chat-list">
          <div className="chat-list-label">Recent Chats</div>
          {conversations.length === 0 && (
            <div className="chat-empty">No conversations yet</div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`chat-item ${currentConvId === conv.id ? "active" : ""}`}
              onClick={() => selectConversation(conv)}
            >
              <span className="chat-item-icon">💬</span>
              <span className="chat-item-title">{conv.title || "New Chat"}</span>
              <button className="delete-btn" onClick={(e) => deleteConversation(e, conv.id)}>✕</button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="model-section">
            <div className="model-label">AI Model</div>
            <div className="model-pills">
              <button className={`pill ${model === "groq" ? "active" : ""}`} onClick={() => setModel("groq")}>
                🦙 LLaMA 3.3
              </button>
              <button className={`pill ${model === "gemini" ? "active" : ""}`} onClick={() => setModel("gemini")}>
                ✨ Gemini
              </button>
            </div>
          </div>
          <div className="user-row">
            <div className="user-avatar">{avatarLetter}</div>
            <div className="user-info">
              <span className="user-email">{userEmail || "User"}</span>
              <span className="user-plan">Free Plan</span>
            </div>
            <button className="logout-icon-btn" onClick={handleLogout} title="Logout">↪</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <div className="topbar">
          {!sidebarOpen && (
            <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          )}
          <div className="topbar-center">
            <span className="topbar-logo">⚡</span>
            <span className="topbar-title">LifePilot AI</span>
          </div>
          <div className="topbar-right">
            <span className="model-badge">
              {model === "groq" ? "🦙 LLaMA 3.3" : "✨ Gemini"}
            </span>
            <div className="status-dot" />
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div className="messages">
          {messages.length === 0 && !streamingText && (
            <div className="welcome">
              <div className="welcome-glow" />
              <div className="welcome-icon">⚡</div>
              <h2 className="welcome-title">LifePilot AI</h2>
              <p className="welcome-sub">Your intelligent multilingual assistant</p>
              <div className="welcome-features">
                <span className="feature-tag">🧠 Deep Thinking</span>
                <span className="feature-tag">🌐 Urdu + English</span>
                <span className="feature-tag">💻 Code Expert</span>
              </div>
              <div className="suggestions">
                {[
                  "آپ مجھے کاروبار کا آئیڈیا دیں",
                  "Explain quantum computing simply",
                  "Write a Python web scraper",
                ].map((s) => (
                  <button key={s} className="suggestion-btn"
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === "user" ? avatarLetter : "⚡"}
              </div>
              <div className="msg-content">
                {msg.role === "ai" ? (
                  <>
                    <div
                      className="msg-text markdown"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                    <button className="copy-btn" onClick={() => copyMessage(msg.content, i)}>
                      {copied === i ? "✅ Copied!" : "⎘ Copy"}
                    </button>
                  </>
                ) : (
                  <div className="msg-text user-text">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="msg ai">
              <div className="msg-avatar">⚡</div>
              <div className="msg-content">
                <div
                  className="msg-text markdown streaming"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
                />
              </div>
            </div>
          )}

          {loading && !streamingText && (
            <div className="msg ai">
              <div className="msg-avatar">⚡</div>
              <div className="msg-content">
                <div className="typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-msg">⚠️ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* ── INPUT ── */}
        <div className="input-wrapper">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message LifePilot AI... (English / اردو)"
              disabled={loading}
              rows={1}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? <span className="send-spinner" /> : "↑"}
            </button>
          </div>
          <p className="input-hint">Enter = send • Shift+Enter = new line • Urdu supported ✓</p>
        </div>
      </main>
    </div>
  );
}