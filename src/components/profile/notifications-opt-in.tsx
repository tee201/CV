"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { urlBase64ToUint8Array } from "@/lib/push/client";
import { Button } from "@/components/ui/button";

type Status = "unsupported" | "unconfigured" | "checking" | "off" | "on" | "denied";

export function NotificationsOptIn() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!cancelled) setStatus(existing ? "on" : "off");
    }

    check().catch(() => setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setError(null);
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError("This browser returned an incomplete subscription.");
        await subscription.unsubscribe();
        return;
      }

      const { error: saveError } = await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (saveError) {
        await subscription.unsubscribe();
        setError(saveError);
        return;
      }

      setStatus("on");
    } catch {
      setError("Could not enable notifications on this device.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Could not turn off notifications on this device.");
    } finally {
      setIsPending(false);
    }
  }

  if (status === "checking") return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-900">Notifications on this device</h2>

      {status === "unsupported" && (
        <p className="mt-1 text-sm text-slate-500">This browser doesn&apos;t support push notifications.</p>
      )}
      {status === "unconfigured" && (
        <p className="mt-1 text-sm text-slate-500">Push notifications aren&apos;t set up for this app yet.</p>
      )}
      {status === "denied" && (
        <p className="mt-1 text-sm text-slate-500">
          Notifications are blocked for this site in your browser settings. Allow them there to turn this on.
        </p>
      )}
      {(status === "off" || status === "on") && (
        <>
          <p className="mt-1 text-sm text-slate-500">
            {status === "on"
              ? "You'll get alerts here for things like holiday decisions and important announcements."
              : "Get alerts on this device for holiday decisions and important announcements."}
          </p>
          <Button
            fullWidth
            variant={status === "on" ? "secondary" : "primary"}
            disabled={isPending}
            onClick={status === "on" ? handleDisable : handleEnable}
            className="mt-3"
          >
            {isPending ? "Working…" : status === "on" ? "Turn off" : "Enable notifications"}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
