interface SystemData {
  cpu_percent: number
  cpu_count: number
  memory: { total_gb: number; used_gb: number; percent: number }
  disk_root: { total_gb: number; used_gb: number; percent: number }
  disk_tresor: { total_gb: number; used_gb: number; percent: number } | null
  temperature_c: number | null
  uptime_seconds: number
}

function Bar({ percent, color = 'var(--color-primary)' }: { percent: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full" style={{ background: 'var(--color-bg-deep)' }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  )
}

function Stat({ label, value, sub, percent, color }: {
  label: string; value: string; sub?: string; percent?: number; color?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{label}</span>
        <span className="text-glow font-mono text-sm">{value}</span>
      </div>
      {percent !== undefined && <Bar percent={percent} color={color} />}
      {sub && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{sub}</p>}
    </div>
  )
}

export function SystemCard({ data }: { data: SystemData }) {
  const uptimeDays = Math.floor((Date.now() / 1000 - data.uptime_seconds) / 86400)
  const uptimeHours = Math.floor(((Date.now() / 1000 - data.uptime_seconds) % 86400) / 3600)

  return (
    <div className="hud-card p-6 space-y-5 animate-fade-in">
      <h2 className="hud-title text-sm" style={{ color: 'var(--color-primary)' }}>
        System Status
      </h2>

      <Stat
        label="CPU"
        value={`${data.cpu_percent}%`}
        sub={`${data.cpu_count} Cores`}
        percent={data.cpu_percent}
        color={data.cpu_percent > 80 ? 'var(--color-danger)' : 'var(--color-primary)'}
      />

      <Stat
        label="Memory"
        value={`${data.memory.used_gb} / ${data.memory.total_gb} GB`}
        percent={data.memory.percent}
        color={data.memory.percent > 80 ? 'var(--color-warning)' : 'var(--color-primary)'}
      />

      <Stat
        label="Root Disk"
        value={`${data.disk_root.used_gb} / ${data.disk_root.total_gb} GB`}
        percent={data.disk_root.percent}
      />

      {data.disk_tresor && (
        <Stat
          label="Tresor (T7 Shield)"
          value={`${data.disk_tresor.used_gb} / ${data.disk_tresor.total_gb} GB`}
          percent={data.disk_tresor.percent}
          color="var(--color-success)"
        />
      )}

      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
          {data.temperature_c ? `${data.temperature_c}°C` : '–'}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
          Uptime: {uptimeDays}d {uptimeHours}h
        </span>
      </div>
    </div>
  )
}