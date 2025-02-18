import { defineConfig } from 'vite'
import { glob } from 'glob'

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
          ...Object.fromEntries(
            glob.sync('src/assets/frames/*/*.{webp}').map(file => {
              const folder = file.split('/')[3] // either 'mobile' or 'desktop'
              return [`images-${folder}`, [file]]
            })
          )
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