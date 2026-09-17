import { loadEnv, type Plugin } from 'vite'
import { apiHandler } from './routes.js'

export function folioApi(): Plugin {
  return {
    name: 'folio-api',
    configureServer(server) {
      const env = {
        ...loadEnv(server.config.mode, server.config.root, ''),
        ...process.env,
      }
      const handle = apiHandler(env, server.config.root)
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        void handle(req, res)
      })
    },
  }
}
