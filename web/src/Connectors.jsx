import { useEffect, useRef, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const MAX_EVENTS = 50

const CONNECTORS = [
  {
    id: 'postgres',
    label: 'PostgreSQL',
    icon: '🐘',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost' },
      { key: 'port', label: 'Port', placeholder: '5432' },
      { key: 'database', label: 'Database', placeholder: 'mydb' },
      { key: 'user', label: 'User', placeholder: 'postgres' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
    ],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    icon: '💳',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk_live_...', type: 'password' },
    ],
  },
  {
    id: 's3',
    label: 'AWS S3',
    icon: '☁️',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIA...' },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '••••••••', type: 'password' },
      { key: 'region', label: 'Region', placeholder: 'us-east-1' },
    ],
  },
]

const EVENT_TAG_STYLES = {
  insert: { bg: 'rgba(0,229,100,0.1)', color: '#00e564', label: '✅ INSERT' },
  update: { bg: 'rgba(255,200,0,0.1)', color: '#ffc800', label: '✏️ UPDATE' },
  delete: { bg: 'rgba(255,80,80,0.1)', color: '#ff5050', label: '🗑️ DELETE' },
}

function tagColor(type) {
  return EVENT_TAG_STYLES[type] || { bg: '#111', color: '#fff', label: type }
}

export default function Connectors() {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setWsStatus('connected')
    ws.onclose = () => setWsStatus('disconnected')
    ws.onerror = () => setWsStatus('error')
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data)
        // Ignore welcome ping from backend
        if (event.type === 'connected') return
        setEvents((prev) =>
          [{ ...event, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, MAX_EVENTS)
        )
      } catch (err) {
        console.error('Failed to parse WS event:', err.message)
      }
    }

    return () => ws.close()
  }, [])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/api/connect/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Request failed: ${res.status}`)
      }
      setResult(data.data || data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColor =
    wsStatus === 'connected' ? '#00e564' : wsStatus === 'connecting' ? '#ffc800' : '#ff5050'

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Connectors</h2>
      <p style={{ color: '#6b6b80', marginBottom: '32px', fontSize: '14px' }}>
        Connect your data sources
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
        {CONNECTORS.map((c) => {
          const isSelected = selected?.id === c.id
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelected(c)
                setForm({})
                setResult(null)
                setError(null)
              }}
              style={{
                padding: '24px',
                borderRadius: '12px',
                border: isSelected ? '1px solid #00e5ff' : '1px solid #2a2a38',
                background: isSelected ? 'rgba(0,229,255,0.08)' : '#111118',
                color: isSelected ? '#00e5ff' : '#e8e8f0',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{c.label}</div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '700' }}>
            Connect to {selected.label}
          </h3>
          {selected.fields.map((f) => (
            <div key={f.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b6b80', marginBottom: '6px' }}>
                {f.label}
              </label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={form[f.key] || ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a38',
                  background: '#0a0a0f',
                  color: '#e8e8f0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#00e5ff',
              color: '#000',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          {error && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255,50,50,0.1)',
                color: '#ff5555',
                fontSize: '13px',
              }}
            >
              ❌ {error}
            </div>
          )}
          {result && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)',
              }}
            >
              <div style={{ color: '#00e5ff', fontWeight: '700', marginBottom: '8px' }}>✅ Connected!</div>
              <pre style={{ fontSize: '12px', color: '#a0a0b8', overflow: 'auto', margin: 0 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Live CDC Feed */}
      <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>⚡ Live CDC Feed</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ color: '#6b6b80', textTransform: 'capitalize' }}>{wsStatus}</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6b6b80', fontSize: '14px' }}>
            Waiting for database changes...
            <br />
            <span style={{ fontSize: '12px' }}>Try inserting or updating a row in your database</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {events.map((e, i) => {
              const tag = tagColor(e.type)
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0a0a0f',
                    border: '1px solid #1a1a28',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: tag.bg,
                      color: tag.color,
                      fontSize: '12px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag.label}
                  </span>
                  <span style={{ color: '#00e5ff', fontSize: '12px', fontWeight: '600' }}>{e.table}</span>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      color: '#a0a0b8',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {JSON.stringify(e.data)}
                  </pre>
                  <span style={{ color: '#3a3a50', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {e.timestamp}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
