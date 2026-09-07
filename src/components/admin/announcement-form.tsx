"use client";

import { useActionState, useEffect } from "react";
import { createAnnouncement, updateAnnouncement, type ActionState } from "@/lib/actions/announcements";
import type { Announcement } from "@/types/database";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };
const todayStr = () => new Date().toISOString().slice(0, 10);

interface AnnouncementFormProps {
  announcement?: Announcement;
  onDone?: () => void;
}

export function AnnouncementForm({ announcement, onDone }: AnnouncementFormProps) {
  const action = announcement ? updateAnnouncement : createAnnouncement;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {announcement && <input type="hidden" name="id" value={announcement.id} />}

      <TextField label="Title" name="title" defaultValue={announcement?.title} required disabled={isPending} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={announcement?.message}
          required
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <TextField
          label="Publish date"
          name="publish_date"
          type="date"
          defaultValue={announcement?.publish_date ?? todayStr()}
          required
          disabled={isPending}
        />
        <label className="flex items-center gap-2 pb-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="is_important" defaultChecked={announcement?.is_important} disabled={isPending} className="h-5 w-5" />
          Mark as important
        </label>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : announcement ? "Save changes" : "Publish announcement"}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" disabled={isPending} onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
