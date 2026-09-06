"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceRecord } from "@/types/database";
import { Button } from "@/components/ui/button";
import { VehicleInspectionCapture } from "@/components/shift/vehicle-inspection-capture";

interface EndShiftFlowProps {
  driverId: string;
  attendance: AttendanceRecord;
}

export function EndShiftFlow({ driverId, attendance }: EndShiftFlowProps) {
  const router = useRouter();
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEndingPersonal, setIsEndingPersonal] = useState(false);
  const [isCreatingInspection, setIsCreatingInspection] = useState(false);

  async function endPersonalShift() {
    setError(null);
    setIsEndingPersonal(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("end_shift", {
      p_attendance_id: attendance.id,
      p_end_inspection_id: null,
    });
    setIsEndingPersonal(false);

    if (rpcError) {
      setError("Could not end your shift. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function beginEndInspection() {
    setError(null);
    setIsCreatingInspection(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_vehicle_inspection", {
      p_company_vehicle_id: attendance.company_vehicle_id!,
      p_inspection_type: "end",
    });
    setIsCreatingInspection(false);

    if (rpcError || !data) {
      setError("Could not start the end-of-shift inspection. Please try again.");
      return;
    }

    setInspectionId(data);
  }

  async function finishEndShift() {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("end_shift", {
      p_attendance_id: attendance.id,
      p_end_inspection_id: inspectionId,
    });

    if (rpcError) {
      throw new Error("Could not end your shift after the inspection. Please try again.");
    }

    router.push("/");
    router.refresh();
  }

  if (attendance.vehicle_type === "personal") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">You used a personal vehicle today — no photos needed.</p>
        <Button variant="danger" fullWidth disabled={isEndingPersonal} onClick={endPersonalShift}>
          {isEndingPersonal ? "Ending shift…" : "End Shift"}
        </Button>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!inspectionId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          You used a company vehicle. Take 3 photos showing how you&apos;re leaving it before your shift ends.
        </p>
        <Button fullWidth disabled={isCreatingInspection} onClick={beginEndInspection}>
          {isCreatingInspection ? "Starting…" : "Start end-of-shift photo check"}
        </Button>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">Your shift only ends once all three photos are saved.</p>
      <VehicleInspectionCapture
        inspectionId={inspectionId}
        driverId={driverId}
        submitLabel="Submit inspection & end shift"
        onComplete={finishEndShift}
      />
    </div>
  );
}
