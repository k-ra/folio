import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { folioApi } from './server/devApi'

export default defineConfig({
  plugins: [react(), folioApi()],
})
