import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for push notifications + offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[App] Service Worker registered, scope:', reg.scope);
    }).catch((err) => {
      console.warn('[App] Service Worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
