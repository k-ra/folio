import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { magicApi } from './server/magic'
import { backgroundApi } from './server/background'
import { chatApi } from './server/chat'
import { fancyApi } from './server/fancy'

export default defineConfig({
  plugins: [react(), magicApi(), backgroundApi(), chatApi(), fancyApi()],
})
