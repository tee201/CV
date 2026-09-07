"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NewHolidayRequestForm } from "@/components/holiday/new-request-form";

export function NewRequestToggle() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button fullWidth onClick={() => setOpen(true)}>
        Request holiday
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <NewHolidayRequestForm
        onSubmitted={() => {
          setOpen(false);
          router.refresh();
        }}
      />
      <button type="button" onClick={() => setOpen(false)} className="mt-3 text-sm text-slate-500">
        Cancel
      </button>
    </div>
  );
}
