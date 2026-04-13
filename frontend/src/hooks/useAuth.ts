/**
 * useAuth – Auth-State Management für Olymp Dashboard
 * ====================================================
 * Verwaltet:
 * - Dashboard Login/Logout
 * - Tresor Lock/Unlock mit Countdown-Timer
 * - Automatische Status-Prüfung
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface AuthStatus {
  authenticated: boolean;
  tresor_unlocked: boolean;
  tresor_remaining_seconds: number | null;
}

interface AuthState {
  // Status
  isAuthenticated: boolean;
  isTresorUnlocked: boolean;
  tresorRemainingSeconds: number | null;
  isLoading: boolean;

  // Errors
  loginError: string | null;
  tresorError: string | null;

  // Actions
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  unlockTresor: (password: string) => Promise<boolean>;
  lockTresor: () => void;
  refreshStatus: () => Promise<void>;
}

const API_BASE = "/api/auth";

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTresorUnlocked, setIsTresorUnlocked] = useState(false);
  const [tresorRemainingSeconds, setTresorRemainingSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tresorError, setTresorError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Tresor Countdown ---
  const startCountdown = useCallback((seconds: number) => {
    // Alten Timer aufräumen
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setTresorRemainingSeconds(seconds);

    countdownRef.current = setInterval(() => {
      setTresorRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          // Tresor automatisch sperren
          if (countdownRef.current) clearInterval(countdownRef.current);
          setIsTresorUnlocked(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setTresorRemainingSeconds(null);
  }, []);

  // --- Status prüfen ---
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, { credentials: "include" });
      if (res.ok) {
        const data: AuthStatus = await res.json();
        setIsAuthenticated(data.authenticated);
        setIsTresorUnlocked(data.tresor_unlocked);

        if (data.tresor_unlocked && data.tresor_remaining_seconds !== null) {
          // Nur neu starten wenn signifikante Differenz
          if (
            tresorRemainingSeconds === null ||
            Math.abs(tresorRemainingSeconds - data.tresor_remaining_seconds) > 5
          ) {
            startCountdown(data.tresor_remaining_seconds);
          }
        } else if (!data.tresor_unlocked) {
          stopCountdown();
        }
      }
    } catch {
      // Netzwerk-Fehler → nicht authentifiziert
      setIsAuthenticated(false);
      setIsTresorUnlocked(false);
      stopCountdown();
    } finally {
      setIsLoading(false);
    }
  }, [startCountdown, stopCountdown, tresorRemainingSeconds]);

  // Initialer Status-Check
  useEffect(() => {
    refreshStatus();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Periodischer Status-Check (alle 60 Sekunden)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(refreshStatus, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshStatus]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // --- Login ---
  const login = useCallback(async (password: string): Promise<boolean> => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }

      const error = await res.json();
      setLoginError(error.detail || "Login fehlgeschlagen.");
      return false;
    } catch {
      setLoginError("Verbindung zum Server fehlgeschlagen.");
      return false;
    }
  }, []);

  // --- Logout ---
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Auch bei Netzwerk-Fehler lokal ausloggen
    }
    setIsAuthenticated(false);
    setIsTresorUnlocked(false);
    stopCountdown();
    setLoginError(null);
    setTresorError(null);
  }, [stopCountdown]);

  // --- Tresor entsperren ---
  const unlockTresor = useCallback(
    async (password: string): Promise<boolean> => {
      setTresorError(null);
      try {
        const res = await fetch(`${API_BASE}/tresor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          setIsTresorUnlocked(true);
          startCountdown(15 * 60); // 15 Minuten
          return true;
        }

        const error = await res.json();
        setTresorError(error.detail || "Tresor-Entsperrung fehlgeschlagen.");
        return false;
      } catch {
        setTresorError("Verbindung zum Server fehlgeschlagen.");
        return false;
      }
    },
    [startCountdown]
  );

  // --- Tresor sperren ---
  const lockTresor = useCallback(() => {
    setIsTresorUnlocked(false);
    stopCountdown();
    // Cookie wird beim nächsten Request serverseitig nicht mehr akzeptiert
    // (oder wir rufen einen Lock-Endpoint auf)
  }, [stopCountdown]);

  return {
    isAuthenticated,
    isTresorUnlocked,
    tresorRemainingSeconds,
    isLoading,
    loginError,
    tresorError,
    login,
    logout,
    unlockTresor,
    lockTresor,
    refreshStatus,
  };
}
