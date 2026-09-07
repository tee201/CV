"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export function NewAnnouncementToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New announcement</Button>;
  }

  return <AnnouncementForm onDone={() => setOpen(false)} />;
}
