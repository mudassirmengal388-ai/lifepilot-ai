"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Already logged in? Redirect to chat
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push("/chat");
    };
    check();
  }, []);

  const validateForm = () => {
    if (!email.trim()) { setError("Email is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return false; }
    if (!password) { setError("Password is required"); return false; }
    if (!isLogin && password.length < 8) { setError("Password must be at least 8 characters"); return false; }
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/chat");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/chat` }
        });
        if (error) throw error;
        setSuccess("Account created! Please check your email to confirm.");
        setIsLogin(true);
      }
    } catch (err: any) {
      const msg = err.message;
      if (msg.includes("Invalid login")) setError("Incorrect email or password");
      else if (msg.includes("already registered")) setError("Email already in use. Please login.");
      else if (msg.includes("Email not confirmed")) setError("Please confirm your email first.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    if (error) setError("Google login failed. Please try email login.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⚡</div>
        <h1 className="auth-title">LifePilot AI</h1>
        <p className="auth-subtitle">
          {isLogin ? "Welcome back!" : "Create your free account"}
        </p>

        <button className="google-btn" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder={isLogin ? "Your password" : "Min. 8 characters"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
        </div>

        {error && (
          <div className="auth-error">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="auth-success">
            ✅ {success}
          </div>
        )}

        <button className="auth-btn" onClick={handleAuth} disabled={loading}>
          {loading ? (
            <span className="auth-spinner">...</span>
          ) : isLogin ? "Sign In" : "Create Account"}
        </button>

        {isLogin && (
          <p className="auth-forgot">
            Forgot password? <span onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              await supabase.auth.resetPasswordForEmail(email);
              setSuccess("Password reset email sent!");
            }}>Reset it</span>
          </p>
        )}

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setSuccess("");
          }}>
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}