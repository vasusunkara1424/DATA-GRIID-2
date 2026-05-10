import { WebSocketServer } from 'ws'
import url from 'url'
import { registerCDCSubscriber, unregisterCDCSubscriber } from '../routes/connectors.js'

export function setupCDCWebSocket(server, options = {}) {
  const { authenticate } = options

  const wss = new WebSocketServer({
    noServer: true,
    path: '/ws/cdc',
  })

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname

    if (pathname === '/ws/cdc') {
      if (authenticate) {
        authenticate(request, {}, err => {
          if (err) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
            socket.destroy()
            return
          }

          wss.handleUpgrade(request, socket, head, ws => {
            handleCDCConnection(ws, request)
          })
        })
      } else {
        wss.handleUpgrade(request, socket, head, ws => {
          handleCDCConnection(ws, request)
        })
      }
    }
  })

  return wss
}

function handleCDCConnection(ws, request) {
  const clientId = generateClientId()
  const subscriptions = new Set()

  console.log(`[WebSocket] CDC client connected: ${clientId}`)

  ws.send(
    JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId,
      message: 'Connected to CDC stream',
    })
  )

  ws.on('message', data => {
    try {
      const message = JSON.parse(data)
      handleCDCMessage(ws, message, subscriptions, clientId)
    } catch (err) {
      console.error(`[WebSocket] Parse error (${clientId}):`, err.message)
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      )
    }
  })

  ws.on('close', () => {
    console.log(`[WebSocket] CDC client disconnected: ${clientId}`)
    subscriptions.forEach(connectorId => {
      unregisterCDCSubscriber(connectorId, ws)
    })
  })

  ws.on('error', err => {
    console.error(`[WebSocket] Error (${clientId}):`, err.message)
  })
}

function handleCDCMessage(ws, message, subscriptions, clientId) {
  const { type, connectorId } = message

  switch (type) {
    case 'subscribe':
      handleSubscribe(ws, connectorId, subscriptions, clientId)
      break

    case 'unsubscribe':
      handleUnsubscribe(connectorId, subscriptions, clientId)
      break

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    default:
      console.log(`[WebSocket] Unknown message type: ${type}`)
  }
}

function handleSubscribe(ws, connectorId, subscriptions, clientId) {
  if (!connectorId) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'connectorId required for subscription',
      })
    )
    return
  }

  registerCDCSubscriber(connectorId, ws)
  subscriptions.add(connectorId)

  console.log(`[WebSocket] Client ${clientId} subscribed to connector ${connectorId}`)

  ws.send(
    JSON.stringify({
      type: 'subscribed',
      connectorId,
      message: `Subscribed to CDC events for connector ${connectorId}`,
    })
  )
}

function handleUnsubscribe(connectorId, subscriptions, clientId) {
  if (!connectorId) return

  subscriptions.delete(connectorId)
  console.log(`[WebSocket] Client ${clientId} unsubscribed from connector ${connectorId}`)
}

function generateClientId() {
  return Math.random().toString(36).substring(2, 11)
}
