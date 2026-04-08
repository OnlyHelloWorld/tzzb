import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://34.142.144.123',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    base: '/',
    // 目标浏览器兼容性
    target: 'es2015',
    // 生成更小的代码
    minify: 'esbuild',
    // 生成 source map 便于调试
    sourcemap: false,
    // 确保代码被正确转译
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // ESBuild 配置，确保转译到 ES2015
  esbuild: {
    target: 'es2015'
  }
})
