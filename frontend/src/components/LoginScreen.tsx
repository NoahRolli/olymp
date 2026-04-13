/**
 * LoginScreen – Dashboard-Login (Stufe 1)
 * =========================================
 * Vollbild-Login im Pallas HUD Design.
 * Zeigt Fehler bei falschen Passwörtern + Lockout-Warnung.
 */

import { useState, useRef, useEffect } from "react";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
  error: string | null;
}

export function LoginScreen({ onLogin, error }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-Focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Shake-Animation bei Fehler
  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onLogin(password);
    setIsSubmitting(false);

    if (!success) {
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        {/* Logo / Titel */}
        <div className="login-header">
          <div className="login-icon">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 4L6 14v20l18 10 18-10V14L24 4z"
                stroke="var(--color-accent)"
                strokeWidth="2"
                fill="none"
                opacity="0.3"
              />
              <path
                d="M24 8L10 16v16l14 8 14-8V16L24 8z"
                stroke="var(--color-accent)"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="24" cy="24" r="4" fill="var(--color-accent)" />
            </svg>
          </div>
          <h1 className="login-title hud-title">OLYMP</h1>
          <p className="login-subtitle">Authentifizierung erforderlich</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={`login-form ${shake ? "shake" : ""}`}>
          <div className="input-group">
            <label htmlFor="dashboard-password" className="input-label">
              PASSWORT
            </label>
            <input
              ref={inputRef}
              id="dashboard-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hud-input"
              placeholder="Dashboard-Passwort eingeben"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          {/* Fehler-Anzeige */}
          {error && (
            <div className="login-error">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="hud-btn login-btn"
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? (
              <span className="login-spinner" />
            ) : (
              "ZUGANG ANFORDERN"
            )}
          </button>
        </form>

        {/* Security Badge */}
        <div className="login-security-badge">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 00-3.5 3.5V7A1.5 1.5 0 003 8.5v5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 7V4.5A3.5 3.5 0 008 1zm2 6V4.5a2 2 0 10-4 0V7h4z"
              clipRule="evenodd"
            />
          </svg>
          <span>bcrypt + JWT · Rate Limited · Session Encrypted</span>
        </div>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg, #0a0e17);
          padding: 1rem;
        }

        .login-container {
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        .login-header {
          margin-bottom: 2rem;
        }

        .login-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px var(--color-accent)); }
          50% { opacity: 1; filter: drop-shadow(0 0 16px var(--color-accent)); }
        }

        .login-title {
          font-size: 2rem;
          letter-spacing: 0.3em;
          margin: 0;
          color: var(--color-accent);
        }

        .login-subtitle {
          color: var(--color-text-secondary, #8892b0);
          font-size: 0.85rem;
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .login-form.shake {
          animation: shake 0.6s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }

        .input-group {
          text-align: left;
        }

        .input-label {
          display: block;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          color: var(--color-text-secondary, #8892b0);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .hud-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: var(--color-text, #e6f1ff);
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .hud-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 0, 255, 255), 0.15);
        }

        .hud-input::placeholder {
          color: var(--color-text-secondary, #8892b0);
          opacity: 0.5;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1rem;
          background: rgba(255, 50, 50, 0.1);
          border: 1px solid rgba(255, 50, 50, 0.3);
          border-radius: 6px;
          color: #ff6b6b;
          font-size: 0.85rem;
          text-align: left;
        }

        .login-btn {
          width: 100%;
          padding: 0.8rem;
          margin-top: 0.5rem;
          background: var(--color-accent);
          color: var(--color-bg, #0a0e17);
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .login-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top-color: var(--color-bg, #0a0e17);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 2rem;
          color: var(--color-text-secondary, #8892b0);
          opacity: 0.5;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}
