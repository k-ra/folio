import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { folioApi } from './server/devApi'
import { readerBundle } from './server/readerBundle'

export default defineConfig({
  plugins: [react(), folioApi(), readerBundle()],
})
