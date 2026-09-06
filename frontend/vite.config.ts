import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// @ts-ignore
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), (cesium as any)()],
})


