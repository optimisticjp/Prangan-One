import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host:true so `npm run dev` works out of the box in GitHub Codespaces
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
})
