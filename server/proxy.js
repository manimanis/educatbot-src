import express from 'express'
import cors from 'cors'
import http from 'http'
import https from 'https'
import { URL } from 'url'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Proxy endpoint for AI API requests
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { endpoint, apiKey, body } = req.body

    if (!endpoint) {
      return res.status(400).json({ error: 'API endpoint is required' })
    }

    // Parse the endpoint URL
    const url = new URL(endpoint)
    const isHttps = url.protocol === 'https:'
    const transport = isHttps ? https : http

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    }

    // Prepare the request options
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: headers
    }

    // Make the request to the external API
    const proxyReq = transport.request(options, (proxyRes) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      // Copy status code from the external API
      res.statusCode = proxyRes.statusCode

      // Copy headers from the external API
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (key !== 'transfer-encoding' && key !== 'connection') {
          res.setHeader(key, value)
        }
      })

      // Forward the response
      proxyRes.pipe(res)
    })

    // Handle errors
    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error)
      res.status(500).json({
        error: 'Proxy request failed',
        message: error.message
      })
    })

    // Send the request body
    proxyReq.write(JSON.stringify(body))
    proxyReq.end()

  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({
      error: 'Internal proxy error',
      message: error.message
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

export default app