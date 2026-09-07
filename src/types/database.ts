// Hand-written types matching supabase/migrations/*.sql. If you have the
// Supabase CLI + a linked project, prefer regenerating this with
// `supabase gen types typescript` and keep this file as the fallback shape.

export type UserRole = "driver" | "admin";
export type EmploymentStatus = "active" | "inactive";
export type VehicleType = "personal" | "company";
export type InspectionType = "start" | "end";
export type InspectionStatus = "pending" | "complete";
export type PhotoCategory = "cab" | "rear" | "cargo";
export type ShiftStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceStatus = "active" | "completed";
export type HolidayRequestStatus = "pending" | "approved" | "rejected";

// These are plain `type` aliases rather than `interface`s deliberately: the
// Supabase query builder's generic types check `Row extends Record<string,
// unknown>` structurally, and TypeScript only grants object *type alias*
// literals the implicit index signature that check needs — interfaces don't
// qualify, even though they look identical everywhere else in the codebase.

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  employment_status: EmploymentStatus;
  created_at: string;
  updated_at: string;
};

export type CompanyVehicle = {
  id: string;
  internal_name: string;
  registration: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  driver_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  status: ShiftStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleInspection = {
  id: string;
  driver_id: string;
  company_vehicle_id: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  created_at: string;
  completed_at: string | null;
};

export type VehicleInspectionPhoto = {
  id: string;
  inspection_id: string;
  category: PhotoCategory;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
};

export type AttendanceRecord = {
  id: string;
  driver_id: string;
  shift_id: string | null;
  vehicle_type: VehicleType;
  company_vehicle_id: string | null;
  status: AttendanceStatus;
  check_in_at: string;
  check_out_at: string | null;
  start_inspection_id: string | null;
  end_inspection_id: string | null;
  created_at: string;
};

export type HolidayRequest = {
  id: string;
  driver_id: string;
  note: string | null;
  status: HolidayRequestStatus;
  admin_id: string | null;
  admin_response: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HolidayRequestDate = {
  id: string;
  holiday_request_id: string;
  date: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_type: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

type NoRelationships = {
  Relationships: [];
};

type Rel<ForeignKeyName extends string, Column extends string, ReferencedRelation extends string> = {
  Relationships: [
    {
      foreignKeyName: ForeignKeyName;
      columns: [Column];
      isOneToOne: false;
      referencedRelation: ReferencedRelation;
      referencedColumns: ["id"];
    },
  ];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Record<string, never>;
        Update: Partial<Pick<Profile, "full_name" | "phone">>;
      } & NoRelationships;
      company_vehicles: {
        Row: CompanyVehicle;
        Insert: Pick<CompanyVehicle, "internal_name" | "registration"> & Partial<Pick<CompanyVehicle, "is_active">>;
        Update: Partial<Pick<CompanyVehicle, "internal_name" | "registration" | "is_active">>;
      } & NoRelationships;
      shifts: {
        Row: Shift;
        Insert: Pick<Shift, "driver_id" | "shift_date" | "start_time" | "created_by"> &
          Partial<Pick<Shift, "end_time" | "status">>;
        Update: Partial<Pick<Shift, "driver_id" | "shift_date" | "start_time" | "end_time" | "status">>;
      } & Rel<"shifts_driver_id_fkey", "driver_id", "profiles">;
      vehicle_inspections: {
        Row: VehicleInspection;
        Insert: Record<string, never>;
        Update: Record<string, never>;
      } & NoRelationships;
      vehicle_inspection_photos: {
        Row: VehicleInspectionPhoto;
        Insert: Pick<VehicleInspectionPhoto, "inspection_id" | "category" | "storage_path" | "uploaded_by">;
        Update: Record<string, never>;
      } & NoRelationships;
      attendance_records: {
        Row: AttendanceRecord;
        Insert: Record<string, never>;
        Update: Record<string, never>;
      } & Rel<"attendance_records_driver_id_fkey", "driver_id", "profiles">;
      holiday_requests: {
        Row: HolidayRequest;
        Insert: Record<string, never>;
        Update: Partial<Pick<HolidayRequest, "status" | "admin_id" | "admin_response" | "decided_at">>;
      } & Rel<"holiday_requests_driver_id_fkey", "driver_id", "profiles">;
      holiday_request_dates: {
        Row: HolidayRequestDate;
        Insert: Record<string, never>;
        Update: Record<string, never>;
      } & Rel<"holiday_request_dates_holiday_request_id_fkey", "holiday_request_id", "holiday_requests">;
      notifications: {
        Row: Notification;
        Insert: Record<string, never>;
        Update: Partial<Pick<Notification, "read_at">>;
      } & NoRelationships;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      create_vehicle_inspection: {
        Args: { p_company_vehicle_id: string; p_inspection_type: InspectionType };
        Returns: string;
      };
      complete_vehicle_inspection: { Args: { p_inspection_id: string }; Returns: void };
      start_shift: {
        Args: { p_shift_id: string | null; p_vehicle_type: VehicleType; p_start_inspection_id: string | null };
        Returns: string;
      };
      end_shift: { Args: { p_attendance_id: string; p_end_inspection_id: string | null }; Returns: void };
      create_holiday_request: { Args: { p_dates: string[]; p_note: string | null }; Returns: string };
    };
  };
}
