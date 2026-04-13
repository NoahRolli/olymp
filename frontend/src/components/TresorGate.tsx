/**
 * TresorGate – Tresor-Entsperrung (Stufe 2)
 * ============================================
 * Modal-Overlay das erscheint wenn man den File Manager öffnen will.
 * Zeigt Countdown-Timer wenn Tresor entsperrt ist.
 * Automatische Sperrung nach 15 Minuten Inaktivität.
 */

import { useState, useRef, useEffect } from "react";

interface TresorGateProps {
  isTresorUnlocked: boolean;
  tresorRemainingSeconds: number | null;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
  error: string | null;
  children: React.ReactNode;
}

export function TresorGate({
  isTresorUnlocked,
  tresorRemainingSeconds,
  onUnlock,
  onLock,
  error,
  children,
}: TresorGateProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-Focus
  useEffect(() => {
    if (!isTresorUnlocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isTresorUnlocked]);

  // Shake bei Fehler
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
    const success = await onUnlock(password);
    setIsSubmitting(false);

    if (!success) {
      setPassword("");
      inputRef.current?.focus();
    } else {
      setPassword("");
    }
  };

  // Formatiere Countdown
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Warnstufe basierend auf verbleibender Zeit
  const getTimerClass = (): string => {
    if (tresorRemainingSeconds === null) return "";
    if (tresorRemainingSeconds <= 60) return "timer-critical";   // Letzte Minute: rot
    if (tresorRemainingSeconds <= 180) return "timer-warning";   // Letzte 3 Min: gelb
    return "timer-ok";
  };

  // Tresor ist entsperrt → zeige Content + Timer-Badge
  if (isTresorUnlocked) {
    return (
      <div className="tresor-container">
        {/* Tresor Timer Badge */}
        <div className={`tresor-timer-badge ${getTimerClass()}`}>
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V7A1.5 1.5 0 003 8.5v5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 7V4.5A3.5 3.5 0 008 1zm2 6V4.5a2 2 0 10-4 0V7h4z" clipRule="evenodd" />
          </svg>
          <span>TRESOR OFFEN</span>
          <span className="tresor-countdown">{formatTime(tresorRemainingSeconds)}</span>
          <button
            className="tresor-lock-btn"
            onClick={onLock}
            title="Tresor jetzt sperren"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M11.5 1A3.5 3.5 0 0015 4.5V7h.5A1.5 1.5 0 0117 8.5v5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 13.5v-5A1.5 1.5 0 018.5 7H13V4.5A2.5 2.5 0 0010.5 2H10a.5.5 0 010-1h1.5z" />
            </svg>
            SPERREN
          </button>
        </div>

        {/* File Manager Content */}
        {children}

        <style>{tresorStyles}</style>
      </div>
    );
  }

  // Tresor ist gesperrt → zeige Unlock-Screen
  return (
    <div className="tresor-locked">
      <div className="tresor-lock-screen">
        <div className="tresor-lock-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="20" width="32" height="24" rx="4" stroke="var(--color-accent)" strokeWidth="2" fill="none" />
            <path d="M16 20V14a8 8 0 1116 0v6" stroke="var(--color-accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="24" cy="32" r="3" fill="var(--color-accent)" />
            <path d="M24 35v3" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h2 className="tresor-title">TRESOR GESPERRT</h2>
        <p className="tresor-subtitle">
          Zweites Passwort erforderlich für Dateizugriff
        </p>

        <form onSubmit={handleSubmit} className={`tresor-form ${shake ? "shake" : ""}`}>
          <div className="input-group">
            <label htmlFor="tresor-password" className="input-label">
              TRESOR-PASSWORT
            </label>
            <input
              ref={inputRef}
              id="tresor-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hud-input"
              placeholder="Tresor-Passwort eingeben"
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="tresor-error">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="hud-btn tresor-unlock-btn"
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? <span className="login-spinner" /> : "TRESOR ENTSPERREN"}
          </button>
        </form>

        <div className="tresor-info">
          <span>Session: 15 Minuten · Auto-Sperre bei Inaktivität</span>
        </div>
      </div>

      <style>{tresorStyles}</style>
    </div>
  );
}

const tresorStyles = `
  .tresor-locked {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .tresor-lock-screen {
    text-align: center;
    max-width: 380px;
    width: 100%;
  }

  .tresor-lock-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 1.2rem;
    opacity: 0.8;
  }

  .tresor-title {
    font-size: 1.2rem;
    letter-spacing: 0.2em;
    color: var(--color-accent);
    margin: 0 0 0.4rem;
  }

  .tresor-subtitle {
    color: var(--color-text-secondary, #8892b0);
    font-size: 0.8rem;
    margin-bottom: 1.5rem;
  }

  .tresor-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .tresor-form.shake {
    animation: shake 0.6s ease-in-out;
  }

  .tresor-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 50, 50, 0.1);
    border: 1px solid rgba(255, 50, 50, 0.3);
    border-radius: 6px;
    color: #ff6b6b;
    font-size: 0.8rem;
    text-align: left;
  }

  .tresor-unlock-btn {
    width: 100%;
    padding: 0.7rem;
    background: var(--color-accent);
    color: var(--color-bg, #0a0e17);
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .tresor-unlock-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .tresor-unlock-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tresor-info {
    margin-top: 1.5rem;
    font-size: 0.65rem;
    color: var(--color-text-secondary, #8892b0);
    opacity: 0.5;
    letter-spacing: 0.05em;
  }

  /* Timer Badge (oben im File Manager) */
  .tresor-container {
    position: relative;
  }

  .tresor-timer-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
    margin-bottom: 1rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .tresor-timer-badge.timer-ok {
    background: rgba(0, 255, 150, 0.08);
    border: 1px solid rgba(0, 255, 150, 0.2);
    color: #00ff96;
  }

  .tresor-timer-badge.timer-warning {
    background: rgba(255, 200, 0, 0.08);
    border: 1px solid rgba(255, 200, 0, 0.2);
    color: #ffc800;
  }

  .tresor-timer-badge.timer-critical {
    background: rgba(255, 50, 50, 0.08);
    border: 1px solid rgba(255, 50, 50, 0.3);
    color: #ff6b6b;
    animation: pulse-critical 1s ease-in-out infinite;
  }

  @keyframes pulse-critical {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .tresor-countdown {
    font-family: "Orbitron", "SF Mono", monospace;
    font-size: 0.85rem;
    margin-left: auto;
  }

  .tresor-lock-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: inherit;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: background 0.2s;
  }

  .tresor-lock-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Shared styles */
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

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 50%, 90% { transform: translateX(-6px); }
    30%, 70% { transform: translateX(6px); }
  }

  .login-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: var(--color-bg, #0a0e17);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
