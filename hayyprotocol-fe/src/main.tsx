import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress Lit dev mode warning (Wagmi/Viem Residu)
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  const message = args[0]?.toString() || '';
  // Suppress Lit dev mode warning
  if (message.includes('Lit is in dev mode')) return;
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
