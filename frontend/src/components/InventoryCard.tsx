interface Disk {
  label: string
  mountpoint: string
  fstype: string
  total_gb: number
  used_gb: number
  percent: number
}

interface Container {
  name: string
  image: string
  state: string
  status: string
  ports: string
}

interface DockerImage {
  tag: string
  size_mb: number
}

interface Service {
  name: string
  port: number | null
  status: string
}

interface NetInterface {
  name: string
  ip: string
}

interface InventoryData {
  hardware: {
    hostname: string
    model: string
    cpu: string
    ram_gb: number
    disks: Disk[]
  }
  os: {
    distribution: string
    kernel: string
  }
  containers: Container[]
  images: DockerImage[]
  services: Service[]
  interfaces: NetInterface[]
}

import { useState } from 'react'

export function InventoryCard({ data }: { data: InventoryData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="hud-card p-6 md:col-span-2 lg:col-span-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <h2 className="hud-title text-base" style={{ margin: 0 }}>
          <span style={{ color: 'var(--color-accent)', marginRight: '0.5rem' }}>⬡</span>
          Server-Inventar
        </h2>
        <span style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-heading)',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="animate-fade-in" style={{ marginTop: '1.2rem' }}>
          {/* Hardware */}
          <Section title="HARDWARE">
            <Row label="Hostname" value={data.hardware.hostname} />
            <Row label="Modell" value={data.hardware.model} />
            <Row label="CPU" value={data.hardware.cpu} />
            <Row label="RAM" value={`${data.hardware.ram_gb} GB`} />
          </Section>

          {/* Speicher */}
          <Section title="SPEICHER">
            {data.hardware.disks.map((d, i) => (
              <Row
                key={i}
                label={d.label}
                value={`${d.used_gb} / ${d.total_gb} GB (${d.percent}%)`}
                accent={d.percent > 85 ? 'var(--color-danger, #ff6b6b)' : undefined}
              />
            ))}
          </Section>

          {/* Betriebssystem */}
          <Section title="BETRIEBSSYSTEM">
            <Row label="Distribution" value={data.os.distribution} />
            <Row label="Kernel" value={data.os.kernel} />
          </Section>

          {/* Docker-Container */}
          <Section title="DOCKER-CONTAINER">
            {data.containers.length > 0 ? (
              data.containers.map((c, i) => (
                <div key={i} style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.02)',
                  marginBottom: '0.3rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 600 }}>{c.name}</span>
                    <span style={{
                      color: c.state === 'running' ? 'var(--color-success)' : 'var(--color-danger, #ff6b6b)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {c.state.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{c.image}</span>
                    {c.ports && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{c.ports}</span>}
                  </div>
                </div>
              ))
            ) : (
              <Row label="–" value="Keine Container gefunden" />
            )}
          </Section>

          {/* Docker Images */}
          {data.images && data.images.length > 0 && (
            <Section title="DOCKER-IMAGES">
              {data.images.map((img, i) => (
                <Row key={i} label={img.tag} value={`${img.size_mb} MB`} />
              ))}
            </Section>
          )}

          {/* Dienste */}
          <Section title="DIENSTE">
            {data.services.map((s, i) => (
              <Row
                key={i}
                label={s.name}
                value={s.port ? `${s.status} (Port ${s.port})` : s.status}
                accent="var(--color-success)"
              />
            ))}
          </Section>

          {/* Netzwerk */}
          <Section title="NETZWERK">
            {data.interfaces.map((iface, i) => (
              <Row key={i} label={iface.name} value={iface.ip} />
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        color: 'var(--color-accent)',
        marginBottom: '0.5rem',
        fontFamily: 'var(--font-heading)',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.3rem 0.5rem',
      borderRadius: '4px',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{label}</span>
      <span style={{
        color: accent || 'var(--color-text)',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'right',
        maxWidth: '60%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  )
}