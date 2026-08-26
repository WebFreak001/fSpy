import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  root: 'src/gui',
  // assets/electron/ served at root URL: /icon.svg, /example.fspy, /icon.png
  publicDir: '../../assets/electron',
  build: {
    outDir: '../../build',
    emptyOutDir: true
  },
  plugins: [
    react({ jsxRuntime: 'classic' })
  ],
  define: {
    APP_VERSION: JSON.stringify(pkg.version)
  },
  server: {
    port: 8080
  }
})
