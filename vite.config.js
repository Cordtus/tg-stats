import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    open: false,
    allowedHosts: ['tgstats.basementnodes.ca']
  },
  esbuild: {
    loader: 'jsx',
    include: /\.[jt]sx?$/
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
})
