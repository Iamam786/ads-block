"use client";

import { useEffect } from "react";
import PWAInstallPrompt from "./PWAInstallPrompt";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        // Safe warning on registration failure
        console.debug("Service worker registration info:", error);
      }
    };

    void registerWorker();
  }, []);

  return <PWAInstallPrompt />;
}
