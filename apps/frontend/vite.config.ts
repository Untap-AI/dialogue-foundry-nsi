import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import * as fs from 'fs'
import * as path from 'path'

export default defineConfig(({ command, mode }) => {
  const isProd = command === 'build'
  const isFullBuild = process.env.BUILD_MODE === 'full'
  
  return {
    plugins: [
      react(),
      // Inject CSS into JS for library mode
      cssInjectedByJsPlugin(),
      // Custom plugin to copy index.css directly to output for full build
      isFullBuild && {
        name: 'copy-index-css',
        closeBundle: () => {
          // Check if index.css exists in the root directory
          const srcIndexCss = path.resolve(__dirname, 'index.css');
          const destDir = path.resolve(__dirname, 'dist');
          const destIndexCss = path.resolve(destDir, 'index.css');

          if (fs.existsSync(srcIndexCss)) {
            // Ensure the dist directory exists
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            // Copy root/index.css to dist/index.css
            fs.copyFileSync(srcIndexCss, destIndexCss);
            console.log('✅ Copied index.css to dist/index.css');
          } else {
            console.warn('⚠️ index.css not found in the root directory - no index.css will be generated');
          }
        }
      },
      // Plugin to ensure HTML has CSS reference 
      isFullBuild && {
        name: 'ensure-css-link',
        closeBundle: () => {
          // Path to the output HTML file
          const htmlFile = path.resolve(__dirname, 'dist', 'index.html');
          
          if (fs.existsSync(htmlFile)) {
            // Read the HTML file
            let htmlContent = fs.readFileSync(htmlFile, 'utf8');
            
            // Check if it already has a link to index.css
            if (!htmlContent.includes('href="./index.css"')) {
              // Add CSS link before the closing </head> tag
              htmlContent = htmlContent.replace(
                '</head>',
                '  <link rel="stylesheet" href="./index.css">\n  </head>'
              );
              
              // Write the updated HTML back
              fs.writeFileSync(htmlFile, htmlContent);
              console.log('✅ Added CSS link to index.html');
            } else {
              console.log('✓ index.html already has CSS link');
            }
          } else {
            console.warn('⚠️ index.html not found in dist directory');
          }
        }
      }
    ].filter(Boolean),
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
    build: isFullBuild ? {
      // Full build: index.js, index.html, and index.css
      outDir: 'dist',
      sourcemap: !isProd,
      rollupOptions: {
        onwarn: (warning, warn) => {
          if (warning.code === 'EMPTY_BUNDLE') return;
          warn(warning);
        },
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'index.js',
          chunkFileNames: 'index-chunk.[name].js',
          assetFileNames: (assetInfo) => {
            // Skip .css files - we'll handle index.css separately
            if (assetInfo.name?.endsWith('.css')) {
              return 'ignore.css';
            }
            return 'index-asset.[ext]';
          },
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        },
        external: ['react', 'react-dom'],
      },
      cssCodeSplit: false,
      copyPublicDir: true,
    } : {
      // Library build: only index.js
      outDir: 'dist',
      sourcemap: !isProd,
      lib: {
        entry: resolve(__dirname, 'src/index.tsx'),
        name: 'DialogueFoundry',
        fileName: 'index'
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        },
        external: ['react', 'react-dom'],
      },
      cssCodeSplit: false,
      copyPublicDir: false,
    }
  }
}) 