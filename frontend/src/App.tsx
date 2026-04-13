import { useApi } from './hooks/useApi'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider, useTheme, THEMES } from './hooks/useTheme'
import type { ThemeKey } from './hooks/useTheme'
import { SystemCard } from './components/SystemCard'
import { DockerCard } from './components/DockerCard'
import { NetworkCard } from './components/NetworkCard'
import { FileManager } from './components/FileManager'
import { LoginScreen } from './components/LoginScreen'
import { TresorGate } from './components/TresorGate'
import { InventoryCard } from './components/InventoryCard'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex gap-2">
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={`hud-tab ${theme === key ? 'hud-tab-active' : ''}`}
        >
          {THEMES[key]}
        </button>
      ))}
    </div>
  )
}

function Dashboard() {
  const auth = useAuth()
  const { data: system, loading: sysLoad } = useApi<any>('/system', 3000)
  const { data: docker, loading: dockLoad } = useApi<any>('/docker', 5000)
  const { data: network, loading: netLoad } = useApi<any>('/network', 10000)
  const { data: inventory, loading: invLoad } = useApi<any>('/inventory', 30000)

  // Loading
  if (auth.isLoading) {
    return (
      <div className="min-h-screen hud-grid-bg flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Verbindung wird geprüft...</p>
      </div>
    )
  }

  // Stufe 1: Nicht eingeloggt → Login Screen
  if (!auth.isAuthenticated) {
    return <LoginScreen onLogin={auth.login} error={auth.loginError} />
  }

  // Eingeloggt → Dashboard
  return (
    <div className="min-h-screen hud-grid-bg">
      <header className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 className="hud-title text-2xl text-glow">Olymp</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
            Infrastructure Dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-glow-pulse" style={{ background: 'var(--color-success)' }} />
            <span style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontFamily: 'var(--font-heading)' }}>
              ONLINE
            </span>
          </div>
          <ThemeToggle />
          <button onClick={auth.logout} className="hud-tab" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
            ABMELDEN
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {sysLoad ? (
          <div className="hud-card p-6">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading system data...</p>
          </div>
        ) : system ? (
          <SystemCard data={system} />
        ) : null}

        {dockLoad ? (
          <div className="hud-card p-6">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading containers...</p>
          </div>
        ) : docker?.containers ? (
          <DockerCard containers={docker.containers} />
        ) : null}

        {netLoad ? (
          <div className="hud-card p-6">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading network...</p>
          </div>
        ) : network?.interfaces ? (
          <NetworkCard interfaces={network.interfaces} />
        ) : null}

        {/* Server-Inventar (über dem Tresor) */}
        {invLoad ? (
          <div className="hud-card p-6 md:col-span-2 lg:col-span-3">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading inventory...</p>
          </div>
        ) : inventory ? (
          <InventoryCard data={inventory} />
        ) : null}

        {/* Tresor (ganz unten) */}
        <div className="md:col-span-2 lg:col-span-3">
          <TresorGate
            isTresorUnlocked={auth.isTresorUnlocked}
            tresorRemainingSeconds={auth.tresorRemainingSeconds}
            onUnlock={auth.unlockTresor}
            onLock={auth.lockTresor}
            error={auth.tresorError}
          >
            <FileManager />
          </TresorGate>
        </div>
      </main>

      <footer className="p-4 text-center" style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
        Projekt Olymp · prometheus@olymp · {new Date().toLocaleDateString('de-CH')}
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  )
}