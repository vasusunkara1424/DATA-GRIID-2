import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { api } from './services/api'

const STAT_CARDS = [
  { key: 'pipelines', label: 'Total Pipelines', icon: '⚡', color: '#00e5ff' },
  { key: 'sources', label: 'Connected Sources', icon: '🔌', color: '#00e564' },
  { key: 'activeAlerts', label: 'Active Alerts', icon: '🚨', color: '#ff5555' },
  { key: 'aiQueries', label: 'AI Queries Run', icon: '🤖', color: '#a855f7' },
]

const PIPELINES = [
  { name: 'ecommerce_analytics_v3', status: 'running', rate: '4.2M/hr', latency: '89ms' },
  { name: 'user_events_stream', status: 'running', rate: '1.1M/hr', latency: '44ms' },
  { name: 'inventory_sync_daily', status: 'scheduled', rate: '82K/hr', latency: '—' },
  { name: 'postgres_to_warehouse', status: 'error', rate: '—', latency: '—' },
  { name: 'marketing_attribution', status: 'scheduled', rate: '—', latency: '—' },
]

const PIPELINE_NODES = ['Postgres', 'Stripe', 'Transform', 'QA Rules', 'Snowflake', 'Dashboard']
const PIPELINE_ICONS = ['🐘', '💳', '⟳', '✓', '❄️', '📊']

export default function Overview() {
  const { user } = useUser()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    api.stats
      .user(user.id)
      .then((data) => {
        if (!cancelled && data.success) setStats(data.stats)
      })
      .catch((err) => console.error('Failed to load stats:', err.message))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const statusColor = (s) =>
    s === 'running' ? '#00e564' : s === 'error' ? '#ff5555' : '#6b6b80'
  const statusBg = (s) =>
    s === 'running'
      ? 'rgba(0,229,100,0.1)'
      : s === 'error'
        ? 'rgba(255,50,50,0.1)'
        : 'rgba(107,107,128,0.1)'

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
          👋 Welcome back{user ? `, ${user.firstName || 'Rudhra'}` : ''}!
        </h2>
        <p style={{ color: '#6b6b80', fontSize: '14px' }}>
          Here's what's happening with your data pipelines
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '20px' }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: card.color }}>
              {loading ? '...' : stats ? String(stats[card.key] ?? '0') : '0'}
            </div>
            <div style={{ fontSize: '13px', color: '#6b6b80', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Canvas */}
      <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#6b6b80', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>📊 ecommerce_analytics_v3</span>
          <span style={{ color: '#00e564' }}>● Running — Last run: 2m ago</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {PIPELINE_NODES.map((node, i) => (
            <div key={node} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #2a2a38',
                  background: '#0a0a0f',
                  textAlign: 'center',
                  minWidth: '80px',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{PIPELINE_ICONS[i]}</div>
                <div style={{ fontSize: '11px', color: '#e8e8f0', fontWeight: '600' }}>{node}</div>
              </div>
              {i < PIPELINE_NODES.length - 1 && (
                <div style={{ color: '#2a2a38', fontSize: '20px' }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Pipelines */}
      <div style={{ background: '#111118', borderRadius: '12px', border: '1px solid #2a2a38', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #2a2a38',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: '700', fontSize: '14px' }}>📋 All Pipelines</span>
          <button
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#00e5ff',
              color: '#000',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>
        {PIPELINES.map((p) => (
          <div
            key={p.name}
            style={{
              padding: '14px 24px',
              borderBottom: '1px solid #1a1a28',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor(p.status) }} />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{p.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6b6b80' }}>{p.rate}</span>
              <span style={{ fontSize: '13px', color: '#6b6b80' }}>{p.latency}</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: statusBg(p.status),
                  color: statusColor(p.status),
                }}
              >
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
