"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type Message = { role: "user" | "ai"; content: string; };
type Model = "groq" | "gemini";
type Conversation = { id: string; title: string; created_at: string; };

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Auth check + load conversations
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth"; return; }
      setUserId(user.id);
      loadConversations(user.id);
    };
    init();
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    if (data) setMessages(data.map(m => ({ role: m.role, content: m.content })));
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConvId(conv.id);
    loadMessages(conv.id);
    setError(null);
  };

  const newChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setError(null);
    setInput("");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !userId) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      // Create new conversation if needed
      let convId = currentConvId;
      if (!convId) {
        const { data: conv } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: input.trim().slice(0, 40),
          })
          .select()
          .single();
        if (conv) {
          convId = conv.id;
          setCurrentConvId(conv.id);
          setConversations(prev => [conv, ...prev]);
        }
      }

      // Save user message
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "user",
          content: input.trim(),
        });
      }

      // Call AI
      const history = newMessages.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim(), model, history }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error");

      const aiMsg: Message = { role: "ai", content: data.reply };
      setMessages([...newMessages, aiMsg]);

      // Save AI message
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "ai",
          content: data.reply,
        });
      }

    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
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

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <span className="logo">⚡ LifePilot</span>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <button className="new-chat-btn" onClick={newChat}>+ New Chat</button>

        <div className="chat-list">
          <div className="chat-list-label">Conversations</div>
          {conversations.length === 0 && (
            <div className="chat-empty">No conversations yet</div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`chat-item ${currentConvId === conv.id ? "active" : ""}`}
              onClick={() => selectConversation(conv)}
            >
              <span className="chat-item-title">{conv.title || "New Chat"}</span>
              <button
                className="delete-btn"
                onClick={(e) => deleteConversation(e, conv.id)}
              >✕</button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="model-label">Model</div>
          <div className="model-pills">
            <button className={`pill ${model === "groq" ? "active" : ""}`} onClick={() => setModel("groq")}>
              🦙 LLaMA
            </button>
            <button className={`pill ${model === "gemini" ? "active" : ""}`} onClick={() => setModel("gemini")}>
              ✨ Gemini
            </button>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="topbar">
          {!sidebarOpen && (
            <button className="icon-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          )}
          <span className="topbar-title">LifePilot AI</span>
          <span className="model-badge">
            {model === "groq" ? "🦙 LLaMA 3.3" : "✨ Gemini"}
          </span>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">⚡</div>
              <h2>LifePilot AI</h2>
              <p>Your personal AI assistant</p>
              <div className="suggestions">
                {["Give me a business idea", "Explain Python for loops", "Create a healthy diet plan"].map(s => (
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
              <div className="msg-avatar">{msg.role === "user" ? "U" : "⚡"}</div>
              <div className="msg-content">
                <pre className="msg-text">{msg.content}</pre>
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg ai">
              <div className="msg-avatar">⚡</div>
              <div className="msg-content">
                <div className="typing"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}

          {error && <div className="error-msg">⚠️ {error}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="input-wrapper">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message likhein..."
              disabled={loading}
              rows={1}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>↑</button>
          </div>
          <p className="input-hint">Enter = send • Shift+Enter = new line</p>
        </div>
      </main>
    </div>
  );
}