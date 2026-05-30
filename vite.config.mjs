import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      isProduction && obfuscator({
        options: {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          numbersToExpressions: true,
          simplify: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          splitStrings: true,
          splitStringsChunkLength: 10,
          rotateStringArray: true,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          debugProtection: true,
          debugProtectionInterval: 4000,
          disableConsoleOutput: true,
          selfDefending: true,
        },
      }),
    ].filter(Boolean),
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
