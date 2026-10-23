import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // В разработке API крутится отдельно (dotnet run или docker compose) — проксируем, чтобы не возиться с CORS.
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:5080',
    },
  },
})
