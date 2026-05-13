// Legacy custom server — kept for Railway/self-hosted deployments.
// Vercel uses next start directly; this file is not used in that case.
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'
import next from 'next'

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

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
