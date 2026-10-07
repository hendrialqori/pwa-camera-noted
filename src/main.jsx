import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker gagal didaftarkan:", error);
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" richColors closeButton />
  </StrictMode>,
);
