import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig(({ command }) => {
  const isProd = command === 'build'
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Always use CSS injected by JS plugin for JS-only output
      cssInjectedByJsPlugin(),
    ],
    server: {
      port: 3001
    },
    css: {
      // Enable CSS modules for component styles
      modules: {
        // Allow .css files to be imported without .module in the name
        localsConvention: 'camelCase',
      }
    },
    // Build configuration for JS-only output
    build: {
      // Library mode configuration - JS output with no HTML
      lib: {
        entry: resolve(__dirname, 'src/index.tsx'),
        name: 'DialogueFoundry',
        fileName: 'index'
      },
      rollupOptions: {
        // Make React external so it's not included in the bundle
        external: ['react', 'react-dom'],
        output: {
          // Global variables to use in UMD build for externalized deps
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          },
          // Output configuration
          entryFileNames: 'index.js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: (assetInfo) => {
            // Make sure to handle undefined name
            if (!assetInfo.name) return 'assets/[name].[ext]';
            
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            
            // Place all assets in assets folder
            return 'assets/[name].[ext]';
          }
        }
      },
      // Ensure CSS is inlined into JS
      cssCodeSplit: false,
      // Don't generate source maps in production
      sourcemap: !isProd,
      // Don't copy public directory assets
      copyPublicDir: false
    }
  }
}) 