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
      // CSS injected by JS plugin is only needed for library mode
      // For HTML output, we can use regular CSS loading
      process.env.BUILD_MODE === 'library' ? cssInjectedByJsPlugin() : null,
      {
        name: 'css-handler',
        enforce: 'post',
        transformIndexHtml(html) {
          // For both development and production, ensure the CSS file is referenced
          if (process.env.BUILD_MODE !== 'library') {
            // Check if CSS link already exists
            if (!html.includes('<link rel="stylesheet" href="./index.css">') && 
                !html.includes('<link rel="stylesheet" href="/index.css">')) {
              return html.replace(
                /<\/title>/,
                `</title>\n    <link rel="stylesheet" href="./index.css">`
              );
            }
          }
          return html;
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
      // Configure output based on build mode
      ...(process.env.BUILD_MODE === 'library' ? {
        // Library mode - generate JS only, no HTML
        manifest: true,
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/index.tsx')
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]',
            manualChunks: undefined
          }
        },
        // Ensure CSS is inlined into JS for library mode
        cssCodeSplit: false,
        // Don't generate source maps in production
        sourcemap: !isProd,
        // Don't copy public directory assets in library mode
        copyPublicDir: false
      } : {
        // Default mode - generate HTML and normal assets
        outDir: 'dist',
        emptyOutDir: true,
        // Keep CSS code split but put it at root level with JS
        cssCodeSplit: true,
        // Don't add hash to main CSS file for easier referencing
        cssMinify: isProd,
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'index.html')
          },
          output: {
            // Place JS files at the root level next to index.html
            entryFileNames: 'index.js',
            chunkFileNames: 'chunks/[name].[hash].js', // Only put chunks in a subfolder
            assetFileNames: (assetInfo) => {
              // Make sure to handle undefined name
              if (!assetInfo.name) return 'assets/[name].[hash].[ext]';
              
              const info = assetInfo.name.split('.');
              const ext = info[info.length - 1];
              
              // Keep CSS at root level, place other assets in assets folder
              if (ext === 'css') {
                // Main CSS file doesn't need a hash for easier referencing
                if (assetInfo.name.includes('index') || assetInfo.name.includes('main')) {
                  return 'index.css';
                }
                return '[name].[ext]';
              }
              
              return 'assets/[name].[hash].[ext]';
            }
          }
        },
        // Generate source maps in development
        sourcemap: !isProd,
        // Copy public directory assets in HTML mode
        copyPublicDir: true
      })
    }
  }
}) 