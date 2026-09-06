"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app still works, it just won't be installable /
        // offline-tolerant for the shell. Never let a failed registration
        // block the app from loading.
      });
    }
  }, []);

  return null;
}
