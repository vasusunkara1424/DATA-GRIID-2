import { useEffect, useState } from 'react'
import { api } from './services/api'

const TYPE_ICONS = {
  Database: '🐘',
  SaaS: '💳',
  Stream: '📡',
  Storage: '☁️',
}

export default function Ingestion() {
  const [sources, setSources] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([api.sources.list(), api.stats.global()])
      .then(([sourcesData, statsData]) => {
        if (cancelled) return
        // New backend returns { success, sources: [...] } — the old shape was a raw array.
        const list = Array.isArray(sourcesData) ? sourcesData : sourcesData.sources || []
        setSources(list)
        setStats(statsData.stats || statsData || {})
      })
      .catch((err) => console.error('Failed to load ingestion data:', err.message))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#00e5ff',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        Loading sources...
      </div>
    )

  const connectedCount = sources.filter((s) => s.status === 'connected').length

  const headerStats = [
    { label: 'Total Sources', value: sources.length.toString(), color: '#00e5ff' },
    { label: 'Active Now', value: connectedCount.toString(), color: '#10b981' },
    { label: 'Records Today', value: stats.recordsToday || '—', color: '#7c3aed' },
    { label: 'Avg Latency', value: stats.avgLatency || '—', color: '#f59e0b' },
  ]

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {headerStats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#111118',
              border: '1px solid #2a2a38',
              borderRadius: '12px',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#6b6b80',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: stat.color,
                fontFamily: 'monospace',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sources Grid */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#6b6b80',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '12px',
          }}
        >
          Connected Sources
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {sources.map((source) => {
            const isConnected = source.status === 'connected'
            return (
              <div
                key={source.id}
                style={{
                  background: '#111118',
                  border: `1px solid ${isConnected ? 'rgba(0,229,255,0.2)' : '#2a2a38'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: `rgba(${isConnected ? '0,229,255' : '107,107,128'},0.08)`,
                    border: `1px solid ${isConnected ? 'rgba(0,229,255,0.2)' : '#2a2a38'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                >
                  {TYPE_ICONS[source.type] || '☁️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#e8e8f0', marginBottom: '2px' }}>
                    {source.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b6b80', fontFamily: 'monospace' }}>
                    {source.type} · {source.records}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: isConnected ? '#10b981' : '#6b6b80',
                      boxShadow: isConnected ? '0 0 6px #10b981' : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: isConnected ? '#10b981' : '#6b6b80',
                    }}
                  >
                    {isConnected ? 'LIVE' : 'IDLE'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Source */}
      <div
        style={{
          border: '2px dashed #2a2a38',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          gap: '8px',
          color: '#6b6b80',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        <span style={{ fontSize: '20px' }}>+</span> Add New Source
      </div>
    </div>
  )
}
