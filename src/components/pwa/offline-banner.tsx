"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Visible, honest connectivity indicator. Nothing in this app queues writes
// while offline, so drivers need to know immediately when actions like
// Start Shift / End Shift / photo upload will fail. useSyncExternalStore
// (rather than state + effect) avoids a hydration mismatch: the server
// snapshot is always "online" since navigator doesn't exist server-side.
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (isOnline) return null;

  return (
    <div role="status" className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
      You&apos;re offline. Starting/ending a shift and photo uploads won&apos;t work until you reconnect.
    </div>
  );
}
