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
      cssInjectedByJsPlugin(),
      {
        name: 'css-handler',
        enforce: 'post',
        transformIndexHtml(html) {
          if (!isProd) {
            // In development, add a link to the index.css file
            return html.replace(
              /<\/title>/,
              `</title>\n    <link rel="stylesheet" href="./index.css">`
            );
          }
        }
      }
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
    // Add build configuration
    build: {
      // Disable generating HTML files
      manifest: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main.tsx') // Adjust this path to your entry point
        },
        output: {
          // Don't generate HTML
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          // Skip HTML file generation
          manualChunks: undefined
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