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
    // Use relative paths for all assets
    base: './',
    
    plugins: [
      react(),
      // Inject CSS into JS for library mode
      cssInjectedByJsPlugin(),
      // Custom plugin to copy index.html and inject config
      isFullBuild && {
        name: 'copy-index-html-and-inject-config',
        closeBundle: () => {
          const srcHtml = path.resolve(__dirname, 'index.html');
          const destDir = path.resolve(__dirname, 'dist');
          const destHtml = path.resolve(destDir, 'index.html');
          const configPath = path.resolve(__dirname, 'default-config.json');

          if (fs.existsSync(srcHtml) && fs.existsSync(configPath)) {
            // Ensure the dist directory exists
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            // Read the config file
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            // Read the HTML file
            let htmlContent = fs.readFileSync(srcHtml, 'utf8');
            
            // Replace the placeholder in the script tag with actual JSON content
            htmlContent = htmlContent.replace(
              /<script id="dialogue-foundry-config" type="application\/json">[\s\S]*?<\/script>/,
              `<script id="dialogue-foundry-config" type="application/json">${configContent}</script>`
            );
            
            // Write the updated HTML to the dist directory
            fs.writeFileSync(destHtml, htmlContent);
            console.log('✅ Copied index.html and injected config');
          } else {
            console.warn('⚠️ index.html or default-config.json not found');
          }
        }
      },
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
      // Custom plugin to copy default-config.json to output
      isFullBuild && {
        name: 'copy-default-config-json',
        closeBundle: () => {
          // Check if default-config.json exists in the root directory
          const srcConfigJson = path.resolve(__dirname, 'default-config.json');
          const destDir = path.resolve(__dirname, 'dist');
          const destConfigJson = path.resolve(destDir, 'default-config.json');
          const htmlFile = path.resolve(destDir, 'index.html');

          if (fs.existsSync(srcConfigJson) && fs.existsSync(htmlFile)) {
            try {
              // Read the config file
              const configContent = fs.readFileSync(srcConfigJson, 'utf8');
              
              // Read the HTML file
              let htmlContent = fs.readFileSync(htmlFile, 'utf8');
              
              // Replace the placeholder in the script tag with actual JSON content
              htmlContent = htmlContent.replace(
                /<script id="dialogue-foundry-config" type="application\/json">[\s\S]*?<\/script>/,
                `<script id="dialogue-foundry-config" type="application/json">${configContent}</script>`
              );
              
              // Write updated HTML back
              fs.writeFileSync(htmlFile, htmlContent);
              console.log('✅ Injected config JSON into index.html');
            } catch (error) {
              console.error('❌ Error processing config file:', error);
            }
          } else {
            console.warn('⚠️ default-config.json or index.html not found');
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
      },
      // Plugin to make sure the index.js reference is relative
      isFullBuild && {
        name: 'ensure-relative-paths',
        closeBundle: () => {
          // Path to the output HTML file
          const htmlFile = path.resolve(__dirname, 'dist', 'index.html');
          
          if (fs.existsSync(htmlFile)) {
            // Read the HTML file
            let htmlContent = fs.readFileSync(htmlFile, 'utf8');
            
            // Change any absolute JS script paths to relative ones
            if (htmlContent.includes('src="/index.js"')) {
              htmlContent = htmlContent.replace(
                'src="/index.js"',
                'src="./index.js"'
              );
              
              // Write the updated HTML back
              fs.writeFileSync(htmlFile, htmlContent);
              console.log('✅ Changed index.js path to relative in index.html');
            }
            
            // Also fix src/index.tsx references
            if (htmlContent.includes('src="./src/index.tsx"')) {
              htmlContent = htmlContent.replace(
                'src="./src/index.tsx"',
                'src="./index.js"'
              );
              
              // Write the updated HTML back
              fs.writeFileSync(htmlFile, htmlContent);
              console.log('✅ Changed src/index.tsx path to ./index.js in index.html');
            }
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
          main: resolve(__dirname, 'src/index.tsx'),
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
        },
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
        },
      },
      cssCodeSplit: false,
      copyPublicDir: false,
    }
  }
}) 