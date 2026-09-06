"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { processPhoto } from "@/lib/image/process-photo";
import { REQUIRED_PHOTO_CATEGORIES } from "@/lib/shift/photo-categories";
import type { PhotoCategory } from "@/types/database";
import { PhotoCaptureTile, type PhotoTileState } from "@/components/shift/photo-capture-tile";
import { Button } from "@/components/ui/button";

interface VehicleInspectionCaptureProps {
  inspectionId: string;
  driverId: string;
  submitLabel: string;
  onComplete: () => Promise<void>;
}

type TileMap = Record<PhotoCategory, PhotoTileState & { blob?: Blob }>;

const EMPTY_TILES: TileMap = {
  cab: { status: "empty" },
  rear: { status: "empty" },
  cargo: { status: "empty" },
};

export function VehicleInspectionCapture({
  inspectionId,
  driverId,
  submitLabel,
  onComplete,
}: VehicleInspectionCaptureProps) {
  const [tiles, setTiles] = useState<TileMap>(EMPTY_TILES);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allSelected = REQUIRED_PHOTO_CATEGORIES.every(
    ({ category }) => tiles[category].status === "selected" || tiles[category].status === "uploaded",
  );

  function handleSelectFile(category: PhotoCategory, file: File) {
    setSubmitError(null);
    processPhoto(file)
      .then((blob) => {
        const previewUrl = URL.createObjectURL(blob);
        setTiles((prev) => ({ ...prev, [category]: { status: "selected", previewUrl, blob } }));
      })
      .catch(() => {
        setTiles((prev) => ({
          ...prev,
          [category]: { status: "error", error: "Could not read that photo. Try again." },
        }));
      });
  }

  async function uploadOne(category: PhotoCategory, blob: Blob): Promise<boolean> {
    const supabase = createClient();
    const path = `${driverId}/${inspectionId}/${category}.jpg`;

    setTiles((prev) => ({ ...prev, [category]: { ...prev[category], status: "uploading" } }));

    const { error: uploadError } = await supabase.storage
      .from("vehicle-inspection-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      setTiles((prev) => ({
        ...prev,
        [category]: { ...prev[category], status: "error", error: "Upload failed — check your connection." },
      }));
      return false;
    }

    const { error: insertError } = await supabase.from("vehicle_inspection_photos").upsert(
      { inspection_id: inspectionId, category, storage_path: path, uploaded_by: driverId },
      { onConflict: "inspection_id,category" },
    );

    if (insertError) {
      setTiles((prev) => ({
        ...prev,
        [category]: { ...prev[category], status: "error", error: "Could not save this photo record." },
      }));
      return false;
    }

    setTiles((prev) => ({ ...prev, [category]: { ...prev[category], status: "uploaded" } }));
    return true;
  }

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let allOk = true;
      for (const { category } of REQUIRED_PHOTO_CATEGORIES) {
        const tile = tiles[category];
        if (tile.status === "uploaded") continue;
        if (!tile.blob) {
          allOk = false;
          continue;
        }
        const ok = await uploadOne(category, tile.blob);
        if (!ok) allOk = false;
      }

      if (!allOk) {
        setSubmitError("Not all photos were saved. Your shift has NOT started/ended — fix the photos above and try again.");
        return;
      }

      const supabase = createClient();
      const { error: completeError } = await supabase.rpc("complete_vehicle_inspection", {
        p_inspection_id: inspectionId,
      });

      if (completeError) {
        setSubmitError("Could not finalise the inspection. Please try again.");
        return;
      }

      try {
        await onComplete();
      } catch (completionError) {
        setSubmitError(
          completionError instanceof Error ? completionError.message : "Something went wrong finishing the shift.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {REQUIRED_PHOTO_CATEGORIES.map(({ category, label, helpText }) => (
        <PhotoCaptureTile
          key={category}
          label={label}
          helpText={helpText}
          state={tiles[category]}
          disabled={isSubmitting}
          onSelectFile={(file) => handleSelectFile(category, file)}
        />
      ))}

      {submitError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </p>
      )}

      <Button fullWidth disabled={!allSelected || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting…" : submitLabel}
      </Button>
    </div>
  );
}
