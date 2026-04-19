/**
 * WebSocket server.
 * Streams real-time events (alerts, CDC changes, pipeline status) to the frontend.
 */

import { WebSocketServer } from 'ws'
import { env } from './config/env.js'

const clients = new Set()
let wss = null

export function startWebSocket() {
  wss = new WebSocketServer({ port: env.WS_PORT })

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

  console.log(`🔌 WebSocket server listening on ws://localhost:${env.WS_PORT}`)
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
