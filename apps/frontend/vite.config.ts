import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => {
  const isProd = command === 'build'
  
  return {
    define: {
      // This is critical - forces React to use production builds
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    },
    
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
      conditions: isProd ? ['production'] : ['development'],
    },
    
    plugins: [
      react(),
      tailwindcss(),
      cssInjectedByJsPlugin(),
    ],
    
    server: { port: 3001 },
    
    build: {
      outDir: 'dist',
      sourcemap: !isProd,
      lib: {
        entry: resolve(__dirname, 'src/index.tsx'),
        name: 'DialogueFoundry',
        fileName: 'index',
        formats: ['es']
      },
      rollupOptions: {

        // Try to split out large dependencies
        onwarn(warning, warn) {
          // Suppress certain warnings
          if (warning.code === 'CIRCULAR_DEPENDENCY') return
          if (warning.code === 'THIS_IS_UNDEFINED') return
          warn(warning)
        },
        output: {
          entryFileNames: 'index.js',
          manualChunks: () => 'index', // Bundle everything into single file
          // Better compression
          compact: true,
        },
        treeshake: {
          moduleSideEffects: false,
          preset: 'recommended'
        },
      },
      cssCodeSplit: false,
      copyPublicDir: false,
      // Target modern browsers for smaller output
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    }
  }
}) 