interface Container {
  name: string
  status: string
  state: string
  image: string
}

export function DockerCard({ containers }: { containers: Container[] }) {
  return (
    <div className="hud-card p-6 space-y-4 animate-fade-in">
      <h2 className="hud-title text-sm" style={{ color: 'var(--color-primary)' }}>
        Docker Containers
      </h2>

      {containers.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          Keine Container aktiv
        </p>
      ) : (
        <div className="space-y-3">
          {containers.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between p-3 rounded-md"
              style={{ background: 'var(--color-bg-deep)' }}
            >
              <div>
                <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {c.name}
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                  {c.image}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: c.state === 'running'
                      ? 'var(--color-success)'
                      : 'var(--color-danger)',
                    boxShadow: c.state === 'running'
                      ? '0 0 8px var(--color-success)'
                      : 'none',
                  }}
                />
                <span style={{
                  color: c.state === 'running'
                    ? 'var(--color-success)'
                    : 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                }}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}