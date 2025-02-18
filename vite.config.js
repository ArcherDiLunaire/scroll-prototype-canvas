import { defineConfig } from 'vite'

export default defineConfig({
  base: "./",
  root: '',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'gsap': ['gsap'],
          'vendor': ['gsap/ScrollTrigger'],
          
          // Split image chunks by folders
          'images-mobile': ['./src/assets/frames/mobile/'],
          'images-desktop': ['./src/assets/frames/desktop/'],
        }
      }
    },
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096, // 4kb
    
    // Image optimization
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger']
    }
  },
  // Cache optimization
  server: {
    fs: {
      strict: true
    },
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  }
})