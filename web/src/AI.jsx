import { useState } from 'react'
import { api } from './services/api'

const SUGGESTIONS = [
  'Show me all active pipelines',
  'How many sources do I have?',
  'Show me the most recent pipeline',
  'Count pipelines by status',
]

export default function AI() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const askAI = async (q) => {
    const query = (q || question).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.ai.sql(query)
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Query failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const rows = result?.rows || []
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🤖 AI Query</h2>
      <p style={{ color: '#6b6b80', marginBottom: '32px', fontSize: '14px' }}>
        Ask your data anything in plain English
      </p>

      {/* Input */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askAI()}
          placeholder="e.g. Show me all active pipelines..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #2a2a38',
            background: '#111118',
            color: '#e8e8f0',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => askAI()}
          disabled={loading}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: loading ? '#2a2a38' : '#00e5ff',
            color: loading ? '#6b6b80' : '#000',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? '⏳ Thinking...' : '✨ Ask AI'}
        </button>
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuestion(s)
              askAI(s)
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #2a2a38',
              background: '#111118',
              color: '#a0a0b8',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(255,50,50,0.1)',
            color: '#ff5555',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div>
          {/* SQL */}
          <div
            style={{
              background: '#111118',
              borderRadius: '10px',
              border: '1px solid #2a2a38',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b6b80', marginBottom: '8px' }}>
              Generated SQL
            </div>
            <code style={{ color: '#00e5ff', fontSize: '13px', fontFamily: 'monospace' }}>
              {result.sql}
            </code>
          </div>

          {/* Results Table */}
          <div
            style={{
              background: '#111118',
              borderRadius: '10px',
              border: '1px solid #2a2a38',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #2a2a38',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Results</span>
              <span style={{ fontSize: '12px', color: '#6b6b80' }}>{rows.length} rows</span>
            </div>
            {rows.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#6b6b80', fontSize: '14px' }}>
                No results found
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#0a0a0f' }}>
                      {columns.map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: '10px 16px',
                            textAlign: 'left',
                            color: '#6b6b80',
                            fontWeight: '600',
                            borderBottom: '1px solid #2a2a38',
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a28' }}>
                        {columns.map((col) => (
                          <td
                            key={col}
                            style={{ padding: '10px 16px', color: '#e8e8f0' }}
                          >
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
