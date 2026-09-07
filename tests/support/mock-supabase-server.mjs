// A minimal hand-written stand-in for the Supabase Auth/PostgREST/Storage
// HTTP APIs, used ONLY so the Playwright suite can drive the real app code
// (real Server Actions, real Supabase client calls, real service worker)
// end-to-end without a network dependency on an actual Supabase project.
//
// IMPORTANT — what this does NOT do: it does not implement Row Level
// Security. Every table here is readable/writable by any authenticated
// (or even unauthenticated, for most tables) request, filtered only by
// whatever query params the client happens to send. That means a test
// suite run against this mock can prove the *application* code path works
// (a driver's UI only ever asks for their own rows, an admin action checks
// role before calling, etc.) but it CANNOT prove the *database* would stop
// a driver who queried directly for someone else's data. That guarantee
// comes entirely from the RLS policies in supabase/migrations/, and is only
// meaningfully tested against a real Supabase project — see
// tests/e2e/rls-isolation.spec.ts, which is skipped unless one is
// configured.
//
// Implements exactly the requests this app's code makes — not a general
// PostgREST reimplementation.
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 5555);
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function iso(daysFromToday) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

// Fixed test accounts. Passwords are throwaway values used only against
// this in-memory mock — never real credentials.
export const TEST_USERS = {
  driver1: { id: "1783b283-7432-4163-b230-81fcbfe3c21d", email: "jamie.rivera@example.com", password: "password123", full_name: "Jamie Rivera" },
  driver2: { id: "1655a52e-d0b1-4bfe-b743-1548bead3a75", email: "alex.chen@example.com", password: "password123", full_name: "Alex Chen" },
  admin: { id: "30f5dd98-9dae-420a-a01b-d971199848b5", email: "sam.okafor@example.com", password: "password123", full_name: "Sam Okafor" },
  deactivatedDriver: { id: "508b7ddb-18cb-4f4a-9902-0a6db4e09b45", email: "priya.nair@example.com", password: "password123", full_name: "Priya Nair" },
};

const COMPANY_VEHICLE_ID = "f9a0c580-8931-43a6-91b4-9bf23c27d08e";

function seed() {
  const u = TEST_USERS;
  return {
    users: [u.driver1, u.driver2, u.admin, u.deactivatedDriver],
    profiles: {
      [u.driver1.id]: { id: u.driver1.id, full_name: u.driver1.full_name, email: u.driver1.email, phone: "+447700900001", role: "driver", employment_status: "active", created_at: now(), updated_at: now() },
      [u.driver2.id]: { id: u.driver2.id, full_name: u.driver2.full_name, email: u.driver2.email, phone: "+447700900003", role: "driver", employment_status: "active", created_at: now(), updated_at: now() },
      [u.admin.id]: { id: u.admin.id, full_name: u.admin.full_name, email: u.admin.email, phone: "+447700900002", role: "admin", employment_status: "active", created_at: now(), updated_at: now() },
      [u.deactivatedDriver.id]: { id: u.deactivatedDriver.id, full_name: u.deactivatedDriver.full_name, email: u.deactivatedDriver.email, phone: "+447700900004", role: "driver", employment_status: "inactive", created_at: now(), updated_at: now() },
    },
    company_vehicles: [
      { id: COMPANY_VEHICLE_ID, internal_name: "Van 1", registration: "AB12 CDE", is_active: true, created_at: now(), updated_at: now() },
    ],
    shifts: [],
    attendance_records: [],
    vehicle_inspections: {},
    vehicle_inspection_photos: [],
    holiday_requests: {
      "9658a477-e5ca-49c0-b754-6f692f4d059f": {
        id: "9658a477-e5ca-49c0-b754-6f692f4d059f",
        driver_id: u.driver2.id,
        note: "Pending from fixture — used by the admin-reject test",
        status: "pending",
        admin_id: null,
        admin_response: null,
        decided_at: null,
        created_at: now(),
        updated_at: now(),
      },
    },
    holiday_request_dates: [{ id: uuid(), holiday_request_id: "9658a477-e5ca-49c0-b754-6f692f4d059f", date: iso(10) }],
    notifications: [],
    incidents: {},
    incident_photos: [],
    incident_notes: [],
    announcements: {},
    announcement_acknowledgements: [],
    policy_acknowledgements: [
      { id: uuid(), user_id: u.driver1.id, policy_version: "2026-09-v1", acknowledged_at: now() },
      { id: uuid(), user_id: u.driver2.id, policy_version: "2026-09-v1", acknowledged_at: now() },
      { id: uuid(), user_id: u.admin.id, policy_version: "2026-09-v1", acknowledged_at: now() },
    ],
    push_subscriptions: [],
    audit_logs: [],
    storageObjects: new Map(),
  };
}

