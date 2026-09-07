// Human-readable labels for the action/entity_type strings written by the
// audit triggers (supabase/migrations/0002, 0004, 0009, 0012, 0013). An
// action not listed here (e.g. a new trigger added later) falls back to the
// raw string rather than disappearing, so the log never silently drops rows.
const ACTION_LABELS: Record<string, string> = {
  "shift.created": "Shift created",
  "shift.updated": "Shift updated",
  "shift.deleted": "Shift deleted",
  "driver.deactivated": "Driver deactivated",
  "driver.reactivated": "Driver reactivated",
  "holiday.requested": "Holiday requested",
  "holiday.approved": "Holiday approved",
  "holiday.rejected": "Holiday rejected",
  "incident.status_changed": "Incident status changed",
  "announcement.created_important": "Important announcement published",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  shift: "Shift",
  profile: "Driver profile",
  holiday_request: "Holiday request",
  incident: "Incident",
  announcement: "Announcement",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function auditEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}
