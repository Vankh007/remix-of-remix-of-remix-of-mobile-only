import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA (only on web)
// Use VitePWA helper so updates apply immediately (prevents old cached UI after redirects/login).
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Auto-apply the new service worker and reload to the latest build
      updateSW(true);
    },
    onOfflineReady() {
      console.log('PWA offline ready');
    },
  });
}

// Log platform for debugging
console.log('[App] Platform:', Capacitor.getPlatform(), 'Native:', Capacitor.isNativePlatform());

createRoot(document.getElementById("root")!).render(<App />);

