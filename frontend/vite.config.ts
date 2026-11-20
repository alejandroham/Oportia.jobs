import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone el servidor a la red local (iPhone, iPad, etc.)
    port: 3000,
    // PRIVACY.md y TERMINOS.md están en la raíz del repositorio (los muestra /privacidad y /terminos).
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), '..'] },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