let db = seed();

function tokenFor(userId) {
  return `tok_${userId}`;
}
function userIdFromAuth(req) {
  const auth = req.headers["authorization"] || "";
  const m = auth.match(/^Bearer tok_(.+)$/);
  return m ? m[1] : null;
}
function authUserJson(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    phone: "",
    app_metadata: {},
    user_metadata: { full_name: user.full_name },
    created_at: now(),
  };
}
function session(user) {
  return {
    access_token: tokenFor(user.id),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh_${user.id}`,
    user: authUserJson(user),
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// storage-js wraps a Blob upload body in multipart/form-data (field name ""
// for the file itself, plus a cacheControl field) rather than sending raw
// bytes — real Supabase Storage parses that server-side, so this mock has
// to as well, or every uploaded photo is stored as the multipart envelope
// instead of the image.
function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(.+)$/.exec(contentType || "");
  if (!boundaryMatch) return [];
  const boundary = Buffer.from(`--${boundaryMatch[1]}`);
  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const chunk = buffer.slice(start + boundary.length, next);
    const headerEnd = chunk.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headerText = chunk.slice(0, headerEnd).toString("utf8");
      let data = chunk.slice(headerEnd + 4);
      if (data.slice(-2).toString() === "\r\n") data = data.slice(0, -2);
      const nameMatch = /name="([^"]*)"/.exec(headerText);
      parts.push({ name: nameMatch ? nameMatch[1] : "", data });
    }
    start = next;
  }
  return parts;
}

function parseFilters(searchParams) {
  const reserved = new Set(["select", "order", "limit", "offset", "on_conflict"]);
  const filters = [];
  for (const [key, value] of searchParams.entries()) {
    if (reserved.has(key)) continue;
    const parts = value.split(".");
    let op = parts[0];
    let val = parts.slice(1).join(".");
    if (op === "not") {
      op = `not.${parts[1]}`;
      val = parts.slice(2).join(".");
    }
    filters.push({ column: key, op, value: val });
  }
  return filters;
}

function matchRow(row, filters) {
  return filters.every(({ column, op, value }) => {
    const cell = row[column];
    switch (op) {
      case "eq":
        return String(cell) === value;
      case "in": {
        const values = value.replace(/^\(|\)$/g, "").split(",");
        return values.includes(String(cell));
      }
      case "gte":
        return cell !== null && cell !== undefined && cell >= value;
      case "lte":
        return cell !== null && cell !== undefined && cell <= value;
      case "lt":
        return cell !== null && cell !== undefined && cell < value;
      case "gt":
        return cell !== null && cell !== undefined && cell > value;
      case "not.is":
        return value === "null" ? cell !== null && cell !== undefined : true;
      case "is":
        if (value === "null") return cell === null || cell === undefined;
        if (value === "true") return cell === true;
        if (value === "false") return cell === false;
        return true;
      default:
        return true;
    }
  });
}

function applyOrder(rows, orderParam) {
  if (!orderParam) return rows;
  const clauses = orderParam.split(",").map((c) => {
    const [field, dir] = c.split(".");
    return { field, dir: dir || "asc" };
  });
  return [...rows].sort((a, b) => {
    for (const { field, dir } of clauses) {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
    }
    return 0;
  });
}

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,HEAD,OPTIONS,PUT");
  res.setHeader("Access-Control-Allow-Headers", "*");
}

function sendJson(res, status, body) {
  withCors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

// PostgREST (and this mock) honors `.single()`/Accept: vnd.pgrst.object+json
// on writes and reads alike: real PostgREST returns the bare object, not a
// 1-element array, when that header is set — postgrest-js has no
// client-side unwrap for plain `.single()` (only `.maybeSingle()` unwraps
// client-side). Getting this wrong silently hands the caller an array
// where it expects `{id: ...}}`, so `result.id` is `undefined`.
function respondRows(res, req, rows, status) {
  const wantsSingle = (req.headers["accept"] || "").includes("vnd.pgrst.object+json");
  if (wantsSingle) {
    if (rows.length !== 1) {
      return sendJson(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
    }
    return sendJson(res, status, rows[0]);
  }
  return sendJson(res, status, rows);
}

// Matches `alias:profiles!fk_name(full_name)` embed syntax in a select
// string and resolves it generically off whatever `<alias>_id` column the
// row has — covers `driver:profiles!...` (shifts/holidays/incidents) and
// `actor:profiles!...` (audit_logs) without hardcoding a table list.
const PROFILE_EMBED_RE = /(\w+):profiles!\w+\(/g;

function attachEmbeds(rows, selectParam) {
  let out = rows;
  if (selectParam) {
    for (const match of selectParam.matchAll(PROFILE_EMBED_RE)) {
      const alias = match[1];
      const idColumn = `${alias}_id`;
      out = out.map((row) => ({
        ...row,
        [alias]: row[idColumn] ? { full_name: db.profiles[row[idColumn]]?.full_name ?? "Unknown driver" } : null,
      }));
    }
  }
  if (selectParam && selectParam.includes("holiday_request_dates")) {
    out = out.map((row) => ({
      ...row,
      holiday_request_dates: db.holiday_request_dates.filter((d) => d.holiday_request_id === row.id).map((d) => ({ date: d.date })),
    }));
  }
  return out;
}

// Mirrors log_audit_event() / the audit triggers in supabase/migrations/
// 0002, 0004, 0009, 0012, 0013 — called from the same mutation points those
// triggers fire from, so the audit log viewer has something real to show
// when driven against this mock.
function auditLog(actorId, action, entityType, entityId, before, after) {
  db.audit_logs.push({
    id: uuid(),
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before: before ?? null,
    after: after ?? null,
    created_at: now(),
  });
}

function notifyHolidayDecision(request) {
  const dates = db.holiday_request_dates
    .filter((d) => d.holiday_request_id === request.id)
    .map((d) => d.date)
    .sort()
    .join(", ");
  const title = request.status === "approved" ? "Holiday request approved" : "Holiday request rejected";
  const body = [dates, request.admin_response].filter(Boolean).join("\n");
  db.notifications.push({
    id: uuid(),
    user_id: request.driver_id,
    type: "holiday_decision",
    title,
    body: body || null,
    related_type: "holiday_request",
    related_id: request.id,
    read_at: null,
    created_at: now(),
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Test-only control endpoint: reset all mutable state between spec files
  // so one file's writes (a submitted incident, a new shift) can't leak
  // into another's assertions.
  if (path === "/__test__/reset" && req.method === "POST") {
    db = seed();
    return sendJson(res, 200, { ok: true });
  }

  // --- Auth ---
  if (path === "/auth/v1/token" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const user = db.users.find((u) => u.email === body.email && u.password === body.password);
    if (!user) return sendJson(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
    return sendJson(res, 200, session(user));
  }

  if (path === "/auth/v1/user" && req.method === "GET") {
    const uid = userIdFromAuth(req);
    const user = db.users.find((u) => u.id === uid);
    if (!user) return sendJson(res, 401, { error: "invalid_token", error_description: "Invalid token" });
    return sendJson(res, 200, { user: authUserJson(user) });
  }

  if (path === "/auth/v1/logout") {
    return sendJson(res, 204);
  }

  const currentUserId = userIdFromAuth(req);

  // --- REST: profiles ---
  if (path === "/rest/v1/profiles") {
    const filters = parseFilters(url.searchParams);
    const rows = Object.values(db.profiles).filter((r) => matchRow(r, filters));

    if (req.method === "HEAD") {
      withCors(res);
      res.setHeader("Content-Range", `0-${Math.max(rows.length - 1, 0)}/${rows.length}`);
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === "PATCH") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const updated = [];
      for (const row of rows) {
        const before = { ...row };
        Object.assign(row, body, { updated_at: now() });
        updated.push(row);
        if (before.employment_status === "active" && row.employment_status === "inactive") {
          auditLog(
            currentUserId,
            "driver.deactivated",
            "profile",
            row.id,
            { employment_status: "active" },
            { employment_status: "inactive" },
          );
        } else if (before.employment_status === "inactive" && row.employment_status === "active") {
          auditLog(
            currentUserId,
            "driver.reactivated",
            "profile",
            row.id,
            { employment_status: "inactive" },
            { employment_status: "active" },
          );
        }
      }
      return respondRows(res, req, updated, 200);
    }
    return respondRows(res, req, rows, 200);
  }

  // --- REST: shifts ---
  if (path === "/rest/v1/shifts") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.shifts.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      const limit = url.searchParams.get("limit");
      if (limit) rows = rows.slice(0, Number(limit));
      rows = attachEmbeds(rows, url.searchParams.get("select"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), status: "scheduled", end_time: null, created_at: now(), updated_at: now(), ...body };
      db.shifts.push(row);
      auditLog(currentUserId, "shift.created", "shift", row.id, null, row);
      return respondRows(res, req, [row], 201);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      db.shifts = db.shifts.map((r) => {
        if (!matchRow(r, filters)) return r;
        const before = { ...r };
        const after = { ...r, ...body, updated_at: now() };
        auditLog(currentUserId, "shift.updated", "shift", after.id, before, after);
        return after;
      });
      return respondRows(res, req, db.shifts.filter((r) => matchRow(r, filters)), 200);
    }
    if (req.method === "DELETE") {
      const filters = parseFilters(url.searchParams);
      const toDelete = db.shifts.filter((r) => matchRow(r, filters));
      db.shifts = db.shifts.filter((r) => !matchRow(r, filters));
      for (const row of toDelete) auditLog(currentUserId, "shift.deleted", "shift", row.id, row, null);
      return respondRows(res, req, toDelete, 200);
    }
  }

  // --- REST: holiday_requests ---
  if (path === "/rest/v1/holiday_requests") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = Object.values(db.holiday_requests).filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      rows = attachEmbeds(rows, url.searchParams.get("select"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const updated = [];
      for (const id of Object.keys(db.holiday_requests)) {
        const row = db.holiday_requests[id];
        if (!matchRow(row, filters)) continue;
        const before = { ...row };
        Object.assign(row, body, { updated_at: now() });
        updated.push(row);
        if (before.status === "pending" && (row.status === "approved" || row.status === "rejected")) {
          notifyHolidayDecision(row);
          auditLog(
            currentUserId,
            `holiday.${row.status}`,
            "holiday_request",
            row.id,
            { status: before.status },
            { status: row.status, admin_id: row.admin_id, admin_response: row.admin_response },
          );
        }
      }
      return respondRows(res, req, updated, 200);
    }
  }

  // --- REST: notifications ---
  if (path === "/rest/v1/notifications") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.notifications.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      const limit = url.searchParams.get("limit");
      if (limit) rows = rows.slice(0, Number(limit));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      db.notifications = db.notifications.map((r) => (matchRow(r, filters) ? { ...r, ...body } : r));
      return respondRows(res, req, db.notifications.filter((r) => matchRow(r, filters)), 200);
    }
  }

  // --- REST: attendance_records ---
  if (path === "/rest/v1/attendance_records") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.attendance_records.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      rows = attachEmbeds(rows, url.searchParams.get("select"));
      return respondRows(res, req, rows, 200);
    }
  }

  // --- REST: company_vehicles ---
  if (path === "/rest/v1/company_vehicles") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.company_vehicles.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), is_active: true, created_at: now(), updated_at: now(), ...body };
      db.company_vehicles.push(row);
      return respondRows(res, req, [row], 201);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      db.company_vehicles = db.company_vehicles.map((r) => (matchRow(r, filters) ? { ...r, ...body, updated_at: now() } : r));
      return respondRows(res, req, db.company_vehicles.filter((r) => matchRow(r, filters)), 200);
    }
  }

  // --- REST: vehicle_inspection_photos (upsert) ---
  if (path === "/rest/v1/vehicle_inspection_photos" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const entries = Array.isArray(body) ? body : [body];
    for (const entry of entries) {
      const idx = db.vehicle_inspection_photos.findIndex((p) => p.inspection_id === entry.inspection_id && p.category === entry.category);
      const row = { id: uuid(), uploaded_at: now(), ...entry };
      if (idx >= 0) db.vehicle_inspection_photos[idx] = row;
      else db.vehicle_inspection_photos.push(row);
    }
    return respondRows(res, req, entries, 201);
  }

  // --- RPC ---
  if (path === "/rest/v1/rpc/create_vehicle_inspection" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const id = uuid();
    db.vehicle_inspections[id] = {
      id,
      driver_id: currentUserId,
      company_vehicle_id: body.p_company_vehicle_id,
      inspection_type: body.p_inspection_type,
      status: "pending",
      created_at: now(),
      completed_at: null,
    };
    return sendJson(res, 200, id);
  }

  if (path === "/rest/v1/rpc/complete_vehicle_inspection" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const inspection = db.vehicle_inspections[body.p_inspection_id];
    const photos = db.vehicle_inspection_photos.filter((p) => p.inspection_id === body.p_inspection_id);
    const categories = new Set(photos.map((p) => p.category));
    if (!inspection || categories.size < 3) {
      return sendJson(res, 400, { message: "Inspection is missing required photographs" });
    }
    inspection.status = "complete";
    inspection.completed_at = now();
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/rest/v1/rpc/start_shift" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const alreadyActive = db.attendance_records.find((a) => a.driver_id === currentUserId && a.status === "active");
    if (alreadyActive) return sendJson(res, 400, { message: "Driver already has an active attendance record" });

    let companyVehicleId = null;
    if (body.p_vehicle_type === "company") {
      const inspection = db.vehicle_inspections[body.p_start_inspection_id];
      if (!inspection || inspection.status !== "complete") {
        return sendJson(res, 400, { message: "Start inspection is not complete" });
      }
      companyVehicleId = inspection.company_vehicle_id;
    }

    const id = uuid();
    db.attendance_records.push({
      id,
      driver_id: currentUserId,
      shift_id: body.p_shift_id,
      vehicle_type: body.p_vehicle_type,
      company_vehicle_id: companyVehicleId,
      status: "active",
      check_in_at: now(),
      check_out_at: null,
      start_inspection_id: body.p_start_inspection_id,
      end_inspection_id: null,
      created_at: now(),
    });
    return sendJson(res, 200, id);
  }

  if (path === "/rest/v1/rpc/end_shift" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const record = db.attendance_records.find((a) => a.id === body.p_attendance_id && a.driver_id === currentUserId && a.status === "active");
    if (!record) return sendJson(res, 400, { message: "No active attendance record" });

    if (record.vehicle_type === "company") {
      const inspection = db.vehicle_inspections[body.p_end_inspection_id];
      if (!inspection || inspection.status !== "complete") {
        return sendJson(res, 400, { message: "End inspection is not complete" });
      }
    }

    record.status = "completed";
    record.check_out_at = now();
    record.end_inspection_id = body.p_end_inspection_id;
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/rest/v1/rpc/create_holiday_request" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const dates = Array.from(new Set(body.p_dates || []));
    if (dates.length === 0) {
      return sendJson(res, 400, { message: "A holiday request must include at least one date" });
    }
    const id = uuid();
    db.holiday_requests[id] = {
      id,
      driver_id: currentUserId,
      note: body.p_note || null,
      status: "pending",
      admin_id: null,
      admin_response: null,
      decided_at: null,
      created_at: now(),
      updated_at: now(),
    };
    for (const date of dates) {
      db.holiday_request_dates.push({ id: uuid(), holiday_request_id: id, date });
    }
    auditLog(currentUserId, "holiday.requested", "holiday_request", id, null, db.holiday_requests[id]);
    return sendJson(res, 200, id);
  }

  // --- REST: incidents ---
  if (path === "/rest/v1/incidents") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = Object.values(db.incidents).filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      rows = attachEmbeds(rows, url.searchParams.get("select"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const id = uuid();
      const row = { id, status: "new", created_at: now(), updated_at: now(), ...body };
      db.incidents[id] = row;
      return respondRows(res, req, [row], 201);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const updated = [];
      for (const id of Object.keys(db.incidents)) {
        const row = db.incidents[id];
        if (!matchRow(row, filters)) continue;
        const beforeStatus = row.status;
        Object.assign(row, body, { updated_at: now() });
        updated.push(row);
        if (body.status && body.status !== beforeStatus) {
          auditLog(currentUserId, "incident.status_changed", "incident", row.id, { status: beforeStatus }, { status: row.status });
        }
      }
      return respondRows(res, req, updated, 200);
    }
  }

  if (path === "/rest/v1/incident_photos") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.incident_photos.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), uploaded_at: now(), ...body };
      db.incident_photos.push(row);
      return respondRows(res, req, [row], 201);
    }
  }

  if (path === "/rest/v1/incident_notes") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = db.incident_notes.filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), created_at: now(), ...body };
      db.incident_notes.push(row);
      return respondRows(res, req, [row], 201);
    }
  }

  // --- REST: announcements ---
  if (path === "/rest/v1/announcements") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      let rows = Object.values(db.announcements).filter((r) => matchRow(r, filters));
      rows = applyOrder(rows, url.searchParams.get("order"));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const id = uuid();
      const row = { id, created_at: now(), updated_at: now(), ...body };
      db.announcements[id] = row;
      if (row.is_important) {
        auditLog(currentUserId, "announcement.created_important", "announcement", id, null, row);
      }
      return respondRows(res, req, [row], 201);
    }
    if (req.method === "PATCH") {
      const filters = parseFilters(url.searchParams);
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const updated = [];
      for (const id of Object.keys(db.announcements)) {
        const row = db.announcements[id];
        if (!matchRow(row, filters)) continue;
        Object.assign(row, body, { updated_at: now() });
        updated.push(row);
      }
      return respondRows(res, req, updated, 200);
    }
    if (req.method === "DELETE") {
      const filters = parseFilters(url.searchParams);
      const toDelete = Object.values(db.announcements).filter((r) => matchRow(r, filters));
      for (const row of toDelete) delete db.announcements[row.id];
      return respondRows(res, req, toDelete, 200);
    }
  }

  if (path === "/rest/v1/announcement_acknowledgements") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      const rows = db.announcement_acknowledgements.filter((r) => matchRow(r, filters));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), acknowledged_at: now(), ...body };
      db.announcement_acknowledgements.push(row);
      return respondRows(res, req, [row], 201);
    }
  }

  // --- REST: policy_acknowledgements ---
  if (path === "/rest/v1/policy_acknowledgements") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      const rows = db.policy_acknowledgements.filter((r) => matchRow(r, filters));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const row = { id: uuid(), acknowledged_at: now(), ...body };
      db.policy_acknowledgements.push(row);
      return respondRows(res, req, [row], 201);
    }
  }

  // --- REST: push_subscriptions ---
  if (path === "/rest/v1/push_subscriptions") {
    if (req.method === "GET") {
      const filters = parseFilters(url.searchParams);
      const rows = db.push_subscriptions.filter((r) => matchRow(r, filters));
      return respondRows(res, req, rows, 200);
    }
    if (req.method === "POST") {
      // supabase-js .upsert({...}, {onConflict:"endpoint"}) issues POST with
      // a Prefer: resolution=merge-duplicates header rather than a separate
      // verb — real PostgREST does the insert-or-update in one statement
      // server-side, so this mock does the same.
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const existingIdx = db.push_subscriptions.findIndex((r) => r.endpoint === body.endpoint);
      let row;
      if (existingIdx >= 0) {
        row = { ...db.push_subscriptions[existingIdx], ...body };
        db.push_subscriptions[existingIdx] = row;
      } else {
        row = { id: uuid(), created_at: now(), ...body };
        db.push_subscriptions.push(row);
      }
      return respondRows(res, req, [row], 201);
    }
    if (req.method === "DELETE") {
      const filters = parseFilters(url.searchParams);
      const toDelete = db.push_subscriptions.filter((r) => matchRow(r, filters));
      db.push_subscriptions = db.push_subscriptions.filter((r) => !matchRow(r, filters));
      return respondRows(res, req, toDelete, 200);
    }
  }

  // --- REST: audit_logs (read-only — see log_audit_event() / auditLog() above) ---
  if (path === "/rest/v1/audit_logs" && req.method === "GET") {
    const filters = parseFilters(url.searchParams);
    let rows = db.audit_logs.filter((r) => matchRow(r, filters));
    rows = applyOrder(rows, url.searchParams.get("order"));
    const limit = url.searchParams.get("limit");
    if (limit) rows = rows.slice(0, Number(limit));
    rows = attachEmbeds(rows, url.searchParams.get("select"));
    return respondRows(res, req, rows, 200);
  }

  // --- Storage: sign URLs ---
  if (path.startsWith("/storage/v1/object/sign/") && req.method === "POST") {
    const bucket = path.replace("/storage/v1/object/sign/", "");
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const results = (body.paths || []).map((p) => ({
      error: null,
      path: p,
      signedURL: `/object/sign/${bucket}/${p}?token=mock`,
    }));
    return sendJson(res, 200, results);
  }

  if (path.startsWith("/storage/v1/object/sign/") && req.method === "GET") {
    const rest = path.replace("/storage/v1/object/sign/", "");
    const buf = db.storageObjects.get(rest);
    if (!buf) return sendJson(res, 404, { message: "not found" });
    withCors(res);
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(buf);
    return;
  }

  // --- Storage: upload ---
  if (path.startsWith("/storage/v1/object/")) {
    const key = path.replace("/storage/v1/object/", "");
    const raw = await readBody(req);
    const contentType = req.headers["content-type"] || "";
    let fileBuf = raw;
    if (contentType.startsWith("multipart/form-data")) {
      const parts = parseMultipart(raw, contentType);
      const filePart = parts.find((p) => p.name === "") ?? parts[parts.length - 1];
      if (filePart) fileBuf = filePart.data;
    }
    db.storageObjects.set(key, fileBuf);
    return sendJson(res, 200, { Key: key, Id: uuid() });
  }

  sendJson(res, 404, { message: `mock: no handler for ${req.method} ${path}` });
}

export function createMockSupabaseServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      sendJson(res, 500, { message: String(err) });
    });
  });
}

// Allow running standalone (`node tests/support/mock-supabase-server.mjs`)
// as well as being started by Playwright's webServer config.
if (import.meta.url === `file://${process.argv[1]}`) {
  createMockSupabaseServer().listen(PORT, () => {
    console.log(`Mock Supabase listening on http://localhost:${PORT}`);
  });
}
