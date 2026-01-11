import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Log platform for debugging
console.log('[App] Platform:', Capacitor.getPlatform(), 'Native:', Capacitor.isNativePlatform());

createRoot(document.getElementById("root")!).render(<App />);
