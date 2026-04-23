import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      console.log('[App] Service Worker registered, scope:', reg.scope);

      setInterval(() => {
        reg.update().catch(() => {});
      }, 5 * 60 * 1000);
    }).catch((err) => {
      console.warn('[App] Service Worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
