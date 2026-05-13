/**
 * Custom Next.js server with integrated Socket.IO
 * Handles HTTP requests via Next.js and real-time events via Socket.IO
 */
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'

const dev      = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port     = parseInt(process.env.PORT || '3000', 10)

const app    = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      const parsedUrl = parse(req.url ?? '/', true)
      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Request error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // ── Socket.IO setup ──────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Store globally so Next.js API routes can emit events
  ;(global as any).__io = io

  io.on('connection', (socket) => {
    // Client joins a department room to receive its queue updates
    socket.on('join:department', (deptId: string) => {
      socket.join(`dept:${deptId}`)
    })

    // Counter room for staff-specific updates
    socket.on('join:counter', (counterId: string) => {
      socket.join(`counter:${counterId}`)
    })

    // Admin room for full system visibility
    socket.on('join:admin', () => {
      socket.join('admin')
    })

    // Public display room
    socket.on('join:display', () => {
      socket.join('display')
    })

    socket.on('disconnect', () => {
      // rooms are auto-cleaned by Socket.IO
    })
  })

  // ── Start ────────────────────────────────────────────────
  httpServer.listen(port, hostname, () => {
    const line = '─'.repeat(44)
    console.log(`\n  ┌${line}┐`)
    console.log(`  │  🎟  SynQueue — Enterprise Queue System         │`)
    console.log(`  ├${line}┤`)
    console.log(`  │  App       http://${hostname}:${port}${'                         '.slice(`${hostname}:${port}`.length)}│`)
    console.log(`  │  Queue     http://${hostname}:${port}/queue${'                   '.slice(`${hostname}:${port}/queue`.length)}│`)
    console.log(`  │  Display   http://${hostname}:${port}/display${'                 '.slice(`${hostname}:${port}/display`.length)}│`)
    console.log(`  │  Admin     http://${hostname}:${port}/admin${'                   '.slice(`${hostname}:${port}/admin`.length)}│`)
    console.log(`  │  Staff     http://${hostname}:${port}/staff${'                   '.slice(`${hostname}:${port}/staff`.length)}│`)
    console.log(`  └${line}┘\n`)
  })
})
