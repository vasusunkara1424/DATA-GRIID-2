/**
 * WebSocket server.
 * Streams real-time events (alerts, CDC changes, pipeline status) to the frontend.
 * Attaches to an existing HTTP server so HTTP + WS share one port (required for Railway/Vercel/Heroku-style PaaS).
 */

import { WebSocketServer } from 'ws'

const clients = new Set()
let wss = null

export function startWebSocket(httpServer) {
  if (!httpServer) {
    throw new Error('startWebSocket requires an httpServer instance')
  }

  wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`🔌 WebSocket client connected (${clients.size} total)`)

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`🔌 WebSocket client disconnected (${clients.size} total)`)
    })

    ws.on('error', (err) => {
      console.error('❌ WebSocket client error:', err.message)
    })

    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }))
  })

  wss.on('error', (err) => {
    console.error('❌ WebSocket server error:', err.message)
  })

  console.log('🔌 WebSocket server attached to HTTP server at path /ws')
  return wss
}

export function broadcast(event) {
  if (!wss) return
  const payload = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload)
    }
  }
}

export function closeWebSocket() {
  if (!wss) return Promise.resolve()
  return new Promise((resolve) => {
    wss.close(() => {
      clients.clear()
      console.log('✅ WebSocket server closed')
      resolve()
    })
  })
}

export function getClientCount() {
  return clients.size
}
