export function NetworkCard({ interfaces }: { interfaces: Record<string, string> }) {
  return (
    <div className="hud-card p-6 space-y-4 animate-fade-in">
      <h2 className="hud-title text-sm" style={{ color: 'var(--color-primary)' }}>
        Network Interfaces
      </h2>

      <div className="space-y-2">
        {Object.entries(interfaces).map(([name, ip]) => (
          <div
            key={name}
            className="flex justify-between p-2 rounded"
            style={{ background: 'var(--color-bg-deep)' }}
          >
            <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {name}
            </span>
            <span className="font-mono text-sm text-glow">{ip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
