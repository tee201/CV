// Reduces an audit row's before/after jsonb into just the fields that
// changed, so the UI shows "status: pending -> approved" instead of
// re-printing every column on the row for a one-field update.
export interface FieldChange {
  key: string;
  before: unknown;
  after: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function diffFields(before: unknown, after: unknown): FieldChange[] {
  const beforeObj = isRecord(before) ? before : null;
  const afterObj = isRecord(after) ? after : null;

  if (!beforeObj && !afterObj) return [];
  if (!beforeObj && afterObj) {
    return Object.entries(afterObj).map(([key, value]) => ({ key, before: undefined, after: value }));
  }
  if (beforeObj && !afterObj) {
    return Object.entries(beforeObj).map(([key, value]) => ({ key, before: value, after: undefined }));
  }

  const keys = new Set([...Object.keys(beforeObj!), ...Object.keys(afterObj!)]);
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const beforeValue = beforeObj![key];
    const afterValue = afterObj![key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({ key, before: beforeValue, after: afterValue });
    }
  }
  return changes;
}

export function formatFieldValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
