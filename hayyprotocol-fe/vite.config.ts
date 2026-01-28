import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Suppress Lit dev mode warning
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  optimizeDeps: {
    include: [
      '@stacks/connect',
      '@stacks/transactions',
      '@stacks/network'
    ],
    exclude: ['lit'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    force: true
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Don't externalize stacks packages in development
        return false;
      }
    }
  }
}));
