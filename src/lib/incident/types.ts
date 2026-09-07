import type { IncidentType, IncidentUrgency } from "@/types/database";

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  vehicle_accident: "Vehicle accident",
  vehicle_issue: "Vehicle issue",
  breakdown: "Breakdown",
  safety_issue: "Safety issue",
  route_issue: "Route issue",
  other: "Other",
};

export const INCIDENT_URGENCY_LABELS: Record<IncidentUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
