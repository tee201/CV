"use client";

import { useRef } from "react";
import { clsx } from "@/lib/clsx";

export type PhotoTileStatus = "empty" | "selected" | "uploading" | "uploaded" | "error";

export interface PhotoTileState {
  status: PhotoTileStatus;
  previewUrl?: string;
  error?: string;
}

interface PhotoCaptureTileProps {
  label: string;
  helpText: string;
  state: PhotoTileState;
  disabled?: boolean;
  onSelectFile: (file: File) => void;
}

export function PhotoCaptureTile({ label, helpText, state, disabled, onSelectFile }: PhotoCaptureTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={clsx(
        "rounded-xl border-2 p-3",
        state.status === "error" && "border-red-400 bg-red-50",
        state.status === "uploaded" && "border-green-400 bg-green-50",
        state.status !== "error" && state.status !== "uploaded" && "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || state.status === "uploading"}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400",
            "disabled:cursor-not-allowed",
          )}
          aria-label={`Capture photo: ${label}`}
        >
          {state.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <CameraIcon className="h-8 w-8" />
          )}
        </button>

        <div className="flex-1">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{helpText}</p>
          <StatusLabel state={state} />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelectFile(file);
        }}
      />

      {state.status !== "empty" && state.status !== "uploading" && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-sm font-medium text-blue-600 disabled:text-slate-300"
        >
          {state.status === "error" ? "Retry" : "Retake"}
        </button>
      )}
    </div>
  );
}

function StatusLabel({ state }: { state: PhotoTileState }) {
  if (state.status === "uploading") return <p className="mt-1 text-xs font-medium text-blue-600">Uploading…</p>;
  if (state.status === "uploaded") return <p className="mt-1 text-xs font-medium text-green-700">Saved</p>;
  if (state.status === "error") return <p className="mt-1 text-xs font-medium text-red-700">{state.error}</p>;
  if (state.status === "selected") return <p className="mt-1 text-xs font-medium text-slate-500">Ready to submit</p>;
  return <p className="mt-1 text-xs text-slate-400">Not taken yet</p>;
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
