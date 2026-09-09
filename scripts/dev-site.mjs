#!/usr/bin/env node
/**
 * Local site gateway: lander + msba + mgm on one origin (default port 5173).
 * Child Vite servers: lander 5174, msba 5175, mgm 5176.
 *
 * Programme packs are selected per Vite process via resolve.alias + PROGRAMME
 * (no shared select-programme.mjs race).
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import httpProxy from 'http-proxy'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GATEWAY_PORT = Number(process.env.DEV_GATEWAY_PORT || 5173)
const LANDER_PORT = 5174
const MSBA_PORT = 5175
const MGM_PORT = 5176

const children = []
const proxy = httpProxy.createProxyServer({ ws: true, xfwd: true })

proxy.on('error', (err, _req, res) => {
  console.error('[gateway] proxy error:', err.message)
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad gateway')
  }
})

function run(label, programme, port) {
  const child = spawn(
    path.join(root, 'node_modules/.bin/vite'),
    ['--port', String(port), '--strictPort'],
    {
      cwd: root,
      env: {
        ...process.env,
        PROGRAMME: programme,
        DEV_SITE_GATEWAY: '1',
        DEV_GATEWAY_PORT: String(GATEWAY_PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  child.stdout.on('data', chunk => process.stdout.write(`[${label}] ${chunk}`))
  child.stderr.on('data', chunk => process.stderr.write(`[${label}] ${chunk}`))
  child.on('exit', code => {
    console.error(`[${label}] exited (${code ?? 'null'})`)
    shutdown(code ?? 1)
  })
  children.push(child)
}

function targetFor(urlPath) {
  if (urlPath.startsWith('/tpghelper/msba')) return `http://127.0.0.1:${MSBA_PORT}`
  if (urlPath.startsWith('/tpghelper/mgm')) return `http://127.0.0.1:${MGM_PORT}`
  return `http://127.0.0.1:${LANDER_PORT}`
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('lander', 'lander', LANDER_PORT)
run('msba', 'msba', MSBA_PORT)
run('mgm', 'mgm', MGM_PORT)

const server = http.createServer((req, res) => {
  const urlPath = req.url || '/'
  proxy.web(req, res, { target: targetFor(urlPath) })
})

server.on('upgrade', (req, socket, head) => {
  const urlPath = req.url || '/'
  proxy.ws(req, socket, head, { target: targetFor(urlPath) })
})

server.listen(GATEWAY_PORT, () => {
  console.log(`\n[gateway] http://localhost:${GATEWAY_PORT}/tpghelper/`)
  console.log(`[gateway]   /tpghelper/msba/ → :${MSBA_PORT}`)
  console.log(`[gateway]   /tpghelper/mgm/  → :${MGM_PORT}\n`)
})
