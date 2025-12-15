import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ command }) => {
  if (command === 'build') {
    // Library build configuration
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
          rollupTypes: true,
          copyDtsFiles: false,
          outDir: 'dist',
          include: ['src/**/*'],
          exclude: ['test/**/*', 'demo/**/*', 'node_modules/**/*'],
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'KeyboardHistory',
          formats: ['es', 'umd'],
          fileName: (format) => `keyboard-history.${format}.js`,
        },
        rollupOptions: {
          // No external dependencies for this library
          external: [],
          output: {
            // Global variable name for UMD build
            globals: {},
            // Ensure proper exports for both formats
            exports: 'named',
            // Add source maps for debugging
            sourcemap: true,
          },
        },
        // Target modern browsers but maintain compatibility
        target: 'es2015',
        // Minify the output
        minify: 'terser',
        // Generate source maps
        sourcemap: true,
        // Clean dist directory before build
        emptyOutDir: true,
      },
    }
  } else {
    // Development server configuration for demo
    return {
      root: 'demo',
      publicDir: '../public',
      server: {
        port: 3000,
        open: true,
      },
    }
  }
})