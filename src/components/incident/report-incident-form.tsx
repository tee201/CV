"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { processPhoto } from "@/lib/image/process-photo";
import { INCIDENT_TYPE_LABELS, INCIDENT_URGENCY_LABELS } from "@/lib/incident/types";
import type { IncidentType, IncidentUrgency } from "@/types/database";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const MAX_PHOTOS = 5;

interface PendingPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
}

function nowForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ReportIncidentForm({ driverId }: { driverId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    try {
      const blob = await processPhoto(file);
      setPhotos((prev) => [...prev, { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob) }]);
    } catch {
      setError("Could not read that photo. Try again.");
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: incident, error: insertError } = await supabase
        .from("incidents")
        .insert({
          driver_id: driverId,
          incident_type: formData.get("incident_type") as IncidentType,
          occurred_at: new Date(String(formData.get("occurred_at"))).toISOString(),
          location: String(formData.get("location")),
          description: String(formData.get("description")),
          urgency: formData.get("urgency") as IncidentUrgency,
        })
        .select("id")
        .single();

      if (insertError || !incident) {
        setError("Could not submit the report. Please try again.");
        return;
      }

      let failedPhotos = 0;
      for (const [index, photo] of photos.entries()) {
        const path = `${driverId}/${incident.id}/${index}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("incident-photos")
          .upload(path, photo.blob, { contentType: "image/jpeg" });

        if (uploadError) {
          failedPhotos++;
          continue;
        }

        const { error: photoInsertError } = await supabase
          .from("incident_photos")
          .insert({ incident_id: incident.id, storage_path: path, uploaded_by: driverId });
        if (photoInsertError) failedPhotos++;
      }

      if (failedPhotos > 0) {
        setError(
          `Your report was submitted, but ${failedPhotos} photo${failedPhotos > 1 ? "s" : ""} failed to upload. You can't add photos to this report later — mention it to your manager if the photos mattered.`,
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/incidents");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="incident_type" className="text-sm font-medium text-slate-700">
          Incident type
        </label>
        <select
          id="incident_type"
          name="incident_type"
          required
          disabled={isSubmitting}
          className="min-h-12 rounded-xl border border-slate-300 px-4 text-base"
        >
          {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label="When did it happen?"
        name="occurred_at"
        type="datetime-local"
        required
        defaultValue={nowForInput()}
        max={nowForInput()}
        disabled={isSubmitting}
      />

      <TextField label="Location" name="location" placeholder="e.g. A40 near junction 3" required disabled={isSubmitting} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">
          What happened?
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          disabled={isSubmitting}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="urgency" className="text-sm font-medium text-slate-700">
          Urgency
        </label>
        <select
          id="urgency"
          name="urgency"
          required
          defaultValue="medium"
          disabled={isSubmitting}
          className="min-h-12 rounded-xl border border-slate-300 px-4 text-base"
        >
          {Object.entries(INCIDENT_URGENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Photos (optional)</span>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                disabled={isSubmitting}
                onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                &times;
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-2xl text-slate-400"
              aria-label="Add photo"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFileSelected(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
