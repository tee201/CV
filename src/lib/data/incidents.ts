import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Incident, IncidentNote, IncidentPhoto } from "@/types/database";

export async function getMyIncidents(supabase: SupabaseClient<Database>, driverId: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type AdminIncident = Incident & { driverName: string };

export async function getAllIncidents(supabase: SupabaseClient<Database>): Promise<AdminIncident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*, driver:profiles!incidents_driver_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { driver, ...rest } = row as typeof row & { driver: { full_name: string } | { full_name: string }[] | null };
    const driverName = (Array.isArray(driver) ? driver[0]?.full_name : driver?.full_name) ?? "Unknown driver";
    return { ...rest, driverName };
  });
}

export async function getIncidentById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<AdminIncident | null> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*, driver:profiles!incidents_driver_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { driver, ...rest } = data as typeof data & { driver: { full_name: string } | { full_name: string }[] | null };
  const driverName = (Array.isArray(driver) ? driver[0]?.full_name : driver?.full_name) ?? "Unknown driver";
  return { ...rest, driverName };
}

export async function getIncidentPhotos(
  supabase: SupabaseClient<Database>,
  incidentId: string,
): Promise<IncidentPhoto[]> {
  const { data, error } = await supabase
    .from("incident_photos")
    .select("*")
    .eq("incident_id", incidentId)
    .order("uploaded_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getIncidentNotes(
  supabase: SupabaseClient<Database>,
  incidentId: string,
): Promise<IncidentNote[]> {
  const { data, error } = await supabase
    .from("incident_notes")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
