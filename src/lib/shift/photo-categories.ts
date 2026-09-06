import type { PhotoCategory } from "@/types/database";

export const REQUIRED_PHOTO_CATEGORIES: Array<{ category: PhotoCategory; label: string; helpText: string }> = [
  { category: "cab", label: "Driver / cab area", helpText: "Front seats and dashboard" },
  { category: "rear", label: "Rear / passenger area", helpText: "Rear seats or passenger area" },
  { category: "cargo", label: "Cargo area", helpText: "Load space where parcels are carried" },
];
