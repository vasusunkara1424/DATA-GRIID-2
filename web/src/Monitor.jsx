import { useEffect, useState, useCallback } from 'react'
import { api } from './services/api'

const REFRESH_INTERVAL_MS = 30_000

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(255,50,50,0.1)', color: '#ff5555', border: 'rgba(255,50,50,0.3)' },
  warning:  { bg: 'rgba(255,200,0,0.1)', color: '#ffc800', border: 'rgba(255,200,0,0.3)' },
}

function severityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES.warning
}

export default function Monitor() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.alerts.list()
      // Support both response shapes: {success, alerts} or raw array
      const list = Array.isArray(data) ? data : data.alerts || []
      setAlerts(list)
    } catch (err) {
      console.error('Failed to load alerts:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const resolveAlert = async (id) => {
    try {
      await api.alerts.resolve(id)
      fetchAlerts()
    } catch (err) {
      console.error('Failed to resolve alert:', err.message)
    }
  }

  const unresolved = alerts.filter((a) => !a.resolved)
  const resolved = alerts.filter((a) => a.resolved)
  const criticalCount = unresolved.filter((a) => a.severity === 'critical').length
  const warningCount = unresolved.filter((a) => a.severity === 'warning').length

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
        🚨 Monitoring & Alerts
      </h2>
      <p style={{ color: '#6b6b80', marginBottom: '32px', fontSize: '14px' }}>
        AI-powered anomaly detection running every 60 seconds
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ff5555' }}>{criticalCount}</div>
          <div style={{ fontSize: '13px', color: '#6b6b80', marginTop: '4px' }}>Critical Alerts</div>
        </div>
        <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ffc800' }}>{warningCount}</div>
          <div style={{ fontSize: '13px', color: '#6b6b80', marginTop: '4px' }}>Warnings</div>
        </div>
        <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#00e564' }}>{resolved.length}</div>
          <div style={{ fontSize: '13px', color: '#6b6b80', marginTop: '4px' }}>Resolved</div>
        </div>
      </div>

      {/* Active Alerts */}
      <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Active Alerts</h3>
        {loading ? (
          <div style={{ color: '#6b6b80', fontSize: '14px' }}>Loading...</div>
        ) : unresolved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6b6b80' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <div>All systems operational!</div>
          </div>
        ) : (
          unresolved.map((alert) => {
            const s = severityStyle(alert.severity)
            return (
              <div
                key={alert.id}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${s.border}`,
                  background: s.bg,
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: s.bg,
                        color: s.color,
                        fontSize: '11px',
                        fontWeight: '700',
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b6b80' }}>{alert.type}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#e8e8f0' }}>{alert.message}</div>
                  <div style={{ fontSize: '12px', color: '#6b6b80', marginTop: '4px' }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #2a2a38',
                    background: '#0a0a0f',
                    color: '#00e564',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✓ Resolve
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#6b6b80' }}>
            Resolved Alerts
          </h3>
          {resolved.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1a1a28',
                background: '#0a0a0f',
                marginBottom: '8px',
                opacity: 0.6,
              }}
            >
              <div style={{ fontSize: '13px', color: '#6b6b80' }}>✅ {alert.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
